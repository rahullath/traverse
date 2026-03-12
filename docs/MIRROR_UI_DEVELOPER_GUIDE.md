# Mirror UI Developer Guide

## Overview

The Triage Mirror Stateless feature extends MeshOS's V2 chain-based planning system with real-time adaptation capabilities. This guide covers architecture, API endpoints, service classes, components, and testing strategy.

## Architecture

### System Components

```
Client Layer (React)
├── MirrorUI (main component)
├── StateDeclarationPrompt
├── TriagePrompt
├── Timeline
├── TimeBlock
├── InlineEditor
├── MirrorHeader
├── DeadlineBanner
├── StartTimeLabel
└── IntentSignalBanner

API Layer (Astro API routes)
├── /api/daily-plan/mirror (GET)
├── /api/daily-plan/recalculate (POST)
├── /api/daily-plan/state (POST)
├── /api/daily-plan/triage (POST)
├── /api/daily-plan/check-absence (GET)
├── /api/time-blocks/[id]/complete (PATCH)
├── /api/time-blocks/[id]/edit (PATCH)
├── /api/time-blocks/[id]/delete (DELETE)
└── /api/time-blocks/insert (POST)

Service Layer (TypeScript classes)
├── TimePhysicsService
├── TriageService
└── StateFilterService

Existing V2 Components (reused)
├── ChainGenerator
├── WakeRampGenerator
├── LocationStateTracker
└── PlanBuilder
```

### Data Flow Patterns

1. **Load Flow**: Client → Mirror API → Services → Database → Client
2. **State Declaration**: Client → State API → StateFilter → Database → Client
3. **Recalculation**: Client → Recalc API → PlanBuilder → V2 Components → Database → Client
4. **Triage**: Client → Triage API → TriageService → Session State → Client
5. **Completion**: Client → Complete API → Database → Client

## API Endpoints

### GET /api/daily-plan/mirror

Loads mirror data including plan, runway calculation, triage state, and state prompt visibility.

**Authentication**: Required (serverAuth.requireAuth())

**Response**:

```typescript
{
  plan: DailyPlan;
  timeBlocks: TimeBlock[];
  runway: RunwayCalculation;
  triageState: TriageState;
  showStatePrompt: boolean;
  lastStateDeclaration: StateDeclaration | null;
}
```

**Example**:

```typescript
const response = await fetch("/api/daily-plan/mirror");
const data = await response.json();
console.log("Runway:", data.runway.runway, "minutes");
console.log("Triage active:", data.triageState.active);
```

**Error Codes**:

- `401`: Not authenticated
- `404`: No plan exists for today
- `500`: Server error

**Implementation**: `src/pages/api/daily-plan/mirror.ts`

### POST /api/daily-plan/recalculate

Regenerates the daily plan from current time using existing plan generation logic.

**Authentication**: Required

**Request Body**: None (uses current time as wake time)

**Response**:

```typescript
{
  success: boolean;
  plan: DailyPlan;
  timeBlocks: TimeBlock[];
  message: string;
}
```

**Example**:

```typescript
const response = await fetch("/api/daily-plan/recalculate", {
  method: "POST",
});
const data = await response.json();
console.log("New plan generated:", data.plan.id);
```

**Timeout**: 4 seconds (returns 408 if exceeded)

**Error Codes**:

- `401`: Not authenticated
- `408`: Timeout (plan generation took too long)
- `500`: Server error

**Behavior**:

- Replaces existing daily_plan record for today
- Preserves completed blocks (matched by start_time)
- Uses user's stored sleep_time and energy_state
- Calls PlanBuilder.generateDailyPlan() with current time as wakeTime

**Implementation**: `src/pages/api/daily-plan/recalculate.ts`

### POST /api/daily-plan/state

Applies state filter to timeline based on user's declared state.

**Authentication**: Required

**Request Body**:

```typescript
{
  state: "starting_day" | "ready_for_anchor" | "mid_chain" | "at_anchor" | "missed_it" | "just_checking";
  selected_step_id?: string; // Required for mid_chain state
}
```

**Response**:

```typescript
{
  success: boolean;
  visible_blocks: TimeBlock[];
  hidden_blocks: TimeBlock[];
  filter_reason: string;
  triage_triggered: boolean; // True if ready_for_anchor past departure
}
```

**Example**:

```typescript
const response = await fetch("/api/daily-plan/state", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ state: "ready_for_anchor" }),
});
const data = await response.json();
console.log("Visible blocks:", data.visible_blocks.length);
console.log("Triage triggered:", data.triage_triggered);
```

**Error Codes**:

- `400`: Invalid state or missing selected_step_id for mid_chain
- `401`: Not authenticated
- `404`: No plan exists for today
- `500`: Server error

**State Behaviors**:

- `starting_day`: Shows full chain from current time, marks all as pending
- `ready_for_anchor`: Hides activation chain, shows departure + anchor + recovery
- `mid_chain`: Marks prior steps complete, shows from selected step
- `at_anchor`: Marks prep/travel complete, highlights anchor
- `missed_it`: Marks anchor and related steps as skipped
- `just_checking`: Shows full timeline without changes

**Implementation**: `src/pages/api/daily-plan/state.ts`

### POST /api/daily-plan/triage

Applies triage decision to timeline (session-only, not persisted).

**Authentication**: Required

**Request Body**:

```typescript
{
  mode: "protect_keystone" | "skip_anchor" | "recalculate";
  anchor_id: string;
}
```

**Response**:

```typescript
{
  success: boolean;
  visible_blocks: TimeBlock[];
  recalc_triggered: boolean; // True if mode is "recalculate"
  message: string;
}
```

**Example**:

```typescript
const response = await fetch("/api/daily-plan/triage", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    mode: "protect_keystone",
    anchor_id: "anchor-123",
  }),
});
const data = await response.json();
```

