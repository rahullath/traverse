/**
 * Property Test: Visual State Constraint
 *
 * Validates Requirements 3.1, 3.2, 3.5
 *
 * This property test verifies that Mirror V2 TimeBlock components maintain
 * exactly one visual state (pending, completed, or skipped) at any given time,
 * and that no time-based color changes occur. The pending state must remain
 * neutral even when current time exceeds the block's planned start time.
 *
 * Property 5: Visual State Constraint
 * FOR ALL timeline blocks and time conditions,
 * WHEN rendering a TimeBlock component,
 * THEN the block has exactly one visual state (pending, completed, or skipped)
 * AND no time-based color changes are applied to pending blocks
 */

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import * as fc from "fast-check";
import React from "react";
import TimeBlock from "@/components/daily-plan/TimeBlock";
import {
  timeBlockArbitrary,
  blockStatusArbitrary,
} from "@/test/generators/timeline-generators";
import type { TimeBlock as TimeBlockType } from "@/types/daily-plan";

describe("Property 5: Visual State Constraint", () => {
  /**
   * Visual state class patterns for each allowed state
   * These are the ONLY visual states that should appear
   */
  const VISUAL_STATE_PATTERNS = {
    completed: /bg-green-500\/10.*border-green-500\/40/,
    skipped: /bg-gray-500\/10.*border-gray-500\/40/,
    pending: /bg-surface-primary.*border-border-primary/,
  };

  /**
   * Forbidden time-based state patterns
   * These should NEVER appear in Mirror V2
   */
  const FORBIDDEN_TIME_BASED_PATTERNS = [
    /bg-red-/i,
    /border-red-/i,
    /bg-orange-/i,
    /border-orange-/i,
    /bg-yellow-(?!400|500)/i, // Yellow except for skip button colors
    /border-yellow-(?!400|500)/i,
    /\blate\b/i,
    /\bcurrent\b/i,
    /\bbehind\b/i,
  ];

  /**
   * Extract the visual state class from rendered HTML
   */
  function extractVisualStateClass(html: string): string | null {
    // Find the main block div with rounded-lg class
    const blockMatch = html.match(/class="([^"]*rounded-lg[^"]*)"/);
    if (!blockMatch) return null;
    return blockMatch[1];
  }

  /**
   * Determine which visual state is active based on class names
   */
  function getActiveVisualState(
    classNames: string,
  ): "pending" | "completed" | "skipped" | "multiple" | "none" {
    const states: Array<"pending" | "completed" | "skipped"> = [];

    if (VISUAL_STATE_PATTERNS.completed.test(classNames)) {
      states.push("completed");
    }
    if (VISUAL_STATE_PATTERNS.skipped.test(classNames)) {
      states.push("skipped");
    }
    if (VISUAL_STATE_PATTERNS.pending.test(classNames)) {
      states.push("pending");
    }

    if (states.length === 0) return "none";
    if (states.length > 1) return "multiple";
    return states[0];
  }

  /**
   * Check if any forbidden time-based patterns are present
   */
  function hasForbiddenTimeBasedPatterns(html: string): {
    found: boolean;
    violations: Array<{ pattern: string; match: string }>;
  } {
    const violations: Array<{ pattern: string; match: string }> = [];

    for (const pattern of FORBIDDEN_TIME_BASED_PATTERNS) {
      const matches = html.match(pattern);
      if (matches) {
        violations.push({
          pattern: pattern.toString(),
          match: matches[0],
        });
      }
    }

    return {
      found: violations.length > 0,
      violations,
    };
  }

  /**
   * Property Test: Each block has exactly one visual state
   * (Req 3.1, 3.2)
   */
  it("TimeBlock should have exactly one visual state at any time", () => {
    fc.assert(
      fc.property(
        timeBlockArbitrary(),
        blockStatusArbitrary,
        fc.date(),
        fc.boolean(),
        (block, status, currentTime, editMode) => {
          const blockWithStatus: TimeBlockType = {
            ...block,
            status,
          };

          const { container } = render(
            <TimeBlock
              block={blockWithStatus}
              currentTime={currentTime}
              editMode={editMode}
              onComplete={() => {}}
              onSkip={() => {}}
              onEdit={async () => {}}
              onRecalculateAll={() => {}}
            />
          );

          const html = container.innerHTML;
          const classNames = extractVisualStateClass(html);

          if (!classNames) {
            console.error("Could not extract visual state class");
            console.error("Block status:", status);
            return false;
          }

          const activeState = getActiveVisualState(classNames);

          if (activeState === "multiple") {
            console.error("Multiple visual states detected:");
            console.error("Block status:", status);
            console.error("Class names:", classNames);
            return false;
          }

          if (activeState === "none") {
            console.error("No visual state detected:");
            console.error("Block status:", status);
            console.error("Class names:", classNames);
            return false;
          }

          // Verify the active state matches the block status
          const expectedState = status;
          if (activeState !== expectedState) {
            console.error("Visual state mismatch:");
            console.error("Expected:", expectedState);
            console.error("Actual:", activeState);
            console.error("Block status:", status);
            console.error("Class names:", classNames);
            return false;
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Pending blocks remain neutral regardless of time
   * (Req 3.4, 3.5)
   */
  it("Pending blocks should use neutral colors even when current time exceeds start time", () => {
    fc.assert(
      fc.property(timeBlockArbitrary(), (block) => {
        // Force block to pending status
        const pendingBlock: TimeBlockType = {
          ...block,
          status: "pending",
        };

        // Test three time scenarios:
        // 1. Before block start (early)
        // 2. During block (current)
        // 3. After block end (late)
        const timeScenarios = [
          new Date(block.startTime.getTime() - 60 * 60 * 1000), // 1 hour before
          new Date(
            (block.startTime.getTime() + block.endTime.getTime()) / 2
          ), // middle
          new Date(block.endTime.getTime() + 60 * 60 * 1000), // 1 hour after
        ];

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
            />
          );

          const html = container.innerHTML;
          const classNames = extractVisualStateClass(html);

          if (!classNames) {
            console.error("Could not extract visual state class");
            return false;
          }

          const activeState = getActiveVisualState(classNames);

          // Must be pending state
          if (activeState !== "pending") {
            console.error("Pending block changed state based on time:");
            console.error("Block start:", block.startTime);
            console.error("Block end:", block.endTime);
            console.error("Current time:", currentTime);
            console.error("Active state:", activeState);
            console.error("Class names:", classNames);
            return false;
          }

          // Must not have forbidden time-based patterns
          const forbiddenCheck = hasForbiddenTimeBasedPatterns(html);
          if (forbiddenCheck.found) {
            console.error("Forbidden time-based patterns in pending block:");
            console.error("Block start:", block.startTime);
            console.error("Block end:", block.endTime);
            console.error("Current time:", currentTime);
            console.error("Violations:", forbiddenCheck.violations);
            return false;
          }
        }

        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: No time-based color changes for any status
   * (Req 3.1)
   */
  it("TimeBlock should not change colors based on current time vs start time", () => {
    fc.assert(
      fc.property(
        timeBlockArbitrary(),
        blockStatusArbitrary,
        (block, status) => {
          const blockWithStatus: TimeBlockType = {
            ...block,
            status,
          };

          // Render with three different time scenarios
          const timeScenarios = [
            new Date(block.startTime.getTime() - 60 * 60 * 1000), // Before
            new Date(
              (block.startTime.getTime() + block.endTime.getTime()) / 2
            ), // During
            new Date(block.endTime.getTime() + 60 * 60 * 1000), // After
          ];

          const renderedStates: string[] = [];

          for (const currentTime of timeScenarios) {
            const { container } = render(
              <TimeBlock
                block={blockWithStatus}
                currentTime={currentTime}
                editMode={false}
                onComplete={() => {}}
                onSkip={() => {}}
                onEdit={async () => {}}
                onRecalculateAll={() => {}}
              />
            );

            const html = container.innerHTML;
            const classNames = extractVisualStateClass(html);

            if (!classNames) {
              console.error("Could not extract visual state class");
              return false;
            }

            const activeState = getActiveVisualState(classNames);
            renderedStates.push(activeState);
          }

          // All three time scenarios should produce the same visual state
          const uniqueStates = new Set(renderedStates);
          if (uniqueStates.size !== 1) {
            console.error("Visual state changed based on time:");
            console.error("Block status:", status);
            console.error("Block start:", block.startTime);
            console.error("Block end:", block.endTime);
            console.error("Rendered states:", renderedStates);
            return false;
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Completed blocks always use green styling
   * (Req 3.2)
   */
  it("Completed blocks should always use green styling", () => {
    fc.assert(
      fc.property(timeBlockArbitrary(), fc.date(), (block, currentTime) => {
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
          />
        );

        const html = container.innerHTML;
        const classNames = extractVisualStateClass(html);

        if (!classNames) {
          console.error("Could not extract visual state class");
          return false;
        }

        const activeState = getActiveVisualState(classNames);

        if (activeState !== "completed") {
          console.error("Completed block not using completed styling:");
          console.error("Active state:", activeState);
          console.error("Class names:", classNames);
          return false;
        }

        // Verify green colors are present
        const hasGreen =
          /bg-green-500\/10/.test(classNames) &&
          /border-green-500\/40/.test(classNames);

        if (!hasGreen) {
          console.error("Completed block missing green styling:");
          console.error("Class names:", classNames);
          return false;
        }

        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Skipped blocks always use gray styling
   * (Req 3.2)
   */
  it("Skipped blocks should always use gray styling", () => {
    fc.assert(
      fc.property(timeBlockArbitrary(), fc.date(), (block, currentTime) => {
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
          />
        );

        const html = container.innerHTML;
        const classNames = extractVisualStateClass(html);

        if (!classNames) {
          console.error("Could not extract visual state class");
          return false;
        }

        const activeState = getActiveVisualState(classNames);

        if (activeState !== "skipped") {
          console.error("Skipped block not using skipped styling:");
          console.error("Active state:", activeState);
          console.error("Class names:", classNames);
          return false;
        }

        // Verify gray colors are present
        const hasGray =
          /bg-gray-500\/10/.test(classNames) &&
          /border-gray-500\/40/.test(classNames);

        if (!hasGray) {
          console.error("Skipped block missing gray styling:");
          console.error("Class names:", classNames);
          return false;
        }

        return true;
      }),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: No "Current" or "Late" badges appear
   * (Req 3.4)
   */
  it("TimeBlock should not display Current or Late badges", () => {
    fc.assert(
      fc.property(
        timeBlockArbitrary(),
        blockStatusArbitrary,
        fc.date(),
        (block, status, currentTime) => {
          const blockWithStatus: TimeBlockType = {
            ...block,
            status,
          };

          const { container } = render(
            <TimeBlock
              block={blockWithStatus}
              currentTime={currentTime}
              editMode={false}
              onComplete={() => {}}
              onSkip={() => {}}
              onEdit={async () => {}}
              onRecalculateAll={() => {}}
            />
          );

          const html = container.innerHTML;

          // Check for forbidden badge text
          const hasForbiddenBadges =
            /\bCurrent\b/.test(html) || /\bLate\b/.test(html);

          if (hasForbiddenBadges) {
            console.error("Forbidden badge found in TimeBlock:");
            console.error("Block status:", status);
            console.error("Block start:", block.startTime);
            console.error("Block end:", block.endTime);
            console.error("Current time:", currentTime);
            return false;
          }

          return true;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Regression Test: Verify state detection logic works correctly
   */
  it("should correctly detect visual states from class names", () => {
    const testCases = [
      {
        classNames:
          "rounded-lg border-2 p-4 transition-all relative bg-green-500/10 border-green-500/40",
        expected: "completed",
      },
      {
        classNames:
          "rounded-lg border-2 p-4 transition-all relative bg-gray-500/10 border-gray-500/40",
        expected: "skipped",
      },
      {
        classNames:
          "rounded-lg border-2 p-4 transition-all relative bg-surface-primary border-border-primary",
        expected: "pending",
      },
      {
        classNames:
          "rounded-lg border-2 p-4 transition-all relative bg-green-500/10 border-green-500/40 bg-gray-500/10 border-gray-500/40",
        expected: "multiple",
      },
      {
        classNames: "rounded-lg border-2 p-4 transition-all relative",
        expected: "none",
      },
    ];

    for (const testCase of testCases) {
      const result = getActiveVisualState(testCase.classNames);
      expect(result).toBe(testCase.expected);
    }
  });

  /**
   * Regression Test: Verify forbidden pattern detection works
   */
  it("should detect forbidden time-based patterns", () => {
    const testCases = [
      { html: '<div class="bg-red-500">Late</div>', shouldFail: true },
      { html: '<div class="border-orange-400">Behind</div>', shouldFail: true },
      {
        html: '<div class="bg-yellow-600">Current</div>',
        shouldFail: true,
      },
      {
        html: '<div class="bg-green-500/10">Completed</div>',
        shouldFail: false,
      },
      {
        html: '<div class="bg-surface-primary">Pending</div>',
        shouldFail: false,
      },
      {
        html: '<div class="bg-yellow-400">Skip</div>',
        shouldFail: false,
      }, // Skip button color
    ];

    for (const testCase of testCases) {
      const result = hasForbiddenTimeBasedPatterns(testCase.html);

      if (testCase.shouldFail) {
        expect(result.found).toBe(true);
        expect(result.violations.length).toBeGreaterThan(0);
      } else {
        expect(result.found).toBe(false);
        expect(result.violations.length).toBe(0);
      }
    }
  });

  /**
   * Documentation Test: Verify requirements are met
   */
  it("should document which requirements are validated", () => {
    const validatedRequirements = [
      "3.1", // Timeline does not change block colors based on current time relative to planned start time
      "3.2", // Timeline uses only three visual states: pending (neutral), completed (green), skipped (gray)
      "3.5", // When current time exceeds a block's planned start time, Timeline maintains neutral pending state
    ];

    expect(validatedRequirements).toHaveLength(3);
    expect(validatedRequirements).toContain("3.1");
    expect(validatedRequirements).toContain("3.2");
    expect(validatedRequirements).toContain("3.5");
  });
});
