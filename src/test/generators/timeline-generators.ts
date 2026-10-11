/**
 * Test Data Generators for Property-Based Testing
 *
 * Provides fast-check arbitraries for generating valid TimeBlock and timeline data
 * for property-based testing of the triage-mirror-stateless feature.
 *
 * Requirements: All (testing foundation)
 */

import * as fc from "fast-check";
import type {
  TimeBlock,
  ActivityType,
  BlockStatus,
  TimeBlockMetadata,
} from "@/types/daily-plan";

/**
 * Generate a valid activity type
 */
export const activityTypeArbitrary = fc.constantFrom<ActivityType>(
  "commitment",
  "task",
  "routine",
  "meal",
  "buffer",
  "travel",
);

/**
 * Generate a valid block status
 */
export const blockStatusArbitrary = fc.constantFrom<BlockStatus>(
  "pending",
  "completed",
  "skipped",
);

/**
 * Generate a valid anchor type
 */
export const anchorTypeArbitrary = fc.constantFrom(
  "class",
  "seminar",
  "workshop",
  "appointment",
  "other",
);

/**
 * Generate a valid commitment envelope type
 */
export const envelopeTypeArbitrary = fc.constantFrom(
  "prep",
  "travel_there",
  "anchor",
  "travel_back",
  "recovery",
);

/**
 * Generate TimeBlock metadata for commitment envelopes
 */
export const commitmentEnvelopeMetadataArbitrary = fc.record({
  role: fc.record({
    type: fc.constant("anchor" as const),
    required: fc.boolean(),
    chain_id: fc.uuid(),
  }),
  chain_id: fc.uuid(),
  anchor_id: fc.uuid(),
  commitment_envelope: fc.record({
    envelope_id: fc.uuid(),
    envelope_type: envelopeTypeArbitrary,
  }),
  original_anchor_type: anchorTypeArbitrary,
  location_state: fc.constantFrom("at_home" as const, "not_home" as const),
});

/**
 * Generate generic TimeBlock metadata
 */
export const timeBlockMetadataArbitrary: fc.Arbitrary<TimeBlockMetadata> =
  fc.record({
    role: fc.option(
      fc.record({
        type: fc.constantFrom(
          "anchor" as const,
          "chain-step" as const,
          "exit-gate" as const,
          "recovery" as const,
        ),
        required: fc.boolean(),
        chain_id: fc.option(fc.uuid(), { nil: undefined }),
      }),
      { nil: undefined },
    ),
    chain_id: fc.option(fc.uuid(), { nil: undefined }),
    step_id: fc.option(fc.uuid(), { nil: undefined }),
    anchor_id: fc.option(fc.uuid(), { nil: undefined }),
    location_state: fc.option(
      fc.constantFrom("at_home" as const, "not_home" as const),
      { nil: undefined },
    ),
    commitment_envelope: fc.option(
      fc.record({
        envelope_id: fc.uuid(),
        envelope_type: envelopeTypeArbitrary,
      }),
      { nil: undefined },
    ),
    original_anchor_type: fc.option(anchorTypeArbitrary, { nil: undefined }),
  });

/**
 * Generate a single TimeBlock
 *
 * @param baseTime - Base time to generate blocks around (defaults to current time)
 * @param durationMinutes - Duration range for blocks (defaults to 15-120 minutes)
 */
export const timeBlockArbitrary = (
  baseTime: Date = new Date(),
  durationMinutes: { min: number; max: number } = { min: 15, max: 120 },
): fc.Arbitrary<TimeBlock> => {
  return fc
    .record({
      id: fc.uuid(),
      planId: fc.uuid(),
      startTime: fc.date({
        min: baseTime,
        max: new Date(baseTime.getTime() + 24 * 60 * 60 * 1000),
      }),
      activityType: activityTypeArbitrary,
      activityName: fc.string({ minLength: 5, maxLength: 50 }),
      activityId: fc.option(fc.uuid(), { nil: undefined }),
      isFixed: fc.boolean(),
      sequenceOrder: fc.integer({ min: 0, max: 100 }),
      status: blockStatusArbitrary,
      skipReason: fc.option(fc.string({ minLength: 5, maxLength: 100 }), {
        nil: undefined,
      }),
      metadata: fc.option(timeBlockMetadataArbitrary, { nil: undefined }),
      createdAt: fc.constant(new Date()),
      updatedAt: fc.constant(new Date()),
    })
    .chain((block) => {
      // Generate endTime based on startTime + duration
      return fc
        .integer({ min: durationMinutes.min, max: durationMinutes.max })
        .map((duration) => ({
          ...block,
          endTime: new Date(block.startTime.getTime() + duration * 60 * 1000),
        }));
    });
};

/**
 * Generate a TimeBlock that is specifically an anchor
 */
