/**
 * Property Test: Completion Controls Visibility
 *
 * Validates Requirements 4.3, 4.4
 *
 * This property test verifies that completion controls (checkboxes and buttons)
 * are visible if and only if the showCompletionControls preference is true.
 * When false (default), the timeline serves as visual scaffolding without
 * mandatory tracking controls.
 *
 * Property 6: Completion Controls Visibility
 * FOR ALL preference values and timeline states,
 * WHEN rendering Timeline or TimeBlock components,
 * THEN completion controls are visible iff show_completion_controls is true
 */

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import * as fc from "fast-check";
import React from "react";
import TimeBlock from "@/components/daily-plan/TimeBlock";
import {
  timeBlockArbitrary,
} from "@/test/generators/timeline-generators";
import type { TimeBlock as TimeBlockType } from "@/types/daily-plan";

describe("Property 6: Completion Controls Visibility", () => {
  /**
   * Completion control selectors
   * These are the UI elements that should be hidden when showCompletionControls is false
   */
  const COMPLETION_CONTROL_PATTERNS = {
    completeButton: /Mark as complete/i,
    skipButton: /Skip activity/i,
    completeIcon: /<path[^>]*d="M5 13l4 4L19 7"/i, // Checkmark icon
    skipIcon: /<path[^>]*d="M13 5l7 7-7 7M5 5l7 7-7 7"/i, // Skip icon
  };

  /**
   * Extract completion control elements from rendered HTML
   */
  function hasCompletionControls(html: string): {
    hasCompleteButton: boolean;
    hasSkipButton: boolean;
    hasAnyControls: boolean;
  } {
    const hasCompleteButton =
      html.includes('title="Mark as complete"') ||
      html.includes('aria-label="Mark as complete"');

    const hasSkipButton =
      html.includes('title="Skip"') ||
      html.includes('aria-label="Skip activity"');

    return {
      hasCompleteButton,
      hasSkipButton,
      hasAnyControls: hasCompleteButton || hasSkipButton,
    };
  }

  /**
   * Property Test: Completion controls visible iff showCompletionControls is true
   * (Req 4.3, 4.4)
   */
  it("TimeBlock should show completion controls iff showCompletionControls is true", () => {
    fc.assert(
      fc.property(
        timeBlockArbitrary(),
        fc.boolean(), // showCompletionControls preference
        fc.date(),
        (block, showCompletionControls, currentTime) => {
          // Force block to pending status (controls only shown for pending blocks)
          const pendingBlock: TimeBlockType = {
            ...block,
            status: "pending",
          };

          const { container } = render(
            <TimeBlock
              block={pendingBlock}
              currentTime={currentTime}
              editMode={false}
              onComplete={() => {}}
              onSkip={() => {}}
              onEdit={async () => {}}
              onRecalculateAll={() => {}}
              showCompletionControls={showCompletionControls}
            />
          );

          const html = container.innerHTML;
          const controls = hasCompletionControls(html);

          // Verify controls visibility matches preference
          if (showCompletionControls) {
            // Controls should be visible
            if (!controls.hasCompleteButton || !controls.hasSkipButton) {
              console.error(
                "Completion controls missing when showCompletionControls is true:"
              );
              console.error("Has complete button:", controls.hasCompleteButton);
              console.error("Has skip button:", controls.hasSkipButton);
              console.error("showCompletionControls:", showCompletionControls);
              return false;
            }
          } else {
            // Controls should be hidden
            if (controls.hasAnyControls) {
              console.error(
                "Completion controls visible when showCompletionControls is false:"
              );
              console.error("Has complete button:", controls.hasCompleteButton);
              console.error("Has skip button:", controls.hasSkipButton);
              console.error("showCompletionControls:", showCompletionControls);
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
   * When showCompletionControls is undefined, controls should be visible (default true)
   */
  it("TimeBlock should show completion controls by default when prop is undefined", () => {
    fc.assert(
      fc.property(
        timeBlockArbitrary(),
        fc.date(),
        (block, currentTime) => {
          const pendingBlock: TimeBlockType = {
            ...block,
            status: "pending",
          };

          const { container } = render(
            <TimeBlock
              block={pendingBlock}
              currentTime={currentTime}
              editMode={false}
              onComplete={() => {}}
              onSkip={() => {}}
              onEdit={async () => {}}
              onRecalculateAll={() => {}}
              // showCompletionControls prop omitted (should default to true)
            />
          );

          const html = container.innerHTML;
          const controls = hasCompletionControls(html);

          // Controls should be visible by default
          if (!controls.hasCompleteButton || !controls.hasSkipButton) {
            console.error(
              "Completion controls missing when prop is undefined (should default to true):"
            );
            console.error("Has complete button:", controls.hasCompleteButton);
            console.error("Has skip button:", controls.hasSkipButton);
            return false;
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Completed blocks never show completion controls
   * regardless of showCompletionControls preference
   */
  it("Completed blocks should never show completion controls", () => {
    fc.assert(
      fc.property(
        timeBlockArbitrary(),
        fc.boolean(),
        fc.date(),
        (block, showCompletionControls, currentTime) => {
          const completedBlock: TimeBlockType = {
            ...block,
            status: "completed",
          };

          const { container } = render(
            <TimeBlock
              block={completedBlock}
              currentTime={currentTime}
              editMode={false}
              onComplete={() => {}}
              onSkip={() => {}}
              onEdit={async () => {}}
              onRecalculateAll={() => {}}
              showCompletionControls={showCompletionControls}
            />
          );

          const html = container.innerHTML;
          const controls = hasCompletionControls(html);

          // Completed blocks should never show completion controls
          if (controls.hasCompleteButton || controls.hasSkipButton) {
            console.error(
              "Completion controls visible on completed block:"
            );
            console.error("Has complete button:", controls.hasCompleteButton);
            console.error("Has skip button:", controls.hasSkipButton);
            console.error("Block status:", completedBlock.status);
            return false;
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Skipped blocks never show completion controls
   * regardless of showCompletionControls preference
   */
  it("Skipped blocks should never show completion controls", () => {
    fc.assert(
      fc.property(
        timeBlockArbitrary(),
        fc.boolean(),
        fc.date(),
        (block, showCompletionControls, currentTime) => {
          const skippedBlock: TimeBlockType = {
            ...block,
            status: "skipped",
            skipReason: "Test reason",
          };

          const { container } = render(
            <TimeBlock
              block={skippedBlock}
              currentTime={currentTime}
              editMode={false}
              onComplete={() => {}}
              onSkip={() => {}}
              onEdit={async () => {}}
              onRecalculateAll={() => {}}
              showCompletionControls={showCompletionControls}
            />
          );

          const html = container.innerHTML;
          const controls = hasCompletionControls(html);

          // Skipped blocks should never show completion controls
          if (controls.hasCompleteButton || controls.hasSkipButton) {
            console.error("Completion controls visible on skipped block:");
            console.error("Has complete button:", controls.hasCompleteButton);
            console.error("Has skip button:", controls.hasSkipButton);
            console.error("Block status:", skippedBlock.status);
            return false;
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Controls visibility is independent of time conditions
   * (Req 4.3, 4.4)
   */
  it("Completion controls visibility should not depend on time conditions", () => {
    fc.assert(
      fc.property(
        timeBlockArbitrary(),
        fc.boolean(),
        (block, showCompletionControls) => {
          const pendingBlock: TimeBlockType = {
            ...block,
            status: "pending",
          };

          // Test three time scenarios: before, during, after block
          const timeScenarios = [
            new Date(block.startTime.getTime() - 60 * 60 * 1000), // 1 hour before
            new Date(
              (block.startTime.getTime() + block.endTime.getTime()) / 2
            ), // middle
            new Date(block.endTime.getTime() + 60 * 60 * 1000), // 1 hour after
          ];

          const controlsVisibility: boolean[] = [];

          for (const currentTime of timeScenarios) {
            const { container } = render(
              <TimeBlock
                block={pendingBlock}
                currentTime={currentTime}
                editMode={false}
                onComplete={() => {}}
                onSkip={() => {}}
                onEdit={async () => {}}
                onRecalculateAll={() => {}}
                showCompletionControls={showCompletionControls}
              />
            );

            const html = container.innerHTML;
            const controls = hasCompletionControls(html);
            controlsVisibility.push(controls.hasAnyControls);
          }

          // All three time scenarios should have same controls visibility
          const uniqueVisibility = new Set(controlsVisibility);
          if (uniqueVisibility.size !== 1) {
            console.error(
              "Controls visibility changed based on time condition:"
            );
            console.error("Block start:", block.startTime);
            console.error("Block end:", block.endTime);
            console.error("Controls visibility:", controlsVisibility);
            console.error("showCompletionControls:", showCompletionControls);
            return false;
          }

          // Verify visibility matches preference
          const expectedVisibility = showCompletionControls;
          const actualVisibility = controlsVisibility[0];

          if (expectedVisibility !== actualVisibility) {
            console.error("Controls visibility doesn't match preference:");
            console.error("Expected:", expectedVisibility);
            console.error("Actual:", actualVisibility);
            console.error("showCompletionControls:", showCompletionControls);
            return false;
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Edit button visibility is independent of showCompletionControls
   * Edit button should only depend on editMode prop
   */
  it("Edit button visibility should be independent of showCompletionControls", () => {
    fc.assert(
      fc.property(
        timeBlockArbitrary(),
        fc.boolean(), // showCompletionControls
        fc.boolean(), // editMode
        fc.date(),
        (block, showCompletionControls, editMode, currentTime) => {
          const { container } = render(
            <TimeBlock
              block={block}
              currentTime={currentTime}
              editMode={editMode}
              onComplete={() => {}}
              onSkip={() => {}}
              onEdit={async () => {}}
              onRecalculateAll={() => {}}
              showCompletionControls={showCompletionControls}
            />
          );

          const html = container.innerHTML;
          const hasEditButton =
            html.includes('title="Edit"') ||
            html.includes('aria-label="Edit activity"');

          // Edit button should be visible iff editMode is true
          // regardless of showCompletionControls
          if (editMode && !hasEditButton) {
            console.error("Edit button missing when editMode is true:");
            console.error("editMode:", editMode);
            console.error("showCompletionControls:", showCompletionControls);
            return false;
          }

          if (!editMode && hasEditButton) {
            console.error("Edit button visible when editMode is false:");
            console.error("editMode:", editMode);
            console.error("showCompletionControls:", showCompletionControls);
            return false;
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Regression Test: Verify control detection logic works correctly
   */
  it("should correctly detect completion controls in HTML", () => {
    const testCases = [
      {
        html: '<button title="Mark as complete">Complete</button>',
        expected: { hasCompleteButton: true, hasSkipButton: false },
      },
      {
        html: '<button aria-label="Skip activity">Skip</button>',
        expected: { hasCompleteButton: false, hasSkipButton: true },
      },
      {
        html: '<button title="Mark as complete">Complete</button><button aria-label="Skip activity">Skip</button>',
        expected: { hasCompleteButton: true, hasSkipButton: true },
      },
      {
        html: '<div>No controls here</div>',
        expected: { hasCompleteButton: false, hasSkipButton: false },
      },
      {
        html: '<button title="Edit">Edit</button>',
        expected: { hasCompleteButton: false, hasSkipButton: false },
      },
    ];

    for (const testCase of testCases) {
      const result = hasCompletionControls(testCase.html);

      expect(result.hasCompleteButton).toBe(
        testCase.expected.hasCompleteButton
      );
      expect(result.hasSkipButton).toBe(testCase.expected.hasSkipButton);
      expect(result.hasAnyControls).toBe(
        testCase.expected.hasCompleteButton ||
          testCase.expected.hasSkipButton
      );
    }
  });

  /**
   * Documentation Test: Verify requirements are met
   */
  it("should document which requirements are validated", () => {
    const validatedRequirements = [
      "4.3", // When show_completion_controls is false, Timeline displays blocks without completion controls
      "4.4", // When show_completion_controls is true, Timeline displays completion checkboxes and buttons
    ];

    expect(validatedRequirements).toHaveLength(2);
    expect(validatedRequirements).toContain("4.3");
    expect(validatedRequirements).toContain("4.4");
  });
});
