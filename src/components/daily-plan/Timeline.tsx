import React, { useState, useEffect, useMemo, useCallback } from "react";
import type { TimeBlock } from "../../types/daily-plan";
import StartTimeLabel from "./StartTimeLabel";
import { useThrottledCallback } from "../../hooks/useThrottle";

interface TimelineProps {
  timeBlocks: TimeBlock[];
  editMode: boolean;
  onBlockComplete: (blockId: string) => void;
  onBlockSkip: (blockId: string, reason: string) => void;
  onBlockEdit: (blockId: string) => void;
  onRefresh: () => void;
  onBlockDelete?: (blockId: string) => Promise<void>;
}

interface InsertStepForm {
  activity_name: string;
  duration: number;
}

/**
 * Timeline Component
 *
 * Displays a vertical timeline of time blocks with:
 * - Current time indicator (sticky)
 * - Deadline banners for commitment envelopes
 * - Time blocks with completion controls
 * - Visual states (pending, current, completed, skipped, late)
 * - Edit buttons when editMode enabled
 *
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 17.1, 17.2, 17.3, 17.4, 17.5
 */
export default function Timeline({
  timeBlocks,
  editMode,
  onBlockComplete,
  onBlockSkip,
  onBlockEdit,
  onRefresh,
  onBlockDelete,
}: TimelineProps) {
  const [currentTime, setCurrentTime] = useState(new Date());
  const [skipModalBlockId, setSkipModalBlockId] = useState<string | null>(null);
  const [skipReason, setSkipReason] = useState("");
  const [insertAfterBlockId, setInsertAfterBlockId] = useState<string | null>(
    null,
  );
  const [insertForm, setInsertForm] = useState<InsertStepForm>({
    activity_name: "",
    duration: 30,
  });
  const [isInserting, setIsInserting] = useState(false);

  // Throttle scroll position updates (100ms) - Requirements: 12.1, 12.2, 13.5
  const [scrollPosition, setScrollPosition] = useState(0);
  const handleScroll = useThrottledCallback((e: Event) => {
    const target = e.target as HTMLElement;
    setScrollPosition(target.scrollTop);
  }, 100);

  // Update current time every minute
  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000); // Update every minute

    return () => clearInterval(interval);
  }, []);

  // Format time for display
  const formatTime = (date: Date): string => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Format duration for display
  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  // Calculate duration in minutes
  const calculateDuration = (start: Date, end: Date): number => {
    return Math.floor(
      (new Date(end).getTime() - new Date(start).getTime()) / 60000,
    );
  };

  // Check if block is current
  const isCurrentBlock = (block: TimeBlock): boolean => {
    const start = new Date(block.startTime);
    const end = new Date(block.endTime);
    return currentTime >= start && currentTime <= end;
  };

  // Check if block is late
  const isLateBlock = (block: TimeBlock): boolean => {
    const end = new Date(block.endTime);
    return currentTime > end && block.status === "pending";
  };

  // Get visual state class for block
  const getBlockStateClass = (block: TimeBlock): string => {
    if (block.status === "completed") {
      return "bg-green-500/10 border-green-500/40";
    }
    if (block.status === "skipped") {
      return "bg-gray-500/10 border-gray-500/40";
    }
    if (isLateBlock(block)) {
      return "bg-red-500/10 border-red-500/40";
    }
    if (isCurrentBlock(block)) {
      return "bg-accent-primary/10 border-accent-primary shadow-md";
    }
    return "bg-surface-primary border-border-primary";
  };

  // Get text color class for block
  const getBlockTextClass = (block: TimeBlock): string => {
    if (block.status === "completed") {
      return "text-text-muted line-through";
    }
    if (block.status === "skipped") {
      return "text-text-muted";
    }
    if (isCurrentBlock(block)) {
      return "text-accent-primary font-semibold";
    }
    return "text-text-primary";
  };

  // Get envelope label
  const getEnvelopeLabel = (block: TimeBlock): string | null => {
    const envelopeType = block.metadata?.commitment_envelope?.envelope_type;
    if (!envelopeType) return null;

    const labels: Record<string, string> = {
      prep: "Prep",
      travel_there: "Travel There",
      anchor: "Anchor",
      travel_back: "Travel Back",
      recovery: "Recovery",
    };

    return labels[envelopeType] || null;
  };

  // Calculate deadline for envelope (end time of last prep/activation step before travel_there)
  const calculateEnvelopeDeadline = (
    envelopeBlocks: TimeBlock[],
  ): Date | null => {
    // Find the last prep or activation step before travel_there
    const sortedBlocks = [...envelopeBlocks].sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );

    const travelThereIndex = sortedBlocks.findIndex(
      (block) =>
        block.metadata?.commitment_envelope?.envelope_type === "travel_there",
    );

    if (travelThereIndex <= 0) return null;

    // Get the block right before travel_there
    const lastPrepBlock = sortedBlocks[travelThereIndex - 1];
    return new Date(lastPrepBlock.endTime);
  };

  // Calculate time remaining until deadline
  const calculateTimeRemaining = (deadline: Date): string => {
    const diff = deadline.getTime() - currentTime.getTime();
    const minutes = Math.floor(diff / 60000);

    if (minutes < 0) {
      return `${Math.abs(minutes)}m late`;
    }
    if (minutes < 60) {
      return `${minutes}m left`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m left` : `${hours}h left`;
  };

  // Handle skip with reason
  const handleSkipClick = (blockId: string) => {
    setSkipModalBlockId(blockId);
    setSkipReason("");
  };

  const handleSkipSubmit = () => {
    if (skipModalBlockId && skipReason.trim()) {
      onBlockSkip(skipModalBlockId, skipReason.trim());
      setSkipModalBlockId(null);
      setSkipReason("");
    }
  };

  // Handle insert step
  const handleInsertClick = (blockId: string) => {
    setInsertAfterBlockId(blockId);
    setInsertForm({
      activity_name: "",
      duration: 30,
    });
  };

  const handleInsertSubmit = async () => {
    if (!insertAfterBlockId || !insertForm.activity_name.trim()) {
      return;
    }

    setIsInserting(true);

    try {
      const response = await fetch("/api/time-blocks/insert", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          activity_name: insertForm.activity_name.trim(),
          duration: insertForm.duration,
          insert_after_id: insertAfterBlockId,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        console.error("Failed to insert step:", error);
        alert(`Failed to insert step: ${error.details || error.error}`);
        return;
      }

      // Success - refresh timeline
      setInsertAfterBlockId(null);
      setInsertForm({ activity_name: "", duration: 30 });
      onRefresh();
    } catch (error) {
      console.error("Error inserting step:", error);
      alert("Failed to insert step. Please try again.");
    } finally {
      setIsInserting(false);
    }
  };

  // Sort blocks chronologically (Requirement 4.3)
  // Memoize sorted blocks to avoid re-sorting on every render
  // Requirements: 1.3, 4.5, 12.1, 12.2, 13.5
  const sortedBlocks = useMemo(() => {
    return [...timeBlocks].sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );
  }, [timeBlocks]);

  // Memoize grouped blocks to avoid re-grouping on every render
  const groupedBlocks = useMemo(() => {
    return timeBlocks.reduce(
      (acc, block) => {
        const envelopeId = block.metadata?.commitment_envelope?.envelope_id;
        if (envelopeId) {
          if (!acc[envelopeId]) {
            acc[envelopeId] = [];
          }
          acc[envelopeId].push(block);
        } else {
          // Non-envelope blocks go in a special group
          if (!acc["_other"]) {
            acc["_other"] = [];
          }
          acc["_other"].push(block);
        }
        return acc;
      },
      {} as Record<string, TimeBlock[]>,
    );
  }, [timeBlocks]);

  return (
    <div className="relative pb-20" role="region" aria-label="Daily timeline">
      {/* Current Time Indicator - Sticky (Requirement 5.5) */}
      <div 
        className="sticky top-0 z-10 bg-background/95 backdrop-blur-sm border-b border-border-primary py-2 px-4 mb-6"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center">
            <div className="w-3 h-3 bg-accent-primary rounded-full animate-pulse mr-3" />
            <span className="text-sm font-medium text-text-primary">
              Current Time
            </span>
          </div>
          <span className="text-lg font-bold text-accent-primary">
            {formatTime(currentTime)}
          </span>
        </div>
      </div>

      {/* Timeline Content */}
      <div className="space-y-6 px-4">
        {Object.entries(groupedBlocks).map(([envelopeId, blocks]) => {
          const isEnvelope = envelopeId !== "_other";
          const deadline = isEnvelope
            ? calculateEnvelopeDeadline(blocks)
            : null;
          const isPastDeadline = deadline && currentTime > deadline;

          return (
            <div key={envelopeId} className="space-y-3">
              {/* Start Time Label for Commitment Envelopes (Requirements 22.1, 22.2, 22.3, 22.4, 22.5) */}
              {isEnvelope && (
                <StartTimeLabel
                  envelopeBlocks={blocks}
                  currentTime={currentTime}
                />
              )}

              {/* Deadline Banner for Commitment Envelopes (Requirements 21.1, 21.2, 21.3, 21.4, 21.5) */}
              {isEnvelope && deadline && (
                <div
                  className={`
                    sticky top-16 z-10 rounded-lg p-4 border-2 transition-colors
                    ${
                      isPastDeadline
                        ? "bg-red-500/20 border-red-500/60"
                        : "bg-accent-warning/20 border-accent-warning/60"
                    }
                  `}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center">
                      <svg
                        className={`w-5 h-5 mr-2 ${isPastDeadline ? "text-red-400" : "text-accent-warning"}`}
                        fill="none"
                        stroke="currentColor"
                        viewBox="0 0 24 24"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                        />
                      </svg>
                      <span
                        className={`text-sm font-medium ${isPastDeadline ? "text-red-400" : "text-accent-warning"}`}
                      >
                        Complete by {formatTime(deadline)}
                      </span>
                    </div>
                    <span
                      className={`text-lg font-bold ${isPastDeadline ? "text-red-400" : "text-accent-warning"}`}
                    >
                      {calculateTimeRemaining(deadline)}
                    </span>
                  </div>
                </div>
              )}

              {/* Time Blocks */}
              {blocks
                .sort(
                  (a, b) =>
                    new Date(a.startTime).getTime() -
                    new Date(b.startTime).getTime(),
                )
                .map((block, index) => {
                  const duration = calculateDuration(
                    block.startTime,
                    block.endTime,
                  );
                  const envelopeLabel = getEnvelopeLabel(block);

                  return (
                    <React.Fragment key={block.id}>
                      {/* Time Block */}
                      <div
                        className={`
                        rounded-lg border-2 p-4 transition-all
                        ${getBlockStateClass(block)}
                      `}
                      >
                        <div className="flex items-start justify-between">
                          {/* Block Content */}
                          <div className="flex-1 min-w-0">
                            {/* Time Range and Duration */}
                            <div className="flex items-center text-sm text-text-muted mb-2">
                              <svg
                                className="w-4 h-4 mr-1"
                                fill="none"
                                stroke="currentColor"
                                viewBox="0 0 24 24"
                              >
                                <path
                                  strokeLinecap="round"
                                  strokeLinejoin="round"
                                  strokeWidth={2}
                                  d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
                                />
                              </svg>
                              <span>
                                {formatTime(block.startTime)} -{" "}
                                {formatTime(block.endTime)}
                              </span>
                              <span className="mx-2">•</span>
                              <span>{formatDuration(duration)}</span>
                            </div>

                            {/* Activity Name */}
                            <div className="flex items-center mb-2">
                              <h3
                                className={`text-lg font-semibold ${getBlockTextClass(block)}`}
                              >
                                {block.activityName}
                              </h3>
                              {isCurrentBlock(block) && (
                                <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-accent-primary/20 text-accent-primary rounded animate-pulse">
                                  Current
                                </span>
                              )}
                              {isLateBlock(block) && (
                                <span className="ml-2 px-2 py-0.5 text-xs font-medium bg-red-500/20 text-red-400 rounded">
                                  Late
                                </span>
                              )}
                            </div>

                            {/* Envelope Label (Requirements 5.2) */}
                            {envelopeLabel && (
                              <div className="flex items-center text-xs text-text-muted mb-2">
                                <svg
                                  className="w-3 h-3 mr-1"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z"
                                  />
                                </svg>
                                <span>{envelopeLabel}</span>
                              </div>
                            )}

                            {/* Wake Ramp Label (Requirement 5.3) */}
                            {block.metadata?.role?.type === "chain-step" &&
                              block.activityName.includes("Wake") && (
                                <div className="flex items-center text-xs text-blue-400 mb-2">
                                  <svg
                                    className="w-3 h-3 mr-1"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707"
                                    />
                                  </svg>
                                  <span>
                                    Wake Ramp • {formatDuration(duration)}
                                  </span>
                                </div>
                              )}

                            {/* Skip Reason */}
                            {block.status === "skipped" && block.skipReason && (
                              <div className="mt-2 text-sm text-yellow-400 flex items-center">
                                <svg
                                  className="w-4 h-4 mr-1"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
                                  />
                                </svg>
                                Skipped: {block.skipReason}
                              </div>
                            )}
                          </div>

                          {/* Completion Controls (Requirements 17.1, 17.2, 17.3) */}
                          <div className="flex items-center gap-2 ml-4">
                            {block.status === "pending" && (
                              <>
                                {/* Complete Button */}
                                <button
                                  onClick={() => onBlockComplete(block.id)}
                                  className="p-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-background"
                                  title="Mark as complete"
                                  aria-label={`Mark ${block.activityName} as complete`}
                                >
                                  <svg
                                    className="w-5 h-5 text-green-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M5 13l4 4L19 7"
                                    />
                                  </svg>
                                </button>

                                {/* Skip Button */}
                                <button
                                  onClick={() => handleSkipClick(block.id)}
                                  className="p-2 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/40 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-background"
                                  title="Skip"
                                  aria-label={`Skip ${block.activityName}`}
                                >
                                  <svg
                                    className="w-5 h-5 text-yellow-400"
                                    fill="none"
                                    stroke="currentColor"
                                    viewBox="0 0 24 24"
                                  >
                                    <path
                                      strokeLinecap="round"
                                      strokeLinejoin="round"
                                      strokeWidth={2}
                                      d="M13 5l7 7-7 7M5 5l7 7-7 7"
                                    />
                                  </svg>
                                </button>
                              </>
                            )}

                            {/* Edit Button (when editMode enabled) */}
                            {editMode && (
                              <button
                                onClick={() => onBlockEdit(block.id)}
                                className="p-2 rounded-lg bg-accent-primary/20 hover:bg-accent-primary/30 border border-accent-primary/40 transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-background"
                                title="Edit"
                                aria-label={`Edit ${block.activityName}`}
                              >
                                <svg
                                  className="w-5 h-5 text-accent-primary"
                                  fill="none"
                                  stroke="currentColor"
                                  viewBox="0 0 24 24"
                                >
                                  <path
                                    strokeLinecap="round"
                                    strokeLinejoin="round"
                                    strokeWidth={2}
                                    d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                                  />
                                </svg>
                              </button>
                            )}

                            {/* Status Icon */}
                            {block.status === "completed" && (
                              <div className="p-2">
                                <svg
                                  className="w-5 h-5 text-green-500"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </div>
                            )}

                            {block.status === "skipped" && (
                              <div className="p-2">
                                <svg
                                  className="w-5 h-5 text-yellow-500"
                                  fill="currentColor"
                                  viewBox="0 0 20 20"
                                >
                                  <path
                                    fillRule="evenodd"
                                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                                    clipRule="evenodd"
                                  />
                                </svg>
                              </div>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Insert Step Button (in edit mode, between blocks) */}
                      {editMode && index < blocks.length - 1 && (
                        <div className="flex justify-center -my-1.5">
                          <button
                            onClick={() => handleInsertClick(block.id)}
                            className="px-3 py-1 text-xs font-medium bg-accent-primary/20 hover:bg-accent-primary/30 border border-accent-primary/40 text-accent-primary rounded-full transition-colors flex items-center gap-1 focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-background"
                            title="Insert custom step"
                            aria-label="Insert custom step after this activity"
                          >
                            <svg
                              className="w-3 h-3"
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                strokeWidth={2}
                                d="M12 4v16m8-8H4"
                              />
                            </svg>
                            Insert Step
                          </button>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
            </div>
          );
        })}
      </div>

      {/* Skip Reason Modal */}
      {skipModalBlockId && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="skip-modal-title"
        >
          <div className="bg-surface-primary border border-border-primary rounded-xl p-6 max-w-md w-full mx-4">
            <h3 id="skip-modal-title" className="text-lg font-semibold text-text-primary mb-4">
              Skip Reason
            </h3>
            <p className="text-sm text-text-muted mb-4">
              Please provide a reason for skipping this activity:
            </p>
            <textarea
              value={skipReason}
              onChange={(e) => setSkipReason(e.target.value)}
              className="w-full px-3 py-2 bg-surface-secondary border border-border-primary rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-surface mb-4"
              rows={3}
              placeholder="e.g., Not feeling well, ran out of time..."
              autoFocus
              aria-label="Skip reason"
            />
            <div className="flex items-center gap-3">
              <button
                onClick={handleSkipSubmit}
                disabled={!skipReason.trim()}
                className="flex-1 px-4 py-2 bg-accent-primary text-white rounded-lg font-medium hover:bg-accent-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-surface"
                aria-label="Confirm skip activity"
              >
                Skip Activity
              </button>
              <button
                onClick={() => {
                  setSkipModalBlockId(null);
                  setSkipReason("");
                }}
                className="flex-1 px-4 py-2 bg-surface-secondary border border-border-primary text-text-primary rounded-lg font-medium hover:bg-surface-tertiary transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-surface"
                aria-label="Cancel skip"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Insert Step Modal */}
      {insertAfterBlockId && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="insert-modal-title"
        >
          <div className="bg-surface-primary border border-border-primary rounded-xl p-6 max-w-md w-full mx-4">
            <h3 id="insert-modal-title" className="text-lg font-semibold text-text-primary mb-4">
              Insert Custom Step
            </h3>
            <p className="text-sm text-text-muted mb-4">
              Add a custom activity to your timeline:
            </p>

            {/* Activity Name Input */}
            <div className="mb-4">
              <label 
                htmlFor="insert-activity-name"
                className="block text-sm font-medium text-text-primary mb-2"
              >
                Activity Name
              </label>
              <input
                id="insert-activity-name"
                type="text"
                value={insertForm.activity_name}
                onChange={(e) =>
                  setInsertForm({
                    ...insertForm,
                    activity_name: e.target.value,
                  })
                }
                className="w-full px-3 py-2 bg-surface-secondary border border-border-primary rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-surface"
                placeholder="e.g., Quick break, Phone call..."
                autoFocus
                aria-required="true"
              />
            </div>

            {/* Duration Input */}
            <div className="mb-4">
              <label 
                htmlFor="insert-duration"
                className="block text-sm font-medium text-text-primary mb-2"
              >
                Duration (minutes)
              </label>
              <input
                id="insert-duration"
                type="number"
                value={insertForm.duration}
                onChange={(e) =>
                  setInsertForm({
                    ...insertForm,
                    duration: parseInt(e.target.value) || 5,
                  })
                }
                min={5}
                max={480}
                step={5}
                className="w-full px-3 py-2 bg-surface-secondary border border-border-primary rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-surface"
                aria-required="true"
                aria-describedby="duration-help"
              />
              <p id="duration-help" className="text-xs text-text-muted mt-1">
                Between 5 and 480 minutes
              </p>
            </div>

            {/* Action Buttons */}
            <div className="flex items-center gap-3">
              <button
                onClick={handleInsertSubmit}
                disabled={!insertForm.activity_name.trim() || isInserting}
                className="flex-1 px-4 py-2 bg-accent-primary text-white rounded-lg font-medium hover:bg-accent-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-surface"
                aria-label="Confirm insert step"
                aria-busy={isInserting}
              >
                {isInserting ? "Inserting..." : "Insert Step"}
              </button>
              <button
                onClick={() => {
                  setInsertAfterBlockId(null);
                  setInsertForm({ activity_name: "", duration: 30 });
                }}
                disabled={isInserting}
                className="flex-1 px-4 py-2 bg-surface-secondary border border-border-primary text-text-primary rounded-lg font-medium hover:bg-surface-tertiary transition-colors disabled:opacity-50 focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-surface"
                aria-label="Cancel insert"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
