// Reality Check Service
// Requirements: 7.2, 7.4

import type { TimeBlock } from "@/types/daily-plan";
import { TriageService } from "@/lib/triage/triage-service";

/**
 * Reality check result showing what's possible given current time
 */
export interface RealityCheckResult {
  possibleSteps: TimeBlock[];
  skippedSteps: TimeBlock[];
  canMakeAnchor: boolean;
  alternatives: RealityCheckAlternative[];
  runway: number;
  requiredDuration: number;
}

/**
 * Alternative simplified option for reality check
 */
export interface RealityCheckAlternative {
  id: string;
  label: string;
  description: string;
  steps: TimeBlock[];
  estimatedDuration: number;
}

/**
 * Service for user-initiated reality check calculations
 *
 * Provides neutral assessment of what activities are possible given current time,
 * without judgment language or automatic warnings.
 */
export class RealityCheckService {
  private triageService: TriageService;

  constructor() {
    this.triageService = new TriageService();
  }

  /**
   * Calculate which chain steps fit within available runway
   *
   * Requirements: 7.2
   *
   * @param timeBlocks - All time blocks in the plan
   * @param runway - Minutes until next anchor
   * @param nextAnchor - The next anchor block
   * @param currentTime - Current time for calculations
   * @returns Reality check result with possible and skipped steps
   */
  calculatePossibleSteps(
    timeBlocks: TimeBlock[],
    runway: number,
    nextAnchor: TimeBlock,
    currentTime: Date,
  ): RealityCheckResult {
    // Get all chain blocks for this anchor (before the anchor time)
    const chainBlocks = timeBlocks.filter(
      (block) =>
        block.startTime < nextAnchor.startTime &&
        block.metadata?.anchor_id === nextAnchor.activityId &&
        block.startTime >= currentTime,
    );

    // Calculate duration for each block
    const blocksWithDuration = chainBlocks.map((block) => ({
      block,
      duration: Math.floor(
        (block.endTime.getTime() - block.startTime.getTime()) / 60000,
      ),
    }));

    // Sort by start time (earliest first)
    blocksWithDuration.sort(
      (a, b) => a.block.startTime.getTime() - b.block.startTime.getTime(),
    );

    // Calculate total required duration
    const requiredDuration = blocksWithDuration.reduce(
      (sum, { duration }) => sum + duration,
      0,
    );

    let accumulatedDuration = 0;
    const possibleSteps: TimeBlock[] = [];
    const skippedSteps: TimeBlock[] = [];

    // Determine which steps fit within runway
    for (const { block, duration } of blocksWithDuration) {
      if (accumulatedDuration + duration <= runway) {
        possibleSteps.push(block);
        accumulatedDuration += duration;
      } else {
        skippedSteps.push(block);
      }
    }

    // Generate alternatives
    const keystoneId = this.findKeystoneId(timeBlocks, nextAnchor.activityId);
    const alternatives = this.generateAlternatives(
      timeBlocks,
      runway,
      keystoneId,
      nextAnchor,
    );

    return {
      possibleSteps,
      skippedSteps,
      canMakeAnchor: accumulatedDuration <= runway,
      alternatives,
      runway,
      requiredDuration,
    };
  }

  /**
   * Generate alternative simplified options
   *
   * Requirements: 7.4
   *
   * @param timeBlocks - All time blocks in the plan
   * @param runway - Minutes until next anchor
   * @param keystoneId - ID of the keystone block
   * @param nextAnchor - The next anchor block
   * @returns Array of alternative options
   */
  generateAlternatives(
    timeBlocks: TimeBlock[],
    runway: number,
    keystoneId: string | null,
    nextAnchor: TimeBlock,
  ): RealityCheckAlternative[] {
    const alternatives: RealityCheckAlternative[] = [];

    // Option 1: Keystone only
    if (keystoneId) {
      const keystoneBlock = timeBlocks.find((b) => b.id === keystoneId);
      if (keystoneBlock) {
        const keystoneDuration = Math.floor(
          (keystoneBlock.endTime.getTime() -
            keystoneBlock.startTime.getTime()) /
            60000,
        );

        if (keystoneDuration <= runway) {
          alternatives.push({
            id: "keystone_only",
            label: "Just do keystone",
            description: `Quick ${keystoneBlock.activityName} and go`,
            steps: [keystoneBlock],
            estimatedDuration: keystoneDuration,
          });
        }
      }
    }

    // Option 2: Skip everything, just go
    alternatives.push({
      id: "skip_all",
      label: "Skip prep, just go",
      description: "Head straight to anchor",
      steps: [],
      estimatedDuration: 0,
    });

    // Option 3: Show everything anyway
    const allChainBlocks = timeBlocks.filter(
      (block) =>
        block.startTime < nextAnchor.startTime &&
        block.metadata?.anchor_id === nextAnchor.activityId,
    );

    const totalDuration = allChainBlocks.reduce((sum, block) => {
      const duration = Math.floor(
        (block.endTime.getTime() - block.startTime.getTime()) / 60000,
      );
      return sum + duration;
    }, 0);

    alternatives.push({
      id: "show_all",
      label: "Show me everything anyway",
      description: "See full chain regardless of time",
      steps: allChainBlocks,
      estimatedDuration: totalDuration,
    });

    return alternatives;
  }

  /**
   * Format reality check result in neutral language
   *
   * Requirements: 7.3, 7.5
   *
   * Never uses judgment terms: "late", "behind", "missed", "failed", "should have started"
   *
   * @param result - Reality check result
   * @returns Neutral language description
   */
  formatRealityCheck(result: RealityCheckResult): string {
    if (result.possibleSteps.length === 0) {
      return "You have time to head straight to your anchor.";
    }

    const stepNames = result.possibleSteps
      .map((step) => step.activityName)
      .join(", ");

    return `You have time for: ${stepNames}`;
  }

  /**
   * Find keystone activity ID for an anchor
   *
   * @param timeBlocks - All time blocks
   * @param anchorId - Anchor activity ID
   * @returns Keystone block ID or null
   */
  private findKeystoneId(
    timeBlocks: TimeBlock[],
    anchorId: string,
  ): string | null {
    const keystoneBlock = this.triageService.identifyKeystoneActivity(
      timeBlocks,
      anchorId,
    );
    return keystoneBlock?.id || null;
  }
}
