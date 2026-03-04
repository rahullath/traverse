import React from "react";
import type { TimeBlock } from "../../types/daily-plan";

interface StartTimeLabelProps {
  envelopeBlocks: TimeBlock[];
  currentTime?: Date;
}

/**
 * StartTimeLabel Component
 *
 * Displays "Start at [time]" label above commitment envelopes.
 * Shows when the user should begin the first step of the envelope.
 *
 * Requirements: 22.1, 22.2, 22.3, 22.4, 22.5
 */
export default function StartTimeLabel({
  envelopeBlocks,
  currentTime = new Date(),
}: StartTimeLabelProps) {
  // Calculate start time from first step in commitment envelope (Requirement 22.2)
  const sortedBlocks = [...envelopeBlocks].sort(
    (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
  );

  if (sortedBlocks.length === 0) {
    return null;
  }

  const firstBlock = sortedBlocks[0];
  const startTime = new Date(firstBlock.startTime);
  const now = new Date(currentTime);

  // Format time for display (Requirement 22.1)
  const formatTime = (date: Date): string => {
    return date.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Calculate time difference for countdown/late display (Requirements 22.3, 22.4)
  const diffMinutes = Math.floor((startTime.getTime() - now.getTime()) / 60000);

  let timeStatus = "";
  if (diffMinutes > 0) {
    // Before start time - show countdown (Requirement 22.3)
    if (diffMinutes < 60) {
      timeStatus = ` (Start in ${diffMinutes}m)`;
    } else {
      const hours = Math.floor(diffMinutes / 60);
      const mins = diffMinutes % 60;
      timeStatus =
        mins > 0 ? ` (Start in ${hours}h ${mins}m)` : ` (Start in ${hours}h)`;
    }
  } else if (diffMinutes < 0) {
    // After start time - show how late (Requirement 22.4)
    const lateMinutes = Math.abs(diffMinutes);
    if (lateMinutes < 60) {
      timeStatus = ` (Started ${lateMinutes}m ago)`;
    } else {
      const hours = Math.floor(lateMinutes / 60);
      const mins = lateMinutes % 60;
      timeStatus =
        mins > 0
          ? ` (Started ${hours}h ${mins}m ago)`
          : ` (Started ${hours}h ago)`;
    }
  }

  // Render label with text-text-secondary styling (Requirement 22.5)
  return (
    <div className="mb-2 px-4">
      <div className="flex items-center text-sm text-text-secondary">
        <svg
          className="w-4 h-4 mr-2"
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
          Start at {formatTime(startTime)}
          {timeStatus && <span className="font-medium">{timeStatus}</span>}
        </span>
      </div>
    </div>
  );
}
