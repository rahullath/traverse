// Time Physics Service
// Requirements: 1.1, 1.2, 1.4, 1.5

import type { TimeBlock } from "@/types/daily-plan";
import type { RunwayCalculation } from "@/types/triage";

/**
 * TimePhysicsService calculates runway and required duration for triage decisions.
 *
 * Runway: Time remaining between current moment and next anchor start time
 * Required Duration: Total time needed for all steps in a commitment envelope
 *
 * Requirements: 1.1, 1.2, 1.3, 1.4, 1.5
 */
export class TimePhysicsService {
  /**
   * Calculate runway for next anchor
   *
   * Requirements:
   * - 1.1: Calculate runway as (next_anchor_start_time - current_time)
   * - 1.2: Calculate required_duration as sum of envelope step durations
   * - 1.4: Return null for runway when no anchors exist
   * - 1.5: Recalculate on each page load (stateless)
   *
   * @param timeBlocks - Array of time blocks from daily plan
   * @param currentTime - Current time for calculation (defaults to now)
   * @returns RunwayCalculation with runway, required_duration, and metadata
   */
  calculateRunway(
    timeBlocks: TimeBlock[],
    currentTime: Date = new Date(),
  ): RunwayCalculation {
    const candidateAnchors = timeBlocks
      .filter((block) => block.metadata?.role?.type === "anchor")
      .map((anchor) => {
        const maxLateMinutes = Math.max(
          0,
          Number(anchor.metadata?.timing_signals?.max_late_minutes || 0),
        );
        const effectiveDeadlineIso =
          anchor.metadata?.timing_signals?.effective_arrival_deadline;
        const effectiveDeadline = effectiveDeadlineIso
          ? new Date(effectiveDeadlineIso)
          : new Date(anchor.startTime.getTime() + maxLateMinutes * 60_000);

        return {
          anchor,
          effectiveDeadline,
        };
      })
      .filter(
        ({ effectiveDeadline }) =>
          effectiveDeadline.getTime() > currentTime.getTime(),
      )
      .sort(
        (a, b) =>
          a.effectiveDeadline.getTime() - b.effectiveDeadline.getTime(),
      );

    if (candidateAnchors.length === 0) {
      return {
        runway: null,
        required_duration: null,
        next_anchor_id: null,
        next_anchor_start: null,
        current_time: currentTime,
        has_sufficient_time: true, // No anchors = no time pressure
      };
    }

    const { anchor: nextAnchor, effectiveDeadline } = candidateAnchors[0];
    const nextAnchorStart = new Date(nextAnchor.startTime);

    const runwayMinutes = Math.floor(
      (effectiveDeadline.getTime() - currentTime.getTime()) / 60_000,
    );

    const envelopeId = nextAnchor.metadata?.commitment_envelope?.envelope_id;
    const relatedBlocks = envelopeId
      ? timeBlocks.filter(
          (block) =>
            block.metadata?.commitment_envelope?.envelope_id === envelopeId,
        )
      : timeBlocks.filter(
          (block) =>
            block.metadata?.anchor_id ===
            (nextAnchor.activityId || nextAnchor.metadata?.anchor_id),
        );

    // Required duration is remaining prep + travel_there only.
    const requiredDuration = relatedBlocks
      .filter((block) => {
        const envelopeType = block.metadata?.commitment_envelope?.envelope_type;
        if (envelopeType !== "prep" && envelopeType !== "travel_there") {
          return false;
        }
        return (
          block.endTime.getTime() > currentTime.getTime() &&
          block.status !== "completed" &&
          block.status !== "skipped"
        );
      })
      .reduce((total, block) => {
        const remainingStart = Math.max(
          block.startTime.getTime(),
          currentTime.getTime(),
        );
        const remainingMinutes = Math.max(
          0,
          Math.floor((block.endTime.getTime() - remainingStart) / 60_000),
        );
        return total + remainingMinutes;
      }, 0);

    const hasSufficientTime = runwayMinutes >= requiredDuration;
    const nextAnchorId =
      nextAnchor.activityId || nextAnchor.metadata?.anchor_id || nextAnchor.id;

    return {
      runway: runwayMinutes,
      required_duration: requiredDuration,
      next_anchor_id: nextAnchorId,
      next_anchor_start: nextAnchorStart,
      current_time: currentTime,
      has_sufficient_time: hasSufficientTime,
    };
  }
}