**Error Codes**:

- `400`: Invalid mode or missing anchor_id
- `401`: Not authenticated
- `404`: Anchor not found
- `500`: Server error

**Mode Behaviors**:

- `protect_keystone`: Keeps only keystone activity + anchor blocks
- `skip_anchor`: Marks all anchor blocks as skipped, removes from timeline
- `recalculate`: Triggers full recalculation from current time

**Implementation**: `src/pages/api/daily-plan/triage.ts`

### PATCH /api/time-blocks/[id]/complete

Marks a time block as completed or skipped.

**Authentication**: Required

**Request Body**:

```typescript
{
  status: "completed" | "skipped";
  skip_reason?: string; // Required if status is "skipped"
}
```

**Response**:

```typescript
{
  success: boolean;
  block: TimeBlock;
  remaining_time: number; // Minutes until deadline
}
```

**Example**:

```typescript
const response = await fetch("/api/time-blocks/block-123/complete", {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ status: "completed" }),
});
```

**Error Codes**:

- `400`: Invalid status or missing skip_reason
- `401`: Not authenticated or unauthorized
- `404`: Block not found
- `500`: Server error

**Implementation**: `src/pages/api/time-blocks/[id]/complete.ts`

### PATCH /api/time-blocks/[id]/edit

Edits a time block (anchor or step) with cascade support.

**Authentication**: Required

**Request Body**:

```typescript
{
  start_time?: string; // ISO 8601
  end_time?: string; // ISO 8601
  activity_name?: string;
  duration?: number; // Minutes (5-480)
  location?: string;
}
```

**Response**:

```typescript
{
  success: boolean;
  block: TimeBlock;
  updated_blocks: TimeBlock[]; // Cascaded blocks
  conflicts: Array<{ anchor_id: string; time: string }>;
}
```

**Example**:

```typescript
const response = await fetch("/api/time-blocks/block-123/edit", {
  method: "PATCH",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    duration: 30,
    activity_name: "Updated activity",
  }),
});
```

**Error Codes**:

- `400`: Invalid data or time conflict
- `401`: Not authenticated or unauthorized
- `404`: Block not found
- `500`: Server error

**Cascade Behavior**: When editing a step duration, all subsequent steps in the same chain are recalculated to maintain continuity.

**Implementation**: `src/pages/api/time-blocks/[id]/edit.ts`

### DELETE /api/time-blocks/[id]/delete

Deletes an anchor and its entire commitment envelope.

**Authentication**: Required

**Response**:

```typescript
{
  success: boolean;
  deleted_count: number;
  message: string;
}
```

**Example**:

```typescript
const response = await fetch("/api/time-blocks/anchor-123/delete", {
  method: "DELETE",
});
```

**Error Codes**:

- `400`: Block is not an anchor
- `401`: Not authenticated or unauthorized
- `404`: Block not found
- `500`: Server error

**Implementation**: `src/pages/api/time-blocks/[id]/delete.ts`

### POST /api/time-blocks/insert

Inserts a custom step into the timeline with cascade.

**Authentication**: Required

**Request Body**:

```typescript
{
  activity_name: string;
  duration: number; // Minutes (5-480)
  insert_after_id: string; // Block ID to insert after
}
```

**Response**:

```typescript
{
  success: boolean;
  block: TimeBlock;
  updated_blocks: TimeBlock[]; // Cascaded blocks
}
```

**Example**:

```typescript
const response = await fetch("/api/time-blocks/insert", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    activity_name: "Custom step",
    duration: 15,
    insert_after_id: "block-123",
  }),
});
```

**Error Codes**:

- `400`: Invalid data
- `401`: Not authenticated
- `404`: insert_after_id not found
- `500`: Server error

**Implementation**: `src/pages/api/time-blocks/insert.ts`

### GET /api/daily-plan/check-absence

Checks if user has been absent for 7+ days (for Intent Signal).

**Authentication**: Required

**Response**:

```typescript
{
  absent: boolean;
  days_absent: number;
  last_plan_date: string | null;
}
```

**Example**:

```typescript
const response = await fetch("/api/daily-plan/check-absence");
const data = await response.json();
if (data.absent) {
  console.log("User absent for", data.days_absent, "days");
}
```

**Implementation**: `src/pages/api/daily-plan/check-absence.ts`

## Service Classes

### TimePhysicsService

Calculates runway and required duration for triage decisions.

**Location**: `src/lib/triage/time-physics.ts`

**Methods**:

```typescript
calculateRunway(
  timeBlocks: TimeBlock[],
  currentTime: Date = new Date()
): RunwayCalculation
```

Calculates time remaining until next anchor and total time needed for commitment envelope.

**Returns**:

```typescript
{
  runway: number | null; // Minutes until next anchor
  required_duration: number | null; // Total minutes needed
  next_anchor_id: string | null;
  next_anchor_start: Date | null;
  current_time: Date;
  has_sufficient_time: boolean;
}
```

**Example**:

```typescript
import { TimePhysicsService } from "@/lib/triage/time-physics";

const service = new TimePhysicsService();
const runway = service.calculateRunway(timeBlocks);

if (!runway.has_sufficient_time) {
  console.log("Insufficient time! Runway:", runway.runway);
  console.log("Required:", runway.required_duration);
}
```

**Performance**: Completes in <100ms for typical timelines (20 blocks)

### TriageService

Manages triage mode activation and keystone identification.

**Location**: `src/lib/triage/triage-service.ts`

**Methods**:

```typescript
shouldActivateTriage(runway: RunwayCalculation): boolean
```

Determines if triage mode should activate based on runway calculation.

**Returns**: `true` if runway < required_duration, `false` otherwise

```typescript
identifyKeystoneActivity(
  timeBlocks: TimeBlock[],
  anchorId: string
): TimeBlock | null
```

