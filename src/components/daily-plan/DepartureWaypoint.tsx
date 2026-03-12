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
      className={`mb-3 sm:mb-4 p-3 sm:p-4 bg-surface-primary rounded-lg transition-all ${highlightClasses}`}
    >
      {/* Leave by [time] - Req 6.2, 6.4 */}
      <div className="flex items-baseline gap-2 mb-1">
        <span className="text-sm sm:text-sm text-text-muted uppercase tracking-wide">
          Leave by
        </span>
        <span className="text-2xl sm:text-2xl font-semibold text-text-primary">
          {formatDepartureTime(departureAt)}
        </span>
      </div>

      {/* Countdown - Req 6.3 */}
      <p className="text-sm sm:text-base text-text-secondary mb-2" aria-live="polite">
        {formatCountdown(minutesUntilDeparture)}
      </p>

      {/* Destination context */}
      <div className="text-xs sm:text-sm text-text-muted space-y-1">
        <p>
          Travel to:{" "}
          <span className="text-text-secondary">{anchor.activityName}</span>
        </p>
        <p>
          Travel time:{" "}
          <span className="text-text-secondary">{travelDuration} min</span>
        </p>
        <p>
          Anchor starts:{" "}
          <span className="text-text-secondary">
            {formatDepartureTime(anchorStartAt)}
          </span>
        </p>
        <p>
          Latest arrival:{" "}
          <span className="text-text-secondary">
            {formatDepartureTime(effectiveDeadline)}
          </span>
        </p>
        {selectedSlot && (
          <p>
            Slot used: <span className="text-text-secondary">{selectedSlot}</span>
          </p>
        )}
        {nextFeasibleSlot && (
          <p>
            Next feasible slot:{" "}
            <span className="text-text-secondary">{nextFeasibleSlot}</span>
          </p>
        )}
      </div>

      {/* Visual hierarchy note: This component uses larger text (text-2xl) than 
          chain steps (text-base), but smaller than anchor time display (text-3xl).
          Req 6.4: Anchor time (largest) → Departure time (prominent) → Chain steps (smaller) */}
    </div>
  );
}
