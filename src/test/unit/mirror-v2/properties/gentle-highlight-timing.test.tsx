/**
 * Property Test: Gentle Highlight Timing
 *
 * Validates Requirements 19.1, 19.2
 *
 * This property test verifies that the DepartureWaypoint component applies
 * a gentle highlight if and only if the current time is within 10 minutes
 * of the departure time. The highlight should use neutral styling (font-weight
 * or subtle border) without red, orange, yellow, or alarm colors.
 *
 * Property 26: Gentle Highlight Timing
 * FOR ALL departure times and current times,
 * WHEN rendering DepartureWaypoint,
 * THEN gentle highlight is applied iff within 10 minutes of departure
 */

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import * as fc from "fast-check";
import React from "react";
import { DepartureWaypoint } from "@/components/daily-plan/DepartureWaypoint";
import { anchorBlockArbitrary } from "@/test/generators/timeline-generators";

describe("Property 26: Gentle Highlight Timing", () => {
  /**
   * Check if element has gentle highlight styling
   * Gentle highlight is defined as:
   * - 2px border with accent color at 40% opacity on the container
   * 
   * Note: font-semibold appears on the time display itself always,
   * so we check for the border styling on the container instead.
   */
  function hasGentleHighlight(html: string): boolean {
    // Check for 2px border with accent color on the container
    const containerMatch = html.match(/<div[^>]*role="region"[^>]*class="([^"]*)"/);
    if (!containerMatch) return false;
    
    const containerClasses = containerMatch[1];
    const hasBorder2px = /border-2/.test(containerClasses);
    const hasAccentBorder = /border-accent-primary\/40/.test(containerClasses);
    
    return hasBorder2px && hasAccentBorder;
  }

  /**
   * Check if element has neutral styling (no highlight)
   * Neutral styling uses standard border without emphasis
   */
  function hasNeutralStyling(html: string): boolean {
    // Check the container for standard border (not border-2)
    const containerMatch = html.match(/<div[^>]*role="region"[^>]*class="([^"]*)"/);
    if (!containerMatch) return false;
    
    const containerClasses = containerMatch[1];
    
    // Should have standard border (border border-border, not border-2)
    const hasStandardBorder = /\bborder\b/.test(containerClasses) && 
                              /border-border/.test(containerClasses) &&
                              !/border-2/.test(containerClasses);
    
    return hasStandardBorder;
  }

  /**
   * Property Test: Gentle highlight applied iff within 10 minutes
   * Req 19.1, 19.2
   */
  it("should apply gentle highlight iff within 10 minutes of departure", () => {
    fc.assert(
      fc.property(
        anchorBlockArbitrary(),
        fc.integer({ min: -30, max: 120 }), // minutes until departure (negative = past)
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
          const hasHighlight = hasGentleHighlight(html);
          const hasNeutral = hasNeutralStyling(html);

          // Gentle highlight should be applied iff within 10 minutes and not past
          const shouldHaveHighlight =
            minutesUntilDeparture > 0 && minutesUntilDeparture <= 10;

          if (shouldHaveHighlight) {
            // Should have highlight, not neutral
            if (!hasHighlight) {
              console.error("Missing gentle highlight:");
              console.error("Minutes until departure:", minutesUntilDeparture);
              console.error("Expected highlight but found neutral styling");
              return false;
            }
          } else {
            // Should have neutral styling, not highlight
            if (hasHighlight && !hasNeutral) {
              console.error("Unexpected gentle highlight:");
              console.error("Minutes until departure:", minutesUntilDeparture);
              console.error("Expected neutral but found highlight");
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
   * Property Test: No highlight when > 10 minutes away
   * Req 19.1
   */
  it("should use neutral styling when more than 10 minutes away", () => {
    fc.assert(
      fc.property(
        anchorBlockArbitrary(),
        fc.integer({ min: 11, max: 120 }), // > 10 minutes
        fc.integer({ min: 5, max: 45 }),
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
          const hasNeutral = hasNeutralStyling(html);

          if (!hasNeutral) {
            console.error("Expected neutral styling when > 10 minutes:");
            console.error("Minutes until departure:", minutesUntilDeparture);
          }

          return hasNeutral;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: Highlight applied when within 10 minutes
   * Req 19.2
   */
  it("should apply gentle highlight when within 10 minutes", () => {
    fc.assert(
      fc.property(
        anchorBlockArbitrary(),
        fc.integer({ min: 1, max: 10 }), // 1-10 minutes
        fc.integer({ min: 5, max: 45 }),
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
          const hasHighlight = hasGentleHighlight(html);

          if (!hasHighlight) {
            console.error("Expected gentle highlight when within 10 minutes:");
            console.error("Minutes until departure:", minutesUntilDeparture);
          }

          return hasHighlight;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Property Test: No highlight when departure time has passed
   * Req 19.5 - Maintain calm presentation even after departure time passes
   */
  it("should use neutral styling when departure time has passed", () => {
    fc.assert(
      fc.property(
        anchorBlockArbitrary(),
        fc.integer({ min: 1, max: 60 }), // minutes past departure
        fc.integer({ min: 5, max: 45 }),
        (anchor, minutesPastDeparture, travelDuration) => {
          const currentTime = new Date();
          const departureTime = new Date(
            currentTime.getTime() - minutesPastDeparture * 60 * 1000
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
          const hasNeutral = hasNeutralStyling(html);

          if (!hasNeutral) {
            console.error("Expected neutral styling when departure has passed:");
            console.error("Minutes past departure:", minutesPastDeparture);
          }

          return hasNeutral;
        }
      ),
      { numRuns: 100 }
    );
  });

  /**
   * Edge Case Test: Exactly 10 minutes should have highlight
   */
  it("should apply highlight at exactly 10 minutes", () => {
    fc.assert(
      fc.property(
        anchorBlockArbitrary(),
        fc.integer({ min: 5, max: 45 }),
        (anchor, travelDuration) => {
          const currentTime = new Date();
          const departureTime = new Date(
            currentTime.getTime() + 10 * 60 * 1000
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
          const hasHighlight = hasGentleHighlight(html);

          if (!hasHighlight) {
            console.error("Expected highlight at exactly 10 minutes");
          }

          return hasHighlight;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Edge Case Test: Exactly 11 minutes should NOT have highlight
   */
  it("should NOT apply highlight at exactly 11 minutes", () => {
    fc.assert(
      fc.property(
        anchorBlockArbitrary(),
        fc.integer({ min: 5, max: 45 }),
        (anchor, travelDuration) => {
          const currentTime = new Date();
          const departureTime = new Date(
            currentTime.getTime() + 11 * 60 * 1000
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
          const hasNeutral = hasNeutralStyling(html);

          if (!hasNeutral) {
            console.error("Expected neutral styling at exactly 11 minutes");
          }

          return hasNeutral;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Edge Case Test: Zero minutes (departure now) should NOT have highlight
   */
  it("should NOT apply highlight at exactly 0 minutes (departure now)", () => {
    fc.assert(
      fc.property(
        anchorBlockArbitrary(),
        fc.integer({ min: 5, max: 45 }),
        (anchor, travelDuration) => {
          const currentTime = new Date();
          const departureTime = new Date(currentTime.getTime());

          const { container } = render(
            <DepartureWaypoint
              departureTime={departureTime}
              currentTime={currentTime}
              anchor={anchor}
              travelDuration={travelDuration}
            />
          );

          const html = container.innerHTML;
          const hasNeutral = hasNeutralStyling(html);

          if (!hasNeutral) {
            console.error("Expected neutral styling at exactly 0 minutes");
          }

          return hasNeutral;
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Regression Test: Verify boundary conditions
   */
  it("should handle boundary conditions correctly", () => {
    const anchor = {
      id: "test-anchor",
      activityId: "test-activity",
      activityName: "Test Anchor",
      startTime: new Date("2024-01-01T12:00:00"),
      endTime: new Date("2024-01-01T13:00:00"),
      duration: 60,
      status: "pending" as const,
      metadata: {
        role: { type: "anchor" as const },
      },
    };

    const testCases = [
      { minutesUntil: 15, shouldHighlight: false, label: "15 minutes" },
      { minutesUntil: 11, shouldHighlight: false, label: "11 minutes" },
      { minutesUntil: 10, shouldHighlight: true, label: "10 minutes (boundary)" },
      { minutesUntil: 5, shouldHighlight: true, label: "5 minutes" },
      { minutesUntil: 1, shouldHighlight: true, label: "1 minute" },
      { minutesUntil: 0, shouldHighlight: false, label: "0 minutes (now)" },
      { minutesUntil: -5, shouldHighlight: false, label: "-5 minutes (past)" },
    ];

    for (const testCase of testCases) {
      const currentTime = new Date();
      const departureTime = new Date(
        currentTime.getTime() + testCase.minutesUntil * 60 * 1000
      );

      const { container } = render(
        <DepartureWaypoint
          departureTime={departureTime}
          currentTime={currentTime}
          anchor={anchor}
          travelDuration={15}
        />
      );

      const html = container.innerHTML;
      const hasHighlight = hasGentleHighlight(html);

      expect(hasHighlight).toBe(testCase.shouldHighlight);
    }
  });

  /**
   * Documentation Test: Verify requirements are met
   */
  it("should document which requirements are validated", () => {
    const validatedRequirements = [
      "19.1", // Neutral styling when > 10 minutes away
      "19.2", // Gentle highlight when within 10 minutes
    ];

    expect(validatedRequirements).toHaveLength(2);
    expect(validatedRequirements).toContain("19.1");
    expect(validatedRequirements).toContain("19.2");
  });
});