Identifies the most critical activity to protect during triage.

**Priority Order**:

1. For class/seminar: anchor itself
2. For appointment: prep if >15min, else anchor
3. Default: anchor

```typescript
getTriageState(
  timeBlocks: TimeBlock[],
  runway: RunwayCalculation
): TriageState
```

Gets complete triage state for UI rendering.

**Returns**:

```typescript
{
  active: boolean;
  keystone_activity: TimeBlock | null;
  anchor: TimeBlock | null;
  options: TriageOption[];
}
```

**Example**:

```typescript
import { TriageService } from "@/lib/triage/triage-service";

const service = new TriageService();
const triageState = service.getTriageState(timeBlocks, runway);

if (triageState.active) {
  console.log("Keystone:", triageState.keystone_activity?.activityName);
  console.log(
    "Options:",
    triageState.options.map((o) => o.label),
  );
}
```

### StateFilterService

Filters timeline based on user's declared state.

**Location**: `src/lib/triage/state-filter.ts`

**Methods**:

```typescript
filterTimeline(
  timeBlocks: TimeBlock[],
  state: StateDeclaration,
  currentTime: Date = new Date()
): FilteredTimeline
```

Applies state-specific filtering logic to timeline.

**Returns**:

```typescript
{
  visible_blocks: TimeBlock[];
  hidden_blocks: TimeBlock[];
  filter_reason: string;
}
```

```typescript
shouldShowStatePrompt(
  lastDeclaration: StateDeclaration | null,
  timeBlocks: TimeBlock[],
  currentTime: Date = new Date()
): boolean
```

Determines if state declaration prompt should be shown.

**Logic**:

- Don't show if declared within last 30 minutes
- Show if within 2 hours of any anchor
- Otherwise don't show

**Example**:

```typescript
import { StateFilterService } from "@/lib/triage/state-filter";

const service = new StateFilterService();
const filtered = service.filterTimeline(timeBlocks, {
  state: "ready_for_anchor",
  timestamp: new Date(),
});

console.log("Visible:", filtered.visible_blocks.length);
console.log("Hidden:", filtered.hidden_blocks.length);
console.log("Reason:", filtered.filter_reason);
```

**State Filter Behaviors**:

- `starting_day`: Shows blocks from current time forward
- `ready_for_anchor`: Hides activation chain, shows departure onwards
- `mid_chain`: Marks prior steps complete, shows from selected step
- `at_anchor`: Marks prep/travel complete
- `missed_it`: Marks anchor as skipped
- `just_checking`: No filtering

## React Components

### MirrorUI

Main container component for Mirror UI.

**Location**: `src/components/daily-plan/MirrorUI.tsx`

**Props**:

```typescript
{
  userId: string;
}
```

**State Management**:

- Loads mirror data on mount
- Handles recalculation
- Handles state declaration
- Handles triage decisions
- Manages edit mode toggle

**Example Usage**:

```tsx
import { MirrorUI } from "@/components/daily-plan/MirrorUI";

<MirrorUI userId={user.id} />;
```

**Key Methods**:

- `loadMirrorData()`: Fetches data from mirror API
- `handleRecalculate()`: Triggers recalculation
- `handleStateDeclaration(state, stepId?)`: Applies state filter
- `handleTriageDecision(decision)`: Applies triage decision

### MirrorHeader

Header component with navigation, edit toggle, and recalc button.

**Location**: `src/components/daily-plan/MirrorHeader.tsx`

**Props**:

```typescript
{
  editMode: boolean;
  onToggleEditMode: () => void;
  onRecalculate: () => void;
}
```

**Features**:

- Token balance display
- Edit mode toggle
- Recalculate button
- Navigation links
- Responsive hamburger menu

**Example**:

```tsx
<MirrorHeader
  editMode={editMode}
  onToggleEditMode={() => setEditMode(!editMode)}
  onRecalculate={handleRecalculate}
/>
```

### StateDeclarationPrompt

Bottom sheet prompt for state declaration.

**Location**: `src/components/daily-plan/StateDeclarationPrompt.tsx`

**Props**:

```typescript
{
  onDeclare: (state: UserState, stepId?: string) => void;
  onDismiss: () => void;
}
```

**Features**:

- 6 radio button options
- Mid-chain expansion with step selector
- Swipe-down to dismiss
- Keyboard navigable
- Safe area inset support

**Example**:

```tsx
<StateDeclarationPrompt
  onDeclare={(state, stepId) => handleStateDeclaration(state, stepId)}
  onDismiss={() => setShowPrompt(false)}
/>
```

### TriagePrompt

Triage decision prompt with 3 options.

**Location**: `src/components/daily-plan/TriagePrompt.tsx`

**Props**:

```typescript
{
  triageState: TriageState;
  onDecision: (decision: TriageDecision) => void;
}
```

**Features**:

- Displays runway vs required duration
- Shows keystone activity
- 3 option buttons (Protect, Skip, Recalculate)
- Warning color scheme
- Accessible (ARIA labels, keyboard nav)

**Example**:

```tsx
<TriagePrompt
  triageState={triageState}
  onDecision={(decision) => handleTriageDecision(decision)}
/>
```

### Timeline

Vertical timeline component displaying time blocks.

**Location**: `src/components/daily-plan/Timeline.tsx`

**Props**:

```typescript
{
  timeBlocks: TimeBlock[];
  editMode: boolean;
  onBlockComplete: (blockId: string) => void;
  onBlockEdit: (blockId: string, updates: Partial<TimeBlock>) => void;
  onRefresh: () => void;
}
```

**Features**:

- Chronological ordering
- Current time indicator (sticky)
- Deadline banners
- Visual states (pending, current, completed, skipped, late)
- Completion controls
- Edit buttons (when editMode enabled)

**Example**:

