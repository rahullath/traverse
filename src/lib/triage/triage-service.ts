// Triage Service
// Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 10.1, 10.2, 10.3, 10.4, 10.5

import type { TimeBlock } from "@/types/daily-plan";
import type {
  RunwayCalculation,
  TriageState,
  TriageOption,
  TriageMode,
} from "@/types/triage";

/**
 * Service for managing triage mode activation and keystone identification
 *
 * Triage mode activates when available runway is insufficient for planned activities.
 * The service identifies the most critical activity (keystone) to protect during triage.
 */
export class TriageService {
  /**
   * Determine if triage mode should activate
   *
   * Requirements: 2.1, 2.2, 2.5
   *
   * Triage activates when:
   * - Runway is not null (there are future anchors)
   * - Required duration is not null (commitment envelope exists)
   * - Runway < required_duration (insufficient time)
   *
   * @param runway - Runway calculation result
   * @returns true if triage should activate, false otherwise
   */
  shouldActivateTriage(runway: RunwayCalculation): boolean {
    // Requirement 2.5: When no commitment envelope exists, triage shall not activate
    if (runway.runway === null || runway.required_duration === null) {
      return false;
    }

    // Requirement 2.1: Triage activates when runway < required_duration
    // Requirement 2.2: Triage remains inactive when runway >= required_duration
    return runway.runway < runway.required_duration;
  }

  /**
   * Identify the keystone activity for triage
   *
   * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
   *
   * Keystone identification logic:
   * - For class/seminar anchors: keystone is the anchor itself
   * - For appointment anchors: keystone is prep if >15min, otherwise anchor
   * - Priority order: anchor > prep (if >15min) > recovery
   *
   * @param timeBlocks - All time blocks in the plan
   * @param anchorId - ID of the anchor to find keystone for
   * @returns The keystone activity block, or null if not found
   */
  identifyKeystoneActivity(
    timeBlocks: TimeBlock[],
    anchorId: string,
  ): TimeBlock | null {
    // Find the anchor block
    const anchor = timeBlocks.find(
      (block) =>
        block.activityId === anchorId &&
        block.metadata?.role?.type === "anchor",
    );

    if (!anchor) {
      return null;
    }

    // Get the original anchor type from metadata
    const anchorType = anchor.metadata?.original_anchor_type || "other";

    // Requirement 10.2: For class/seminar, keystone is the anchor itself
    if (anchorType === "class" || anchorType === "seminar") {
      return anchor;
    }

    // Requirement 10.3: For appointments, check prep duration
    if (anchorType === "appointment") {
      // Find the prep block in the commitment envelope
      const prepBlock = timeBlocks.find(
        (block) =>
          block.metadata?.anchor_id === anchorId &&
          block.metadata?.commitment_envelope?.envelope_type === "prep",
      );

      if (prepBlock) {
        // Calculate prep duration in minutes
        const prepDuration = Math.floor(
          (prepBlock.endTime.getTime() - prepBlock.startTime.getTime()) / 60000,
        );

        // If prep > 15 minutes, it's the keystone
        if (prepDuration > 15) {
          return prepBlock;
        }
      }
    }

    // Requirement 10.5: Default to anchor when envelope has only anchor remaining
    // or when prep is <= 15 minutes
    return anchor;
  }

  /**
   * Get complete triage state for UI
   *
   * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 10.1, 10.2, 10.3, 10.4, 10.5
   *
   * @param timeBlocks - All time blocks in the plan
   * @param runway - Runway calculation result
   * @returns Complete triage state with options
   */
  getTriageState(
    timeBlocks: TimeBlock[],
    runway: RunwayCalculation,
  ): TriageState {
    // Check if triage should activate
    if (!this.shouldActivateTriage(runway)) {
      return {
        active: false,
        keystone_activity: null,
        anchor: null,
        options: [],
      };
    }

    // Find the anchor block
    const anchor = timeBlocks.find(
      (block) =>
        block.activityId === runway.next_anchor_id &&
        block.metadata?.role?.type === "anchor",
    );

    // Identify keystone activity
    const keystoneActivity = runway.next_anchor_id
      ? this.identifyKeystoneActivity(timeBlocks, runway.next_anchor_id)
      : null;

    // Requirement 2.3: Triage prompt presents three options
    const options: TriageOption[] = [
      {
        id: "protect_keystone" as TriageMode,
        label: "Protect Keystone",
        description: `Keep only ${keystoneActivity?.activityName || "essential activity"} and anchor`,
      },
      {
        id: "skip_anchor" as TriageMode,
        label: "Skip Anchor",
        description: "Mark anchor as skipped and remove from timeline",
      },
      {
        id: "recalculate" as TriageMode,
        label: "Recalculate",
        description: "Generate fresh plan from current time",
      },
    ];

    return {
      active: true,
      keystone_activity: keystoneActivity,
      anchor: anchor || null,
      options,
    };
  }
}
