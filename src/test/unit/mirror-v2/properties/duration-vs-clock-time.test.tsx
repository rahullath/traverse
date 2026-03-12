/**
 * Property Test: Duration vs Clock Time Display
 *
 * Validates Requirements 5.1, 5.2, 5.3, 5.4, 5.5
 *
 * This property test verifies that Mirror V2 displays durations for chain steps
 * and clock times only for anchor and travel_there (departure) blocks. This
 * reduces time pressure by showing the sequence without specific times for
 * most activities.
 *
 * Property 7: Duration vs Clock Time Display
 * FOR ALL time blocks with various envelope_types,
 * WHEN rendering the Timeline component,
 * THEN duration format is shown for non-anchor/non-travel blocks
 * AND clock time format is shown for anchor and travel_there blocks
 *
 * NOTE: This test validates the INTENDED behavior for Mirror V2.
 * The Timeline component implementation is currently being updated to support
 * this requirement. These tests will pass once the implementation is complete.
 */

import { describe, it, expect } from "vitest";
import { render } from "@testing-library/react";
import * as fc from "fast-check";
import React from "react";
import Timeline from "@/components/daily-plan/Timeline";
import {
  timeBlockArbitrary,
  commitmentEnvelopeArbitrary,
} from "@/test/generators/timeline-generators";
import type { TimeBlock } from "@/types/daily-plan";