```tsx
<Timeline
  timeBlocks={timeBlocks}
  editMode={editMode}
  onBlockComplete={(id) => handleComplete(id)}
  onBlockEdit={(id, updates) => handleEdit(id, updates)}
  onRefresh={loadMirrorData}
/>
```

### TimeBlock

Individual time block card component.

**Location**: `src/components/daily-plan/TimeBlock.tsx`

**Props**:

```typescript
{
  block: TimeBlock;
  editMode: boolean;
  onComplete: () => void;
  onSkip: () => void;
  onEdit: () => void;
}
```

**Features**:

- Time range display
- Duration badge
- Activity name
- Completion checkbox
- Skip button
- Edit button (when editMode enabled)
- Touch gesture support (swipe right = complete, swipe left = skip)
- Visual state styling

**Example**:

```tsx
<TimeBlock
  block={block}
  editMode={editMode}
  onComplete={() => handleComplete(block.id)}
  onSkip={() => handleSkip(block.id)}
  onEdit={() => handleEdit(block.id)}
/>
```

### InlineEditor

Inline editing component for anchors and steps.

**Location**: `src/components/daily-plan/InlineEditor.tsx`

**Props**:

```typescript
{
  block: TimeBlock;
  onSave: (updates: Partial<TimeBlock>) => void;
  onCancel: () => void;
  onDelete?: () => void; // Only for anchors
}
```

**Features**:

- Time range inputs
- Duration input (5-480 minutes)
- Activity name input
- Location input (optional)
- Real-time conflict detection
- Validation (duration range, time order)
- Debounced inputs (300ms)
- Delete button (anchors only)

**Example**:

```tsx
<InlineEditor
  block={block}
  onSave={(updates) => handleSave(block.id, updates)}
  onCancel={() => setEditingId(null)}
  onDelete={block.isAnchor ? () => handleDelete(block.id) : undefined}
/>
```

### DeadlineBanner

Deadline display for commitment envelopes.

**Location**: `src/components/daily-plan/DeadlineBanner.tsx`

**Props**:

```typescript
{
  envelope: CommitmentEnvelope;
  currentTime: Date;
}
```

**Features**:

- Calculates deadline from last prep/activation step
- Displays "Complete by [TIME]"
- Shows time remaining
- Color transition (warning when past deadline)
- Sticky positioning when approaching deadline

**Example**:

```tsx
<DeadlineBanner envelope={envelope} currentTime={new Date()} />
```

### StartTimeLabel

Start time label for commitment envelopes.

**Location**: `src/components/daily-plan/StartTimeLabel.tsx`

**Props**:

```typescript
{
  envelope: CommitmentEnvelope;
  currentTime: Date;
}
```

**Features**:

- Displays "Start at [TIME]"
- Shows countdown if before start time
- Shows lateness if after start time
- Positioned above envelope

**Example**:

```tsx
<StartTimeLabel envelope={envelope} currentTime={new Date()} />
```

### IntentSignalBanner

Re-engagement banner after 7+ day absence.

**Location**: `src/components/daily-plan/IntentSignalBanner.tsx`

**Props**:

```typescript
{
  onGeneratePlan: () => void;
  onDismiss: () => void;
}
```

**Features**:

- Checks for 7+ day absence
- Neutral re-engagement message
- Two options: "Yes, generate plan" and "No, not today"
- Session-only dismissal (not persistent)

**Example**:

```tsx
<IntentSignalBanner
  onGeneratePlan={() => navigate("/daily-plan/generate")}
  onDismiss={() => setShowBanner(false)}
/>
```

## Testing Strategy

### Test Organization

```
src/test/
├── unit/                    # Unit tests
│   ├── time-physics.test.ts
│   ├── triage-service.test.ts
│   ├── state-filter.test.ts
│   └── timeline-generators.test.ts
├── integration/             # Integration tests
│   └── mirror-ui/
│       ├── api-endpoints.test.ts
│       ├── database-operations.test.ts
│       └── recalculation.test.ts
├── e2e/                     # End-to-end tests
│   └── mirror-ui/
│       └── user-flows.test.ts
├── performance/             # Performance tests
│   └── mirror-ui/
│       └── load-times.test.ts
└── generators/              # Test data generators
    └── timeline-generators.ts
```

### Property-Based Testing

The feature uses property-based testing (PBT) with fast-check to validate correctness properties.

**Test Data Generators** (`src/test/generators/timeline-generators.ts`):

```typescript
import * as fc from "fast-check";

// Generate random time blocks
export const timeBlockArbitrary = fc.record({
  id: fc.uuid(),
  startTime: fc.date(),
  endTime: fc.date(),
  activityName: fc.string(),
  status: fc.constantFrom("pending", "completed", "skipped"),
  // ... other fields
});

// Generate timeline with anchors
export const timelineWithAnchors = (anchorCount: number = 3) =>
  fc.array(timeBlockArbitrary, { minLength: anchorCount * 5 });
```

**Example Property Test**:

```typescript
import * as fc from "fast-check";
import { TimePhysicsService } from "@/lib/triage/time-physics";

test("Property: Runway calculation correctness", () => {
  fc.assert(
    fc.property(timelineWithAnchors(), fc.date(), (timeline, currentTime) => {
      const service = new TimePhysicsService();
      const runway = service.calculateRunway(timeline, currentTime);

      // Property: runway = (next_anchor_start - current_time) in minutes
      if (runway.runway !== null) {
        const expected = Math.floor(
          (runway.next_anchor_start!.getTime() - currentTime.getTime()) / 60000,
        );
        expect(runway.runway).toBe(expected);
      }
    }),
  );
});
```

### Unit Tests

Test individual service classes and components in isolation.

**Running Unit Tests**:

```bash
npm test src/test/unit/
```

**Example Unit Test**:

