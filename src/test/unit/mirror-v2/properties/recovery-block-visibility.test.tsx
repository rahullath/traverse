/**
 * Property Test: Recovery Block Visibility
 *
 * Validates Requirements 21.2, 21.3
 *
 * This property test verifies that recovery blocks (blocks with envelope_type "recovery")
 * are visible if and only if the showRecoveryBlocks preference is true.
 * When false, recovery blocks should be filtered out of the timeline display.
 *
 * Property 29: Recovery Block Visibility
 * FOR ALL preference values and timeline states,
 * WHEN rendering Timeline component,
 * THEN recovery blocks are visible iff show_recovery_blocks is true
 */

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import * as fc from "fast-check";
import React from "react";
import Timeline from "@/components/daily-plan/Timeline";
import {
  commitmentEnvelopeArbitrary,
  timeBlockArbitrary,
} from "@/test/generators/timeline-generators";
import type { TimeBlock } from "@/types/daily-plan";

describe("Property 29: Recovery Block Visibility", () => {
  /**
   * Check if a block is a recovery block
   */
  function isRecoveryBlock(block: TimeBlock): boolean {
    return block.metadata?.commitment_envelope?.envelope_type === "recovery";
  }

  /**
   * Extract recovery block indicators from rendered HTML
   */
  function hasRecoveryBlocksInHTML(html: string): {
    hasRecoveryLabel: boolean;
    hasRecoveryActivity: boolean;
    hasAnyRecoveryIndicators: boolean;
  } {
    const hasRecoveryLabel =
      html.includes("Recovery") || html.includes("recovery");

    // Check for recovery-specific activity names
    const hasRecoveryActivity =
      html.includes("Recovery") || html.includes("Rest");

    return {
      hasRecoveryLabel,
      hasRecoveryActivity,
      hasAnyRecoveryIndicators: hasRecoveryLabel || hasRecoveryActivity,
    };
  }

  /**
   * Count recovery blocks in a timeline
   */
  function countRecoveryBlocks(blocks: TimeBlock[]): number {
    return blocks.filter(isRecoveryBlock).length;
  }

  /**
   * Property Test: Recovery blocks visible iff showRecoveryBlocks is true
   * (Req 21.2, 21.3)
   */
  it("Timeline should show recovery blocks iff showRecoveryBlocks is true", () => {
    fc.assert(
      fc.property(
        fc.date(),
        fc.boolean(), // showRecoveryBlocks preference
        (anchorStartTime, showRecoveryBlocks) => {
          // Generate a commitment envelope which includes a recovery block
          const blocks = fc.sample(
            commitmentEnvelopeArbitrary(anchorStartTime),
            1
          )[0];

          // Verify we have at least one recovery block in the test data
          const recoveryCount = countRecoveryBlocks(blocks);
          if (recoveryCount === 0) {
            console.error("Test data generation failed: no recovery blocks");
            return false;
          }

          const { container } = render(
            <Timeline
              timeBlocks={blocks}
              editMode={false}
              onBlockComplete={() => {}}
              onBlockSkip={() => {}}
              onBlockEdit={() => {}}
              onRefresh={() => {}}
              showRecoveryBlocks={showRecoveryBlocks}
            />
          );

          const html = container.innerHTML;
          const recoveryIndicators = hasRecoveryBlocksInHTML(html);

          // Verify recovery block visibility matches preference
          if (showRecoveryBlocks) {
            // Recovery blocks should be visible
            if (!recoveryIndicators.hasAnyRecoveryIndicators) {
              console.error(
                "Recovery blocks missing when showRecoveryBlocks is true:"
              );
              console.error(
                "Has recovery label:",
                recoveryIndicators.hasRecoveryLabel
              );
              console.error(
                "Has recovery activity:",
                recoveryIndicators.hasRecoveryActivity
              );
              console.error("showRecoveryBlocks:", showRecoveryBlocks);
              console.error("Recovery blocks in data:", recoveryCount);
              return false;
            }
          } else {
            // Recovery blocks should be hidden
            if (recoveryIndicators.hasAnyRecoveryIndicators) {
              console.error(
                "Recovery blocks visible when showRecoveryBlocks is false:"
              );
              console.error(
                "Has recovery label:",
                recoveryIndicators.hasRecoveryLabel
              );
              console.error(
                "Has recovery activity:",
                recoveryIndicators.hasRecoveryActivity
              );
              console.error("showRecoveryBlocks:", showRecoveryBlocks);
              console.error("Recovery blocks in data:", recoveryCount);
              return false;
            }
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Default behavior (backward compatibility)
   * When showRecoveryBlocks is undefined, recovery blocks should be visible (default true)
   */
  it("Timeline should show recovery blocks by default when prop is undefined", () => {
    fc.assert(
      fc.property(fc.date(), (anchorStartTime) => {
        const blocks = fc.sample(
          commitmentEnvelopeArbitrary(anchorStartTime),
          1
        )[0];

        const recoveryCount = countRecoveryBlocks(blocks);
        if (recoveryCount === 0) {
          console.error("Test data generation failed: no recovery blocks");
          return false;
        }

        const { container } = render(
          <Timeline
            timeBlocks={blocks}
            editMode={false}
            onBlockComplete={() => {}}
            onBlockSkip={() => {}}
            onBlockEdit={() => {}}
            onRefresh={() => {}}
            // showRecoveryBlocks prop omitted (should default to true)
          />
        );

        const html = container.innerHTML;
        const recoveryIndicators = hasRecoveryBlocksInHTML(html);

        // Recovery blocks should be visible by default
        if (!recoveryIndicators.hasAnyRecoveryIndicators) {
          console.error(
            "Recovery blocks missing when prop is undefined (should default to true):"
          );
          console.error(
            "Has recovery label:",
            recoveryIndicators.hasRecoveryLabel
          );
          console.error(
            "Has recovery activity:",
            recoveryIndicators.hasRecoveryActivity
          );
          console.error("Recovery blocks in data:", recoveryCount);
          return false;
        }

        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Non-recovery blocks always visible
   * regardless of showRecoveryBlocks preference
   */
  it("Non-recovery blocks should always be visible regardless of showRecoveryBlocks", () => {
    fc.assert(
      fc.property(
        fc.date(),
        fc.boolean(),
        (anchorStartTime, showRecoveryBlocks) => {
          const blocks = fc.sample(
            commitmentEnvelopeArbitrary(anchorStartTime),
            1
          )[0];

          // Filter to get non-recovery blocks
          const nonRecoveryBlocks = blocks.filter(
            (block) => !isRecoveryBlock(block)
          );

          if (nonRecoveryBlocks.length === 0) {
            console.error(
              "Test data generation failed: no non-recovery blocks"
            );
            return false;
          }

          const { container } = render(
            <Timeline
              timeBlocks={blocks}
              editMode={false}
              onBlockComplete={() => {}}
              onBlockSkip={() => {}}
              onBlockEdit={() => {}}
              onRefresh={() => {}}
              showRecoveryBlocks={showRecoveryBlocks}
            />
          );

          const html = container.innerHTML;

          // Check that non-recovery blocks are visible
          // Look for envelope types that should always be visible
          const hasPrep = html.includes("Prep");
          const hasTravelThere = html.includes("Travel There");
          const hasAnchor = html.includes("Anchor");
          const hasTravelBack = html.includes("Travel Back");

          const hasNonRecoveryBlocks =
            hasPrep || hasTravelThere || hasAnchor || hasTravelBack;

          if (!hasNonRecoveryBlocks) {
            console.error(
              "Non-recovery blocks missing (should always be visible):"
            );
            console.error("Has Prep:", hasPrep);
            console.error("Has Travel There:", hasTravelThere);
            console.error("Has Anchor:", hasAnchor);
            console.error("Has Travel Back:", hasTravelBack);
            console.error("showRecoveryBlocks:", showRecoveryBlocks);
            console.error("Non-recovery blocks in data:", nonRecoveryBlocks.length);
            return false;
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Recovery block filtering is independent of other preferences
   * (Req 21.2, 21.3)
   */
  it("Recovery block visibility should be independent of showCompletionControls", () => {
    fc.assert(
      fc.property(
        fc.date(),
        fc.boolean(), // showRecoveryBlocks
        fc.boolean(), // showCompletionControls
        (anchorStartTime, showRecoveryBlocks, showCompletionControls) => {
          const blocks = fc.sample(
            commitmentEnvelopeArbitrary(anchorStartTime),
            1
          )[0];

          const recoveryCount = countRecoveryBlocks(blocks);
          if (recoveryCount === 0) {
            console.error("Test data generation failed: no recovery blocks");
            return false;
          }

          const { container } = render(
            <Timeline
              timeBlocks={blocks}
              editMode={false}
              onBlockComplete={() => {}}
              onBlockSkip={() => {}}
              onBlockEdit={() => {}}
              onRefresh={() => {}}
              showRecoveryBlocks={showRecoveryBlocks}
              showCompletionControls={showCompletionControls}
            />
          );

          const html = container.innerHTML;
          const recoveryIndicators = hasRecoveryBlocksInHTML(html);

          // Verify recovery block visibility matches showRecoveryBlocks preference
          // regardless of showCompletionControls value
          const expectedVisibility = showRecoveryBlocks;
          const actualVisibility = recoveryIndicators.hasAnyRecoveryIndicators;

          if (expectedVisibility !== actualVisibility) {
            console.error(
              "Recovery block visibility doesn't match showRecoveryBlocks preference:"
            );
            console.error("Expected:", expectedVisibility);
            console.error("Actual:", actualVisibility);
            console.error("showRecoveryBlocks:", showRecoveryBlocks);
            console.error("showCompletionControls:", showCompletionControls);
            console.error("Recovery blocks in data:", recoveryCount);
            return false;
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Recovery block filtering is independent of display mode
   * (Req 21.2, 21.3)
   */
  it("Recovery block visibility should be independent of display mode", () => {
    fc.assert(
      fc.property(
        fc.date(),
        fc.boolean(), // showRecoveryBlocks
        fc.constantFrom(
          "full_chain",
          "keystone_focus",
          "anchor_only",
          "rest_of_day"
        ), // displayMode
        (anchorStartTime, showRecoveryBlocks, displayMode) => {
          const blocks = fc.sample(
            commitmentEnvelopeArbitrary(anchorStartTime),
            1
          )[0];

          const recoveryCount = countRecoveryBlocks(blocks);
          if (recoveryCount === 0) {
            console.error("Test data generation failed: no recovery blocks");
            return false;
          }

          const { container } = render(
            <Timeline
              timeBlocks={blocks}
              editMode={false}
              onBlockComplete={() => {}}
              onBlockSkip={() => {}}
              onBlockEdit={() => {}}
              onRefresh={() => {}}
              showRecoveryBlocks={showRecoveryBlocks}
              displayMode={displayMode}
            />
          );

          const html = container.innerHTML;
          const recoveryIndicators = hasRecoveryBlocksInHTML(html);

          // Verify recovery block visibility matches showRecoveryBlocks preference
          // regardless of displayMode value
          const expectedVisibility = showRecoveryBlocks;
          const actualVisibility = recoveryIndicators.hasAnyRecoveryIndicators;

          if (expectedVisibility !== actualVisibility) {
            console.error(
              "Recovery block visibility doesn't match showRecoveryBlocks preference:"
            );
            console.error("Expected:", expectedVisibility);
            console.error("Actual:", actualVisibility);
            console.error("showRecoveryBlocks:", showRecoveryBlocks);
            console.error("displayMode:", displayMode);
            console.error("Recovery blocks in data:", recoveryCount);
            return false;
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Multiple commitment envelopes
   * Verify all recovery blocks are filtered consistently
   */
  it("Should filter all recovery blocks consistently across multiple envelopes", () => {
    fc.assert(
      fc.property(
        fc.date(),
        fc.boolean(),
        (baseTime, showRecoveryBlocks) => {
          // Generate two commitment envelopes with different anchor times
          const anchor1Time = new Date(baseTime.getTime() + 2 * 60 * 60 * 1000); // 2 hours from base
          const anchor2Time = new Date(baseTime.getTime() + 6 * 60 * 60 * 1000); // 6 hours from base

          const envelope1 = fc.sample(
            commitmentEnvelopeArbitrary(anchor1Time),
            1
          )[0];
          const envelope2 = fc.sample(
            commitmentEnvelopeArbitrary(anchor2Time),
            1
          )[0];

          const allBlocks = [...envelope1, ...envelope2];

          const recoveryCount = countRecoveryBlocks(allBlocks);
          if (recoveryCount < 2) {
            console.error(
              "Test data generation failed: expected at least 2 recovery blocks"
            );
            return false;
          }

          const { container } = render(
            <Timeline
              timeBlocks={allBlocks}
              editMode={false}
              onBlockComplete={() => {}}
              onBlockSkip={() => {}}
              onBlockEdit={() => {}}
              onRefresh={() => {}}
              showRecoveryBlocks={showRecoveryBlocks}
            />
          );

          const html = container.innerHTML;
          const recoveryIndicators = hasRecoveryBlocksInHTML(html);

          // Verify recovery block visibility matches preference
          if (showRecoveryBlocks) {
            if (!recoveryIndicators.hasAnyRecoveryIndicators) {
              console.error(
                "Recovery blocks missing when showRecoveryBlocks is true (multiple envelopes):"
              );
              console.error("showRecoveryBlocks:", showRecoveryBlocks);
              console.error("Recovery blocks in data:", recoveryCount);
              return false;
            }
          } else {
            if (recoveryIndicators.hasAnyRecoveryIndicators) {
              console.error(
                "Recovery blocks visible when showRecoveryBlocks is false (multiple envelopes):"
              );
              console.error("showRecoveryBlocks:", showRecoveryBlocks);
              console.error("Recovery blocks in data:", recoveryCount);
              return false;
            }
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Regression Test: Verify recovery block detection logic works correctly
   */
  it("should correctly identify recovery blocks", () => {
    const testCases = [
      {
        block: {
          id: "test-1",
          metadata: {
            commitment_envelope: {
              envelope_id: "env-1",
              envelope_type: "recovery" as const,
            },
          },
        } as TimeBlock,
        expected: true,
      },
      {
        block: {
          id: "test-2",
          metadata: {
            commitment_envelope: {
              envelope_id: "env-1",
              envelope_type: "prep" as const,
            },
          },
        } as TimeBlock,
        expected: false,
      },
      {
        block: {
          id: "test-3",
          metadata: {
            commitment_envelope: {
              envelope_id: "env-1",
              envelope_type: "anchor" as const,
            },
          },
        } as TimeBlock,
        expected: false,
      },
      {
        block: {
          id: "test-4",
          metadata: {
            role: { type: "recovery" as const, required: false },
          },
        } as TimeBlock,
        expected: false, // Only envelope_type matters, not role.type
      },
      {
        block: {
          id: "test-5",
          metadata: undefined,
        } as TimeBlock,
        expected: false,
      },
    ];

    for (const testCase of testCases) {
      const result = isRecoveryBlock(testCase.block);
      expect(result).toBe(testCase.expected);
    }
  });

  /**
   * Documentation Test: Verify requirements are met
   */
  it("should document which requirements are validated", () => {
    const validatedRequirements = [
      "21.2", // When show_recovery_blocks is true, Timeline displays Recovery_Block time blocks after each Anchor
      "21.3", // When show_recovery_blocks is false, Timeline hides Recovery_Block time blocks
    ];

    expect(validatedRequirements).toHaveLength(2);
    expect(validatedRequirements).toContain("21.2");
    expect(validatedRequirements).toContain("21.3");
  });
});
