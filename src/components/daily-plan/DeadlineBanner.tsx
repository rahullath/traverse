import React, { useMemo } from "react";
import type { TimeBlock } from "@/types/daily-plan";

export interface DeadlineBannerProps {
  /** Time blocks in the commitment envelope */
  envelopeBlocks: TimeBlock[];
  /** Current time for calculating time remaining */
  currentTime?: Date;
  /** Whether the banner should be sticky */
  sticky?: boolean;
}

/**
 * DeadlineBanner Component
 *
 * Displays a prominent "Complete by [TIME]" banner for commitment envelopes.
 * Calculates deadline from the last prep/activation step before travel_there.
 * Changes color to warning when past deadline.
 *
 * Requirements: 21.1, 21.2, 21.3, 21.4, 21.5
 */
export function DeadlineBanner({
  envelopeBlocks,
  currentTime = new Date(),
  sticky = false,
}: DeadlineBannerProps) {
  const deadlineInfo = useMemo(() => {
    // Find the last prep/activation step before travel_there
    // Requirements: 21.1
    const prepBlocks = envelopeBlocks.filter(
      (block) => block.metadata?.commitment_envelope?.envelope_type === "prep",
    );

    if (prepBlocks.length === 0) {
      return null;
    }

    // Sort by end time and get the last one
    const sortedPrepBlocks = [...prepBlocks].sort(
      (a, b) => b.endTime.getTime() - a.endTime.getTime(),
    );
    const lastPrepBlock = sortedPrepBlocks[0];

    const deadlineTime = lastPrepBlock.endTime;
    const timeRemainingMs = deadlineTime.getTime() - currentTime.getTime();
    const timeRemainingMinutes = Math.floor(timeRemainingMs / 60000);

    // Check if past deadline
    // Requirements: 21.3, 21.5
    const isPastDeadline = timeRemainingMinutes < 0;

    return {
      deadlineTime,
      timeRemainingMinutes,
      isPastDeadline,
    };
  }, [envelopeBlocks, currentTime]);

  if (!deadlineInfo) {
    return null;
  }

  const { deadlineTime, timeRemainingMinutes, isPastDeadline } = deadlineInfo;

  // Format deadline time
  // Requirements: 21.2
  const formattedTime = deadlineTime.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  // Format time remaining in human-readable format
  // Requirements: 21.4
  const formatTimeRemaining = (minutes: number): string => {
    const absMinutes = Math.abs(minutes);

    if (absMinutes < 60) {
      return `${absMinutes} min${absMinutes !== 1 ? "s" : ""}`;
    }

    const hours = Math.floor(absMinutes / 60);
    const remainingMinutes = absMinutes % 60;

    if (remainingMinutes === 0) {
      return `${hours} hr${hours !== 1 ? "s" : ""}`;
    }

    return `${hours} hr${hours !== 1 ? "s" : ""} ${remainingMinutes} min${remainingMinutes !== 1 ? "s" : ""}`;
  };

  const timeRemainingText = isPastDeadline
    ? `Started ${formatTimeRemaining(timeRemainingMinutes)} ago`
    : `${formatTimeRemaining(timeRemainingMinutes)} left`;

  // Determine color based on deadline status
  // Requirements: 21.3, 21.5
  const colorClasses = isPastDeadline
    ? "bg-warning/10 border-warning text-warning"
    : "bg-surface border-border text-text-secondary";

  // Apply sticky positioning when approaching deadline
  // Requirements: 21.4
  const positionClasses = sticky ? "sticky top-0 z-10" : "";

  return (
    <div
      className={`
        ${positionClasses}
        ${colorClasses}
        border-l-4 px-4 py-3 mb-2 rounded-r-lg
        transition-colors duration-300
      `}
      role="status"
      aria-live="polite"
    >
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          {isPastDeadline && (
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          )}
          <span className="font-medium">Complete by {formattedTime}</span>
        </div>
        <span className="text-sm font-semibold">{timeRemainingText}</span>
      </div>
    </div>
  );
}