```typescript
import { describe, it, expect } from "vitest";
import { TriageService } from "@/lib/triage/triage-service";

describe("TriageService", () => {
  it("should activate triage when runway < required_duration", () => {
    const service = new TriageService();
    const runway = {
      runway: 30,
      required_duration: 45,
      next_anchor_id: "anchor-1",
      next_anchor_start: new Date(),
      current_time: new Date(),
      has_sufficient_time: false,
    };

    expect(service.shouldActivateTriage(runway)).toBe(true);
  });

  it("should not activate triage when runway >= required_duration", () => {
    const service = new TriageService();
    const runway = {
      runway: 60,
      required_duration: 45,
      next_anchor_id: "anchor-1",
      next_anchor_start: new Date(),
      current_time: new Date(),
      has_sufficient_time: true,
    };

    expect(service.shouldActivateTriage(runway)).toBe(false);
  });
});
```

### Integration Tests

Test API endpoints with database interactions.

**Running Integration Tests**:

```bash
npm test src/test/integration/
```

**Example Integration Test**:

```typescript
import { describe, it, expect, beforeEach } from "vitest";
import { createTestUser, createTestPlan } from "@/test/helpers";

describe("Mirror API", () => {
  let user: TestUser;

  beforeEach(async () => {
    user = await createTestUser();
  });

  it("should load mirror data successfully", async () => {
    await createTestPlan(user.id);

    const response = await fetch("/api/daily-plan/mirror", {
      headers: { Cookie: user.sessionCookie },
    });

    expect(response.status).toBe(200);
    const data = await response.json();
    expect(data.plan).toBeDefined();
    expect(data.timeBlocks).toBeInstanceOf(Array);
    expect(data.runway).toBeDefined();
  });

  it("should return 404 when no plan exists", async () => {
    const response = await fetch("/api/daily-plan/mirror", {
      headers: { Cookie: user.sessionCookie },
    });

    expect(response.status).toBe(404);
  });
});
```

### End-to-End Tests

Test complete user flows from UI interaction to database persistence.

**Running E2E Tests**:

```bash
npm test src/test/e2e/
```

**Example E2E Test**:

```typescript
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { MirrorUI } from '@/components/daily-plan/MirrorUI';

describe('Mirror UI User Flows', () => {
  it('should complete full state declaration flow', async () => {
    const { container } = render(<MirrorUI userId="test-user" />);

    // Wait for data to load
    await waitFor(() => {
      expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
    });

    // State prompt should appear
    expect(screen.getByText('Starting my day')).toBeInTheDocument();

    // Select "Ready for anchor"
    fireEvent.click(screen.getByText('Ready for anchor'));
    fireEvent.click(screen.getByText('Continue'));

    // Timeline should update
    await waitFor(() => {
      expect(screen.queryByText('Prep')).not.toBeInTheDocument();
      expect(screen.getByText('Travel')).toBeInTheDocument();
    });
  });

  it('should complete triage decision flow', async () => {
    render(<MirrorUI userId="test-user" />);

    await waitFor(() => {
      expect(screen.getByText('Protect Keystone')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByText('Protect Keystone'));

    await waitFor(() => {
      // Only keystone and anchor should remain
      const blocks = screen.getAllByTestId('time-block');
      expect(blocks.length).toBeLessThan(5);
    });
  });
});
```

### Performance Tests

Validate performance constraints and optimization effectiveness.

**Running Performance Tests**:

```bash
npm test src/test/performance/
```

**Example Performance Test**:

```typescript
import { describe, it, expect } from "vitest";
import { TimePhysicsService } from "@/lib/triage/time-physics";
import { generateLargeTimeline } from "@/test/generators/timeline-generators";

describe("Performance", () => {
  it("should calculate runway in <100ms for 20 blocks", () => {
    const service = new TimePhysicsService();
    const timeline = generateLargeTimeline(20);

    const start = performance.now();
    service.calculateRunway(timeline);
    const duration = performance.now() - start;

    expect(duration).toBeLessThan(100);
  });

  it("should load Mirror UI in <500ms", async () => {
    const start = performance.now();

    const response = await fetch("/api/daily-plan/mirror");
    await response.json();

    const duration = performance.now() - start;
    expect(duration).toBeLessThan(500);
  });
});
```

## Architecture Diagrams

### Component Hierarchy

```
MirrorUI
├── MirrorHeader
│   ├── TokenBalance
│   ├── EditModeToggle
│   └── RecalculateButton
├── IntentSignalBanner (conditional)
├── TriagePrompt (conditional)
│   └── TriageOption (x3)
├── StateDeclarationPrompt (conditional)
│   ├── StateOption (x6)
│   └── StepSelector (for mid_chain)
└── Timeline
    ├── CurrentTimeIndicator
    └── TimeBlock (multiple)
        ├── DeadlineBanner (for envelopes)
        ├── StartTimeLabel (for envelopes)
        ├── CompletionControls
        └── InlineEditor (when editing)
```

### State Management Flow

```
User Action
    ↓
Component Handler
    ↓
API Call (fetch)
    ↓
API Route (Astro)
    ↓
Service Layer
    ↓
Database (Supabase)
    ↓
Response
    ↓
Component State Update
    ↓
UI Re-render
```

### Triage Decision Flow

```
Page Load
    ↓
Calculate Runway (TimePhysicsService)
    ↓
runway < required_duration?
    ↓ YES
Activate Triage (TriageService)
    ↓
Identify Keystone
    ↓
Display Triage Prompt
    ↓
User Selects Option
    ↓
Apply Decision (TriageService)
    ↓
Update Timeline (session-only)
```

### State Declaration Flow

