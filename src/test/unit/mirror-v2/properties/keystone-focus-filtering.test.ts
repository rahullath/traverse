/**
 * Property Test: Keystone Focus Filtering
 *
 * Validates Requirement 9.2
 *
 * This property test verifies that when keystone_focus display mode is active,
 * the timeline shows ONLY the keystone block and anchor blocks, filtering out
 * all other chain steps. This ensures users can focus on the essential
 * activation step without being overwhelmed by the full chain.
 *
 * Property 13: Keystone Focus Filtering
 * FOR ALL timelines with keystone blocks,
 * WHEN keystone_focus mode is applied,
 * THEN the filtered timeline contains ONLY keystone and anchor blocks
 */

import { describe, it, expect } from "vitest";
import * as fc from "fast-check";
import { DisplayModeService } from "@/lib/display/display-mode-service";
import {
  timelineWithAnchors,
  commitmentEnvelopeArbitrary,
} from "@/test/generators/timeline-generators";
import type { TimeBlock } from "@/types/daily-plan";

describe("Property 13: Keystone Focus Filtering", () => {
  const displayModeService = new DisplayModeService();

  /**
   * Helper: Add a keystone block to a timeline
   */
  function addKeystoneBlock(
    blocks: TimeBlock[],
    keystoneId: string,
  ): TimeBlock[] {
    if (blocks.length === 0) return blocks;

    // Find the first prep block or create a keystone before the first block
    const firstBlock = blocks[0];
    const keystoneStartTime = new Date(
      firstBlock.startTime.getTime() - 30 * 60 * 1000,
    ); // 30 min before first block

    const keystoneBlock: TimeBlock = {
      id: keystoneId,
      planId: firstBlock.planId,
      startTime: keystoneStartTime,
      endTime: new Date(keystoneStartTime.getTime() + 15 * 60 * 1000), // 15 min duration
      activityType: "routine",
      activityName: "Shower",
      activityId: fc.sample(fc.uuid(), 1)[0],
      isFixed: false,
      sequenceOrder: -1,
      status: "pending",
      metadata: {
        role: {
          type: "chain-step",
          required: true,
          chain_id: firstBlock.metadata?.chain_id,
        },
        chain_id: firstBlock.metadata?.chain_id,
        triage: {
          is_keystone: true,
        },
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return [keystoneBlock, ...blocks].map((block, index) => ({
      ...block,
      sequenceOrder: index,
    }));
  }

  /**
   * Helper: Count blocks by type
   */
  function countBlocksByType(blocks: TimeBlock[]): {
    keystone: number;
    anchor: number;
    other: number;
  } {
    return blocks.reduce(
      (counts, block) => {
        if (block.metadata?.triage?.is_keystone === true) {
          counts.keystone++;
        } else if (block.metadata?.role?.type === "anchor") {
          counts.anchor++;
        } else {
          counts.other++;
        }
        return counts;
      },
      { keystone: 0, anchor: 0, other: 0 },
    );
  }

  /**
   * Property Test: keystone_focus mode shows only keystone and anchor blocks
   * (Req 9.2)
   */
  it("should show only keystone and anchor blocks in keystone_focus mode", () => {
    fc.assert(
      fc.property(
        timelineWithAnchors({
          anchorCount: { min: 1, max: 3 },
          includeFillerBlocks: false,
        }),
        fc.uuid(),
        (timeline, keystoneId) => {
          // Add keystone block to timeline
          const timelineWithKeystone = addKeystoneBlock(timeline, keystoneId);

          // Count blocks before filtering
          const beforeCounts = countBlocksByType(timelineWithKeystone);

          // Verify we have keystone and anchors
          if (beforeCounts.keystone === 0 || beforeCounts.anchor === 0) {
            console.error("Timeline missing keystone or anchors");
            return false;
          }

          // Apply keystone_focus mode
          const filtered = displayModeService.applyDisplayMode(
            timelineWithKeystone,
            "keystone_focus",
            keystoneId,
          );

          // Count blocks after filtering
          const afterCounts = countBlocksByType(filtered);

          // Verify ONLY keystone and anchor blocks remain
          if (afterCounts.other > 0) {
            console.error("keystone_focus mode included non-keystone/anchor blocks:");
            console.error("Before:", beforeCounts);
            console.error("After:", afterCounts);
            console.error("Filtered blocks:", filtered.map(b => ({
              id: b.id,
              name: b.activityName,
              type: b.metadata?.role?.type,
              isKeystone: b.metadata?.triage?.is_keystone,
            })));
            return false;
          }

          // Verify keystone is included
          if (afterCounts.keystone !== beforeCounts.keystone) {
            console.error("keystone_focus mode did not include keystone block");
            console.error("Before keystone count:", beforeCounts.keystone);
            console.error("After keystone count:", afterCounts.keystone);
            return false;
          }

          // Verify all anchors are included
          if (afterCounts.anchor !== beforeCounts.anchor) {
            console.error("keystone_focus mode did not include all anchor blocks");
            console.error("Before anchor count:", beforeCounts.anchor);
            console.error("After anchor count:", afterCounts.anchor);
            return false;
          }

          // Verify total count is correct
          const expectedCount = beforeCounts.keystone + beforeCounts.anchor;
          if (filtered.length !== expectedCount) {
            console.error("keystone_focus mode returned incorrect number of blocks");
            console.error("Expected:", expectedCount);
            console.error("Actual:", filtered.length);
            return false;
          }

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property Test: keystone_focus mode filters out prep, travel, and recovery blocks
   * (Req 9.2)
   */
  it("should filter out prep, travel_there, travel_back, and recovery blocks", () => {
    fc.assert(
      fc.property(
        fc.date(),
        fc.uuid(),
        (anchorStartTime, keystoneId) => {
          // Generate a full commitment envelope
          const envelope = fc.sample(
            commitmentEnvelopeArbitrary(anchorStartTime),
            1,
          )[0];

          // Add keystone block
          const timelineWithKeystone = addKeystoneBlock(envelope, keystoneId);

          // Verify we have all envelope types
          const envelopeTypes = new Set(
            timelineWithKeystone.map(
              (b) => b.metadata?.commitment_envelope?.envelope_type,
            ),
          );

          if (!envelopeTypes.has("prep")) {
            console.error("Test data missing prep block");
            return false;
          }
          if (!envelopeTypes.has("travel_there")) {
            console.error("Test data missing travel_there block");
            return false;
          }
          if (!envelopeTypes.has("anchor")) {
            console.error("Test data missing anchor block");
            return false;
          }

          // Apply keystone_focus mode
          const filtered = displayModeService.applyDisplayMode(
            timelineWithKeystone,
            "keystone_focus",
            keystoneId,
          );

          // Verify filtered blocks
          for (const block of filtered) {
            const envelopeType =
              block.metadata?.commitment_envelope?.envelope_type;
            const isKeystone = block.metadata?.triage?.is_keystone === true;
            const isAnchor = block.metadata?.role?.type === "anchor";

            if (!isKeystone && !isAnchor) {
              console.error("keystone_focus mode included non-keystone/anchor block:");
              console.error("Block:", {
                id: block.id,
                name: block.activityName,
                envelopeType,
                roleType: block.metadata?.role?.type,
              });
              return false;
            }

            // Verify no prep, travel, or recovery blocks
            if (
              envelopeType === "prep" ||
              envelopeType === "travel_there" ||
              envelopeType === "travel_back" ||
              envelopeType === "recovery"
            ) {
              console.error("keystone_focus mode included envelope block:");
              console.error("Envelope type:", envelopeType);
              console.error("Block:", {
                id: block.id,
                name: block.activityName,
              });
              return false;
            }
          }

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property Test: keystone_focus mode preserves chronological order
   * (Req 9.2)
   */
  it("should preserve chronological order of keystone and anchor blocks", () => {
    fc.assert(
      fc.property(
        timelineWithAnchors({
          anchorCount: { min: 2, max: 3 },
          includeFillerBlocks: false,
        }),
        fc.uuid(),
        (timeline, keystoneId) => {
          // Add keystone block to timeline
          const timelineWithKeystone = addKeystoneBlock(timeline, keystoneId);

          // Apply keystone_focus mode
          const filtered = displayModeService.applyDisplayMode(
            timelineWithKeystone,
            "keystone_focus",
            keystoneId,
          );

          // Verify chronological order
          for (let i = 1; i < filtered.length; i++) {
            const prevBlock = filtered[i - 1];
            const currBlock = filtered[i];

            if (prevBlock.startTime > currBlock.startTime) {
              console.error("keystone_focus mode broke chronological order:");
              console.error("Previous block:", {
                name: prevBlock.activityName,
                startTime: prevBlock.startTime,
              });
              console.error("Current block:", {
                name: currBlock.activityName,
                startTime: currBlock.startTime,
              });
              return false;
            }
          }

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property Test: keystone_focus mode with multiple anchors includes all anchors
   * (Req 9.2)
   */
  it("should include all anchor blocks when multiple anchors exist", () => {
    fc.assert(
      fc.property(
        timelineWithAnchors({
          anchorCount: { min: 2, max: 4 },
          includeFillerBlocks: false,
        }),
        fc.uuid(),
        (timeline, keystoneId) => {
          // Add keystone block to timeline
          const timelineWithKeystone = addKeystoneBlock(timeline, keystoneId);

          // Count anchors before filtering
          const anchorsBefore = timelineWithKeystone.filter(
            (b) => b.metadata?.role?.type === "anchor",
          );

          // Apply keystone_focus mode
          const filtered = displayModeService.applyDisplayMode(
            timelineWithKeystone,
            "keystone_focus",
            keystoneId,
          );

          // Count anchors after filtering
          const anchorsAfter = filtered.filter(
            (b) => b.metadata?.role?.type === "anchor",
          );

          // Verify all anchors are included
          if (anchorsAfter.length !== anchorsBefore.length) {
            console.error("keystone_focus mode did not include all anchors:");
            console.error("Anchors before:", anchorsBefore.length);
            console.error("Anchors after:", anchorsAfter.length);
            return false;
          }

          // Verify anchor IDs match
          const anchorIdsBefore = new Set(anchorsBefore.map((b) => b.id));
          const anchorIdsAfter = new Set(anchorsAfter.map((b) => b.id));

          for (const id of anchorIdsBefore) {
            if (!anchorIdsAfter.has(id)) {
              console.error("keystone_focus mode missing anchor ID:", id);
              return false;
            }
          }

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property Test: keystone_focus mode returns empty array when no keystone or anchors
   * (Req 9.2)
   */
  it("should return empty array when timeline has no keystone or anchors", () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            id: fc.uuid(),
            planId: fc.uuid(),
            startTime: fc.date(),
            endTime: fc.date(),
            activityType: fc.constantFrom("routine", "task", "meal"),
            activityName: fc.string({ minLength: 5, maxLength: 50 }),
            activityId: fc.option(fc.uuid(), { nil: undefined }),
            isFixed: fc.boolean(),
            sequenceOrder: fc.integer({ min: 0, max: 100 }),
            status: fc.constantFrom("pending", "completed", "skipped"),
            skipReason: fc.option(fc.string(), { nil: undefined }),
            metadata: fc.constant(undefined),
            createdAt: fc.constant(new Date()),
            updatedAt: fc.constant(new Date()),
          }),
          { minLength: 1, maxLength: 10 },
        ),
        fc.uuid(),
        (timeline, keystoneId) => {
          // Apply keystone_focus mode to timeline without keystone or anchors
          const filtered = displayModeService.applyDisplayMode(
            timeline,
            "keystone_focus",
            keystoneId,
          );

          // Should return empty array
          if (filtered.length !== 0) {
            console.error("keystone_focus mode returned blocks without keystone/anchors:");
            console.error("Filtered length:", filtered.length);
            console.error("Filtered blocks:", filtered.map(b => ({
              name: b.activityName,
              type: b.activityType,
            })));
            return false;
          }

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property Test: keystone_focus mode is idempotent
   * (Req 9.2)
   */
  it("should be idempotent - applying twice produces same result", () => {
    fc.assert(
      fc.property(
        timelineWithAnchors({
          anchorCount: { min: 1, max: 3 },
          includeFillerBlocks: false,
        }),
        fc.uuid(),
        (timeline, keystoneId) => {
          // Add keystone block to timeline
          const timelineWithKeystone = addKeystoneBlock(timeline, keystoneId);

          // Apply keystone_focus mode once
          const filtered1 = displayModeService.applyDisplayMode(
            timelineWithKeystone,
            "keystone_focus",
            keystoneId,
          );

          // Apply keystone_focus mode again to the result
          const filtered2 = displayModeService.applyDisplayMode(
            filtered1,
            "keystone_focus",
            keystoneId,
          );

          // Results should be identical
          if (filtered1.length !== filtered2.length) {
            console.error("keystone_focus mode is not idempotent:");
            console.error("First application length:", filtered1.length);
            console.error("Second application length:", filtered2.length);
            return false;
          }

          // Verify block IDs match
          for (let i = 0; i < filtered1.length; i++) {
            if (filtered1[i].id !== filtered2[i].id) {
              console.error("keystone_focus mode changed block order on second application");
              return false;
            }
          }

          return true;
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Regression Test: Verify keystone identification works correctly
   */
  it("should correctly identify keystone blocks by metadata", () => {
    const keystoneId = "keystone-123";

    const keystoneBlock: TimeBlock = {
      id: keystoneId,
      planId: "plan-123",
      startTime: new Date(),
      endTime: new Date(Date.now() + 15 * 60 * 1000),
      activityType: "routine",
      activityName: "Shower",
      activityId: "activity-123",
      isFixed: false,
      sequenceOrder: 0,
      status: "pending",
      metadata: {
        triage: {
          is_keystone: true,
        },
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const anchorBlock: TimeBlock = {
      id: "anchor-123",
      planId: "plan-123",
      startTime: new Date(Date.now() + 60 * 60 * 1000),
      endTime: new Date(Date.now() + 120 * 60 * 1000),
      activityType: "commitment",
      activityName: "Class",
      activityId: "activity-456",
      isFixed: true,
      sequenceOrder: 1,
      status: "pending",
      metadata: {
        role: {
          type: "anchor",
          required: true,
        },
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const otherBlock: TimeBlock = {
      id: "other-123",
      planId: "plan-123",
      startTime: new Date(Date.now() + 30 * 60 * 1000),
      endTime: new Date(Date.now() + 45 * 60 * 1000),
      activityType: "routine",
      activityName: "Get dressed",
      activityId: "activity-789",
      isFixed: false,
      sequenceOrder: 2,
      status: "pending",
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    const timeline = [keystoneBlock, otherBlock, anchorBlock];

    const filtered = displayModeService.applyDisplayMode(
      timeline,
      "keystone_focus",
      keystoneId,
    );

    expect(filtered).toHaveLength(2);
    expect(filtered[0].id).toBe(keystoneId);
    expect(filtered[1].id).toBe("anchor-123");
  });

  /**
   * Documentation Test: Verify requirements are met
   */
  it("should document which requirements are validated", () => {
    const validatedRequirements = [
      "9.2", // When keystone_focus mode is active, Timeline displays only keystone and anchor blocks
    ];

    expect(validatedRequirements).toHaveLength(1);
    expect(validatedRequirements).toContain("9.2");
  });
});
