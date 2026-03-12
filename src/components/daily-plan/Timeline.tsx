import React, { useEffect, useMemo, useState } from "react";
import type { TimeBlock } from "../../types/daily-plan";
import { AnchorInfoCard } from "./AnchorInfoCard";
import { DepartureWaypoint } from "./DepartureWaypoint";

interface TimelineProps {
  timeBlocks: TimeBlock[];
  editMode: boolean;
  onBlockComplete: (blockId: string) => void;
  onBlockSkip: (blockId: string, reason: string) => void;
  onBlockEdit: (blockId: string) => void;
  onRefresh: () => void;
  onBlockDelete?: (blockId: string) => Promise<void>;
  showCompletionControls?: boolean;
  showRecoveryBlocks?: boolean;
  displayMode?: "full_chain" | "keystone_focus" | "anchor_only" | "rest_of_day";
  showTimes?: boolean;
  onRealityCheck?: (anchorId: string) => void;
  onAnchorExpand?: (anchorId: string) => void;
  expandedAnchorId?: string | null;
  projectedCurrentTime?: Date | null;
  projectionNote?: string | null;
}

interface InsertStepForm {
  activity_name: string;
  duration: number;
}

export default function Timeline({
  timeBlocks,
  editMode,
  onBlockComplete,
  onBlockSkip,
  onBlockEdit,
  onRefresh,
  showCompletionControls = false,
  showRecoveryBlocks = true,
  showTimes = true,
  onRealityCheck,
  onAnchorExpand,
  expandedAnchorId,
  projectedCurrentTime,
  projectionNote,
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

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentTime(new Date());
    }, 60000);

    return () => clearInterval(interval);
  }, []);

  const formatTime = (date: Date): string => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  const formatDuration = (minutes: number): string => {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  };

  const calculateDuration = (start: Date, end: Date): number => {
    return Math.floor(
      (new Date(end).getTime() - new Date(start).getTime()) / 60000,
    );
  };

  const shouldShowClockTime = (block: TimeBlock): boolean => {
    if (!showTimes) return false;

    const envelopeType = block.metadata?.commitment_envelope?.envelope_type;
    return envelopeType === "anchor" || envelopeType === "travel_there";
  };

  const getBlockDisplayTime = (block: TimeBlock): string => {
    const duration = calculateDuration(block.startTime, block.endTime);

    if (shouldShowClockTime(block)) {
      return `${formatTime(block.startTime)} - ${formatTime(block.endTime)}`;
    }

    return `${formatDuration(duration)}`;
  };

  const isKeystoneBlock = (block: TimeBlock): boolean => {
    if (block.metadata?.triage?.is_keystone === true) {
      return true;
    }

    if (block.metadata?.role?.type === "chain-step") {
      const name = block.activityName.toLowerCase();
      return (
        name.includes("shower") ||
        name.includes("meds") ||
        name.includes("medication") ||
        name.includes("breakfast")
      );
    }

    return false;
  };

  const getBlockStateClass = (block: TimeBlock): string => {
    if (block.status === "completed") {
      return "bg-green-500/10 border-green-500/40";
    }
    if (block.status === "skipped") {
      return "bg-gray-500/10 border-gray-500/40";
    }
    if (isKeystoneBlock(block)) {
      return "bg-accent-primary/5 border-accent-primary/30";
    }

    return "bg-surface-primary border-border-primary";
  };

  const getBlockTextClass = (block: TimeBlock): string => {
    if (block.status === "completed") {
      return "text-text-muted line-through";
    }
    if (block.status === "skipped") {
      return "text-text-muted";
    }

    return "text-text-primary";
  };

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

  const sortedBlocks = useMemo(() => {
    return [...timeBlocks].sort(
      (a, b) =>
        new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
    );
  }, [timeBlocks]);

  const filteredBlocks = useMemo(() => {
    if (showRecoveryBlocks) {
      return sortedBlocks;
    }

    return sortedBlocks.filter(
      (block) =>
        block.metadata?.commitment_envelope?.envelope_type !== "recovery",
    );
  }, [sortedBlocks, showRecoveryBlocks]);

  const anchorsByEnvelope = useMemo(() => {
    const map = new Map<string, TimeBlock>();
    for (const block of filteredBlocks) {
      const envelopeId = block.metadata?.commitment_envelope?.envelope_id;
      const envelopeType = block.metadata?.commitment_envelope?.envelope_type;
      if (envelopeId && envelopeType === "anchor") {
        map.set(envelopeId, block);
      }
    }
    return map;
  }, [filteredBlocks]);

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

  const getAnchorExpandState = (anchorBlockId: string): boolean => {
    if (expandedAnchorId === null || expandedAnchorId === undefined) {
      return true;
    }
    return expandedAnchorId === anchorBlockId;
  };
  const effectiveCurrentTime = projectedCurrentTime || currentTime;

  return (
    <div
      className="relative pb-16 sm:pb-20"
      role="region"
      aria-label="Daily timeline"
    >
      <div
        className="sticky top-0 z-20 bg-background/95 backdrop-blur-sm border-b border-border-primary py-2 px-3 sm:px-4 mb-3 sm:mb-4"
        role="status"
        aria-live="polite"
        aria-atomic="true"
      >
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center min-w-0">
            <div className="w-2.5 h-2.5 bg-accent-primary rounded-full animate-pulse mr-2.5" />
            <span className="text-xs sm:text-sm font-medium text-text-primary truncate">
              {projectedCurrentTime ? "Projected Time" : "Current Time"}
            </span>
          </div>
          <span className="text-base sm:text-lg font-semibold text-accent-primary">
            {formatTime(effectiveCurrentTime)}
          </span>
        </div>
        {projectionNote && (
          <p className="mt-1 text-[11px] sm:text-xs text-text-muted truncate">
            {projectionNote}
          </p>
        )}
      </div>

      <div className="space-y-3 sm:space-y-4 px-2 sm:px-4">
        {filteredBlocks.map((block, index) => {
          const duration = calculateDuration(block.startTime, block.endTime);
          const envelopeType = block.metadata?.commitment_envelope?.envelope_type;
          const envelopeId = block.metadata?.commitment_envelope?.envelope_id;
          const envelopeLabel = getEnvelopeLabel(block);
          const showAsAnchor =
            showTimes &&
            (envelopeType === "anchor" || block.metadata?.role?.type === "anchor");
          const showAsDeparture = showTimes && envelopeType === "travel_there";

          if (showAsAnchor) {
            const anchorId =
              block.activityId || block.metadata?.anchor_id || block.id;

            return (
              <div key={block.id}>
                <AnchorInfoCard
                  anchor={block as any}
                  currentTime={effectiveCurrentTime}
                  onRealityCheck={() => {
                    if (onRealityCheck) {
                      onRealityCheck(anchorId);
                    }
                  }}
                  isExpanded={getAnchorExpandState(block.id)}
                  onToggleExpand={
                    onAnchorExpand
                      ? () => {
                          onAnchorExpand(block.id);
                        }
                      : undefined
                  }
                />
              </div>
            );
          }

          if (showAsDeparture) {
            const anchor =
              (envelopeId ? anchorsByEnvelope.get(envelopeId) : undefined) || block;

            return (
              <div key={block.id}>
                <DepartureWaypoint
                  departureTime={new Date(block.startTime)}
                  currentTime={effectiveCurrentTime}
                  anchor={anchor as any}
                  travelDuration={duration}
                />
              </div>
            );
          }

          return (
            <React.Fragment key={block.id}>
              <div
                className={`rounded-lg border-2 p-3 sm:p-4 transition-all ${getBlockStateClass(
                  block,
                )}`}
              >
                <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center text-xs sm:text-sm text-text-muted mb-1.5">
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
                      <span>{getBlockDisplayTime(block)}</span>
                    </div>

                    <div className="flex items-center mb-1.5">
                      {isKeystoneBlock(block) && (
                        <span
                          className="text-xl sm:text-2xl mr-2"
                          aria-label="Keystone activity"
                          title="Keystone activity"
                        >
                          🌟
                        </span>
                      )}
                      <h3
                        className={`text-base sm:text-lg font-semibold ${getBlockTextClass(
                          block,
                        )}`}
                      >
                        {block.activityName}
                      </h3>
                    </div>

                    {envelopeLabel && (
                      <div className="flex items-center text-xs text-text-muted mb-1.5">
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

                    {block.status === "skipped" && block.skipReason && (
                      <div className="mt-1.5 text-sm text-yellow-400 flex items-center">
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

                  {showCompletionControls && (
                    <div className="flex items-center gap-2 sm:ml-4 shrink-0">
                      {block.status === "pending" && (
                        <>
                          <button
                            onClick={() => onBlockComplete(block.id)}
                            className="p-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
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

                          <button
                            onClick={() => handleSkipClick(block.id)}
                            className="p-2 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/40 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
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

                      {editMode && (
                        <button
                          onClick={() => onBlockEdit(block.id)}
                          className="p-2 rounded-lg bg-accent-primary/20 hover:bg-accent-primary/30 border border-accent-primary/40 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
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
                    </div>
                  )}
                </div>
              </div>

              {editMode && index < filteredBlocks.length - 1 && (
                <div className="flex justify-center -my-1">
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

      {skipModalBlockId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="skip-modal-title"
        >
          <div className="bg-surface-primary border border-border-primary rounded-xl p-6 max-w-md w-full mx-4">
            <h3
              id="skip-modal-title"
              className="text-lg font-semibold text-text-primary mb-4"
            >
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

      {insertAfterBlockId && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="insert-step-title"
        >
          <div className="bg-surface-primary border border-border-primary rounded-xl p-6 max-w-md w-full mx-4">
            <h3
              id="insert-step-title"
              className="text-lg font-semibold text-text-primary mb-4"
            >
              Insert Custom Step
            </h3>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Activity Name
                </label>
                <input
                  type="text"
                  value={insertForm.activity_name}
                  onChange={(e) =>
                    setInsertForm((prev) => ({
                      ...prev,
                      activity_name: e.target.value,
                    }))
                  }
                  className="w-full px-3 py-2 bg-surface-secondary border border-border-primary rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-surface"
                  placeholder="e.g., Fill water bottle"
                  autoFocus
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-text-primary mb-1">
                  Duration (minutes)
                </label>
                <input
                  type="number"
                  min={1}
                  max={180}
                  value={insertForm.duration}
                  onChange={(e) =>
                    setInsertForm((prev) => ({
                      ...prev,
                      duration: Number(e.target.value) || 1,
                    }))
                  }
                  className="w-full px-3 py-2 bg-surface-secondary border border-border-primary rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-surface"
                />
              </div>
            </div>

            <div className="mt-6 flex items-center gap-3">
              <button
                onClick={handleInsertSubmit}
                disabled={!insertForm.activity_name.trim() || isInserting}
                className="flex-1 px-4 py-2 bg-accent-primary text-white rounded-lg font-medium hover:bg-accent-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-surface"
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