```
Page Load
    ↓
Check Last Declaration (StateFilterService)
    ↓
Within 2hr of anchor AND >30min since last?
    ↓ YES
Display State Prompt
    ↓
User Selects State
    ↓
Apply Filter (StateFilterService)
    ↓
Update Database (time_blocks + user_preferences)
    ↓
Refresh Timeline
```

## Development Workflow

### Local Development

1. **Start dev server**:

```bash
npm run dev
```

2. **Navigate to Mirror UI**:

```
http://localhost:4321/daily-plan/mirror
```

3. **Run tests in watch mode**:

```bash
npm run test:watch
```

4. **Format code**:

```bash
npm run format
```

### Adding New Features

1. **Update types** in `src/types/triage.ts`
2. **Implement service logic** in `src/lib/triage/`
3. **Create API endpoint** in `src/pages/api/`
4. **Build React component** in `src/components/daily-plan/`
5. **Write tests** (unit, integration, e2e)
6. **Update documentation**

### Debugging

**Server-side (API routes)**:

```typescript
console.log("[Mirror API]", { runway, triageState });
```

**Client-side (React components)**:

```typescript
console.log("[MirrorUI]", { data, loading, error });
```

**Database queries**:

```typescript
const { data, error } = await supabase
  .from("time_blocks")
  .select("*")
  .eq("user_id", userId);

console.log("[DB Query]", { data, error });
```

### Common Issues

**Issue**: Mirror API returns 404

- **Cause**: No daily_plan exists for today
- **Solution**: Generate a plan first via `/api/daily-plan/generate`

**Issue**: Triage mode not activating

- **Cause**: runway >= required_duration
- **Solution**: Check runway calculation, ensure anchors exist

**Issue**: State prompt not showing

- **Cause**: Declared state within last 30 minutes OR not within 2hr of anchor
- **Solution**: This is expected behavior

**Issue**: Recalculation times out

- **Cause**: Too many anchors (6+) or slow database
- **Solution**: Reduce anchors or optimize queries

**Issue**: Completion state not persisting

- **Cause**: Database write failed or RLS policy blocking
- **Solution**: Check user_id scoping and RLS policies

## Security Considerations

### Authentication

All API endpoints use `serverAuth.requireAuth()`:

```typescript
import { createServerAuth } from "@/lib/auth/simple-multi-user";

export async function GET({ cookies }: APIContext) {
  const serverAuth = createServerAuth(cookies);
  const user = await serverAuth.requireAuth(); // Throws if not authenticated

  // user.id is now guaranteed to be valid
}
```

### Authorization

All database queries filter by `user_id`:

```typescript
const { data } = await supabase
  .from("time_blocks")
  .select("*")
  .eq("user_id", user.id) // CRITICAL: Always filter by user_id
  .eq("date", today);
```

### Input Validation

All API endpoints validate input:

```typescript
// Validate state
const validStates = [
  "starting_day",
  "ready_for_anchor",
  "mid_chain",
  "at_anchor",
  "missed_it",
  "just_checking",
];
if (!validStates.includes(state)) {
  return new Response(JSON.stringify({ error: "Invalid state" }), {
    status: 400,
  });
}

// Validate duration
if (duration < 5 || duration > 480) {
  return new Response(
    JSON.stringify({ error: "Duration must be 5-480 minutes" }),
    { status: 400 },
  );
}
```

### RLS Policies

Supabase RLS is enabled on all tables. Application-level scoping is defense-in-depth.

**Example RLS Policy**:

```sql
CREATE POLICY "Users can only access their own time blocks"
ON time_blocks
FOR ALL
USING (auth.uid() = user_id);
```

### Session Management

Triage decisions are session-only (not persisted):

```typescript
// Triage decisions stored in component state, not database
const [triageDecision, setTriageDecision] = useState<TriageDecision | null>(
  null,
);
```

State declarations are persisted but scoped to user:

```typescript
// Saved to user_preferences.preferences JSONB
await supabase
  .from("user_preferences")
  .update({
    preferences: {
      ...existingPrefs,
      last_state_declaration: { state, timestamp: new Date() },
    },
  })
  .eq("user_id", user.id);
```

## Performance Optimization

### Memoization

Expensive calculations are memoized:

```typescript
import { useMemo } from "react";

const runway = useMemo(() => {
  return timePhysicsService.calculateRunway(timeBlocks, currentTime);
}, [timeBlocks, currentTime]);

const filteredTimeline = useMemo(() => {
  return stateFilterService.filterTimeline(timeBlocks, stateDeclaration);
}, [timeBlocks, stateDeclaration]);
```

### Debouncing

User inputs are debounced:

```typescript
import { useDebouncedCallback } from "use-debounce";

const debouncedSave = useDebouncedCallback(
  (updates: Partial<TimeBlock>) => {
    handleSave(updates);
  },
  300, // 300ms delay
);
```

### Database Query Optimization

Queries use indexes and limit results:

```typescript
// Use indexes on user_id and date
const { data } = await supabase
  .from("time_blocks")
  .select("*")
  .eq("user_id", user.id)
  .eq("date", today)
  .order("start_time", { ascending: true });
```

### Component Lazy Loading

Non-critical components are lazy loaded:

```typescript
import { lazy, Suspense } from 'react';

const IntentSignalBanner = lazy(() => import('./IntentSignalBanner'));

<Suspense fallback={<div>Loading...</div>}>
  {showIntentSignal && <IntentSignalBanner />}
</Suspense>
```

### API Response Caching

Mirror data is cached in component state:

```typescript
const [data, setData] = useState<MirrorData | null>(null);

// Only refetch when explicitly needed
useEffect(() => {
  loadMirrorData();
}, []); // Empty deps = load once on mount
```

## Accessibility Implementation

### Keyboard Navigation

All interactive elements are keyboard accessible:

