import React, { useState, useRef, lazy, Suspense } from "react";
import type { TimeBlock as TimeBlockType } from "../../types/daily-plan";
import type { TimeBlockEdit } from "../../types/triage";

// Lazy load InlineEditor - Requirements: 12.1, 12.2, 13.5
const InlineEditor = lazy(() => import("./InlineEditor"));

// Loading fallback for InlineEditor
const EditorLoadingFallback = () => (
  <div className="mt-4 p-4 bg-surface-secondary border border-border-primary rounded-lg animate-pulse">
    <div className="h-6 bg-surface-tertiary rounded w-1/4 mb-4"></div>
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
      <div className="h-10 bg-surface-tertiary rounded"></div>
      <div className="h-10 bg-surface-tertiary rounded"></div>
      <div className="h-10 bg-surface-tertiary rounded"></div>
      <div className="h-10 bg-surface-tertiary rounded"></div>
    </div>
    <div className="flex gap-3">
      <div className="flex-1 h-11 bg-surface-tertiary rounded"></div>
      <div className="flex-1 h-11 bg-surface-tertiary rounded"></div>
    </div>
  </div>
);

interface TimeBlockProps {
  block: TimeBlockType;
  currentTime: Date;
  editMode: boolean;
  onComplete: (blockId: string) => void;
  onSkip: (blockId: string, reason: string) => void;
  onEdit: (blockId: string, edit: Partial<TimeBlockEdit>) => Promise<void>;
  onRecalculateAll: () => void;
  onDelete?: (blockId: string) => Promise<void>;
  onRefresh?: () => void;
  // Mirror V2 props (Req 4.3, 4.4)
  showCompletionControls?: boolean; // Default true for backward compatibility
}

/**
 * TimeBlock Component
 *
 * Displays an individual time block with:
 * - Time range, duration, activity name
 * - Completion checkbox and skip button
 * - Edit button (when editMode enabled)
 * - Visual state styling (pending, current, completed, skipped, late)
 * - Touch gesture support (swipe right = complete, swipe left = skip)
 *
 * Requirements: 17.1, 17.2, 17.3, 17.4, 17.5
 */