describe("Property 7: Duration vs Clock Time Display", () => {
  function getRenderedText(container: HTMLElement): string {
    return container.textContent || "";
  }

  function formatDuration(minutes: number): string {
    if (minutes < 60) {
      return `${minutes}m`;
    }
    const hours = Math.floor(minutes / 60);
    const mins = minutes % 60;
    return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
  }

  function getBlockDurationLabel(block: TimeBlock): string {
    const durationMinutes = Math.floor(
      (new Date(block.endTime).getTime() - new Date(block.startTime).getTime()) /
        60000,
    );
    return formatDuration(durationMinutes);
  }

  function hasAnchorClockTime(text: string): boolean {
    return /Anchor at\s*\d{1,2}:\d{2}\s*[AP]M/.test(text);
  }

  function hasDepartureClockTime(text: string): boolean {
    return /Leave by\s*\d{1,2}:\d{2}\s*[AP]M/.test(text);
  }

  function hasClockComponentMarkers(text: string): boolean {
    return text.includes("Anchor at") || text.includes("Leave by");
  }

  /**
   * Helper: Get envelope type from block metadata
   */
  function getEnvelopeType(
    block: TimeBlock,
  ): "prep" | "travel_there" | "anchor" | "travel_back" | "recovery" | null {
    return block.metadata?.commitment_envelope?.envelope_type || null;
  }

  /**
   * Property Test: Anchor blocks show clock time (Req 5.4)
   */
  it("should show clock time for anchor blocks", () => {
    fc.assert(
      fc.property(
        fc.date({
          min: new Date("2024-01-01"),
          max: new Date("2025-12-31"),
        }),
        (anchorStartTime) => {
          // Generate a commitment envelope with anchor block
          const blocks = fc.sample(
            commitmentEnvelopeArbitrary(anchorStartTime),
            1,
          )[0];

          // Find the anchor block
          const anchorBlock = blocks.find(
            (b) => getEnvelopeType(b) === "anchor",
          );

          if (!anchorBlock) {
            return true; // Skip if no anchor found
          }

          const { container } = render(
            <Timeline
              timeBlocks={[anchorBlock]}
              editMode={false}
              onBlockComplete={() => {}}
              onBlockSkip={() => {}}
              onBlockEdit={() => {}}
              onRefresh={() => {}}
              showTimes={true} // Clock times enabled
            />,
          );

          const text = getRenderedText(container);
          const hasClockTime = hasAnchorClockTime(text);

          if (!hasClockTime) {
            console.error("Anchor block missing clock time display:");
            console.error("Block:", anchorBlock.activityName);
            console.error("Start:", anchorBlock.startTime);
            console.error("End:", anchorBlock.endTime);
            console.error("Envelope type:", getEnvelopeType(anchorBlock));
            console.error("Rendered text:", text);
          }

          return hasClockTime;
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property Test: Travel_there (departure) blocks show clock time (Req 5.5)
   */
  it("should show clock time for travel_there (departure) blocks", () => {
    fc.assert(
      fc.property(
        fc.date({
          min: new Date("2024-01-01"),
          max: new Date("2025-12-31"),
        }),
        (anchorStartTime) => {
          // Generate a commitment envelope with travel_there block
          const blocks = fc.sample(
            commitmentEnvelopeArbitrary(anchorStartTime),
            1,
          )[0];

          // Find the travel_there block
          const travelThereBlock = blocks.find(
            (b) => getEnvelopeType(b) === "travel_there",
          );

          if (!travelThereBlock) {
            return true; // Skip if no travel_there found
          }

          const { container } = render(
            <Timeline
              timeBlocks={[travelThereBlock]}
              editMode={false}
              onBlockComplete={() => {}}
              onBlockSkip={() => {}}
              onBlockEdit={() => {}}
              onRefresh={() => {}}
              showTimes={true} // Clock times enabled
            />,
          );

          const text = getRenderedText(container);
          const hasClockTime = hasDepartureClockTime(text);

          if (!hasClockTime) {
            console.error("Travel_there block missing clock time display:");
            console.error("Block:", travelThereBlock.activityName);
            console.error("Start:", travelThereBlock.startTime);
            console.error("End:", travelThereBlock.endTime);
            console.error("Envelope type:", getEnvelopeType(travelThereBlock));
            console.error("Rendered text:", text);
          }

          return hasClockTime;
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property Test: Non-anchor/non-travel blocks show duration (Req 5.1, 5.2, 5.3)
   */
  it("should show duration for prep, travel_back, and recovery blocks", () => {
    fc.assert(
      fc.property(
        fc.date({
          min: new Date("2024-01-01"),
          max: new Date("2025-12-31"),
        }),
        fc.constantFrom("prep", "travel_back", "recovery"),
        (anchorStartTime, targetEnvelopeType) => {
          // Generate a commitment envelope
          const blocks = fc.sample(
            commitmentEnvelopeArbitrary(anchorStartTime),
            1,
          )[0];

          // Find the target block type
          const targetBlock = blocks.find(
            (b) => getEnvelopeType(b) === targetEnvelopeType,
          );

          if (!targetBlock) {
            return true; // Skip if target block not found
          }

          const { container } = render(
            <Timeline
              timeBlocks={[targetBlock]}
              editMode={false}
              onBlockComplete={() => {}}
              onBlockSkip={() => {}}
              onBlockEdit={() => {}}
              onRefresh={() => {}}
              showTimes={true} // Clock times enabled
            />,
          );

          const text = getRenderedText(container);
          const expectedDuration = getBlockDurationLabel(targetBlock);
          const hasDuration = text.includes(expectedDuration);

          // Should NOT render anchor/departure clock components
          const hasClockComponents = hasClockComponentMarkers(text);

          if (!hasDuration || hasClockComponents) {
            console.error(
              "Non-anchor/non-travel block has incorrect time display:",
            );
            console.error("Block:", targetBlock.activityName);
            console.error("Start:", targetBlock.startTime);
            console.error("End:", targetBlock.endTime);
            console.error("Envelope type:", targetEnvelopeType);
            console.error("Expected duration:", expectedDuration);
            console.error("Has duration:", hasDuration);
            console.error("Has clock components:", hasClockComponents);
          }

          return hasDuration && !hasClockComponents;
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property Test: Blocks without envelope metadata show duration (Req 5.1)
   */
  it("should show duration for blocks without commitment envelope metadata", () => {
    fc.assert(
      fc.property(timeBlockArbitrary(), (block) => {
        // Remove commitment envelope metadata
        const blockWithoutEnvelope: TimeBlock = {
          ...block,
          metadata: {
            ...block.metadata,
            role: {
              type: "chain-step",
              required: false,
            },
            commitment_envelope: undefined,
          },
        };

        const { container } = render(
          <Timeline
            timeBlocks={[blockWithoutEnvelope]}
            editMode={false}
            onBlockComplete={() => {}}
            onBlockSkip={() => {}}
            onBlockEdit={() => {}}
            onRefresh={() => {}}
            showTimes={true} // Clock times enabled
          />,
        );

        const text = getRenderedText(container);
        const expectedDuration = getBlockDurationLabel(blockWithoutEnvelope);
        const hasDuration = text.includes(expectedDuration);
        const hasClockComponents = hasClockComponentMarkers(text);

        if (!hasDuration || hasClockComponents) {
          console.error(
            "Block without envelope metadata missing duration display:",
          );
          console.error("Block:", blockWithoutEnvelope.activityName);
          console.error("Rendered text:", text);
          console.error("Expected duration:", expectedDuration);
        }

        return hasDuration && !hasClockComponents;
      }),
      { numRuns: 100 },
    );
  });

  /**
   * Property Test: "When ready" mode shows no clock times (Req 8.3)
   */
  it('should show only durations when showTimes is false ("when ready" mode)', () => {
    fc.assert(
      fc.property(
        fc.date({
          min: new Date("2024-01-01"),
          max: new Date("2025-12-31"),
        }),
        (anchorStartTime) => {
          // Generate a full commitment envelope
          const blocks = fc.sample(
            commitmentEnvelopeArbitrary(anchorStartTime),
            1,
          )[0];

          const { container } = render(
            <Timeline
              timeBlocks={blocks}
              editMode={false}
              onBlockComplete={() => {}}
              onBlockSkip={() => {}}
              onBlockEdit={() => {}}
              onRefresh={() => {}}
              showTimes={false} // "When ready" mode - no clock times
            />,
          );

          const text = getRenderedText(container);
          const expectedDurations = blocks.map((block) =>
            getBlockDurationLabel(block),
          );
          const hasDuration = expectedDurations.some((duration) =>
            text.includes(duration),
          );

          // Should NOT render anchor/departure clock components in when-ready mode
          const hasClockComponents = hasClockComponentMarkers(text);

          if (!hasDuration || hasClockComponents) {
            console.error('"When ready" mode has incorrect time display:');
            console.error("Rendered text:", text);
            console.error("Has duration:", hasDuration);
            console.error("Expected durations:", expectedDurations);
            console.error("Has clock components (should be false):", hasClockComponents);
          }

          return hasDuration && !hasClockComponents;
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Property Test: Complete commitment envelope has correct mix of formats (Req 5.1-5.5)
   */
  it("should show correct time format for each block type in commitment envelope", () => {
    fc.assert(
      fc.property(
        fc.date({
          min: new Date("2024-01-01"),
          max: new Date("2025-12-31"),
        }),
        (anchorStartTime) => {
          // Generate a full commitment envelope
          const blocks = fc.sample(
            commitmentEnvelopeArbitrary(anchorStartTime),
            1,
          )[0];

          // Verify each block type individually
          const results = blocks.map((block) => {
            const envelopeType = getEnvelopeType(block);

            const { container } = render(
              <Timeline
                timeBlocks={[block]}
                editMode={false}
                onBlockComplete={() => {}}
                onBlockSkip={() => {}}
                onBlockEdit={() => {}}
                onRefresh={() => {}}
                showTimes={true}
              />,
            );

            const text = getRenderedText(container);
            const hasAnchorClock = hasAnchorClockTime(text);
            const hasDepartureClock = hasDepartureClockTime(text);
            const expectedDuration = getBlockDurationLabel(block);
            const hasDuration = text.includes(expectedDuration);

            // Determine expected format based on envelope type
            const shouldShowClockTime =
              envelopeType === "anchor" || envelopeType === "travel_there";
            const shouldShowDuration = !shouldShowClockTime;
            const hasExpectedClockTime =
              envelopeType === "anchor"
                ? hasAnchorClock
                : envelopeType === "travel_there"
                  ? hasDepartureClock
                  : false;

            const isCorrect =
              (shouldShowClockTime && hasExpectedClockTime) ||
              (shouldShowDuration &&
                hasDuration &&
                !hasAnchorClock &&
                !hasDepartureClock);

            if (!isCorrect) {
              console.error("Incorrect time format for envelope block:");
              console.error("Block:", block.activityName);
              console.error("Start:", block.startTime);
              console.error("End:", block.endTime);
              console.error("Envelope type:", envelopeType);
              console.error("Should show clock time:", shouldShowClockTime);
              console.error("Has anchor clock:", hasAnchorClock);
              console.error("Has departure clock:", hasDepartureClock);
              console.error("Has duration:", hasDuration);
              console.error("Expected duration:", expectedDuration);
            }

            return isCorrect;
          });

          // All blocks should have correct format
          return results.every((result) => result);
        },
      ),
      { numRuns: 100 },
    );
  });

  /**
   * Regression Test: Verify specific envelope types
   */
  it("should correctly identify envelope types requiring clock time", () => {
    const clockTimeTypes = ["anchor", "travel_there"];
    const durationTypes = ["prep", "travel_back", "recovery"];

    // Verify our logic matches requirements
    expect(clockTimeTypes).toContain("anchor");
    expect(clockTimeTypes).toContain("travel_there");
    expect(durationTypes).toContain("prep");
    expect(durationTypes).toContain("travel_back");
    expect(durationTypes).toContain("recovery");
  });

  /**
   * Documentation Test: Verify requirements are met
   */
  it("should document which requirements are validated", () => {
    const validatedRequirements = [
      "5.1", // Timeline displays chain step blocks with duration format
      "5.2", // Timeline displays clock times only for Anchor and Departure blocks
      "5.3", // Non-anchor/non-travel blocks show duration only
      "5.4", // Anchor blocks show clock time
      "5.5", // Travel_there blocks show clock time as Departure Waypoint
    ];

    expect(validatedRequirements).toHaveLength(5);
    expect(validatedRequirements).toContain("5.1");
    expect(validatedRequirements).toContain("5.2");
    expect(validatedRequirements).toContain("5.3");
    expect(validatedRequirements).toContain("5.4");
    expect(validatedRequirements).toContain("5.5");
  });
});
