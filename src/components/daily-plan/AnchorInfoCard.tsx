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
      className="mb-3 sm:mb-4 p-3 sm:p-4 bg-surface-primary border border-border rounded-lg"
    >
      <div className="flex items-start justify-between">
        <div className="flex-1">
          <h3 className="text-base sm:text-lg font-semibold text-text-primary mb-1">
            Anchor at {formatAnchorTime(anchorAt)}
          </h3>

          {/* Activity name */}
          <p className="text-sm text-text-secondary mb-2 leading-snug">
            {anchor.activityName}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs sm:text-sm">
            {startBy && (
              <p className="text-text-muted">
                Start by{" "}
                <span className="text-text-secondary font-medium">
                  {formatAnchorTime(startBy)}
                </span>
              </p>
            )}
            {leaveBy && (
              <p className="text-text-muted">
                Leave by{" "}
                <span className="text-text-secondary font-medium">
                  {formatAnchorTime(leaveBy)}
                </span>
              </p>
            )}
            <p className="text-text-muted">
              Latest arrival{" "}
              <span className="text-text-secondary font-medium">
                {formatAnchorTime(effectiveDeadline)}
              </span>
            </p>
          </div>

          <p className="text-xs sm:text-sm text-text-muted mt-2" aria-live="polite">
            {timeRemaining > 0
              ? formatTimeRemaining(timeRemaining)
              : "(anchor time has passed)"}
          </p>
        </div>

        {/* Expand/collapse button for multi-anchor scenarios - Req 12.2, 12.3 */}
        {onToggleExpand && (
          <button
            onClick={onToggleExpand}
            className="ml-4 p-2 text-text-secondary hover:text-text-primary transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary rounded"
            aria-label={
              isExpanded ? "Collapse anchor details" : "Expand anchor details"
            }
            aria-expanded={isExpanded}
          >
            <svg
              className={`w-5 h-5 transition-transform ${isExpanded ? "rotate-180" : ""}`}
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

      {/* Can I make it? button - Req 1.2 */}
      <button
        onClick={onRealityCheck}
      className="mt-3 w-full sm:w-auto px-4 py-2 text-sm font-medium rounded-lg border border-border text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-background"
      aria-label="Check if you can make this anchor"
    >
      Can I make it?
      </button>
    </div>
  );
}
