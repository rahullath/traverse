// Reality Check Service
// Calculates what's possible given current time and next anchor
// Philosophy: Neutral assessment, no warnings, just options

import type { TimeBlock } from '@/types/daily-plan';

export interface RealityCheckResult {
  canMakeIt: boolean;
  possibleSteps: TimeBlock[];
  skippableSteps: TimeBlock[];
  departureTime: Date | null;
  minutesAvailable: number;
}

export class RealityCheckService {
  /**
   * Calculate what's possible given current time and next anchor
   * Returns neutral assessment without judgment
   */
  calculateRealityCheck(
    timeBlocks: TimeBlock[],
    anchorId: string,
    currentTime: Date = new Date()
  ): RealityCheckResult {
    // Find the anchor
    const anchor = timeBlocks.find(
      (block) =>
        block.activityId === anchorId &&
        block.metadata?.role?.type === 'anchor'
    );

    if (!anchor) {
      return {
        canMakeIt: false,
        possibleSteps: [],
        skippableSteps: [],
        departureTime: null,
        minutesAvailable: 0,
      };
    }

    // Find all blocks in the commitment envelope before the anchor
    const envelopeBlocks = timeBlocks
      .filter(
        (block) =>
          block.metadata?.anchor_id === anchorId &&
          block.startTime < anchor.startTime
      )
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    // Find departure time (first travel_there block)
    const travelBlock = envelopeBlocks.find(
      (block) =>
        block.metadata?.commitment_envelope?.envelope_type === 'travel_there'
    );

    const departureTime = travelBlock?.startTime || anchor.startTime;

    // Calculate minutes available until departure
    const minutesAvailable = Math.floor(
      (departureTime.getTime() - currentTime.getTime()) / 60000
    );

    // If already past departure, can't make it with full chain
    if (minutesAvailable <= 0) {
      return {
        canMakeIt: false,
        possibleSteps: [],
        skippableSteps: envelopeBlocks,
        departureTime,
        minutesAvailable: Math.max(0, minutesAvailable),
      };
    }

    // Calculate which steps fit in available time
    const { possibleSteps, skippableSteps } = this.fitStepsInTime(
      envelopeBlocks,
      minutesAvailable,
      currentTime
    );

    // Can make it if all essential steps fit
    const canMakeIt = this.hasEssentialSteps(possibleSteps, envelopeBlocks);

    return {
      canMakeIt,
      possibleSteps,
      skippableSteps,
      departureTime,
      minutesAvailable,
    };
  }

  /**
   * Determine which steps fit in available time
   * Prioritizes keystone activities
   */
  private fitStepsInTime(
    blocks: TimeBlock[],
    minutesAvailable: number,
    currentTime: Date
  ): { possibleSteps: TimeBlock[]; skippableSteps: TimeBlock[] } {
    const possibleSteps: TimeBlock[] = [];
    const skippableSteps: TimeBlock[] = [];
    let timeUsed = 0;

    // Identify keystone (usually the longest prep step or marked as keystone)
    const keystoneBlock = this.identifyKeystone(blocks);

    // Try to fit keystone first
    if (keystoneBlock) {
      const keystoneDuration = this.getBlockDuration(keystoneBlock);
      if (timeUsed + keystoneDuration <= minutesAvailable) {
        possibleSteps.push(keystoneBlock);
        timeUsed += keystoneDuration;
      } else {
        // Try quick version (half duration)
        const quickDuration = Math.ceil(keystoneDuration / 2);
        if (timeUsed + quickDuration <= minutesAvailable) {
          // Create modified block with quick duration
          const quickBlock = {
            ...keystoneBlock,
            activityName: `Quick ${keystoneBlock.activityName}`,
            endTime: new Date(
              keystoneBlock.startTime.getTime() + quickDuration * 60000
            ),
          };
          possibleSteps.push(quickBlock);
          timeUsed += quickDuration;
        } else {
          skippableSteps.push(keystoneBlock);
        }
      }
    }

    // Try to fit other blocks
    for (const block of blocks) {
      if (block === keystoneBlock) continue; // Already handled

      const duration = this.getBlockDuration(block);
      if (timeUsed + duration <= minutesAvailable) {
        possibleSteps.push(block);
        timeUsed += duration;
      } else {
        skippableSteps.push(block);
      }
    }

    return { possibleSteps, skippableSteps };
  }

  /**
   * Identify the keystone activity in the chain
   * Usually the longest prep step or explicitly marked
   */
  private identifyKeystone(blocks: TimeBlock[]): TimeBlock | null {
    // Look for explicitly marked keystone
    const markedKeystone = blocks.find(
      (block) => block.metadata?.is_keystone === true
    );
    if (markedKeystone) return markedKeystone;

    // Find longest prep block as fallback
    const prepBlocks = blocks.filter(
      (block) =>
        block.metadata?.commitment_envelope?.envelope_type === 'prep'
    );

    if (prepBlocks.length === 0) return null;

    return prepBlocks.reduce((longest, current) => {
      const longestDuration = this.getBlockDuration(longest);
      const currentDuration = this.getBlockDuration(current);
      return currentDuration > longestDuration ? current : longest;
    });
  }

  /**
   * Check if essential steps are included
   * Essential = keystone or travel
   */
  private hasEssentialSteps(
    possibleSteps: TimeBlock[],
    allBlocks: TimeBlock[]
  ): boolean {
    const keystone = this.identifyKeystone(allBlocks);
    if (!keystone) return true; // No keystone defined, any steps are fine

    // Check if keystone or quick version is included
    return possibleSteps.some(
      (step) =>
        step.id === keystone.id ||
        step.activityName.includes(keystone.activityName)
    );
  }

  /**
   * Get block duration in minutes
   */
  private getBlockDuration(block: TimeBlock): number {
    return Math.floor(
      (block.endTime.getTime() - block.startTime.getTime()) / 60000
    );
  }
}