export default function TimeBlock({
  block,
  currentTime,
  editMode,
  onComplete,
  onSkip,
  onEdit,
  onRecalculateAll,
  onDelete,
  onRefresh,
  showCompletionControls = true, // Default true for backward compatibility (Req 4.3, 4.4)
}: TimeBlockProps) {
  const [showSkipModal, setShowSkipModal] = useState(false);
  const [skipReason, setSkipReason] = useState("");
  const [showInlineEditor, setShowInlineEditor] = useState(false);
  const [touchStart, setTouchStart] = useState<{ x: number; y: number } | null>(
    null,
  );
  const [touchOffset, setTouchOffset] = useState(0);
  const [showContextMenu, setShowContextMenu] = useState(false);
  const [longPressTimer, setLongPressTimer] = useState<NodeJS.Timeout | null>(
    null,
  );
  const blockRef = useRef<HTMLDivElement>(null);

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
  const isCurrentBlock = (): boolean => {
    const start = new Date(block.startTime);
    const end = new Date(block.endTime);
    return currentTime >= start && currentTime <= end;
  };

  // Check if block is late
  const isLateBlock = (): boolean => {
    const end = new Date(block.endTime);
    return currentTime > end && block.status === "pending";
  };

  // Get visual state class for block - Mirror V2: Only three states (Req 3.1, 3.2, 3.5)
  const getBlockStateClass = (): string => {
    if (block.status === "completed") {
      return "bg-green-500/10 border-green-500/40";
    }
    if (block.status === "skipped") {
      return "bg-gray-500/10 border-gray-500/40";
    }
    // Pending state - always neutral, no time-based color changes (Req 3.4, 3.5)
    return "bg-surface-primary border-border-primary";
  };

  // Get text color class for block - Mirror V2: Neutral for pending (Req 3.2)
  const getBlockTextClass = (): string => {
    if (block.status === "completed") {
      return "text-text-muted line-through";
    }
    if (block.status === "skipped") {
      return "text-text-muted";
    }
    // Pending state - always neutral text color
    return "text-text-primary";
  };

  // Get envelope label
  const getEnvelopeLabel = (): string | null => {
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

  // Touch gesture handlers for swipe support and long press
  const handleTouchStart = (e: React.TouchEvent) => {
    if (block.status !== "pending") return;

    const touch = e.touches[0];
    setTouchStart({ x: touch.clientX, y: touch.clientY });
    setTouchOffset(0);

    // Start long press timer (500ms threshold)
    const timer = setTimeout(() => {
      setShowContextMenu(true);
      // Haptic feedback if available
      if (navigator.vibrate) {
        navigator.vibrate(50);
      }
    }, 500);
    setLongPressTimer(timer);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    if (!touchStart || block.status !== "pending") return;

    const touch = e.touches[0];
    const deltaX = touch.clientX - touchStart.x;
    const deltaY = Math.abs(touch.clientY - touchStart.y);

    // Cancel long press if user moves finger
    if (longPressTimer && (Math.abs(deltaX) > 10 || deltaY > 10)) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }

    // Only track horizontal swipes (ignore vertical scrolling)
    if (deltaY < 30) {
      setTouchOffset(deltaX);
    }
  };

  const handleTouchEnd = () => {
    // Clear long press timer
    if (longPressTimer) {
      clearTimeout(longPressTimer);
      setLongPressTimer(null);
    }

    if (!touchStart || block.status !== "pending") {
      setTouchStart(null);
      setTouchOffset(0);
      return;
    }

    const threshold = 100; // pixels

    // Swipe right = complete
    if (touchOffset > threshold) {
      onComplete(block.id);
    }
    // Swipe left = skip
    else if (touchOffset < -threshold) {
      setShowSkipModal(true);
    }

    setTouchStart(null);
    setTouchOffset(0);
  };

  // Cleanup long press timer on unmount
  React.useEffect(() => {
    return () => {
      if (longPressTimer) {
        clearTimeout(longPressTimer);
      }
    };
  }, [longPressTimer]);

  // Handle skip submission
  const handleSkipSubmit = () => {
    if (skipReason.trim()) {
      onSkip(block.id, skipReason.trim());
      setShowSkipModal(false);
      setSkipReason("");
    }
  };

  // Handle inline editor save
  const handleInlineEditorSave = async (
    blockId: string,
    edit: Partial<TimeBlockEdit>,
  ) => {
    await onEdit(blockId, edit);
    setShowInlineEditor(false);
  };

  // Handle inline editor cancel
  const handleInlineEditorCancel = () => {
    setShowInlineEditor(false);
  };

  // Handle inline editor delete
  const handleInlineEditorDelete = async (blockId: string) => {
    if (onDelete) {
      await onDelete(blockId);
      setShowInlineEditor(false);
      if (onRefresh) {
        onRefresh();
      }
    }
  };

  const duration = calculateDuration(block.startTime, block.endTime);
  const envelopeLabel = getEnvelopeLabel();
  const isCurrent = isCurrentBlock();
  const isLate = isLateBlock();

  return (
    <>
      <div
        ref={blockRef}
        className={`
          rounded-lg border-2 p-4 transition-all relative
          ${getBlockStateClass()}
          ${touchOffset !== 0 ? "transition-none" : ""}
        `}
        style={{
          transform:
            touchOffset !== 0 ? `translateX(${touchOffset}px)` : undefined,
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Swipe indicators */}
        {touchOffset > 50 && (
          <div className="absolute left-4 top-1/2 -translate-y-1/2 text-green-400 opacity-70">
            <svg
              className="w-8 h-8"
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
          </div>
        )}
        {touchOffset < -50 && (
          <div className="absolute right-4 top-1/2 -translate-y-1/2 text-yellow-400 opacity-70">
            <svg
              className="w-8 h-8"
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
          </div>
        )}

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
                {formatTime(block.startTime)} - {formatTime(block.endTime)}
              </span>
              <span className="mx-2">•</span>
              <span>{formatDuration(duration)}</span>
            </div>

            {/* Activity Name */}
            <div className="flex items-center mb-2">
              <h3 className={`text-lg font-semibold ${getBlockTextClass()}`}>
                {block.activityName}
              </h3>
              {/* Mirror V2: Removed "Current" and "Late" badges - no time-based visual indicators (Req 3.4) */}
            </div>

            {/* Envelope Label */}
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

            {/* Wake Ramp Label */}
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
                  <span>Wake Ramp • {formatDuration(duration)}</span>
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

          {/* Completion Controls - Mirror V2: Hidden by default unless showCompletionControls is true (Req 4.3, 4.4) */}
          <div className="flex items-center gap-2 ml-4">
            {block.status === "pending" && showCompletionControls && (
              <>
                {/* Complete Button - 44x44px minimum touch target */}
                <button
                  onClick={() => onComplete(block.id)}
                  className="p-2 rounded-lg bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                  title="Mark as complete"
                  aria-label="Mark as complete"
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

                {/* Skip Button - 44x44px minimum touch target */}
                <button
                  onClick={() => setShowSkipModal(true)}
                  className="p-2 rounded-lg bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/40 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                  title="Skip"
                  aria-label="Skip activity"
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

            {/* Edit Button (when editMode enabled) - 44x44px minimum touch target */}
            {editMode && (
              <button
                onClick={() => setShowInlineEditor(!showInlineEditor)}
                className="p-2 rounded-lg bg-accent-primary/20 hover:bg-accent-primary/30 border border-accent-primary/40 transition-colors min-w-[44px] min-h-[44px] flex items-center justify-center"
                title="Edit"
                aria-label="Edit activity"
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
              <div className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center">
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
              <div className="p-2 min-w-[44px] min-h-[44px] flex items-center justify-center">
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

      {/* Skip Reason Modal */}
      {showSkipModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="timeblock-skip-title"
        >
          <div className="bg-surface-primary border border-border-primary rounded-xl p-6 max-w-md w-full mx-4">
            <h3
              id="timeblock-skip-title"
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
                className="flex-1 px-4 py-2 bg-accent-primary text-white rounded-lg font-medium hover:bg-accent-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors min-h-[44px] focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-surface"
                aria-label="Confirm skip activity"
              >
                Skip Activity
              </button>
              <button
                onClick={() => {
                  setShowSkipModal(false);
                  setSkipReason("");
                }}
                className="flex-1 px-4 py-2 bg-surface-secondary border border-border-primary text-text-primary rounded-lg font-medium hover:bg-surface-tertiary transition-colors min-h-[44px] focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-surface"
                aria-label="Cancel skip"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Inline Editor */}
      {showInlineEditor && (
        <Suspense fallback={<EditorLoadingFallback />}>
          <InlineEditor
            block={block}
            onSave={handleInlineEditorSave}
            onCancel={handleInlineEditorCancel}
            onRecalculateAll={onRecalculateAll}
            onDelete={onDelete ? handleInlineEditorDelete : undefined}
          />
        </Suspense>
      )}

      {/* Context Menu (Long Press) */}
      {showContextMenu && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
          role="dialog"
          aria-modal="true"
          aria-labelledby="context-menu-title"
        >
          <div className="bg-surface-primary border border-border-primary rounded-xl p-4 max-w-xs w-full mx-4">
            <h3
              id="context-menu-title"
              className="text-lg font-semibold text-text-primary mb-4"
            >
              Quick Actions
            </h3>
            <div className="space-y-2" role="menu">
              <button
                onClick={() => {
                  onComplete(block.id);
                  setShowContextMenu(false);
                }}
                className="w-full px-4 py-3 bg-green-500/20 hover:bg-green-500/30 border border-green-500/40 text-green-400 rounded-lg font-medium transition-colors min-h-[44px] flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 focus:ring-offset-surface"
                role="menuitem"
                aria-label="Mark complete"
              >
                <svg
                  className="w-5 h-5"
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
                Mark Complete
              </button>
              <button
                onClick={() => {
                  setShowContextMenu(false);
                  setShowSkipModal(true);
                }}
                className="w-full px-4 py-3 bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/40 text-yellow-400 rounded-lg font-medium transition-colors min-h-[44px] flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-offset-2 focus:ring-offset-surface"
                role="menuitem"
                aria-label="Skip activity"
              >
                <svg
                  className="w-5 h-5"
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
                Skip Activity
              </button>
              {editMode && (
                <button
                  onClick={() => {
                    setShowContextMenu(false);
                    setShowInlineEditor(true);
                  }}
                  className="w-full px-4 py-3 bg-accent-primary/20 hover:bg-accent-primary/30 border border-accent-primary/40 text-accent-primary rounded-lg font-medium transition-colors min-h-[44px] flex items-center gap-2 focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-surface"
                  role="menuitem"
                  aria-label="Edit activity"
                >
                  <svg
                    className="w-5 h-5"
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
                  Edit Activity
                </button>
              )}
              <button
                onClick={() => setShowContextMenu(false)}
                className="w-full px-4 py-3 bg-surface-secondary border border-border-primary text-text-primary rounded-lg font-medium hover:bg-surface-tertiary transition-colors min-h-[44px] focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-surface"
                role="menuitem"
                aria-label="Cancel"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