```typescript
// Focusable buttons
<button
  tabIndex={0}
  onKeyDown={(e) => {
    if (e.key === 'Enter' || e.key === ' ') {
      handleClick();
    }
  }}
>
  Action
</button>

// Escape to dismiss
useEffect(() => {
  const handleEscape = (e: KeyboardEvent) => {
    if (e.key === 'Escape') {
      onDismiss();
    }
  };
  window.addEventListener('keydown', handleEscape);
  return () => window.removeEventListener('keydown', handleEscape);
}, [onDismiss]);
```

### ARIA Labels

All components include proper ARIA attributes:

```typescript
<button
  aria-label="Mark step as completed"
  aria-pressed={isCompleted}
  role="button"
>
  <CheckIcon />
</button>

<div
  role="alert"
  aria-live="polite"
  aria-atomic="true"
>
  {triageMessage}
</div>
```

### Focus Management

Focus is managed on prompt open/close:

```typescript
useEffect(() => {
  if (isOpen) {
    // Focus first interactive element
    const firstButton = dialogRef.current?.querySelector("button");
    firstButton?.focus();
  }
}, [isOpen]);
```

### Screen Reader Support

Important state changes are announced:

```typescript
<div
  role="status"
  aria-live="polite"
  className="sr-only"
>
  {completedCount} of {totalCount} steps completed
</div>
```

## Mobile-Specific Implementation

### Touch Gestures

Swipe gestures are implemented with threshold detection:

```typescript
const [touchStart, setTouchStart] = useState<number | null>(null);
const [touchEnd, setTouchEnd] = useState<number | null>(null);

const minSwipeDistance = 50;

const onTouchStart = (e: React.TouchEvent) => {
  setTouchEnd(null);
  setTouchStart(e.targetTouches[0].clientX);
};

const onTouchMove = (e: React.TouchEvent) => {
  setTouchEnd(e.targetTouches[0].clientX);
};

const onTouchEnd = () => {
  if (!touchStart || !touchEnd) return;

  const distance = touchStart - touchEnd;
  const isLeftSwipe = distance > minSwipeDistance;
  const isRightSwipe = distance < -minSwipeDistance;

  if (isRightSwipe) {
    handleComplete();
  } else if (isLeftSwipe) {
    handleSkip();
  }
};
```

### Bottom Sheet Pattern

Bottom sheets use slide-up animation and backdrop:

```typescript
<div
  className={`fixed inset-0 z-50 ${isOpen ? 'block' : 'hidden'}`}
  onClick={onDismiss}
>
  {/* Backdrop */}
  <div className="absolute inset-0 bg-black/50" />

  {/* Sheet */}
  <div
    className={`
      absolute bottom-0 left-0 right-0
      bg-surface rounded-t-2xl
      transform transition-transform duration-300
      ${isOpen ? 'translate-y-0' : 'translate-y-full'}
      pb-[env(safe-area-inset-bottom)]
    `}
    onClick={(e) => e.stopPropagation()}
  >
    {children}
  </div>
</div>
```

### Safe Area Insets

Respect device safe areas:

```css
/* In component styles */
.mirror-header {
  padding-top: env(safe-area-inset-top);
}

.mirror-footer {
  padding-bottom: env(safe-area-inset-bottom);
}

.bottom-sheet {
  padding-bottom: calc(1rem + env(safe-area-inset-bottom));
}
```

### Viewport Handling

Handle mobile viewport quirks:

```css
/* In messy-theme.css */
.mirror-ui {
  min-height: 100vh;
  min-height: -webkit-fill-available;
}
```

## Error Handling

### API Error Handling

All API calls include error handling:

```typescript
async function loadMirrorData() {
  try {
    setLoading(true);
    setError(null);

    const response = await fetch("/api/daily-plan/mirror");

    if (!response.ok) {
      const errorData = await response.json();
      throw new Error(errorData.error || "Failed to load mirror data");
    }

    const data = await response.json();
    setData(data);
  } catch (err) {
    console.error("[MirrorUI] Load error:", err);
    setError(err instanceof Error ? err.message : "Unknown error");
  } finally {
    setLoading(false);
  }
}
```

### Error Boundary

React Error Boundary catches component errors:

```typescript
import { ErrorBoundary } from '@/components/daily-plan/ErrorBoundary';

<ErrorBoundary
  fallback={(error, reset) => (
    <div className="p-4 bg-error/10 rounded">
      <h2>Something went wrong</h2>
      <p>{error.message}</p>
      <button onClick={reset}>Try again</button>
    </div>
  )}
>
  <MirrorUI userId={user.id} />
</ErrorBoundary>
```

### Retry Logic

Failed requests can be retried:

```typescript
import { RetryHandler } from "@/lib/triage/retry-handler";

const retryHandler = new RetryHandler({
  maxRetries: 3,
  backoffMs: 1000,
});

const data = await retryHandler.execute(async () => {
  const response = await fetch("/api/daily-plan/mirror");
  if (!response.ok) throw new Error("Request failed");
  return response.json();
});
```

### User-Friendly Error Messages

Errors are translated to user-friendly messages:

```typescript
function getErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    switch (error.message) {
      case "NO_PLAN_EXISTS":
        return "No plan found for today. Generate a plan first.";
      case "TIMEOUT":
        return "Request timed out. Please try again.";
      case "UNAUTHORIZED":
        return "Please log in to continue.";
      default:
        return error.message;
    }
  }
  return "An unexpected error occurred.";
}
```

## Deployment

### Build Process

```bash
# Production build
npm run build

# Preview production build locally
npm run preview
```

### Environment Variables

Required environment variables:

```env
# Supabase
PUBLIC_SUPABASE_URL=https://your-project.supabase.co
PUBLIC_SUPABASE_ANON_KEY=your-anon-key
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key

# App
PUBLIC_APP_URL=https://your-app.vercel.app
```

### Vercel Deployment

The app uses Vercel adapter for Astro:

