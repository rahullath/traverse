// State Filter Service
// Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 16.8, 16.9, 16.10, 23.5

import type {
  StateDeclaration,
  FilteredTimeline,
  UserState,
} from "@/types/triage";
import type { TimeBlock } from "@/types/daily-plan";

/**
 * Service for filtering timeline based on user's declared state
 * Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 16.8, 16.9, 16.10
 */
export class StateFilterService {
  /**
   * Filter timeline based on declared state
   * Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 16.8, 16.9, 16.10
   */
  filterTimeline(
    timeBlocks: TimeBlock[],
    state: StateDeclaration,
    currentTime: Date = new Date(),
  ): FilteredTimeline {
    switch (state.state) {
      case "starting_day":
        return this.filterStartingDay(timeBlocks, currentTime);

      case "ready_for_anchor":
        return this.filterReadyForAnchor(timeBlocks, currentTime);

      case "mid_chain":
        return this.filterMidChain(
          timeBlocks,
          state.selected_step_id,
          currentTime,
        );

      case "at_anchor":
        return this.filterAtAnchor(timeBlocks, currentTime);

      case "missed_it":
        return this.filterMissedIt(timeBlocks, currentTime);

      case "just_checking":
        return {
          visible_blocks: timeBlocks,
          hidden_blocks: [],
          filter_reason: "No filter applied",
        };

      default:
        return {
          visible_blocks: timeBlocks,
          hidden_blocks: [],
          filter_reason: "Unknown state",
        };
    }
  }

  /**
   * Filter for "Starting my day" state
   * Requirements: 16.3
   * Shows full activation chain from current time, marks all as pending
   */
  private filterStartingDay(
    timeBlocks: TimeBlock[],
    currentTime: Date,
  ): FilteredTimeline {
    const visible = timeBlocks.filter(
      (block) => block.startTime >= currentTime,
    );
    const hidden = timeBlocks.filter((block) => block.startTime < currentTime);

    // Mark all visible blocks as pending (non-mutating - create new objects)
    const visibleWithStatus = visible.map((block) => {
      const newStatus = block.status === "completed" ? "completed" : "pending";
      return {
        ...block,
        status: newStatus as "completed" | "pending",
      };
    });

    return {
      visible_blocks: visibleWithStatus,
      hidden_blocks: hidden,
      filter_reason: "Starting day - showing full chain from now",
    };
  }

  /**
   * Filter for "Ready for anchor" state
   * Requirements: 16.4, 16.10
   * Hides activation chain steps, shows only departure + anchor + recovery
   */
  private filterReadyForAnchor(
    timeBlocks: TimeBlock[],
    currentTime: Date,
  ): FilteredTimeline {
    // Find next anchor after current time
    const nextAnchor = timeBlocks.find(
      (block) =>
        block.metadata?.role?.type === "anchor" &&
        block.startTime > currentTime,
    );

    if (!nextAnchor) {
      return {
        visible_blocks: timeBlocks,
        hidden_blocks: [],
        filter_reason: "No upcoming anchor found",
      };
    }

    const anchorId = nextAnchor.activityId;

    const visible: TimeBlock[] = [];
    const hidden: TimeBlock[] = [];

    timeBlocks.forEach((block) => {
      // Show travel_there, anchor, travel_back, recovery for this anchor
      if (block.metadata?.anchor_id === anchorId) {
        const envelopeType = block.metadata?.commitment_envelope?.envelope_type;
        if (
          envelopeType === "travel_there" ||
          envelopeType === "anchor" ||
          envelopeType === "travel_back" ||
          envelopeType === "recovery"
        ) {
          visible.push(block);
        } else {
          hidden.push(block);
        }
      }
      // Show blocks after anchor
      else if (block.startTime > nextAnchor.endTime) {
        visible.push(block);
      }
      // Hide everything else
      else {
        hidden.push(block);
      }
    });

    return {
      visible_blocks: visible,
      hidden_blocks: hidden,
      filter_reason: "Ready for anchor - hiding activation chain",
    };
  }

  /**
   * Filter for "Mid-chain" state
   * Requirements: 16.5
   * Shows from selected step onward, marks prior steps as completed
   */
  private filterMidChain(
    timeBlocks: TimeBlock[],
    selectedStepId: string | undefined,
    currentTime: Date,
  ): FilteredTimeline {
    if (!selectedStepId) {
      // No step selected, fallback to starting_day
      return this.filterStartingDay(timeBlocks, currentTime);
    }

    const selectedIndex = timeBlocks.findIndex(
      (block) => block.metadata?.step_id === selectedStepId,
    );

    if (selectedIndex === -1) {
      return {
        visible_blocks: timeBlocks,
        hidden_blocks: [],
        filter_reason: "Selected step not found",
      };
    }

    // Visible blocks from selected step onward
    const visible = timeBlocks.slice(selectedIndex);

    // Hidden blocks before selected step, marked as completed
    const hidden = timeBlocks.slice(0, selectedIndex).map((block) => ({
      ...block,
      status: "completed" as const,
    }));

    return {
      visible_blocks: visible,
      hidden_blocks: hidden,
      filter_reason: "Mid-chain - showing from selected step",
    };
  }

