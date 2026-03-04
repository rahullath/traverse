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
    // Find next anchor after current time
    // Requirement 1.1: Identify next anchor
    const futureAnchors = timeBlocks
      .filter(
        (block) =>
          block.metadata?.role?.type === "anchor" &&
          new Date(block.startTime) > currentTime,
      )
      .sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      );

    // Requirement 1.4: Handle null cases (no future anchors)
    if (futureAnchors.length === 0) {
      return {
        runway: null,
        required_duration: null,
        next_anchor_id: null,
        next_anchor_start: null,
        current_time: currentTime,
        has_sufficient_time: true, // No anchors = no time pressure
      };
    }

    const nextAnchor = futureAnchors[0];
    const nextAnchorStart = new Date(nextAnchor.startTime);

    // Requirement 1.1: Calculate runway as (next_anchor_start - current_time) in minutes
    const runwayMinutes = Math.floor(
      (nextAnchorStart.getTime() - currentTime.getTime()) / 60000,
    );

    // Requirement 1.2: Calculate required duration from commitment envelope
    // Find all blocks that are part of the commitment envelope for this anchor
    const anchorId = nextAnchor.activityId || nextAnchor.id;
    const envelopeBlocks = timeBlocks.filter((block) => {
      // Include blocks that are part of this anchor's commitment envelope
      // and occur before the anchor start time
      const isPartOfEnvelope =
        block.metadata?.anchor_id === anchorId ||
        block.metadata?.commitment_envelope?.envelope_id === anchorId;
      const isBeforeAnchor = new Date(block.startTime) < nextAnchorStart;

      return isPartOfEnvelope && isBeforeAnchor;
    });

    // Sum durations of all envelope steps (prep + travel_there)
    const requiredDuration = envelopeBlocks.reduce((total, block) => {
      const blockStart = new Date(block.startTime);
      const blockEnd = new Date(block.endTime);
      const duration = Math.floor(
        (blockEnd.getTime() - blockStart.getTime()) / 60000,
      );
      return total + duration;
    }, 0);

    // Determine if user has sufficient time
    const hasSufficientTime = runwayMinutes >= requiredDuration;

    return {
      runway: runwayMinutes,
      required_duration: requiredDuration,
      next_anchor_id: anchorId,
      next_anchor_start: nextAnchorStart,
      current_time: currentTime,
      has_sufficient_time: hasSufficientTime,
    };
  }
}
