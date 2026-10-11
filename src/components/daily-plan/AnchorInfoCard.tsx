// src/components/daily-plan/AnchorInfoCard.tsx
import React from "react";
import type { TimeBlock } from "@/types/daily-plan";

export interface AnchorInfoCardProps {
  anchor: TimeBlock;
  currentTime: Date;
  onRealityCheck: () => void;
  isExpanded: boolean;
  onToggleExpand?: () => void;
}

/**
 * AnchorInfoCard - Neutral anchor information display
 *
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 12.2, 12.3
 *
 * Displays anchor time in neutral "Anchor at [time]" format instead of
 * deadline-focused "Complete by" language. Shows time remaining without
 * countdown timers or urgency indicators. Uses neutral colors only.
 */
export function AnchorInfoCard({
  anchor,
  currentTime,
  onRealityCheck,
  isExpanded,
  onToggleExpand,
}: AnchorInfoCardProps) {
  const timing = anchor.metadata?.timing_signals;
  const anchorAt = timing?.anchor_at ? new Date(timing.anchor_at) : anchor.startTime;
  const startBy = timing?.suggested_start_by
    ? new Date(timing.suggested_start_by)
    : null;
  const leaveBy = timing?.ready_to_leave_by
    ? new Date(timing.ready_to_leave_by)
    : null;
  const effectiveDeadline = timing?.effective_arrival_deadline
    ? new Date(timing.effective_arrival_deadline)
    : anchorAt;

  const timeRemaining = Math.max(
    0,
    (anchorAt.getTime() - currentTime.getTime()) / (1000 * 60 * 60),
  );

  // Format time remaining in neutral language (Req 2.2, 2.5)
  const formatTimeRemaining = (hours: number): string => {
    if (hours < 1) {
      const minutes = Math.round(hours * 60);
      return `(in ${minutes} minute${minutes !== 1 ? "s" : ""})`;
    }
    const wholeHours = Math.floor(hours);
    const minutes = Math.round((hours - wholeHours) * 60);
    if (minutes === 0) {
      return `(in ${wholeHours} hour${wholeHours !== 1 ? "s" : ""})`;
    }
    return `(in ${wholeHours}h ${minutes}m)`;
  };

  // Format anchor time (Req 2.1)
  const formatAnchorTime = (date: Date): string => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  return (
    <div
      role="region"
      aria-label="Anchor information"
      className="mb-4 p-4 bg-surface-primary border border-border rounded-lg"
    >
      {/* Mobile-first layout - Task 13.3 */}
      <div className="flex flex-col gap-3">
        {/* Header section */}
        <div className="flex items-start justify-between gap-3">
          <div className="flex-1 min-w-0">
            {/* Anchor time - Mobile optimized typography */}
            <h3 className="text-xl font-semibold text-text-primary mb-1 leading-tight">
              Anchor at {formatAnchorTime(anchorAt)}
            </h3>

            {/* Activity name */}
            <p className="text-sm text-text-secondary mb-3 leading-snug break-words">
              {anchor.activityName}
            </p>
          </div>

          {/* Expand/collapse button - Task 13.3: Touch target >= 44x44 */}
          {onToggleExpand && (
            <button
              onClick={onToggleExpand}
              className="p-3 text-text-secondary hover:text-text-primary active:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary rounded min-w-[44px] min-h-[44px] flex items-center justify-center shrink-0 touch-manipulation"
              aria-label={
                isExpanded ? "Collapse anchor details" : "Expand anchor details"
              }
              aria-expanded={isExpanded}
            >
              <svg
                className={`w-6 h-6 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M19 9l-7 7-7-7"
                />
              </svg>
            </button>
          )}
        </div>

        {/* Timing details - Mobile: Stacked, Desktop: Grid */}
        <div className="flex flex-col gap-2 sm:grid sm:grid-cols-3 sm:gap-3 text-sm">
          {startBy && (
            <div className="flex items-baseline gap-2">
              <span className="text-text-muted shrink-0">Start by</span>
              <span className="text-text-secondary font-medium">
                {formatAnchorTime(startBy)}
              </span>
            </div>
          )}
          {leaveBy && (
            <div className="flex items-baseline gap-2">
              <span className="text-text-muted shrink-0">Leave by</span>
              <span className="text-text-secondary font-medium">
                {formatAnchorTime(leaveBy)}
              </span>
            </div>
          )}
          <div className="flex items-baseline gap-2">
            <span className="text-text-muted shrink-0">Latest arrival</span>
            <span className="text-text-secondary font-medium">
              {formatAnchorTime(effectiveDeadline)}
            </span>
          </div>
        </div>

        {/* Time remaining */}
        <p className="text-sm text-text-muted" aria-live="polite">
          {timeRemaining > 0
            ? formatTimeRemaining(timeRemaining)
            : "(anchor time has passed)"}
        </p>

        {/* Can I make it? button - Task 13.3: Touch target >= 44x44 */}
        <button
          onClick={onRealityCheck}
          className="w-full px-4 py-3 text-sm font-medium rounded-lg border border-border text-text-secondary hover:text-text-primary hover:bg-surface-hover active:bg-surface-hover transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-background min-h-[44px] touch-manipulation"
          aria-label="Check if you can make this anchor"
        >
          Can I make it?
        </button>
      </div>
    </div>
  );
}