export const anchorBlockArbitrary = (
  baseTime: Date = new Date(),
  anchorType: string = "appointment",
): fc.Arbitrary<TimeBlock> => {
  const anchorId = fc.sample(fc.uuid(), 1)[0];

  return fc
    .record({
      id: fc.uuid(),
      planId: fc.uuid(),
      startTime: fc.date({
        min: baseTime,
        max: new Date(baseTime.getTime() + 24 * 60 * 60 * 1000),
      }),
      activityType: fc.constant("commitment" as ActivityType),
      activityName: fc.string({ minLength: 5, maxLength: 50 }),
      activityId: fc.constant(anchorId),
      isFixed: fc.constant(true),
      sequenceOrder: fc.integer({ min: 0, max: 100 }),
      status: fc.constant("pending" as BlockStatus),
      skipReason: fc.constant(undefined),
      metadata: fc.record({
        role: fc.constant({
          type: "anchor" as const,
          required: true,
          chain_id: fc.sample(fc.uuid(), 1)[0],
        }),
        chain_id: fc.constant(fc.sample(fc.uuid(), 1)[0]),
        anchor_id: fc.constant(anchorId),
        commitment_envelope: fc.constant({
          envelope_id: fc.sample(fc.uuid(), 1)[0],
          envelope_type: "anchor" as const,
        }),
        original_anchor_type: fc.constant(anchorType),
        location_state: fc.constant("not_home" as const),
      }),
      createdAt: fc.constant(new Date()),
      updatedAt: fc.constant(new Date()),
    })
    .chain((block) => {
      return fc.integer({ min: 30, max: 120 }).map((duration) => ({
        ...block,
        endTime: new Date(block.startTime.getTime() + duration * 60 * 1000),
      }));
    });
};

/**
 * Generate a commitment envelope (prep, travel_there, anchor, travel_back, recovery)
 *
 * @param anchorStartTime - Start time for the anchor
 * @param anchorType - Type of anchor (class, seminar, appointment, etc.)
 */