  /**
   * Filter for "At anchor" state
   * Requirements: 16.6
   * Marks prep and travel_there as completed, shows anchor onward
   */
  private filterAtAnchor(
    timeBlocks: TimeBlock[],
    currentTime: Date,
  ): FilteredTimeline {
    // Find current anchor (user is at it now)
    const currentAnchor = timeBlocks.find(
      (block) =>
        block.metadata?.role?.type === "anchor" &&
        block.startTime <= currentTime &&
        block.endTime >= currentTime,
    );

    if (!currentAnchor) {
      return {
        visible_blocks: timeBlocks,
        hidden_blocks: [],
        filter_reason: "No current anchor found",
      };
    }

    const anchorId = currentAnchor.activityId;
    const visible: TimeBlock[] = [];
    const hidden: TimeBlock[] = [];

    timeBlocks.forEach((block) => {
      if (block.metadata?.anchor_id === anchorId) {
        const envelopeType = block.metadata?.commitment_envelope?.envelope_type;
        if (envelopeType === "prep" || envelopeType === "travel_there") {
          // Mark as completed and hide
          hidden.push({
            ...block,
            status: "completed",
          });
        } else {
          // Show anchor, travel_back, recovery
          visible.push(block);
        }
      } else if (block.startTime >= currentAnchor.startTime) {
        // Show blocks at or after anchor
        visible.push(block);
      } else {
        // Hide blocks before anchor
        hidden.push(block);
      }
    });

    return {
      visible_blocks: visible,
      hidden_blocks: hidden,
      filter_reason: "At anchor - prep and travel marked complete",
    };
  }

  /**
   * Filter for "Missed it" state
   * Requirements: 16.7
   * Marks anchor and all related steps as skipped
   */
  private filterMissedIt(
    timeBlocks: TimeBlock[],
    currentTime: Date,
  ): FilteredTimeline {
    // Find most recent anchor that was missed (ended before current time)
    const missedAnchor = timeBlocks
      .filter(
        (block) =>
          block.metadata?.role?.type === "anchor" &&
          block.endTime < currentTime,
      )
      .sort((a, b) => b.endTime.getTime() - a.endTime.getTime())[0];

    if (!missedAnchor) {
      return {
        visible_blocks: timeBlocks,
        hidden_blocks: [],
        filter_reason: "No missed anchor found",
      };
    }

    const anchorId = missedAnchor.activityId;
    const visible: TimeBlock[] = [];
    const hidden: TimeBlock[] = [];

    timeBlocks.forEach((block) => {
      if (block.metadata?.anchor_id === anchorId) {
        // Mark as skipped and hide
        hidden.push({
          ...block,
          status: "skipped",
          skipReason: "User declared missed",
        });
      } else if (block.startTime > missedAnchor.endTime) {
        // Show blocks after missed anchor
        visible.push(block);
      } else {
        // Hide blocks before missed anchor
        hidden.push(block);
      }
    });

    return {
      visible_blocks: visible,
      hidden_blocks: hidden,
      filter_reason: "Missed anchor - marked as skipped",
    };
  }

  /**
   * Check if state declaration prompt should be shown
   * Requirements: 16.1, 16.9, 23.5
   */
  shouldShowStatePrompt(
    lastDeclaration: StateDeclaration | null,
    timeBlocks: TimeBlock[],
    currentTime: Date = new Date(),
  ): boolean {
    // Don't show if declared within last 30 minutes
    if (lastDeclaration) {
      const minutesSinceDeclaration = Math.floor(
        (currentTime.getTime() - lastDeclaration.timestamp.getTime()) / 60000,
      );
      if (minutesSinceDeclaration < 30) {
        return false;
      }
    }

    // Show if current time is within 2 hours of any anchor
    const nearbyAnchors = timeBlocks.filter((block) => {
      if (block.metadata?.role?.type !== "anchor") return false;
      const minutesUntilAnchor = Math.floor(
        (block.startTime.getTime() - currentTime.getTime()) / 60000,
      );
      // Within 30 minutes past or 120 minutes future
      return minutesUntilAnchor >= -30 && minutesUntilAnchor <= 120;
    });

    return nearbyAnchors.length > 0;
  }
}