```javascript
// astro.config.mjs
import { defineConfig } from "astro/config";
import vercel from "@astrojs/vercel/serverless";

export default defineConfig({
  output: "server",
  adapter: vercel(),
});
```

Deploy via Vercel CLI or GitHub integration:

```bash
# Deploy to production
vercel --prod

# Deploy to preview
vercel
```

### Database Migrations

Run migrations before deploying:

```bash
# Apply migrations
npx supabase db push

# Generate types after schema changes
npm run db:generate-types
```

### Post-Deployment Checks

1. Verify API endpoints respond correctly
2. Check authentication flow
3. Test triage mode activation
4. Verify state declaration persistence
5. Test completion tracking
6. Check mobile responsiveness

## Monitoring and Analytics

### Triage Metrics

Track triage mode usage:

```typescript
import { TriageMetrics } from "@/lib/monitoring/triage-metrics";

const metrics = new TriageMetrics();

// Track triage activation
metrics.trackTriageActivation({
  user_id: user.id,
  runway_minutes: runway.runway,
  required_minutes: runway.required_duration,
  keystone_activity: keystoneActivity.activityName,
});

// Track triage decision
metrics.trackTriageDecision({
  user_id: user.id,
  decision: "protect_keystone",
  anchor_id: anchorId,
});
```

### Analytics Events

Track user interactions:

```typescript
import { Analytics } from "@/lib/monitoring/analytics";

const analytics = new Analytics();

// Track state declaration
analytics.track("state_declared", {
  state: "ready_for_anchor",
  user_id: user.id,
});

// Track completion
analytics.track("step_completed", {
  block_id: blockId,
  activity_name: activityName,
  user_id: user.id,
});

// Track recalculation
analytics.track("plan_recalculated", {
  trigger: "manual",
  duration_ms: duration,
  user_id: user.id,
});
```

### Performance Monitoring

Monitor performance metrics:

```typescript
import { PerformanceMonitor } from "@/lib/monitoring/performance";

const monitor = new PerformanceMonitor();

// Track API response time
const start = performance.now();
const response = await fetch("/api/daily-plan/mirror");
const duration = performance.now() - start;

monitor.trackApiCall({
  endpoint: "/api/daily-plan/mirror",
  duration_ms: duration,
  status: response.status,
});

// Track component render time
useEffect(() => {
  const start = performance.now();
  return () => {
    const duration = performance.now() - start;
    monitor.trackComponentRender({
      component: "MirrorUI",
      duration_ms: duration,
    });
  };
}, []);
```

## Contributing

### Code Style

Follow existing patterns:

- Use TypeScript for all new code
- Use functional components with hooks
- Use Tailwind semantic tokens for styling
- Include JSDoc comments for public APIs
- Write tests for new features

### Pull Request Process

1. Create feature branch from `main`
2. Implement feature with tests
3. Run `npm run format` and `npm test`
4. Update documentation
5. Submit PR with clear description
6. Address review feedback

### Commit Messages

Use conventional commits:

```
feat: add triage mode activation
fix: correct runway calculation for null anchors
docs: update API endpoint documentation
test: add property tests for state filter
refactor: extract timeline filtering logic
```

### Testing Requirements

All new features must include:

- Unit tests for service classes
- Integration tests for API endpoints
- E2E tests for user flows
- Property tests for correctness properties (where applicable)

### Documentation Requirements

Update documentation when:

- Adding new API endpoints
- Adding new components
- Changing service interfaces
- Adding new features
- Fixing bugs that affect behavior

## Resources

### Related Documentation

- [Requirements Document](.kiro/specs/triage-mirror-stateless/requirements.md)
- [Design Document](.kiro/specs/triage-mirror-stateless/design.md)
- [Tasks Document](.kiro/specs/triage-mirror-stateless/tasks.md)
- [User Guide](./MIRROR_UI_USER_GUIDE.md)
- [Accessibility Compliance](../src/docs/ACCESSIBILITY_COMPLIANCE.md)

### External Resources

- [Astro Documentation](https://docs.astro.build/)
- [React Documentation](https://react.dev/)
- [Supabase Documentation](https://supabase.com/docs)
- [Tailwind CSS Documentation](https://tailwindcss.com/docs)
- [Vitest Documentation](https://vitest.dev/)
- [fast-check Documentation](https://fast-check.dev/)

### Support

For questions or issues:

1. Check existing documentation
2. Review test examples
3. Consult design document
4. Ask in team chat

## Changelog

### Version 1.0.0 (Initial Release)

**Features**:

- Mirror UI with vertical timeline
- Runway calculation and triage mode
- State declaration with 6 options
- Completion tracking with persistence
- Inline editing for anchors and steps
- Stateless recalculation
- Intent signal after 7+ day absence
- Mobile-first responsive design
- Touch gesture support
- Accessibility compliance

**API Endpoints**:

- GET /api/daily-plan/mirror
- POST /api/daily-plan/recalculate
- POST /api/daily-plan/state
- POST /api/daily-plan/triage
- GET /api/daily-plan/check-absence
- PATCH /api/time-blocks/[id]/complete
- PATCH /api/time-blocks/[id]/edit
- DELETE /api/time-blocks/[id]/delete
- POST /api/time-blocks/insert

**Service Classes**:

- TimePhysicsService
- TriageService
- StateFilterService

**Components**:

- MirrorUI
- MirrorHeader
- StateDeclarationPrompt
- TriagePrompt
- Timeline
- TimeBlock
- InlineEditor
- DeadlineBanner
- StartTimeLabel
- IntentSignalBanner

**Testing**:

- 33 correctness properties
- Unit tests for all services
- Integration tests for all APIs
- E2E tests for user flows
- Performance tests for optimization validation

---

**Last Updated**: 2026-03-01
**Maintained By**: MeshOS Development Team