export const commitmentEnvelopeArbitrary = (
  anchorStartTime: Date,
  anchorType: string = "appointment",
): fc.Arbitrary<TimeBlock[]> => {
  const envelopeId = fc.sample(fc.uuid(), 1)[0];
  const anchorId = fc.sample(fc.uuid(), 1)[0];
  const chainId = fc.sample(fc.uuid(), 1)[0];
  const planId = fc.sample(fc.uuid(), 1)[0];

  return fc
    .record({
      prepDuration: fc.integer({ min: 10, max: 60 }),
      travelThereDuration: fc.integer({ min: 5, max: 45 }),
      anchorDuration: fc.integer({ min: 30, max: 120 }),
      travelBackDuration: fc.integer({ min: 5, max: 45 }),
      recoveryDuration: fc.integer({ min: 10, max: 30 }),
    })
    .map((durations) => {
      const blocks: TimeBlock[] = [];

      // Calculate start times working backward from anchor
      const anchorStart = anchorStartTime;
      const travelThereStart = new Date(
        anchorStart.getTime() - durations.travelThereDuration * 60 * 1000,
      );
      const prepStart = new Date(
        travelThereStart.getTime() - durations.prepDuration * 60 * 1000,
      );

      // Calculate forward from anchor
      const anchorEnd = new Date(
        anchorStart.getTime() + durations.anchorDuration * 60 * 1000,
      );
      const travelBackStart = anchorEnd;
      const travelBackEnd = new Date(
        travelBackStart.getTime() + durations.travelBackDuration * 60 * 1000,
      );
      const recoveryStart = travelBackEnd;
      const recoveryEnd = new Date(
        recoveryStart.getTime() + durations.recoveryDuration * 60 * 1000,
      );

      // Prep block
      blocks.push({
        id: fc.sample(fc.uuid(), 1)[0],
        planId,
        startTime: prepStart,
        endTime: travelThereStart,
        activityType: "routine",
        activityName: "Prep for anchor",
        activityId: anchorId,
        isFixed: false,
        sequenceOrder: 0,
        status: "pending",
        metadata: {
          role: { type: "chain-step", required: true, chain_id: chainId },
          chain_id: chainId,
          anchor_id: anchorId,
          commitment_envelope: {
            envelope_id: envelopeId,
            envelope_type: "prep",
          },
          original_anchor_type: anchorType,
          location_state: "at_home",
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Travel there block
      blocks.push({
        id: fc.sample(fc.uuid(), 1)[0],
        planId,
        startTime: travelThereStart,
        endTime: anchorStart,
        activityType: "travel",
        activityName: "Travel to anchor",
        activityId: anchorId,
        isFixed: false,
        sequenceOrder: 1,
        status: "pending",
        metadata: {
          role: { type: "chain-step", required: true, chain_id: chainId },
          chain_id: chainId,
          anchor_id: anchorId,
          commitment_envelope: {
            envelope_id: envelopeId,
            envelope_type: "travel_there",
          },
          original_anchor_type: anchorType,
          location_state: "not_home",
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Anchor block
      blocks.push({
        id: fc.sample(fc.uuid(), 1)[0],
        planId,
        startTime: anchorStart,
        endTime: anchorEnd,
        activityType: "commitment",
        activityName: "Anchor activity",
        activityId: anchorId,
        isFixed: true,
        sequenceOrder: 2,
        status: "pending",
        metadata: {
          role: { type: "anchor", required: true, chain_id: chainId },
          chain_id: chainId,
          anchor_id: anchorId,
          commitment_envelope: {
            envelope_id: envelopeId,
            envelope_type: "anchor",
          },
          original_anchor_type: anchorType,
          location_state: "not_home",
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Travel back block
      blocks.push({
        id: fc.sample(fc.uuid(), 1)[0],
        planId,
        startTime: travelBackStart,
        endTime: travelBackEnd,
        activityType: "travel",
        activityName: "Travel back",
        activityId: anchorId,
        isFixed: false,
        sequenceOrder: 3,
        status: "pending",
        metadata: {
          role: { type: "chain-step", required: true, chain_id: chainId },
          chain_id: chainId,
          anchor_id: anchorId,
          commitment_envelope: {
            envelope_id: envelopeId,
            envelope_type: "travel_back",
          },
          original_anchor_type: anchorType,
          location_state: "not_home",
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Recovery block
      blocks.push({
        id: fc.sample(fc.uuid(), 1)[0],
        planId,
        startTime: recoveryStart,
        endTime: recoveryEnd,
        activityType: "routine",
        activityName: "Recovery",
        activityId: anchorId,
        isFixed: false,
        sequenceOrder: 4,
        status: "pending",
        metadata: {
          role: { type: "recovery", required: false, chain_id: chainId },
          chain_id: chainId,
          anchor_id: anchorId,
          commitment_envelope: {
            envelope_id: envelopeId,
            envelope_type: "recovery",
          },
          original_anchor_type: anchorType,
          location_state: "at_home",
        },
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return blocks;
    });
};

/**
 * Generate a timeline with anchors and commitment envelopes
 *
 * @param options - Configuration for timeline generation
 */
export interface TimelineOptions {
  /** Base time for timeline (defaults to current time) */
  baseTime?: Date;
  /** Number of anchors to generate (defaults to 1-3) */
  anchorCount?: { min: number; max: number };
  /** Minimum gap between anchors in minutes (defaults to 120) */
  minGapMinutes?: number;
  /** Include non-anchor blocks (defaults to true) */
  includeFillerBlocks?: boolean;
}

export const timelineWithAnchors = (
  options: TimelineOptions = {},
): fc.Arbitrary<TimeBlock[]> => {
  const {
    baseTime = new Date(),
    anchorCount = { min: 1, max: 3 },
    minGapMinutes = 120,
    includeFillerBlocks = true,
  } = options;

  return fc
    .integer({ min: anchorCount.min, max: anchorCount.max })
    .chain((numAnchors) => {
      // Generate anchor start times with minimum gaps
      const anchorTimes: Date[] = [];
      let currentTime = new Date(baseTime.getTime() + 60 * 60 * 1000); // Start 1 hour from base

      for (let i = 0; i < numAnchors; i++) {
        anchorTimes.push(new Date(currentTime));
        currentTime = new Date(
          currentTime.getTime() + minGapMinutes * 60 * 1000,
        );
      }

      // Generate commitment envelopes for each anchor
      const envelopePromises = anchorTimes.map(
        (anchorTime) =>
          fc.sample(commitmentEnvelopeArbitrary(anchorTime), 1)[0],
      );

      let allBlocks = envelopePromises.flat();

      // Add filler blocks if requested
      if (includeFillerBlocks) {
        const fillerCount = fc.sample(fc.integer({ min: 0, max: 3 }), 1)[0];
        for (let i = 0; i < fillerCount; i++) {
          const fillerBlock = fc.sample(timeBlockArbitrary(baseTime), 1)[0];
          allBlocks.push(fillerBlock);
        }
      }

      // Sort chronologically by start time
      allBlocks.sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

      // Update sequence order
      allBlocks = allBlocks.map((block, index) => ({
        ...block,
        sequenceOrder: index,
      }));

      return fc.constant(allBlocks);
    });
};

/**
 * Generate a timeline with a specific number of future anchors
 * Useful for testing runway calculations
 */
export const timelineWithFutureAnchors = (
  currentTime: Date,
  futureAnchorCount: number,
): fc.Arbitrary<TimeBlock[]> => {
  return timelineWithAnchors({
    baseTime: currentTime,
    anchorCount: { min: futureAnchorCount, max: futureAnchorCount },
    minGapMinutes: 120,
    includeFillerBlocks: false,
  });
};

/**
 * Generate a timeline with no future anchors (all anchors in the past)
 * Useful for testing null runway scenarios
 */
export const timelineWithNoFutureAnchors = (
  currentTime: Date,
): fc.Arbitrary<TimeBlock[]> => {
  const pastTime = new Date(currentTime.getTime() - 4 * 60 * 60 * 1000); // 4 hours ago

  return timelineWithAnchors({
    baseTime: pastTime,
    anchorCount: { min: 1, max: 2 },
    minGapMinutes: 60,
    includeFillerBlocks: false,
  }).map((blocks) => {
    // Ensure all blocks are in the past
    return blocks.filter((block) => block.endTime < currentTime);
  });
};
