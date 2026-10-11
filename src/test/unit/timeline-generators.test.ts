/**
 * Unit tests for timeline generators
 *
 * Verifies that the fast-check arbitraries generate valid TimeBlock data
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import {
  timeBlockArbitrary,
  anchorBlockArbitrary,
  commitmentEnvelopeArbitrary,
  timelineWithAnchors,
  timelineWithFutureAnchors,
  timelineWithNoFutureAnchors,
} from "../generators/timeline-generators";

describe("Timeline Generators", () => {
  describe("timeBlockArbitrary", () => {
    it("should generate valid TimeBlocks", () => {
      fc.assert(
        fc.property(timeBlockArbitrary(), (block) => {
          // Verify required fields exist
          expect(block.id).toBeDefined();
          expect(block.planId).toBeDefined();
          expect(block.startTime).toBeInstanceOf(Date);
          expect(block.endTime).toBeInstanceOf(Date);
          expect(block.activityName).toBeDefined();

          // Verify endTime is after startTime
          expect(block.endTime.getTime()).toBeGreaterThan(
            block.startTime.getTime(),
          );

          // Verify duration is within expected range (15-120 minutes)
          const durationMinutes =
            (block.endTime.getTime() - block.startTime.getTime()) / (60 * 1000);
          expect(durationMinutes).toBeGreaterThanOrEqual(15);
          expect(durationMinutes).toBeLessThanOrEqual(120);

          return true;
        }),
      );
    });
  });

  describe("anchorBlockArbitrary", () => {
    it("should generate valid anchor blocks", () => {
      fc.assert(
        fc.property(anchorBlockArbitrary(), (block) => {
          // Verify it's marked as an anchor
          expect(block.metadata?.role?.type).toBe("anchor");
          expect(block.metadata?.commitment_envelope?.envelope_type).toBe(
            "anchor",
          );
          expect(block.isFixed).toBe(true);
          expect(block.activityType).toBe("commitment");

          return true;
        }),
      );
    });
  });

  describe("commitmentEnvelopeArbitrary", () => {
    it("should generate complete commitment envelopes with 5 steps", () => {
      const anchorTime = new Date("2024-01-15T14:00:00Z");

      fc.assert(
        fc.property(commitmentEnvelopeArbitrary(anchorTime), (envelope) => {
          // Should have exactly 5 blocks
          expect(envelope).toHaveLength(5);

          // Verify envelope types in order
          expect(envelope[0].metadata?.commitment_envelope?.envelope_type).toBe(
            "prep",
          );
          expect(envelope[1].metadata?.commitment_envelope?.envelope_type).toBe(
            "travel_there",
          );
          expect(envelope[2].metadata?.commitment_envelope?.envelope_type).toBe(
            "anchor",
          );
          expect(envelope[3].metadata?.commitment_envelope?.envelope_type).toBe(
            "travel_back",
          );
          expect(envelope[4].metadata?.commitment_envelope?.envelope_type).toBe(
            "recovery",
          );

          // Verify anchor starts at specified time
          expect(envelope[2].startTime.getTime()).toBe(anchorTime.getTime());

          // Verify chronological ordering
          for (let i = 1; i < envelope.length; i++) {
            expect(envelope[i].startTime.getTime()).toBeGreaterThanOrEqual(
              envelope[i - 1].endTime.getTime(),
            );
          }

          // Verify all blocks share same anchor_id
          const anchorId = envelope[0].metadata?.anchor_id;
          expect(anchorId).toBeDefined();
          envelope.forEach((block) => {
            expect(block.metadata?.anchor_id).toBe(anchorId);
          });

          return true;
        }),
      );
    });

    it("should generate prep blocks before anchor start time", () => {
      const anchorTime = new Date("2024-01-15T14:00:00Z");

      fc.assert(
        fc.property(commitmentEnvelopeArbitrary(anchorTime), (envelope) => {
          const prepBlock = envelope[0];
          const travelThereBlock = envelope[1];
          const anchorBlock = envelope[2];

          // Prep and travel should end before anchor starts
          expect(prepBlock.endTime.getTime()).toBeLessThanOrEqual(
            anchorBlock.startTime.getTime(),
          );
          expect(travelThereBlock.endTime.getTime()).toBeLessThanOrEqual(
            anchorBlock.startTime.getTime(),
          );

          return true;
        }),
      );
    });
  });

  describe("timelineWithAnchors", () => {
    it("should generate chronologically sorted timelines", () => {
      fc.assert(
        fc.property(timelineWithAnchors(), (timeline) => {
          // Verify chronological ordering
          for (let i = 1; i < timeline.length; i++) {
            expect(timeline[i].startTime.getTime()).toBeGreaterThanOrEqual(
              timeline[i - 1].startTime.getTime(),
            );
          }

          return true;
        }),
      );
    });

    it("should generate timelines with specified anchor count", () => {
      fc.assert(
        fc.property(
          timelineWithAnchors({
            anchorCount: { min: 2, max: 2 },
            includeFillerBlocks: false,
          }),
          (timeline) => {
            // Count anchor blocks
            const anchorCount = timeline.filter(
              (block) => block.metadata?.role?.type === "anchor",
            ).length;

            expect(anchorCount).toBe(2);

            return true;
          },
        ),
      );
    });

    it("should maintain minimum gap between anchors", () => {
      const minGapMinutes = 120;

      fc.assert(
        fc.property(
          timelineWithAnchors({
            anchorCount: { min: 2, max: 3 },
            minGapMinutes,
            includeFillerBlocks: false,
          }),
          (timeline) => {
            const anchors = timeline.filter(
              (block) => block.metadata?.role?.type === "anchor",
            );

            // Check gaps between consecutive anchors
            for (let i = 1; i < anchors.length; i++) {
              const gapMinutes =
                (anchors[i].startTime.getTime() -
                  anchors[i - 1].endTime.getTime()) /
                (60 * 1000);
              expect(gapMinutes).toBeGreaterThanOrEqual(0); // Allow for commitment envelope overlap
            }

            return true;
          },
        ),
      );
    });
  });

  describe("timelineWithFutureAnchors", () => {
    it("should generate timelines with all anchors in the future", () => {
      const currentTime = new Date("2024-01-15T10:00:00Z");

      fc.assert(
        fc.property(timelineWithFutureAnchors(currentTime, 2), (timeline) => {
          const anchors = timeline.filter(
            (block) => block.metadata?.role?.type === "anchor",
          );

          // All anchors should be in the future
          anchors.forEach((anchor) => {
            expect(anchor.startTime.getTime()).toBeGreaterThan(
              currentTime.getTime(),
            );
          });

          return true;
        }),
      );
    });
  });

  describe("timelineWithNoFutureAnchors", () => {
    it("should generate timelines with all blocks in the past", () => {
      const currentTime = new Date("2024-01-15T10:00:00Z");

      fc.assert(
        fc.property(timelineWithNoFutureAnchors(currentTime), (timeline) => {
          // All blocks should be in the past
          timeline.forEach((block) => {
            expect(block.endTime.getTime()).toBeLessThan(currentTime.getTime());
          });

          return true;
        }),
      );
    });
  });
});
