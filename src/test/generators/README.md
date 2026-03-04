# Test Data Generators

This directory contains fast-check arbitraries for property-based testing of the triage-mirror-stateless feature.

## Available Generators

### Basic Arbitraries

- `activityTypeArbitrary` - Generates valid ActivityType values
- `blockStatusArbitrary` - Generates valid BlockStatus values
- `anchorTypeArbitrary` - Generates valid anchor types (class, seminar, appointment, etc.)
- `envelopeTypeArbitrary` - Generates valid commitment envelope types
- `timeBlockMetadataArbitrary` - Generates TimeBlock metadata
- `commitmentEnvelopeMetadataArbitrary` - Generates metadata for commitment envelopes

### TimeBlock Generators

- `timeBlockArbitrary(baseTime?, durationMinutes?)` - Generates a single TimeBlock
  - `baseTime`: Base time to generate blocks around (defaults to current time)
  - `durationMinutes`: Duration range for blocks (defaults to 15-120 minutes)

- `anchorBlockArbitrary(baseTime?, anchorType?)` - Generates a TimeBlock that is specifically an anchor
  - `baseTime`: Base time for the anchor (defaults to current time)
  - `anchorType`: Type of anchor (defaults to 'appointment')

### Commitment Envelope Generators

- `commitmentEnvelopeArbitrary(anchorStartTime, anchorType?)` - Generates a complete commitment envelope with 5 steps:
  1. Prep
  2. Travel there
  3. Anchor
  4. Travel back
  5. Recovery

### Timeline Generators

- `timelineWithAnchors(options?)` - Generates a timeline with anchors and commitment envelopes
  - Options:
    - `baseTime`: Base time for timeline (defaults to current time)
    - `anchorCount`: Number of anchors to generate (defaults to 1-3)
    - `minGapMinutes`: Minimum gap between anchors in minutes (defaults to 120)
    - `includeFillerBlocks`: Include non-anchor blocks (defaults to true)

- `timelineWithFutureAnchors(currentTime, futureAnchorCount)` - Generates a timeline with a specific number of future anchors (useful for testing runway calculations)

- `timelineWithNoFutureAnchors(currentTime)` - Generates a timeline with no future anchors (all anchors in the past, useful for testing null runway scenarios)

## Usage Example

```typescript
import * as fc from "fast-check";
import {
  timelineWithAnchors,
  commitmentEnvelopeArbitrary,
} from "@/test/generators/timeline-generators";

// Property test example
fc.assert(
  fc.property(timelineWithAnchors(), (timeline) => {
    // Test that timeline is chronologically sorted
    for (let i = 1; i < timeline.length; i++) {
      expect(timeline[i].startTime.getTime()).toBeGreaterThanOrEqual(
        timeline[i - 1].startTime.getTime(),
      );
    }
    return true;
  }),
);

// Generate a specific commitment envelope
const anchorTime = new Date("2024-01-15T14:00:00Z");
const envelope = fc.sample(
  commitmentEnvelopeArbitrary(anchorTime, "class"),
  1,
)[0];
```

## Testing the Generators

Run the generator tests:

```bash
npm test -- src/test/unit/timeline-generators.test.ts
```

## Requirements Coverage

These generators support property-based testing for all requirements in the triage-mirror-stateless feature, providing a foundation for testing:

- Runway calculations (Requirements 1.1-1.5)
- Triage mode activation (Requirements 2.1-2.5)
- State filtering (Requirements 16.1-16.10)
- Completion tracking (Requirements 17.1-17.5, 23.1-23.5)
- Timeline operations (Requirements 4.1-4.5, 5.1-5.4)
