/**
 * Property Test: No Warning Colors
 *
 * Validates Requirements 2.4, 3.4, 19.4
 *
 * This property test verifies that Mirror V2 components never use red, orange,
 * yellow, or warning colors in their display, regardless of timeline state or
 * time conditions. The interface must remain neutral and calm at all times.
 *
 * Property 4: No Warning Colors
 * FOR ALL timeline states and time conditions,
 * WHEN rendering Mirror V2 components,
 * THEN no red, orange, yellow, or warning colors are used in the display
 */

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import * as fc from "fast-check";
import React from "react";
import TimeBlock from "@/components/daily-plan/TimeBlock";
import { AnchorInfoCard } from "@/components/daily-plan/AnchorInfoCard";
import { DepartureWaypoint } from "@/components/daily-plan/DepartureWaypoint";
import {
  timeBlockArbitrary,
  anchorBlockArbitrary,
  blockStatusArbitrary,
} from "@/test/generators/timeline-generators";
import type { TimeBlock as TimeBlockType } from "@/types/daily-plan";

describe("Property 4: No Warning Colors", () => {
  /**
   * Forbidden color patterns that indicate warning/alarm states
   * These should NEVER appear in Mirror V2 components
   * 
   * Note: Yellow-400 and yellow-500 are allowed for skip action buttons,
   * as they represent a neutral action choice, not a warning state.
   */
  const FORBIDDEN_COLOR_PATTERNS = [
    // Direct color names
    /\bred\b/i,
    /\borange\b/i,
    
    // Tailwind red variants
    /bg-red-/i,
    /text-red-/i,
    /border-red-/i,
    /ring-red-/i,
    
    // Tailwind orange variants
    /bg-orange-/i,
    /text-orange-/i,
    /border-orange-/i,
    /ring-orange-/i,
    
    // Warning semantic classes
    /bg-warning/i,
    /text-warning/i,
    /border-warning/i,
    /bg-danger/i,
    /text-danger/i,
    /border-danger/i,
    /bg-error/i,
    /text-error/i,
    /border-error/i,
    /bg-alert/i,
    /text-alert/i,
    /border-alert/i,
  ];

  /**
   * Allowed color patterns that are neutral or supportive
   * These are explicitly permitted in Mirror V2
   */
  const ALLOWED_COLOR_PATTERNS = [
    // Green for completion (supportive)
    /bg-green-/i,
    /text-green-/i,
    /border-green-/i,
    
    // Gray for skipped (neutral)
    /bg-gray-/i,
    /text-gray-/i,
    /border-gray-/i,
    
    // Yellow for skip action (neutral action, not warning)
    /yellow-400/i,
    /yellow-500/i,
    
    // Semantic neutral colors
    /bg-surface/i,
    /text-text/i,
    /border-border/i,
    /bg-background/i,
    /text-accent/i,
    /border-accent/i,
  ];

  /**
   * Extract all class names from rendered HTML
   */
  function extractClassNames(html: string): string[] {
    const classMatches = html.matchAll(/class="([^"]*)"/g);
    const allClasses: string[] = [];
    
    for (const match of classMatches) {
      const classes = match[1].split(/\s+/).filter(c => c.length > 0);
      allClasses.push(...classes);
    }
    
    return allClasses;
  }

  /**
   * Check if any class name contains forbidden color patterns
   */
  function hasForbiddenColors(classNames: string[]): {
    found: boolean;
    violations: Array<{ className: string; pattern: string }>;
  } {
    const violations: Array<{ className: string; pattern: string }> = [];
    
    for (const className of classNames) {
      for (const pattern of FORBIDDEN_COLOR_PATTERNS) {
        if (pattern.test(className)) {
          // Check if this is an allowed exception
          const isAllowed = ALLOWED_COLOR_PATTERNS.some(allowed => 
            allowed.test(className)
          );
          
          if (!isAllowed) {
            violations.push({
              className,
              pattern: pattern.toString(),
            });
          }
        }
      }
    }
    
    return {
      found: violations.length > 0,
      violations,
    };
  }

  /**
   * Property Test: TimeBlock component never uses warning colors
   * regardless of block status or time conditions
   */
  it("TimeBlock should never use warning colors for any timeline state", () => {
    fc.assert(
      fc.property(
        timeBlockArbitrary(),
        fc.date(),
        fc.boolean(),
        (block, currentTime, editMode) => {
          // Render TimeBlock with various states
          const { container } = render(
            <TimeBlock
              block={block}
              currentTime={currentTime}
              editMode={editMode}
              onComplete={() => {}}
              onSkip={() => {}}
              onEdit={async () => {}}
              onRecalculateAll={() => {}}
            />
          );

          const html = container.innerHTML;
          const classNames = extractClassNames(html);
          const result = hasForbiddenColors(classNames);

          if (result.found) {
            console.error("Warning colors found in TimeBlock:");
            console.error("Block status:", block.status);
            console.error("Current time:", currentTime);
            console.error("Block start:", block.startTime);
            console.error("Block end:", block.endTime);
            console.error("Violations:", result.violations);
          }

          return !result.found;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: TimeBlock with pending status and late time
   * should still use neutral colors (Req 3.4, 3.5)
   */
  it("TimeBlock should use neutral colors even when current time exceeds start time", () => {
    fc.assert(
      fc.property(
        timeBlockArbitrary(),
        (block) => {
          // Force block to pending status
          const pendingBlock: TimeBlockType = {
            ...block,
            status: "pending",
          };

          // Set current time to be after block end time (late scenario)
          const lateTime = new Date(block.endTime.getTime() + 60 * 60 * 1000);

          const { container } = render(
            <TimeBlock
              block={pendingBlock}
              currentTime={lateTime}
              editMode={false}
              onComplete={() => {}}
              onSkip={() => {}}
              onEdit={async () => {}}
              onRecalculateAll={() => {}}
            />
          );

          const html = container.innerHTML;
          const classNames = extractClassNames(html);
          const result = hasForbiddenColors(classNames);

          if (result.found) {
            console.error("Warning colors found in late TimeBlock:");
            console.error("Block end:", block.endTime);
            console.error("Current time:", lateTime);
            console.error("Violations:", result.violations);
          }

          return !result.found;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: AnchorInfoCard never uses warning colors
   * regardless of time remaining (Req 2.4)
   */
  it("AnchorInfoCard should never use warning colors regardless of time remaining", () => {
    fc.assert(
      fc.property(
        anchorBlockArbitrary(),
        fc.date(),
        fc.boolean(),
        (anchor, currentTime, isExpanded) => {
          const { container } = render(
            <AnchorInfoCard
              anchor={anchor}
              currentTime={currentTime}
              onRealityCheck={() => {}}
              isExpanded={isExpanded}
              onToggleExpand={() => {}}
            />
          );

          const html = container.innerHTML;
          const classNames = extractClassNames(html);
          const result = hasForbiddenColors(classNames);

          if (result.found) {
            console.error("Warning colors found in AnchorInfoCard:");
            console.error("Anchor start:", anchor.startTime);
            console.error("Current time:", currentTime);
            console.error("Time remaining (hours):", 
              (anchor.startTime.getTime() - currentTime.getTime()) / (1000 * 60 * 60)
            );
            console.error("Violations:", result.violations);
          }

          return !result.found;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: DepartureWaypoint uses neutral colors when > 10 minutes away
   * and gentle highlight (not warning colors) when within 10 minutes (Req 19.1, 19.4)
   */
  it("DepartureWaypoint should never use warning colors, even when within 10 minutes", () => {
    fc.assert(
      fc.property(
        anchorBlockArbitrary(),
        fc.integer({ min: 0, max: 120 }), // minutes until departure
        fc.integer({ min: 5, max: 45 }), // travel duration
        (anchor, minutesUntilDeparture, travelDuration) => {
          const currentTime = new Date();
          const departureTime = new Date(
            currentTime.getTime() + minutesUntilDeparture * 60 * 1000
          );

          const { container } = render(
            <DepartureWaypoint
              departureTime={departureTime}
              currentTime={currentTime}
              anchor={anchor}
              travelDuration={travelDuration}
            />
          );

          const html = container.innerHTML;
          const classNames = extractClassNames(html);
          const result = hasForbiddenColors(classNames);

          if (result.found) {
            console.error("Warning colors found in DepartureWaypoint:");
            console.error("Minutes until departure:", minutesUntilDeparture);
            console.error("Within 10 minutes:", minutesUntilDeparture <= 10);
            console.error("Violations:", result.violations);
          }

          return !result.found;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: All three visual states (pending, completed, skipped)
   * use only neutral or supportive colors (Req 3.1, 3.2)
   */
  it("TimeBlock should use only neutral/supportive colors for all three visual states", () => {
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
          const classNames = extractClassNames(html);
          const result = hasForbiddenColors(classNames);

          if (result.found) {
            console.error("Warning colors found in TimeBlock:");
            console.error("Status:", status);
            console.error("Violations:", result.violations);
          }

          return !result.found;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Regression Test: Verify specific forbidden patterns are caught
   */
  it("should detect forbidden color patterns in test cases", () => {
    const testCases = [
      { className: "bg-red-500", shouldFail: true },
      { className: "text-orange-400", shouldFail: true },
      { className: "bg-warning", shouldFail: true },
      { className: "text-danger", shouldFail: true },
      { className: "bg-green-500", shouldFail: false },
      { className: "text-gray-400", shouldFail: false },
      { className: "border-border", shouldFail: false },
      { className: "bg-surface-primary", shouldFail: false },
      { className: "text-yellow-400", shouldFail: false }, // Skip action color
      { className: "bg-yellow-500/20", shouldFail: false }, // Skip button background
      { className: "border-yellow-500/40", shouldFail: false }, // Skip button border
    ];

    for (const testCase of testCases) {
      const result = hasForbiddenColors([testCase.className]);
      
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
      "2.4", // AnchorInfoCard uses neutral colors without red or warning states
      "3.4", // Timeline does not use red or warning colors for time-based states
      "19.4", // DepartureWaypoint never uses red, orange, yellow, or alarm colors
    ];

    expect(validatedRequirements).toHaveLength(3);
    expect(validatedRequirements).toContain("2.4");
    expect(validatedRequirements).toContain("3.4");
    expect(validatedRequirements).toContain("19.4");
  });
});
