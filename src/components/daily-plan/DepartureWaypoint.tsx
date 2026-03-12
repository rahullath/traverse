// src/components/daily-plan/DepartureWaypoint.tsx
import React from "react";
import type { TimeBlock } from "@/types/daily-plan";

export interface DepartureWaypointProps {
  departureTime: Date;
  currentTime: Date;
  anchor: TimeBlock;
  travelDuration: number;
}

/**
 * DepartureWaypoint - Prominent departure time display
 *
 * Requirements: 6.2, 6.3, 6.4, 6.5, 19.1, 19.2, 19.3, 19.4, 19.5
 *
 * Displays "Leave by [time]" prominently with both clock time and countdown.
 * Uses neutral styling when > 10 minutes away, applies gentle highlight when
 * within 10 minutes. Never uses red, orange, yellow, or alarm colors.
 */
export function DepartureWaypoint({
  departureTime,
  currentTime,
  anchor,
  travelDuration,
}: DepartureWaypointProps) {
  const toSafeDate = (value: unknown): Date | null => {
    if (value instanceof Date) {
      return Number.isNaN(value.getTime()) ? null : value;
    }
    if (typeof value === "string" || typeof value === "number") {
      const parsed = new Date(value);
      return Number.isNaN(parsed.getTime()) ? null : parsed;
    }
    return null;
  };

  const departureAt = toSafeDate(departureTime);
  const currentAt = toSafeDate(currentTime);
  const anchorStartAt = toSafeDate(anchor.startTime);

  const timing = anchor.metadata?.timing_signals;
  const effectiveDeadline =
    toSafeDate(timing?.effective_arrival_deadline) || anchorStartAt;
  const selectedSlot = timing?.selected_departure_slot;
  const nextFeasibleSlot = timing?.next_feasible_departure_slot;

  // Calculate time until departure in minutes
  const minutesUntilDeparture =
    departureAt && currentAt
      ? Math.max(
          0,
          (departureAt.getTime() - currentAt.getTime()) / (1000 * 60),
        )
      : 0;

  // Determine if gentle highlight should be applied (Req 19.1, 19.2)
  const isWithin10Minutes =
    minutesUntilDeparture <= 10 && minutesUntilDeparture > 0;

  // Format departure time (Req 6.2)
  const formatDepartureTime = (date: unknown): string => {
    const parsed = toSafeDate(date);
    if (!parsed) {
      return "--:--";
    }

    return parsed.toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Format countdown (Req 6.3)
  const formatCountdown = (minutes: number): string => {
    if (minutes <= 0) {
      return "(departure time has passed)";
    }

    const hours = Math.floor(minutes / 60);
    const mins = Math.round(minutes % 60);

    if (hours === 0) {
      return `(in ${mins} minute${mins !== 1 ? "s" : ""})`;
    }

    if (mins === 0) {
      return `(in ${hours} hour${hours !== 1 ? "s" : ""})`;
    }

    return `(in ${hours}h ${mins}m)`;
  };

  // Gentle highlight styling (Req 19.3)
  // Uses font-weight 600 or 2px border with accent color at 40% opacity
  const highlightClasses = isWithin10Minutes
    ? "font-semibold border-2 border-accent-primary/40"
    : "border border-border";

  return (
    <div
      role="region"
      aria-label="Departure waypoint"
      className={`mb-4 p-4 bg-surface-primary rounded-lg transition-all ${highlightClasses}`}
    >
      {/* Mobile-first layout - Task 13.3 */}
      <div className="flex flex-col gap-3">
        {/* Leave by [time] - Req 6.2, 6.4 - Mobile optimized */}
        <div className="flex flex-col gap-1">
          <span className="text-xs text-text-muted uppercase tracking-wide">
            Leave by
          </span>
          <span className="text-3xl font-semibold text-text-primary leading-none">
            {formatDepartureTime(departureAt)}
          </span>
        </div>

        {/* Countdown - Req 6.3 */}
        <p className="text-base text-text-secondary" aria-live="polite">
          {formatCountdown(minutesUntilDeparture)}
        </p>

        {/* Destination context - Mobile: Collapsible details */}
        <details className="group">
          <summary className="text-sm text-text-muted cursor-pointer hover:text-text-primary transition-colors list-none flex items-center gap-2 touch-manipulation py-2">
            <svg
              className="w-4 h-4 transition-transform group-open:rotate-90"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9 5l7 7-7 7"
              />
            </svg>
            <span>Travel details</span>
          </summary>
          <div className="mt-2 pl-6 text-sm text-text-muted space-y-2">
            <div className="flex flex-col gap-1">
              <span className="text-xs text-text-muted">Travel to</span>
              <span className="text-text-secondary break-words">{anchor.activityName}</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xs text-text-muted shrink-0">Travel time:</span>
              <span className="text-text-secondary">{travelDuration} min</span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xs text-text-muted shrink-0">Anchor starts:</span>
              <span className="text-text-secondary">
                {formatDepartureTime(anchorStartAt)}
              </span>
            </div>
            <div className="flex items-baseline gap-2">
              <span className="text-xs text-text-muted shrink-0">Latest arrival:</span>
              <span className="text-text-secondary">
                {formatDepartureTime(effectiveDeadline)}
              </span>
            </div>
            {selectedSlot && (
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-text-muted shrink-0">Slot used:</span>
                <span className="text-text-secondary">{selectedSlot}</span>
              </div>
            )}
            {nextFeasibleSlot && (
              <div className="flex items-baseline gap-2">
                <span className="text-xs text-text-muted shrink-0">Next feasible slot:</span>
                <span className="text-text-secondary">{nextFeasibleSlot}</span>
              </div>
            )}
          </div>
        </details>
      </div>

      {/* Visual hierarchy note: This component uses larger text (text-3xl) than 
          chain steps (text-lg), but smaller than anchor time display (text-xl on mobile).
          Req 6.4: Anchor time (largest) → Departure time (prominent) → Chain steps (smaller) */}
    </div>
  );
}
