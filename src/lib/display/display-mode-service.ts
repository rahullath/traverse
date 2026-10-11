// src/lib/display/display-mode-service.ts
// Display Mode Service for Mirror V2
// Requirements: 9.2, 11.3, 11.4, 12.1, 12.2, 12.5, 13.1, 13.3

import type { TimeBlock } from "@/types/daily-plan";

/**
 * Display intent options for Mirror V2
 */
export type DisplayIntent =
  | "full_chain" // Show everything
  | "keystone_focus" // Show only keystone + anchor
  | "reality_check" // Show what's possible now
  | "anchor_only" // Just show the anchor
  | "rest_of_day"; // Skip current anchor, show what's next

/**
 * Display option for UI presentation
 */
export interface DisplayOption {
  id: DisplayIntent;
  label: string;
  description: string;
  available: boolean;
}

/**
 * Pivot option for passed anchor scenarios
 */
export interface PivotOption {
  id: string;
  label: string;
  description: string;
  action: DisplayIntent;
}

/**
 * DisplayModeService
 *
 * Manages display mode filtering and context-aware display options.
 * Replaces automatic triage with user-controlled display modes.
 *
 * Requirements: 9.2, 11.3, 11.4, 12.1, 12.2, 12.5, 13.1, 13.3
 */
export class DisplayModeService {
  /**
   * Get available display options based on current context
   * Requirements: 11.3, 11.4
   */
  getDisplayOptions(
    timeBlocks: TimeBlock[],
    currentTime: Date,
  ): DisplayOption[] {
    const hasAnchors = this.hasAnchorBlocks(timeBlocks);
    const hasKeystone = this.hasKeystoneBlock(timeBlocks);
    const nextAnchor = this.getNextAnchor(timeBlocks, currentTime);

    return [
      {
        id: "full_chain",
        label: "Full morning chain",
        description: "See everything in your plan",
        available: true,
      },
      {
        id: "keystone_focus",
        label: "Just keystone + anchor",
        description: "Focus on the essential activation step",
        available: hasKeystone && hasAnchors,
      },
      {
        id: "reality_check",
        label: "Check if I can make it",
        description: "See what's possible given current time",
        available: nextAnchor !== null,
      },
      {
        id: "anchor_only",
        label: "Just show anchors",
        description: "See only your commitments",
        available: hasAnchors,
      },
      {
        id: "rest_of_day",
        label: "Rest of day",
        description: "Show remaining activities",
        available: true,
      },
    ];
  }

  /**
   * Apply display mode filter to timeline
   * Requirements: 9.2, 11.4, 12.1, 12.2
   */
  applyDisplayMode(
    timeBlocks: TimeBlock[],
    mode: DisplayIntent,
    keystoneId?: string,
  ): TimeBlock[] {
    switch (mode) {
      case "full_chain":
        return timeBlocks;

      case "keystone_focus":
        // Show only keystone and anchor blocks (Req 9.2)
        return timeBlocks.filter(
          (block) =>
            block.id === keystoneId || block.metadata?.role?.type === "anchor",
        );

      case "anchor_only":
        // Show only anchor blocks
        return timeBlocks.filter(
          (block) => block.metadata?.role?.type === "anchor",
        );

      case "rest_of_day":
        // Show all blocks after current time
        const now = new Date();
        return timeBlocks.filter((block) => new Date(block.startTime) > now);

      case "reality_check":
        // Reality check filtering is handled by RealityCheckService
        // This mode just returns all blocks for now
        return timeBlocks;

      default:
        return timeBlocks;
    }
  }

  /**
   * Identify next anchor for multi-anchor scenarios
   * Requirements: 12.5
   */
  getNextAnchor(timeBlocks: TimeBlock[], currentTime: Date): TimeBlock | null {
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

    return futureAnchors[0] || null;
  }

  /**
   * Check if anchor has passed
   * Requirements: 13.1
   */
  hasAnchorPassed(anchor: TimeBlock, currentTime: Date): boolean {
    return currentTime > new Date(anchor.startTime);
  }

  /**
   * Get pivot options for passed anchor scenarios
   * Requirements: 13.3, 13.5, 13.6
   */
  getPivotOptions(
    timeBlocks: TimeBlock[],
    passedAnchor: TimeBlock,
    currentTime: Date,
  ): PivotOption[] {
    const nextAnchor = this.getNextAnchor(timeBlocks, currentTime);
    const hasMoreAnchors = nextAnchor !== null;

    const options: PivotOption[] = [
      {
        id: "rest_of_day",
        label: "Show rest of day",
        description: "See remaining activities and anchors",
        action: "rest_of_day",
      },
    ];

    if (hasMoreAnchors) {
      options.push({
        id: "next_anchor",
        label: "Just show next anchor",
        description: "Focus on your next commitment",
        action: "anchor_only",
      });
    }

    options.push({
      id: "done_for_today",
      label: "Done for today",
      description: "Close the mirror view",
      action: "full_chain", // This will be handled by dismissing the UI
    });

    return options;
  }

  /**
   * Check if timeline has anchor blocks
   */
  private hasAnchorBlocks(timeBlocks: TimeBlock[]): boolean {
    return timeBlocks.some((block) => block.metadata?.role?.type === "anchor");
  }

  /**
   * Check if timeline has keystone block
   */
  private hasKeystoneBlock(timeBlocks: TimeBlock[]): boolean {
    // Keystone is typically identified by triage service
    // For now, check if any block has keystone metadata
    return timeBlocks.some(
      (block) =>
        block.metadata?.triage?.is_keystone === true ||
        block.activityName.toLowerCase().includes("shower") ||
        block.activityName.toLowerCase().includes("meds"),
    );
  }

  /**
   * Find keystone block ID
   */
  findKeystoneId(timeBlocks: TimeBlock[]): string | null {
    const keystone = timeBlocks.find(
      (block) =>
        block.metadata?.triage?.is_keystone === true ||
        block.activityName.toLowerCase().includes("shower") ||
        block.activityName.toLowerCase().includes("meds"),
    );
    return keystone?.id || null;
  }

  /**
   * Get blocks for specific anchor's chain
   * Requirements: 12.1, 12.2
   */
  getAnchorChain(timeBlocks: TimeBlock[], anchorId: string): TimeBlock[] {
    const anchor = timeBlocks.find((block) => block.id === anchorId);
    if (!anchor) return [];

    const envelopeId = anchor.metadata?.commitment_envelope?.envelope_id;
    if (!envelopeId) return [anchor];

    // Return all blocks in the same commitment envelope
    return timeBlocks.filter(
      (block) =>
        block.metadata?.commitment_envelope?.envelope_id === envelopeId,
    );
  }

  /**
   * Check if current time is within departure window (10 minutes before travel_there)
   * Requirements: 19.1, 19.2
   */
  isWithinDepartureWindow(departureTime: Date, currentTime: Date): boolean {
    const diff = new Date(departureTime).getTime() - currentTime.getTime();
    const minutesUntilDeparture = Math.floor(diff / 60000);
    return minutesUntilDeparture >= 0 && minutesUntilDeparture <= 10;
  }
}
