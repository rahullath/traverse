# Design Document: Mirror V2 - Cognitive Prosthetic

## Overview

Mirror V2 transforms the daily plan interface from a judgment-based plan tracker into a cognitive prosthetic for executive dysfunction. This design removes harmful patterns (automatic warnings, deadline countdowns, forced tracking) and replaces them with supportive scaffolding that prioritizes user agency, neutral information display, and flexible activation support.

### Core Design Principles

1. **No Automatic Judgment**: Never trigger warnings or triage without user request
2. **Neutral Information**: Display times and anchors as facts, not deadlines
3. **User-Initiated Support**: Ask "What do you need?" instead of "Where are you?"
4. **Flexible Activation**: Allow users to choose when and how to start their chain
5. **Optional Tracking**: Timeline as visual scaffold first, completion tracker second
6. **Keystone Focus**: Emphasize the one activity that unlocks the day

### Design Goals

- Remove guilt-inducing patterns from V1 (automatic triage, "running late" warnings, red colors)
- Provide calm, neutral information about anchors and time
- Support flexible start times and display modes
- Enable passive telemetry without requiring completion tracking
- Maintain compatibility with existing chain generation and plan builder systems

## Architecture

### High-Level Component Structure


```
┌─────────────────────────────────────────────────────────────┐
│                        MirrorUI                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              MirrorHeader                             │  │
│  │  - Recalculate button                                 │  │
│  │  - Token balance display                              │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │           IntentPrompt (NEW)                          │  │
│  │  "What do you need?"                                  │  │
│  │  - Full morning chain                                 │  │
│  │  - Just keystone + anchor                             │  │
│  │  - Check if I can make it                             │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │        ChainStartSelector (NEW)                       │  │
│  │  - Now / In 10 min / In 30 min / Custom / When ready │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         AnchorInfoCard (NEW)                          │  │
│  │  "Anchor at 12:00 PM (in 3 hours)"                   │  │
│  │  [Can I make it?] button                              │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │         DepartureWaypoint (NEW)                       │  │
│  │  "Leave by 11:15 AM (in 2h 30m)"                     │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │              Timeline (MODIFIED)                      │  │
│  │  - Chain steps with durations                         │  │
│  │  - Optional completion controls                       │  │
│  │  - Keystone emphasis                                  │  │
│  │  - Display mode filtering                             │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │      RealityCheckPrompt (NEW, user-initiated)         │  │
│  │  "You have time for: [steps]"                         │  │
│  │  "Or: [simplified options]"                           │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │      FreeActivationPrompt (NEW, no-anchor days)       │  │
│  │  "No anchors today. Want to run your activation?"    │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```

### Service Layer Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    Service Layer                            │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │     DisplayModeService (NEW)                          │  │
│  │  - applyDisplayMode()                                 │  │
│  │  - getDisplayOptions()                                │  │
│  │  - filterTimelineByMode()                             │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │     RealityCheckService (NEW)                         │  │
│  │  - calculatePossibleSteps()                           │  │
│  │  - generateAlternatives()                             │  │
│  │  - Uses existing TriageService logic                  │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │     TriageService (KEEP, make user-initiated)         │  │
│  │  - shouldActivateTriage() [not auto-called]           │  │
│  │  - identifyKeystoneActivity()                         │  │
│  │  - getTriageState()                                   │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │     AnalyticsService (EXTEND)                         │  │
│  │  - recordAppOpen()                                    │  │
│  │  - recordAnchorView()                                 │  │
│  │  - inferAnchorAttendance()                            │  │
│  │  - recordKeystoneView()                               │  │
│  │  - recordDisplayModeSwitch()                          │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │     DisplayModeSerializer (NEW)                       │  │
│  │  - serialize()                                        │  │
│  │  - deserialize()                                      │  │
│  │  - validate()                                         │  │
│  └───────────────────────────────────────────────────────┘  │
│                                                             │
│  ┌───────────────────────────────────────────────────────┐  │
│  │     TelemetrySerializer (NEW)                         │  │
│  │  - serialize()                                        │  │
│  │  - deserialize()                                      │  │
│  │  - validate()                                         │  │
│  └───────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────┘
```


### Data Flow

```
User Opens Mirror UI
        ↓
IntentPrompt: "What do you need?"
        ↓
User Selects Display Mode
        ↓
DisplayModeService.applyDisplayMode()
        ↓
Timeline Filtered & Rendered
        ↓
[Optional] User Clicks "Can I make it?"
        ↓
RealityCheckService.calculatePossibleSteps()
        ↓
RealityCheckPrompt Shows Options
        ↓
[Optional] User Adjusts Start Time
        ↓
ChainStartSelector Updates Timeline
        ↓
AnalyticsService Records Passive Telemetry
```

## Components and Interfaces

### New Components

#### IntentPrompt

**Purpose**: Replace StateDeclarationPrompt with user-need-focused interface

**Props**:
```typescript
interface IntentPromptProps {
  anchors: TimeBlock[];
  keystoneActivity: string | null;
  currentTime: Date;
  onSelectIntent: (intent: DisplayIntent, startTime?: ChainStartTime) => void;
  onDismiss: () => void;
}
```

**Behavior**:
- Displays "What do you need?" as primary heading (Req 11.2)
- Shows anchor information if anchors exist
- Offers three options: "Full morning chain", "Just keystone + anchor", "Check if I can make it" (Req 11.3)
- For no-anchor days, shows FreeActivationPrompt instead
- Stores selected intent in session state


#### AnchorInfoCard

**Purpose**: Display anchor information neutrally without deadline pressure

**Props**:
```typescript
interface AnchorInfoCardProps {
  anchor: TimeBlock;
  currentTime: Date;
  onRealityCheck: () => void;
  isExpanded: boolean;
  onToggleExpand?: () => void;
}
```

**Behavior**:
- Shows "Anchor at [time]" format (Req 2.1)
- Displays time remaining as "(in X hours)" without countdown timer (Req 2.2)
- Uses neutral colors, no red or warning states (Req 2.4)
- Includes "Can I make it?" button for user-initiated reality check (Req 1.2)
- For multi-anchor days, supports collapsed/expanded states (Req 12.2, 12.3)

**Styling**:
- Larger text for anchor time
- Neutral background color from theme
- No color changes based on time proximity
- Gentle spacing and padding for calm presentation

#### DepartureWaypoint

**Purpose**: Prominently display departure time as critical waypoint

**Props**:
```typescript
interface DepartureWaypointProps {
  departureTime: Date;
  currentTime: Date;
  anchor: TimeBlock;
  travelDuration: number;
}
```

**Behavior**:
- Displays "Leave by [time]" in larger text than chain steps (Req 6.2)
- Shows both clock time and countdown "(in X hours Y minutes)" (Req 6.3)
- Uses neutral styling when > 10 minutes away (Req 19.1)
- Applies gentle highlight when within 10 minutes (Req 19.2)
- Never uses red, orange, yellow, or alarm colors (Req 19.4)
- Maintains calm presentation even after departure time passes (Req 19.5)

**Styling**:
- Font size hierarchy: Anchor (largest) → Departure (prominent) → Chain steps (smaller) (Req 6.4)
- Gentle highlight: font-weight 600 or 2px border with accent color at 40% opacity (Req 19.3)
- Distinct visual separation from chain steps


#### ChainStartSelector

**Purpose**: Allow flexible chain start time selection

**Props**:
```typescript
interface ChainStartSelectorProps {
  onSelectStart: (startTime: ChainStartTime) => void;
  defaultMode?: ChainStartMode;
}

type ChainStartTime =
  | { type: 'now' }
  | { type: 'in_minutes'; minutes: number }
  | { type: 'at_time'; time: Date }
  | { type: 'when_ready' }; // No times shown

type ChainStartMode = 'now' | 'in_10' | 'in_30' | 'custom' | 'when_ready';
```

**Behavior**:
- Offers five options: "Now", "In 10 minutes", "In 30 minutes", "Custom time", "When ready" (Req 8.2)
- When "When ready" selected, timeline shows sequence without clock times (Req 8.3)
- Stores last selected mode in sessionStorage (Req 8.5)
- Triggers timeline regeneration with chosen start point (Req 8.4)

**UI Layout**:
```
Start chain:
○ Now
○ In 10 minutes
○ In 30 minutes
○ Custom time
○ When ready (just show me the sequence)

[Continue]
```

#### RealityCheckPrompt

**Purpose**: User-initiated assessment of what's possible given current time

**Props**:
```typescript
interface RealityCheckPromptProps {
  possibleSteps: string[];
  alternatives: RealityCheckAlternative[];
  runway: number;
  requiredDuration: number;
  onSelectOption: (option: string) => void;
  onDismiss: () => void;
}

interface RealityCheckAlternative {
  id: string;
  label: string;
  description: string;
  steps: string[];
}
```

**Behavior**:
- Displays possible steps in neutral language "You have time for: [steps]" (Req 7.3)
- Offers alternative options "Or: [simplified options]" (Req 7.4)
- Never uses judgment language like "late", "behind", "missed" (Req 7.5)
- Triggered only by user clicking "Can I make it?" button (Req 7.1)

**Example Display**:
```
You have time for:
• Quick shower (10 min)
• Get dressed (5 min)
• Leave by 11:45 AM

Or:
[Skip shower, just go]
[Skip this anchor]
[Show me everything anyway]
```


#### FreeActivationPrompt

**Purpose**: Support activation on days without anchors

**Props**:
```typescript
interface FreeActivationPromptProps {
  keystoneActivity: string | null;
  onStartChain: (startTime: ChainStartTime) => void;
  onKeystoneOnly: () => void;
}
```

**Behavior**:
- Detects when no anchor blocks exist (Req 10.1)
- Displays "No anchors today. Want to run your activation chain?" (Req 10.2)
- Includes ChainStartSelector for flexible start times (Req 10.3)
- Offers keystone-only shortcut
- Timeline displays chain without anchor/departure blocks (Req 10.4)
- Emphasizes keystone as primary daily goal (Req 10.5)

**UI Layout**:
```
No anchors today

Want to run your activation chain?

[Start Now]  [Start in 10 min]

Or just focus on:
[🌟 Shower]
```

### Modified Components

#### MirrorUI (Primary Container)

**Changes**:
- Add state for `showRealityCheck` and `displayMode`
- Replace automatic triage activation with manual trigger (Req 1.1)
- Add "Can I make it?" button that sets `showRealityCheck = true` (Req 1.2)
- Render IntentPrompt on initial load (Req 11.1)
- Store display mode in sessionStorage with key `mirror_display_mode_{date}` (Req 18.1)
- Check for passed anchors on load, foreground, and every 60 seconds (Req 13.2)
- Display neutral pivot options when anchor has passed (Req 13.3)

**New State**:
```typescript
const [displayMode, setDisplayMode] = useState<DisplayIntent>('full_chain');
const [showRealityCheck, setShowRealityCheck] = useState(false);
const [chainStartTime, setChainStartTime] = useState<ChainStartTime>({ type: 'now' });
const [showIntentPrompt, setShowIntentPrompt] = useState(true);
```


#### Timeline

**Changes**:
- Display durations instead of clock times for chain steps (Req 5.1)
- Show clock times only for anchors and departure waypoints (Req 5.2, 5.4, 5.5)
- Hide completion controls by default unless `show_completion_controls` preference is true (Req 4.3, 4.4)
- Remove time-based color changes (Req 3.1)
- Use only three visual states: pending, completed, skipped (Req 3.2)
- Maintain neutral pending state even when current time exceeds start time (Req 3.5)
- Apply display mode filtering (keystone_focus, full_chain, etc.) (Req 9.2)
- Visually emphasize keystone block (Req 9.5)
- Hide recovery blocks when `show_recovery_blocks` preference is false (Req 21.3)

**New Props**:
```typescript
interface TimelineProps {
  timeBlocks: TimeBlock[];
  displayMode: DisplayIntent;
  showTimes: boolean; // false for "when ready" mode
  showCompletionControls: boolean; // from user preferences
  showRecoveryBlocks: boolean; // from user preferences
  keystoneId?: string;
  editMode: boolean;
  onBlockComplete: (blockId: string) => void;
  onBlockSkip: (blockId: string, reason: string) => void;
  onBlockEdit: (blockId: string) => void;
  onBlockDelete: (blockId: string) => void;
  onRefresh: () => void;
}
```

**Display Logic**:
```typescript
function getBlockDisplayTime(block: TimeBlock, showTimes: boolean): string {
  if (!showTimes) {
    return `${block.duration} min`;
  }
  
  const envelopeType = block.metadata?.commitment_envelope?.envelope_type;
  
  if (envelopeType === 'anchor' || envelopeType === 'travel_there') {
    return formatClockTime(block.startTime);
  }
  
  return `${block.duration} min`;
}
```

#### TimeBlock

**Changes**:
- Remove time-based color changes (Req 3.1, 3.4)
- Display duration or clock time based on block type (Req 5.1-5.5)
- Hide completion checkbox when `showCompletionControls` is false (Req 4.3)
- Show completion checkbox when `showCompletionControls` is true (Req 4.4)
- Add keystone indicator when block is identified as keystone (Req 9.5)

**Visual States**:
```typescript
type BlockVisualState = 'pending' | 'completed' | 'skipped';

function getBlockStyles(status: BlockVisualState): string {
  switch (status) {
    case 'completed':
      return 'bg-success/10 border-success';
    case 'skipped':
      return 'bg-surface-secondary border-border opacity-60';
    case 'pending':
    default:
      return 'bg-surface-primary border-border';
  }
}
```


#### MirrorHeader

**Changes**:
- Add display mode switcher buttons (Req 11.5)
- Add keystone shortcut button "Just show me [keystone]" (Req 17.2, 17.5)
- Keep existing recalculate and token balance display

**New Props**:
```typescript
interface MirrorHeaderProps {
  editMode: boolean;
  onToggleEditMode: () => void;
  onRecalculate: () => void;
  isRecalculating: boolean;
  tokenBalance: number | null;
  displayMode: DisplayIntent;
  onDisplayModeChange: (mode: DisplayIntent) => void;
  keystoneActivity: string | null;
  onKeystoneShortcut: () => void;
}
```

### Components to Deprecate

- **DeadlineBanner**: Replaced by AnchorInfoCard (Req 2.3)
- **StateDeclarationPrompt**: Replaced by IntentPrompt (Req 11.1)
- **Automatic TriagePrompt**: Made user-initiated only (Req 1.1)

## Data Models

### Display Mode Types

```typescript
// Display intent options
type DisplayIntent =
  | 'full_chain'           // Show everything
  | 'keystone_focus'       // Show only keystone + anchor
  | 'reality_check'        // Show what's possible now
  | 'anchor_only'          // Just show the anchor
  | 'rest_of_day';         // Skip current anchor, show what's next

// Chain start time options
type ChainStartTime =
  | { type: 'now' }
  | { type: 'in_minutes'; minutes: number }
  | { type: 'at_time'; time: Date }
  | { type: 'when_ready' }; // No times, just sequence

// Display mode state (stored in sessionStorage)
interface DisplayModeState {
  mode: DisplayIntent;
  startTime: ChainStartTime;
  showTimes: boolean;
  timestamp: Date;
}
```


### Telemetry Event Types

```typescript
// Optional usage analytics events (requires enable_usage_analytics = true)
interface AppOpenEvent {
  event_type: 'app_open';
  timestamp: Date;
  had_anchor_today: boolean;
  time_until_next_anchor: number | null; // minutes
}

interface AnchorViewEvent {
  event_type: 'anchor_view';
  timestamp: Date;
  anchor_id: string;
  anchor_time: Date;
  viewed_before_anchor: boolean;
  time_until_anchor: number; // minutes
}

interface KeystoneViewEvent {
  event_type: 'keystone_view';
  timestamp: Date;
  keystone_type: string;
  display_mode: DisplayIntent;
}

interface DisplayModeSwitch {
  event_type: 'display_mode_switch';
  timestamp: Date;
  from_mode: DisplayIntent;
  to_mode: DisplayIntent;
}

interface RealityCheckRequest {
  event_type: 'reality_check_request';
  timestamp: Date;
  runway: number;
  required_duration: number;
  anchor_id: string;
}

// Inferred metrics (calculated from optional analytics events, only when enabled)
interface InferredAnchorAttendance {
  anchor_id: string;
  anchor_time: Date;
  likely_attended: boolean;
  confidence: 'high' | 'medium' | 'low';
  inference_reason: string;
}

// Completion metrics (only when enable_usage_analytics AND show_completion_controls are both true)
interface CompletionMetrics {
  steps_completed: number;
  steps_skipped: number;
  completion_rate: number;
  time_to_complete_chain: number;
}

// Qualitative feedback (always optional, separate from usage analytics)
interface FeltHelpfulFeedback {
  event_type: 'felt_helpful_feedback';
  timestamp: Date;
  response: 'yes' | 'somewhat' | 'not_really';
  date: string; // YYYY-MM-DD
}
```

### User Preferences Schema

```typescript
interface MirrorV2Preferences {
  // Completion tracking (default: false)
  show_completion_controls: boolean;
  
  // Recovery blocks (default: true)
  show_recovery_blocks: boolean;
  
  // Keystone activity (user-defined or inferred)
  keystone_activity: string | null;
  
  // Usage analytics opt-in (default: false)
  enable_usage_analytics: boolean;
  
  // Felt helpful feedback tracking
  felt_helpful_dismissed_dates: string[]; // YYYY-MM-DD format
}
```


### Database Schema

#### New Table: mirror_telemetry_events

```sql
CREATE TABLE mirror_telemetry_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mirror_telemetry_user_time 
  ON mirror_telemetry_events(user_id, timestamp DESC);
CREATE INDEX idx_mirror_telemetry_event_type 
  ON mirror_telemetry_events(event_type);
CREATE INDEX idx_mirror_telemetry_user_event 
  ON mirror_telemetry_events(user_id, event_type);
```

#### Updates to user_preferences Table

```sql
ALTER TABLE user_preferences 
ADD COLUMN IF NOT EXISTS show_completion_controls BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS show_recovery_blocks BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS keystone_activity TEXT,
ADD COLUMN IF NOT EXISTS enable_usage_analytics BOOLEAN DEFAULT FALSE;

-- Add to preferences JSONB for felt_helpful tracking
-- preferences.felt_helpful_dismissed_dates: string[]
```

## Service Layer

### DisplayModeService

**Purpose**: Replace automatic triage with user-controlled display modes

**Location**: `src/lib/display/display-mode-service.ts`

**Interface**:
```typescript
class DisplayModeService {
  /**
   * Get available display options based on current context
   * Req 11.3, 11.4
   */
  getDisplayOptions(
    timeBlocks: TimeBlock[],
    currentTime: Date
  ): DisplayOption[];

  /**
   * Apply display mode filter to timeline
   * Req 9.2, 11.4, 12.1, 12.2
   */
  applyDisplayMode(
    timeBlocks: TimeBlock[],
    mode: DisplayIntent,
    keystoneId?: string
  ): TimeBlock[];

  /**
   * Identify next anchor for multi-anchor scenarios
   * Req 12.5
   */
  getNextAnchor(
    timeBlocks: TimeBlock[],
    currentTime: Date
  ): TimeBlock | null;

  /**
   * Check if anchor has passed
   * Req 13.1
   */
  hasAnchorPassed(
    anchor: TimeBlock,
    currentTime: Date
  ): boolean;

  /**
   * Get pivot options for passed anchor
   * Req 13.3, 13.5, 13.6
   */
  getPivotOptions(
    timeBlocks: TimeBlock[],
    passedAnchor: TimeBlock,
    currentTime: Date
  ): PivotOption[];
}
```


**Implementation Details**:

```typescript
// Display mode filtering logic
applyDisplayMode(
  timeBlocks: TimeBlock[],
  mode: DisplayIntent,
  keystoneId?: string
): TimeBlock[] {
  switch (mode) {
    case 'full_chain':
      return timeBlocks;
    
    case 'keystone_focus':
      // Show only keystone and anchor blocks (Req 9.2)
      return timeBlocks.filter(block => 
        block.id === keystoneId || 
        block.metadata?.role?.type === 'anchor'
      );
    
    case 'anchor_only':
      // Show only anchor blocks
      return timeBlocks.filter(block => 
        block.metadata?.role?.type === 'anchor'
      );
    
    case 'rest_of_day':
      // Show all blocks after current time
      const now = new Date();
      return timeBlocks.filter(block => 
        block.startTime > now
      );
    
    case 'reality_check':
      // Show blocks that fit within runway
      // Handled by RealityCheckService
      return timeBlocks;
    
    default:
      return timeBlocks;
  }
}

// Next anchor identification (Req 12.5)
getNextAnchor(timeBlocks: TimeBlock[], currentTime: Date): TimeBlock | null {
  const futureAnchors = timeBlocks
    .filter(block => 
      block.metadata?.role?.type === 'anchor' &&
      block.startTime > currentTime
    )
    .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());
  
  return futureAnchors[0] || null;
}

// Passed anchor detection (Req 13.1)
hasAnchorPassed(anchor: TimeBlock, currentTime: Date): boolean {
  return currentTime > anchor.startTime;
}
```

### RealityCheckService

**Purpose**: User-initiated assessment of what's possible given current time

**Location**: `src/lib/display/reality-check.ts`

**Interface**:
```typescript
class RealityCheckService {
  /**
   * Calculate which chain steps fit within available runway
   * Req 7.2
   */
  calculatePossibleSteps(
    timeBlocks: TimeBlock[],
    runway: number,
    nextAnchor: TimeBlock
  ): RealityCheckResult;

  /**
   * Generate alternative options (simplified chains)
   * Req 7.4
   */
  generateAlternatives(
    timeBlocks: TimeBlock[],
    runway: number,
    keystoneId: string
  ): RealityCheckAlternative[];

  /**
   * Format result in neutral language
   * Req 7.3, 7.5
   */
  formatRealityCheck(
    result: RealityCheckResult
  ): string;
}

interface RealityCheckResult {
  possibleSteps: TimeBlock[];
  skippedSteps: TimeBlock[];
  canMakeAnchor: boolean;
  alternatives: RealityCheckAlternative[];
}

interface RealityCheckAlternative {
  id: string;
  label: string;
  description: string;
  steps: TimeBlock[];
  estimatedDuration: number;
}
```


**Implementation Details**:

```typescript
// Calculate possible steps within runway (Req 7.2)
calculatePossibleSteps(
  timeBlocks: TimeBlock[],
  runway: number,
  nextAnchor: TimeBlock
): RealityCheckResult {
  const chainBlocks = timeBlocks.filter(block => 
    block.startTime < nextAnchor.startTime &&
    block.metadata?.anchor_id === nextAnchor.activityId
  );
  
  let accumulatedDuration = 0;
  const possibleSteps: TimeBlock[] = [];
  const skippedSteps: TimeBlock[] = [];
  
  // Sort by start time (backward from anchor)
  const sortedBlocks = [...chainBlocks].sort((a, b) => 
    b.startTime.getTime() - a.startTime.getTime()
  );
  
  for (const block of sortedBlocks) {
    if (accumulatedDuration + block.duration <= runway) {
      possibleSteps.unshift(block);
      accumulatedDuration += block.duration;
    } else {
      skippedSteps.unshift(block);
    }
  }
  
  const alternatives = this.generateAlternatives(
    timeBlocks,
    runway,
    this.findKeystoneId(timeBlocks, nextAnchor.activityId)
  );
  
  return {
    possibleSteps,
    skippedSteps,
    canMakeAnchor: accumulatedDuration <= runway,
    alternatives
  };
}

// Generate alternative options (Req 7.4)
generateAlternatives(
  timeBlocks: TimeBlock[],
  runway: number,
  keystoneId: string
): RealityCheckAlternative[] {
  const alternatives: RealityCheckAlternative[] = [];
  
  // Option 1: Keystone only
  const keystoneBlock = timeBlocks.find(b => b.id === keystoneId);
  if (keystoneBlock && keystoneBlock.duration <= runway) {
    alternatives.push({
      id: 'keystone_only',
      label: 'Just do keystone',
      description: `Quick ${keystoneBlock.activityName} and go`,
      steps: [keystoneBlock],
      estimatedDuration: keystoneBlock.duration
    });
  }
  
  // Option 2: Skip everything, just go
  alternatives.push({
    id: 'skip_all',
    label: 'Skip prep, just go',
    description: 'Head straight to anchor',
    steps: [],
    estimatedDuration: 0
  });
  
  // Option 3: Show everything anyway
  alternatives.push({
    id: 'show_all',
    label: 'Show me everything anyway',
    description: 'See full chain regardless of time',
    steps: timeBlocks,
    estimatedDuration: timeBlocks.reduce((sum, b) => sum + b.duration, 0)
  });
  
  return alternatives;
}
```

### AnalyticsService (Extended)

**Purpose**: Record optional usage analytics when users explicitly opt in

**Location**: `src/lib/monitoring/analytics.ts` (extend existing)

**New Methods**:
```typescript
class AnalyticsService {
  /**
   * Check if analytics are enabled for user
   * Req 14.1, 14.2, 15.1
   */
  async isAnalyticsEnabled(userId: string): Promise<boolean>;

  /**
   * Record app open event (only if analytics enabled)
   * Req 14.3
   */
  async recordAppOpen(
    userId: string,
    hadAnchorToday: boolean,
    timeUntilNextAnchor: number | null
  ): Promise<void>;

  /**
   * Record anchor view event (only if analytics enabled)
   * Req 14.3
   */
  async recordAnchorView(
    userId: string,
    anchorId: string,
    anchorTime: Date,
    currentTime: Date
  ): Promise<void>;

  /**
   * Record keystone view event (only if analytics enabled)
   * Req 14.3
   */
  async recordKeystoneView(
    userId: string,
    keystoneType: string,
    displayMode: DisplayIntent
  ): Promise<void>;

  /**
   * Record display mode switch (only if analytics enabled)
   * Req 14.3
   */
  async recordDisplayModeSwitch(
    userId: string,
    fromMode: DisplayIntent,
    toMode: DisplayIntent
  ): Promise<void>;

  /**
   * Record reality check request (only if analytics enabled)
   * Req 14.3
   */
  async recordRealityCheckRequest(
    userId: string,
    runway: number,
    requiredDuration: number,
    anchorId: string
  ): Promise<void>;

  /**
   * Infer anchor attendance from app opens (only if analytics enabled)
   * Req 15.2
   */
  async inferAnchorAttendance(
    userId: string,
    anchorId: string,
    anchorTime: Date
  ): Promise<InferredAnchorAttendance | null>;

  /**
   * Record felt helpful feedback (always available, separate from analytics)
   * Req 20.4
   */
  async recordFeltHelpfulFeedback(
    userId: string,
    response: 'yes' | 'somewhat' | 'not_really',
    date: string
  ): Promise<void>;

  /**
   * Check if completion metrics should be recorded
   * Req 15.3, 15.4
   */
  shouldRecordCompletionMetrics(
    enableAnalytics: boolean,
    showCompletionControls: boolean
  ): boolean;
}
```


**Implementation Details**:

```typescript
// Check if analytics enabled before recording (Req 14.1, 14.2, 15.1)
async isAnalyticsEnabled(userId: string): Promise<boolean> {
  const { data } = await this.supabase
    .from('user_preferences')
    .select('enable_usage_analytics')
    .eq('user_id', userId)
    .single();
  
  return data?.enable_usage_analytics === true;
}

// All recording methods check analytics enabled first
async recordAppOpen(
  userId: string,
  hadAnchorToday: boolean,
  timeUntilNextAnchor: number | null
): Promise<void> {
  // Check if analytics enabled (Req 14.2)
  const enabled = await this.isAnalyticsEnabled(userId);
  if (!enabled) {
    return; // Silently skip if disabled
  }
  
  // Record event
  await this.supabase
    .from('mirror_telemetry_events')
    .insert({
      user_id: userId,
      event_type: 'app_open',
      event_data: {
        had_anchor_today: hadAnchorToday,
        time_until_next_anchor: timeUntilNextAnchor
      },
      timestamp: new Date().toISOString()
    });
}

// Infer anchor attendance (only if analytics enabled) (Req 15.2)
async inferAnchorAttendance(
  userId: string,
  anchorId: string,
  anchorTime: Date
): Promise<InferredAnchorAttendance | null> {
  // Check if analytics enabled
  const enabled = await this.isAnalyticsEnabled(userId);
  if (!enabled) {
    return null; // Cannot infer without analytics data
  }
  
  // Query app opens after anchor time
  const appOpensAfterAnchor = await this.getAppOpens(
    userId,
    anchorTime,
    new Date(anchorTime.getTime() + 4 * 60 * 60 * 1000) // 4 hours after
  );
  
  if (appOpensAfterAnchor.length === 0) {
    return {
      anchor_id: anchorId,
      anchor_time: anchorTime,
      likely_attended: false,
      confidence: 'low',
      inference_reason: 'No app opens after anchor time'
    };
  }
  
  // If opened within 30 min after anchor, high confidence they attended
  const openedSoon = appOpensAfterAnchor.some(open => 
    open.timestamp.getTime() - anchorTime.getTime() < 30 * 60 * 1000
  );
  
  if (openedSoon) {
    return {
      anchor_id: anchorId,
      anchor_time: anchorTime,
      likely_attended: true,
      confidence: 'high',
      inference_reason: 'App opened within 30 minutes after anchor'
    };
  }
  
  // Opened later, medium confidence
  return {
    anchor_id: anchorId,
    anchor_time: anchorTime,
    likely_attended: true,
    confidence: 'medium',
    inference_reason: 'App opened after anchor time'
  };
}

// Check if completion metrics should be recorded (Req 15.3, 15.4)
shouldRecordCompletionMetrics(
  enableAnalytics: boolean,
  showCompletionControls: boolean
): boolean {
  return enableAnalytics === true && showCompletionControls === true;
}
```

### DisplayModeSerializer

**Purpose**: Serialize and deserialize display mode state for sessionStorage

**Location**: `src/lib/display/serializer.ts`

**Interface**:
```typescript
class DisplayModeSerializer {
  /**
   * Serialize display mode to JSON
   * Req 22.1
   */
  serialize(state: DisplayModeState): string;

  /**
   * Deserialize JSON to display mode
   * Req 22.2
   */
  deserialize(json: string): DisplayModeState;

  /**
   * Validate display mode value
   * Req 22.3
   */
  validate(mode: string): boolean;

  /**
   * Get default display mode
   * Req 22.4
   */
  getDefault(): DisplayIntent;
}
```

**Implementation**:
```typescript
class DisplayModeSerializer {
  private readonly VALID_MODES: DisplayIntent[] = [
    'full_chain',
    'keystone_focus',
    'reality_check',
    'anchor_only',
    'rest_of_day'
  ];

  serialize(state: DisplayModeState): string {
    return JSON.stringify(state);
  }

  deserialize(json: string): DisplayModeState {
    try {
      const parsed = JSON.parse(json);
      
      // Validate mode (Req 22.3)
      if (!this.validate(parsed.mode)) {
        return this.getDefaultState();
      }
      
      return {
        mode: parsed.mode,
        startTime: parsed.startTime,
        showTimes: parsed.showTimes ?? true,
        timestamp: new Date(parsed.timestamp)
      };
    } catch (error) {
      // Return default on parse error (Req 22.4)
      return this.getDefaultState();
    }
  }

  validate(mode: string): boolean {
    return this.VALID_MODES.includes(mode as DisplayIntent);
  }

  getDefault(): DisplayIntent {
    return 'full_chain';
  }

  private getDefaultState(): DisplayModeState {
    return {
      mode: 'full_chain',
      startTime: { type: 'now' },
      showTimes: true,
      timestamp: new Date()
    };
  }
}
```


### TelemetrySerializer

**Purpose**: Serialize and deserialize telemetry events for storage

**Location**: `src/lib/monitoring/telemetry-serializer.ts`

**Interface**:
```typescript
class TelemetrySerializer {
  /**
   * Serialize telemetry event to JSON
   * Req 23.1, 23.2
   */
  serialize(event: PassiveTelemetryEvent): string;

  /**
   * Deserialize JSON to telemetry event
   * Req 23.3
   */
  deserialize(json: string): PassiveTelemetryEvent;

  /**
   * Validate telemetry event
   * Req 23.4
   */
  validate(event: any): boolean;
}

type PassiveTelemetryEvent = 
  | AppOpenEvent 
  | AnchorViewEvent 
  | KeystoneViewEvent 
  | DisplayModeSwitch 
  | RealityCheckRequest
  | FeltHelpfulFeedback;
```

**Implementation**:
```typescript
class TelemetrySerializer {
  private readonly VALID_EVENT_TYPES = [
    'app_open',
    'anchor_view',
    'keystone_view',
    'display_mode_switch',
    'reality_check_request',
    'felt_helpful_feedback'
  ];

  serialize(event: PassiveTelemetryEvent): string {
    // Ensure required fields are present (Req 23.2)
    const serialized = {
      event_type: event.event_type,
      timestamp: event.timestamp.toISOString(),
      event_data: this.extractEventData(event)
    };
    
    return JSON.stringify(serialized);
  }

  deserialize(json: string): PassiveTelemetryEvent {
    const parsed = JSON.parse(json);
    
    // Validate timestamp format and event_type (Req 23.4)
    if (!this.validate(parsed)) {
      throw new Error('Invalid telemetry event');
    }
    
    return {
      event_type: parsed.event_type,
      timestamp: new Date(parsed.timestamp),
      ...parsed.event_data
    } as PassiveTelemetryEvent;
  }

  validate(event: any): boolean {
    // Check required fields
    if (!event.event_type || !event.timestamp) {
      return false;
    }
    
    // Validate event_type (Req 23.4)
    if (!this.VALID_EVENT_TYPES.includes(event.event_type)) {
      return false;
    }
    
    // Validate timestamp format (Req 23.4)
    const timestamp = new Date(event.timestamp);
    if (isNaN(timestamp.getTime())) {
      return false;
    }
    
    return true;
  }

  private extractEventData(event: PassiveTelemetryEvent): any {
    const { event_type, timestamp, ...eventData } = event as any;
    return eventData;
  }
}
```

## API Contracts

### Existing Endpoints (Modified)

#### GET /api/daily-plan/mirror

**Changes**:
- No longer auto-calculates triage state
- Returns triage state as inactive by default
- Adds display mode suggestions

**Response**:
```typescript
{
  time_blocks: TimeBlock[];
  runway: RunwayCalculation;
  triage_state: {
    active: false,  // Always false, user must trigger
    keystone_activity: TimeBlock | null;
    anchor: TimeBlock | null;
    options: [];
  };
  show_state_prompt: boolean;
  last_state_declaration: StateDeclaration | null;
  display_suggestions: DisplayOption[];  // NEW
}
```


### New Endpoints

#### POST /api/daily-plan/reality-check

**Purpose**: User-initiated reality check calculation

**Request**:
```typescript
{
  anchor_id: string;
}
```

**Response**:
```typescript
{
  possible_steps: TimeBlock[];
  skipped_steps: TimeBlock[];
  can_make_anchor: boolean;
  alternatives: RealityCheckAlternative[];
  runway: number;
  required_duration: number;
}
```

**Implementation**:
```typescript
export async function POST({ request, cookies }: APIContext) {
  const serverAuth = createServerAuth(cookies);
  const user = await serverAuth.requireAuth();
  
  const { anchor_id } = await request.json();
  
  // Get current plan
  const plan = await getPlanForToday(user.id);
  if (!plan) {
    return new Response(JSON.stringify({ error: 'No plan found' }), {
      status: 404
    });
  }
  
  // Calculate runway
  const runway = calculateRunway(plan.time_blocks, new Date());
  
  // Get reality check
  const realityCheckService = new RealityCheckService();
  const anchor = plan.time_blocks.find(b => b.activityId === anchor_id);
  
  if (!anchor) {
    return new Response(JSON.stringify({ error: 'Anchor not found' }), {
      status: 404
    });
  }
  
  const result = realityCheckService.calculatePossibleSteps(
    plan.time_blocks,
    runway.runway || 0,
    anchor
  );
  
  // Record telemetry (Req 7.1)
  await analyticsService.recordRealityCheckRequest(
    user.id,
    runway.runway || 0,
    runway.required_duration || 0,
    anchor_id
  );
  
  return new Response(JSON.stringify({
    possible_steps: result.possibleSteps,
    skipped_steps: result.skippedSteps,
    can_make_anchor: result.canMakeAnchor,
    alternatives: result.alternatives,
    runway: runway.runway,
    required_duration: runway.required_duration
  }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
```

#### POST /api/analytics/telemetry

**Purpose**: Record passive telemetry events

**Request**:
```typescript
{
  event_type: string;
  event_data: any;
}
```

**Response**:
```typescript
{
  success: boolean;
}
```

**Implementation**:
```typescript
export async function POST({ request, cookies }: APIContext) {
  const serverAuth = createServerAuth(cookies);
  const user = await serverAuth.requireAuth();
  
  const { event_type, event_data } = await request.json();
  
  // Validate event type
  const serializer = new TelemetrySerializer();
  const event = {
    event_type,
    timestamp: new Date(),
    ...event_data
  };
  
  if (!serializer.validate(event)) {
    return new Response(JSON.stringify({ error: 'Invalid event' }), {
      status: 400
    });
  }
  
  // Store in database
  const { error } = await serverAuth.supabase
    .from('mirror_telemetry_events')
    .insert({
      user_id: user.id,
      event_type,
      event_data,
      timestamp: new Date().toISOString()
    });
  
  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500
    });
  }
  
  return new Response(JSON.stringify({ success: true }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' }
  });
}
```


#### POST /api/analytics/felt-helpful

**Purpose**: Record felt helpful feedback

**Request**:
```typescript
{
  response: 'yes' | 'somewhat' | 'not_really';
  date: string; // YYYY-MM-DD
}
```

**Response**:
```typescript
{
  success: boolean;
}
```

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system—essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property Reflection

After analyzing all acceptance criteria, I identified several areas where properties can be consolidated:

**Redundancy Analysis**:
1. Properties about display mode filtering (9.2, 11.4, 12.1, 12.2) can be combined into comprehensive display mode properties
2. Properties about neutral styling (2.4, 3.4, 19.4) can be consolidated into a single "no warning colors" property
3. Properties about sessionStorage (18.1, 18.2, 18.3) are all testing the same round-trip behavior
4. Properties about telemetry recording (14.1, 14.2, 14.4) follow the same pattern and can be generalized
5. Serialization properties (22.5, 23.5) are both round-trip properties

**Consolidated Properties**:
- Display mode filtering → Single property about correct filtering for all modes
- Neutral colors → Single property about absence of warning colors across all states
- SessionStorage persistence → Single round-trip property
- Telemetry recording → Single property about event recording with required fields
- Serialization → Two round-trip properties (one for display mode, one for telemetry)

### Property 1: Automatic Triage Suppression

*For any* runway calculation where runway < required_duration, the Mirror UI should NOT automatically display the triage prompt without user interaction.

**Validates: Requirements 1.1, 1.5**

### Property 2: User-Initiated Reality Check

*For any* user activation of the "Can I make it?" button, the system should calculate and display reality check results showing which steps fit within available runway.

**Validates: Requirements 1.3, 1.4, 7.2**


### Property 3: Neutral Time Display Format

*For any* time remaining value, the AnchorInfoCard should display it in neutral format "(in X hours)" without countdown timers or urgency indicators.

**Validates: Requirements 2.2, 2.5**

### Property 4: No Warning Colors

*For any* timeline block state or time condition, the system should NOT use red, orange, yellow, or warning colors in the display.

**Validates: Requirements 2.4, 3.4, 19.4**

### Property 5: Visual State Constraint

*For any* timeline block, the visual state should be exactly one of: pending (neutral), completed (green), or skipped (gray), with no time-based color changes.

**Validates: Requirements 3.1, 3.2, 3.5**

### Property 6: Completion Controls Visibility

*For any* timeline display, completion controls should be visible if and only if the user preference `show_completion_controls` is true.

**Validates: Requirements 4.3, 4.4**

### Property 7: Duration vs Clock Time Display

*For any* time block, the display should show duration format "X min" if envelope_type is not "anchor" or "travel_there", and clock time otherwise.

**Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**

### Property 8: Departure Waypoint Prominence

*For any* travel_there block, the DepartureWaypoint component should display both clock time and countdown, with larger text than chain steps and neutral styling when more than 10 minutes away.

**Validates: Requirements 6.2, 6.3, 6.5**

### Property 9: Reality Check Neutral Language

*For any* reality check result, the displayed text should use neutral language patterns ("You have time for") and should NOT contain judgment terms ("late", "behind", "missed").

**Validates: Requirements 7.3, 7.5**

### Property 10: Chain Start Time Regeneration

*For any* user-selected start time, the timeline should be regenerated with blocks recalculated from the chosen start point.

**Validates: Requirements 8.4**

### Property 11: When Ready Mode Suppresses Times

*For any* timeline in "when ready" mode, all blocks should display duration format without clock times.

**Validates: Requirements 8.3**

### Property 12: Display Mode Filtering

*For any* display mode selection, the timeline should show exactly the blocks specified by that mode: full_chain (all blocks), keystone_focus (keystone + anchor only), anchor_only (anchors only), rest_of_day (future blocks only).

**Validates: Requirements 9.2, 11.4, 12.1, 12.2**

### Property 13: Keystone Focus Filtering

*For any* timeline in keystone_focus mode, the visible blocks should be exactly the keystone block and anchor block, with all other blocks hidden.

**Validates: Requirements 9.2**

### Property 14: No-Anchor Detection

*For any* set of time blocks without anchor blocks, the system should detect the no-anchor condition and display the FreeActivationPrompt.

**Validates: Requirements 10.1, 10.4**


### Property 15: Next Anchor Identification

*For any* set of anchor blocks and current time, the "next anchor" should be identified as the first anchor with start time after current time, sorted chronologically.

**Validates: Requirements 12.5**

### Property 16: Passed Anchor Detection

*For any* anchor block and current time, the system should detect the passed anchor condition when current time > anchor start time.

**Validates: Requirements 13.1**

### Property 17: Display Mode Switch Persistence

*For any* display mode selection, switching modes and then switching back should restore the original mode correctly.

**Validates: Requirements 11.5**

### Property 18: Optional Analytics Event Recording

*For any* optional analytics event (app_open, anchor_view, keystone_view), the event should be recorded with timestamp, event_type, and event_data fields ONLY when enable_usage_analytics is true.

**Validates: Requirements 14.2, 14.3, 14.6**

### Property 19: Anchor Attendance Inference

*For any* anchor and app open after the anchor's end time, the system should infer likely attendance with appropriate confidence level.

**Validates: Requirements 14.3**

### Property 20: Conditional Completion Metrics

*For any* user session, completion metrics (completion_rate, steps_completed) should be recorded if and only if BOTH enable_usage_analytics AND show_completion_controls are true.

**Validates: Requirements 15.3, 15.4**

### Property 21: Inferred Metrics Calculation

*For any* user with enable_usage_analytics enabled, the system should calculate inferred metrics (likely_anchor_attendance, preferred_display_mode) from collected analytics events.

**Validates: Requirements 15.2**

### Property 22: Judgment Language Absence

*For any* rendered Mirror UI component, the displayed text should NOT contain the forbidden terms: "running late", "behind schedule", "missed it", "failed", "should have started".

**Validates: Requirements 16.1, 16.4, 16.5**

### Property 23: Keystone Shortcut Mode Switch

*For any* keystone shortcut activation, the display mode should switch to keystone_focus and show only the keystone and anchor blocks.

**Validates: Requirements 17.3**

### Property 24: SessionStorage Round-Trip

*For any* valid display mode state, serializing to sessionStorage then deserializing should produce an equivalent state.

**Validates: Requirements 18.1, 18.2, 18.3**

### Property 25: SessionStorage Day Boundary

*For any* display mode stored in sessionStorage, when the calendar day changes (midnight in user's timezone), the previous day's entry should be cleared.

**Validates: Requirements 18.4**

### Property 26: Gentle Highlight Timing

*For any* departure waypoint, gentle highlight styling should be applied if and only if current time is within 10 minutes of departure time.

**Validates: Requirements 19.1, 19.2**


### Property 27: Felt Helpful Frequency Limit

*For any* calendar day, the "Did this help today?" prompt should appear at most once, regardless of how many times the user opens the app.

**Validates: Requirements 20.3, 20.5**

### Property 28: Felt Helpful Recording

*For any* felt helpful response selection, the response should be recorded without requiring additional explanation or input.

**Validates: Requirements 20.4**

### Property 29: Recovery Block Visibility

*For any* timeline display, recovery blocks should be visible if and only if the user preference `show_recovery_blocks` is true.

**Validates: Requirements 21.2, 21.3**

### Property 30: Display Mode Serialization Round-Trip

*For any* valid DisplayMode object, serializing then deserializing should produce an equivalent object.

**Validates: Requirements 22.5**

### Property 31: Display Mode Validation Default

*For any* invalid DisplayMode value encountered during deserialization, the system should return the default value "full_chain".

**Validates: Requirements 22.4**

### Property 32: Analytics Event Serialization Round-Trip

*For any* valid Optional_Usage_Analytics event, serializing then deserializing should produce an equivalent event object.

**Validates: Requirements 23.5**

### Property 33: Analytics Event Required Fields

*For any* serialized analytics event, the JSON should include timestamp, event_type, and event_data fields.

**Validates: Requirements 23.2**

### Property 34: Analytics Event Validation

*For any* analytics event deserialization, the system should validate timestamp format and event_type values against allowed enums.

**Validates: Requirements 23.4**

### Property 35: Judgment Language Detection Test

*For any* Mirror UI component file, the test suite should detect and fail if the file contains forbidden judgment terms.

**Validates: Requirements 24.2, 24.4**

## Error Handling

### User-Facing Errors

**No Plan Found**:
- Scenario: User opens Mirror UI without generating a plan
- Response: Display friendly message with "Generate Plan" button
- No error tracking needed (expected state)

**Reality Check Calculation Failure**:
- Scenario: Reality check service fails to calculate possible steps
- Response: Display neutral message "Unable to calculate right now. Try again?"
- Log error for debugging
- Don't block user from viewing timeline

**Telemetry Recording Failure**:
- Scenario: Network error or database issue when recording telemetry
- Response: Fail silently, don't interrupt user experience
- Log error for monitoring
- Retry on next event

**Invalid Display Mode**:
- Scenario: Corrupted sessionStorage or invalid mode value
- Response: Fall back to default "full_chain" mode
- Clear corrupted storage
- Continue normal operation


### System Errors

**Database Connection Failure**:
- Scenario: Supabase connection lost
- Response: Display retry UI with exponential backoff
- Use existing retry handler from `src/lib/triage/retry-handler.ts`
- Max 3 retries before showing error state

**Anchor Detection Failure**:
- Scenario: Unable to identify next anchor or keystone
- Response: Fall back to showing all blocks without filtering
- Log warning for investigation
- Don't block user from viewing timeline

**SessionStorage Quota Exceeded**:
- Scenario: Browser storage limit reached
- Response: Clear old display mode entries
- Keep only current day's state
- Log warning

### Error Boundaries

Use existing ErrorBoundary component from `src/components/daily-plan/ErrorBoundary.tsx`:

```typescript
<ErrorBoundary
  fallback={
    <div className="p-4 text-center">
      <p className="text-text-muted">Something went wrong</p>
      <button onClick={() => window.location.reload()}>
        Refresh page
      </button>
    </div>
  }
>
  <MirrorUI userId={userId} />
</ErrorBoundary>
```

## Testing Strategy

### Dual Testing Approach

This feature requires both unit tests and property-based tests:

**Unit Tests**: Verify specific examples, edge cases, and error conditions
- Component rendering with specific props
- Button click handlers
- Error boundary behavior
- Edge cases (empty timelines, no anchors, etc.)

**Property Tests**: Verify universal properties across all inputs
- Display mode filtering for all possible modes
- Serialization round-trips for all valid inputs
- Color constraints across all time states
- Telemetry recording for all event types

Together, these provide comprehensive coverage: unit tests catch concrete bugs, property tests verify general correctness.

### Property-Based Testing Configuration

**Library**: Use `fast-check` for TypeScript property-based testing

**Installation**:
```bash
npm install --save-dev fast-check
```

**Configuration**: Each property test should run minimum 100 iterations

**Tagging**: Each test must reference its design document property

**Tag Format**: `Feature: mirror-v2-cognitive-prosthetic, Property {number}: {property_text}`

### Test Organization

```
src/test/unit/mirror-v2/
  ├── components/
  │   ├── IntentPrompt.test.tsx
  │   ├── AnchorInfoCard.test.tsx
  │   ├── DepartureWaypoint.test.tsx
  │   ├── ChainStartSelector.test.tsx
  │   ├── RealityCheckPrompt.test.tsx
  │   └── FreeActivationPrompt.test.tsx
  ├── services/
  │   ├── display-mode-service.test.ts
  │   ├── reality-check-service.test.ts
  │   ├── display-mode-serializer.test.ts
  │   └── telemetry-serializer.test.ts
  └── properties/
      ├── display-mode.property.test.ts
      ├── serialization.property.test.ts
      ├── telemetry.property.test.ts
      ├── neutral-display.property.test.ts
      └── judgment-language.test.ts

src/test/integration/mirror-v2/
  ├── reality-check-flow.test.ts
  ├── display-mode-switching.test.ts
  ├── telemetry-recording.test.ts
  └── session-persistence.test.ts

src/test/e2e/mirror-v2/
  ├── user-flows.test.ts
  ├── multi-anchor-scenarios.test.ts
  └── no-anchor-scenarios.test.ts
```


### Example Property Test

```typescript
// src/test/unit/mirror-v2/properties/display-mode.property.test.ts
import { describe, it } from 'vitest';
import * as fc from 'fast-check';
import { DisplayModeService } from '@/lib/display/display-mode-service';
import { timeBlockArbitrary } from '@/test/generators/timeline-generators';

/**
 * Feature: mirror-v2-cognitive-prosthetic
 * Property 12: Display Mode Filtering
 * 
 * For any display mode selection, the timeline should show exactly 
 * the blocks specified by that mode.
 */
describe('Display Mode Filtering Property', () => {
  it('should filter timeline correctly for all display modes', () => {
    fc.assert(
      fc.property(
        fc.array(timeBlockArbitrary(), { minLength: 5, maxLength: 20 }),
        fc.constantFrom('full_chain', 'keystone_focus', 'anchor_only', 'rest_of_day'),
        fc.string(), // keystoneId
        (timeBlocks, displayMode, keystoneId) => {
          const service = new DisplayModeService();
          const filtered = service.applyDisplayMode(timeBlocks, displayMode, keystoneId);
          
          switch (displayMode) {
            case 'full_chain':
              return filtered.length === timeBlocks.length;
            
            case 'keystone_focus':
              return filtered.every(block => 
                block.id === keystoneId || 
                block.metadata?.role?.type === 'anchor'
              );
            
            case 'anchor_only':
              return filtered.every(block => 
                block.metadata?.role?.type === 'anchor'
              );
            
            case 'rest_of_day':
              const now = new Date();
              return filtered.every(block => block.startTime > now);
            
            default:
              return true;
          }
        }
      ),
      { numRuns: 100 }
    );
  });
});
```

### Example Unit Test

```typescript
// src/test/unit/mirror-v2/components/AnchorInfoCard.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AnchorInfoCard } from '@/components/daily-plan/AnchorInfoCard';

describe('AnchorInfoCard', () => {
  it('should display "Anchor at" format instead of "Complete by"', () => {
    const anchor = {
      id: '1',
      activityName: 'Class',
      startTime: new Date('2024-01-15T12:00:00'),
      endTime: new Date('2024-01-15T13:00:00'),
      duration: 60,
      metadata: { role: { type: 'anchor' } }
    };
    
    render(
      <AnchorInfoCard
        anchor={anchor}
        currentTime={new Date('2024-01-15T09:00:00')}
        onRealityCheck={vi.fn()}
        isExpanded={true}
      />
    );
    
    // Should show "Anchor at" (Req 2.1)
    expect(screen.getByText(/Anchor at/i)).toBeInTheDocument();
    
    // Should NOT show "Complete by" (Req 2.3)
    expect(screen.queryByText(/Complete by/i)).not.toBeInTheDocument();
    
    // Should show neutral time format (Req 2.2)
    expect(screen.getByText(/\(in 3 hours\)/i)).toBeInTheDocument();
  });

  it('should include "Can I make it?" button', () => {
    const anchor = {
      id: '1',
      activityName: 'Class',
      startTime: new Date('2024-01-15T12:00:00'),
      endTime: new Date('2024-01-15T13:00:00'),
      duration: 60,
      metadata: { role: { type: 'anchor' } }
    };
    
    const onRealityCheck = vi.fn();
    
    render(
      <AnchorInfoCard
        anchor={anchor}
        currentTime={new Date('2024-01-15T09:00:00')}
        onRealityCheck={onRealityCheck}
        isExpanded={true}
      />
    );
    
    // Should have reality check button (Req 1.2)
    const button = screen.getByRole('button', { name: /Can I make it/i });
    expect(button).toBeInTheDocument();
    
    button.click();
    expect(onRealityCheck).toHaveBeenCalledTimes(1);
  });
});
```


### Judgment Language Detection Test

```typescript
// src/test/unit/mirror-v2/properties/judgment-language.test.ts
import { describe, it, expect } from 'vitest';
import { readFileSync, readdirSync } from 'fs';
import { join } from 'path';

/**
 * Feature: mirror-v2-cognitive-prosthetic
 * Property 35: Judgment Language Detection Test
 * 
 * For any Mirror UI component file, the test suite should detect 
 * and fail if the file contains forbidden judgment terms.
 */
describe('Judgment Language Detection', () => {
  const FORBIDDEN_TERMS = [
    'running late',
    'behind schedule',
    'missed it',
    'failed',
    'should have started'
  ];

  const COMPONENT_PATTERNS = [
    'src/components/daily-plan/**/*.tsx',
    'src/components/daily-plan/**/*.astro'
  ];

  function findFiles(dir: string, pattern: RegExp): string[] {
    const files: string[] = [];
    const entries = readdirSync(dir, { withFileTypes: true });
    
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      if (entry.isDirectory()) {
        files.push(...findFiles(fullPath, pattern));
      } else if (pattern.test(entry.name)) {
        files.push(fullPath);
      }
    }
    
    return files;
  }

  it('should not contain forbidden judgment terms in Mirror UI components', () => {
    const componentFiles = findFiles(
      'src/components/daily-plan',
      /\.(tsx|astro)$/
    );

    const violations: Array<{ file: string; line: number; term: string }> = [];

    for (const file of componentFiles) {
      const content = readFileSync(file, 'utf-8');
      const lines = content.split('\n');

      lines.forEach((line, index) => {
        const lowerLine = line.toLowerCase();
        for (const term of FORBIDDEN_TERMS) {
          if (lowerLine.includes(term.toLowerCase())) {
            violations.push({
              file,
              line: index + 1,
              term
            });
          }
        }
      });
    }

    if (violations.length > 0) {
      const message = violations
        .map(v => `${v.file}:${v.line} - Found "${v.term}"`)
        .join('\n');
      
      expect.fail(
        `Found forbidden judgment terms in Mirror UI components:\n${message}`
      );
    }

    expect(violations).toHaveLength(0);
  });
});
```

### Test Coverage Goals

**Unit Tests**:
- Component rendering: 100% of new components
- Service methods: 100% of public methods
- Edge cases: Empty timelines, no anchors, invalid inputs
- Error handling: All error paths

**Property Tests**:
- Display mode filtering: All 5 modes
- Serialization: All valid inputs
- Color constraints: All time states
- Telemetry: All event types

**Integration Tests**:
- Reality check flow: User clicks button → sees results
- Display mode switching: Mode changes persist in session
- Telemetry recording: Events stored in database
- Multi-anchor scenarios: Progressive disclosure works

**E2E Tests**:
- Complete user flows from requirements
- No-anchor day scenario
- Multi-anchor day scenario
- Passed anchor pivot flow

## Implementation Phases

### Phase 1: Foundation (Week 1)

**Goal**: Remove harmful patterns and add neutral display

**Tasks**:
1. Disable automatic triage activation in MirrorUI
2. Create AnchorInfoCard component with neutral "Anchor at" display
3. Create DepartureWaypoint component with prominent "Leave by" display
4. Modify Timeline to show durations instead of clock times for chain steps
5. Remove time-based color changes from TimeBlock
6. Hide completion controls by default (add preference check)
7. Add "Can I make it?" button to AnchorInfoCard
8. Create database migration for new preferences fields

**Deliverables**:
- Modified MirrorUI.tsx
- New AnchorInfoCard.tsx
- New DepartureWaypoint.tsx
- Modified Timeline.tsx
- Modified TimeBlock.tsx
- Database migration file
- Unit tests for new components


### Phase 2: User-Initiated Support (Week 2)

**Goal**: Add reality check and flexible start times

**Tasks**:
1. Create RealityCheckService with calculation logic
2. Create RealityCheckPrompt component
3. Create ChainStartSelector component
4. Add POST /api/daily-plan/reality-check endpoint
5. Integrate reality check button with service
6. Add chain start time selection to MirrorUI
7. Implement "when ready" mode (no clock times)
8. Add unit tests for RealityCheckService
9. Add integration tests for reality check flow

**Deliverables**:
- RealityCheckService.ts
- RealityCheckPrompt.tsx
- ChainStartSelector.tsx
- API endpoint for reality check
- Integration tests
- Property tests for reality check calculations

### Phase 3: Display Modes (Week 3)

**Goal**: Add intent-based display modes and filtering

**Tasks**:
1. Create DisplayModeService with filtering logic
2. Create IntentPrompt component
3. Create FreeActivationPrompt component
4. Add display mode state management to MirrorUI
5. Implement keystone-focus filtering
6. Implement multi-anchor progressive disclosure
7. Add display mode switcher to MirrorHeader
8. Add keystone shortcut button
9. Implement sessionStorage persistence
10. Add property tests for display mode filtering

**Deliverables**:
- DisplayModeService.ts
- IntentPrompt.tsx
- FreeActivationPrompt.tsx
- Modified MirrorUI.tsx with display mode state
- Modified MirrorHeader.tsx with mode switcher
- Property tests for all display modes
- Integration tests for mode switching

### Phase 4: Telemetry & Analytics (Week 4)

**Goal**: Add passive telemetry and analytics

**Tasks**:
1. Create database migration for mirror_telemetry_events table
2. Extend AnalyticsService with Mirror V2 methods
3. Create TelemetrySerializer
4. Add POST /api/analytics/telemetry endpoint
5. Add POST /api/analytics/felt-helpful endpoint
6. Integrate telemetry recording in MirrorUI
7. Implement anchor attendance inference
8. Add "Did this help today?" prompt
9. Add property tests for serialization
10. Add integration tests for telemetry recording

**Deliverables**:
- Database migration for telemetry table
- Extended AnalyticsService
- TelemetrySerializer.ts
- API endpoints for telemetry
- Felt helpful feedback prompt
- Property tests for serialization round-trips
- Integration tests for telemetry flow

### Phase 5: Polish & Testing (Week 5)

**Goal**: Complete testing, fix bugs, refine UX

**Tasks**:
1. Implement judgment language detection test
2. Add E2E tests for complete user flows
3. Test multi-anchor scenarios
4. Test no-anchor scenarios
5. Test passed anchor pivot flow
6. Performance testing for display mode switching
7. Accessibility audit of new components
8. Fix any bugs discovered during testing
9. Refine visual styling and spacing
10. Update documentation

**Deliverables**:
- Judgment language detection test
- Complete E2E test suite
- Performance test results
- Accessibility compliance report
- Bug fixes
- Updated documentation

## Migration Strategy

### Feature Flag Approach

Use existing feature flag system from `src/lib/feature-flags.ts`:

```typescript
// Add to feature flags
export const MIRROR_V2_ENABLED = 'MIRROR_V2_ENABLED';
export const MIRROR_V2_NEUTRAL_DISPLAY = 'MIRROR_V2_NEUTRAL_DISPLAY';
export const MIRROR_V2_FLEXIBLE_START = 'MIRROR_V2_FLEXIBLE_START';
export const MIRROR_V2_OPTIONAL_TRACKING = 'MIRROR_V2_OPTIONAL_TRACKING';
export const MIRROR_V2_TELEMETRY = 'MIRROR_V2_TELEMETRY';
```

### Gradual Rollout

**Stage 1: Internal Testing (Week 1-2)**
- Enable MIRROR_V2_ENABLED for development environment only
- Test with internal users
- Gather feedback on neutral display

**Stage 2: Beta Users (Week 3-4)**
- Enable for opt-in beta users
- Monitor telemetry for engagement patterns
- Iterate on display modes based on usage

**Stage 3: Gradual Rollout (Week 5-6)**
- Enable for 25% of users
- Monitor error rates and user feedback
- Increase to 50%, then 75%, then 100%

**Stage 4: V1 Deprecation (Week 7)**
- Remove V1 code paths
- Remove feature flags
- Make V2 the default and only implementation


### Backward Compatibility

**Existing Data**:
- All existing time_blocks remain compatible
- Existing triage_service logic is reused (just made user-initiated)
- Existing chain generation unchanged
- No breaking changes to database schema (only additions)

**Existing Components**:
- MirrorUI: Modified but maintains existing props interface
- Timeline: Modified but maintains existing props interface
- TimeBlock: Modified but maintains existing props interface
- MirrorHeader: Extended with new props (backward compatible)

**API Compatibility**:
- GET /api/daily-plan/mirror: Response structure extended (backward compatible)
- Existing endpoints unchanged
- New endpoints are additive only

## Performance Considerations

### Optimization Strategies

**Display Mode Filtering**:
- Memoize filtered timeline results
- Use React.memo for Timeline component
- Avoid re-filtering on every render

```typescript
const memoizedFilteredBlocks = useMemo(() => {
  return displayModeService.applyDisplayMode(
    timeBlocks,
    displayMode,
    keystoneId
  );
}, [timeBlocks, displayMode, keystoneId]);
```

**SessionStorage Access**:
- Batch reads/writes to sessionStorage
- Use debouncing for frequent updates
- Clear old entries on day boundary

**Telemetry Recording**:
- Batch telemetry events (send every 30 seconds)
- Use fire-and-forget pattern (don't block UI)
- Implement retry with exponential backoff

**Component Rendering**:
- Lazy load RealityCheckPrompt (only when needed)
- Use React.lazy for heavy components
- Implement virtual scrolling for long timelines (if needed)

### Performance Targets

- Display mode switch: < 100ms
- Reality check calculation: < 200ms
- Telemetry recording: < 50ms (non-blocking)
- Initial render: < 500ms
- SessionStorage read/write: < 10ms

## Security Considerations

### Authentication & Authorization

**All API Endpoints**:
- Must call `serverAuth.requireAuth()` to get authenticated user
- Must derive `user_id` from server session, never from client payload
- Must filter all database queries by `user_id`

**Telemetry Data**:
- User-scoped: All telemetry events filtered by `user_id`
- RLS enabled on `mirror_telemetry_events` table
- No cross-user data leakage

**SessionStorage**:
- Client-side only, no sensitive data
- Display mode preferences are not security-sensitive
- No authentication tokens or user data in sessionStorage

### Data Privacy

**Optional Usage Analytics**:
- Default: OFF (requires explicit opt-in)
- No PII collected in analytics events
- Anchor IDs are UUIDs (not descriptive names)
- Event data contains only timestamps and enum values
- User can enable/disable at any time in settings
- App functions identically with analytics disabled
- Transparent explanation in settings UI

**Opt-In Completion Tracking**:
- Requires both enable_usage_analytics AND show_completion_controls
- User can disable either preference at any time
- Disabling stops all metric collection immediately

**Felt Helpful Feedback**:
- Always optional, separate from usage analytics
- User can skip
- No explanation required (just yes/somewhat/not_really)
- Stored with date only, no additional context

## Accessibility

### WCAG 2.1 AA Compliance

**Keyboard Navigation**:
- All interactive elements keyboard accessible
- Logical tab order through components
- Focus indicators visible on all controls
- Escape key dismisses prompts

**Screen Reader Support**:
- Semantic HTML elements (button, nav, main, etc.)
- ARIA labels on all interactive elements
- ARIA live regions for dynamic content updates
- Alt text on all icons

**Visual Accessibility**:
- Minimum 4.5:1 contrast ratio for text
- No color-only information (use icons + text)
- Focus indicators meet 3:1 contrast ratio
- Text resizable to 200% without loss of functionality

**Component-Specific**:

**IntentPrompt**:
```typescript
<div role="dialog" aria-labelledby="intent-heading">
  <h2 id="intent-heading">What do you need?</h2>
  <button aria-label="Show full morning chain">
    Full morning chain
  </button>
</div>
```

**AnchorInfoCard**:
```typescript
<div role="region" aria-label="Anchor information">
  <h3>Anchor at 12:00 PM</h3>
  <p aria-live="polite">(in 3 hours)</p>
  <button aria-label="Check if you can make this anchor">
    Can I make it?
  </button>
</div>
```

**RealityCheckPrompt**:
```typescript
<div role="dialog" aria-labelledby="reality-check-heading">
  <h2 id="reality-check-heading">You have time for:</h2>
  <ul aria-label="Possible steps">
    <li>Quick shower (10 min)</li>
    <li>Get dressed (5 min)</li>
  </ul>
</div>
```


## Monitoring & Observability

### Key Metrics to Track

**Opt-In Analytics Metrics** (only when enable_usage_analytics is true):
- Daily app opens per user
- Anchor views before anchor time (planning ahead)
- Inferred anchor attendance rate
- Keystone views per day
- Reality check requests per day
- Display mode switches per session

**Non-Tracking Metrics** (always available):
- User retention (account activity)
- Feature flag adoption rates
- Support ticket trends
- Error rates and system health

**User Behavior Metrics** (only when analytics enabled):
- Preferred display mode (most frequently used)
- Average time between app opens
- Anchor view timing (how far in advance)
- Keystone focus usage rate
- Free activation mode usage (no-anchor days)

**System Health Metrics** (always tracked):
- Reality check calculation latency
- Display mode switch latency
- Analytics recording success rate (when enabled)
- SessionStorage quota errors
- API endpoint error rates

**Qualitative Metrics** (always optional):
- "Did this help today?" response distribution
- Felt helpful feedback over time
- User retention (continued daily use)

### Monitoring Implementation

Use existing monitoring infrastructure from `src/lib/monitoring/`:

```typescript
// Add Mirror V2 specific metrics (only when analytics enabled)
import { recordMetric } from '@/lib/monitoring/analytics';

// Check if analytics enabled first
const analyticsEnabled = await analyticsService.isAnalyticsEnabled(userId);

if (analyticsEnabled) {
  // Track display mode switches
  recordMetric('mirror_v2.display_mode_switch', {
    from_mode: fromMode,
    to_mode: toMode,
    user_id: userId
  });

  // Track reality check usage
  recordMetric('mirror_v2.reality_check_request', {
    runway: runway,
    required_duration: requiredDuration,
    user_id: userId
  });
}

// Felt helpful is always available (separate from analytics)
recordMetric('mirror_v2.felt_helpful', {
  response: response,
  user_id: userId
});
```

### Alerting

**Critical Alerts**:
- Reality check endpoint error rate > 5%
- Analytics recording failure rate > 10% (when enabled)
- Display mode service errors > 1%

**Warning Alerts**:
- Average reality check latency > 500ms
- SessionStorage quota errors > 0.1% of users
- Felt helpful skip rate > 80% (indicates prompt is annoying)

**Success Metrics Alerts** (only when analytics enabled):
- Daily app opens declining > 20% week-over-week (among opted-in users)
- Inferred anchor attendance < 50% (indicates users not making anchors)
- Reality check usage < 5% of users (indicates feature not discovered)

## Documentation Requirements

### User-Facing Documentation

**Help Article: "Understanding Mirror V2"**
- What changed from V1
- How to use display modes
- What "Can I make it?" does
- How to customize preferences

**Help Article: "Display Modes Explained"**
- Full chain: See everything
- Keystone focus: Just the essential
- Reality check: What's possible now
- When to use each mode

**Help Article: "Completion Tracking (Optional)"**
- How to enable tracking
- Why it's optional
- What data is collected
- How to disable it

### Developer Documentation

**Architecture Doc**: `docs/MIRROR_V2_ARCHITECTURE.md`
- Component hierarchy
- Service layer design
- Data flow diagrams
- API contracts

**Migration Guide**: `docs/MIRROR_V2_MIGRATION.md`
- V1 to V2 differences
- Feature flag usage
- Rollout strategy
- Rollback procedures

**Testing Guide**: `docs/MIRROR_V2_TESTING.md`
- Property test examples
- Test coverage requirements
- How to run tests
- CI/CD integration

## Open Questions & Future Considerations

### Resolved Design Decisions

**Q: How to handle multiple anchors in one day?**
A: Progressive disclosure - show next anchor with full chain, collapse subsequent anchors. User can expand any anchor to focus on it.

**Q: What about recovery time after anchors?**
A: Make it optional via `show_recovery_blocks` preference (default: true). Users who find it helpful keep it, others can hide it.

**Q: Should we show estimated completion time for chain?**
A: Only in reality check mode when user explicitly asks "Can I make it?". Never show automatically to avoid deadline pressure.

**Q: How to handle the exit gate checklist?**
A: Keep as-is for now. Future enhancement: integrate into departure waypoint as expandable "Before you leave" section.

### Future Enhancements (Out of Scope for V2)

**Smart Keystone Detection**:
- ML-based keystone identification from user behavior
- Automatic keystone suggestion based on completion patterns
- Personalized keystone recommendations

**Adaptive Display Modes**:
- Learn user's preferred mode by time of day
- Suggest mode based on runway and context
- Auto-switch to reality check when runway is tight (with user permission)

**Enhanced Telemetry**:
- Correlation analysis between display modes and anchor attendance
- Identify patterns in successful vs unsuccessful days
- Personalized insights: "You make 80% of anchors when you check the app 2+ hours before"

**Social Features**:
- Share display mode preferences with accountability partners
- Anonymous aggregate metrics: "75% of users prefer keystone focus in the morning"
- Community-contributed keystone activities

**Integration Enhancements**:
- Calendar sync for automatic anchor updates
- Smart watch notifications for departure waypoints
- Voice assistant integration: "Alexa, can I make my 12pm class?"

## Success Criteria

### Launch Criteria (Must Have)

- [ ] All 35 correctness properties have passing tests
- [ ] Judgment language detection test passes
- [ ] Zero automatic triage activations in V2 mode
- [ ] All new components meet WCAG 2.1 AA standards
- [ ] Telemetry recording success rate > 95%
- [ ] Display mode switching latency < 100ms
- [ ] Reality check calculation latency < 200ms
- [ ] Database migration tested and verified
- [ ] Feature flags implemented and tested
- [ ] Rollback procedure documented and tested

### Success Metrics (3 Months Post-Launch)

**Engagement** (non-tracking):
- User retention maintained or improved vs V1
- Feature flag adoption rates
- Support ticket reduction

**Opt-In Analytics** (only among users who enable):
- Reality check usage > 20% of opted-in users
- Display mode switching > 1 per session average
- Daily app opens maintained or increased

**User Satisfaction** (always optional):
- "Did this help today?" positive responses > 60%
- Support tickets about "running late" warnings reduced to zero
- User-reported stress reduction (qualitative feedback)

**System Health**:
- Error rates < 1% for all new endpoints
- Analytics recording success rate > 98% (when enabled)
- No performance regressions vs V1

**Behavioral Outcomes** (only when analytics enabled):
- Inferred anchor attendance rate > 70%
- Keystone view rate > 80% of opted-in users
- Completion tracking opt-in rate > 30% (indicates users find it helpful)

## Conclusion

Mirror V2 represents a fundamental shift from judgment-based plan tracking to supportive cognitive scaffolding. By removing automatic warnings, using neutral language, providing flexible display modes, and making ALL tracking completely optional with explicit opt-in, we create an interface that supports activation without inducing guilt or dependency.

The design maintains compatibility with existing chain generation and plan builder systems while introducing new patterns for user-initiated support. The phased implementation approach allows for gradual rollout and iteration based on real user feedback.

**Critical Ethical Principle**: All usage analytics are opt-in by default (OFF). The app works perfectly without any tracking. Users who enable analytics do so voluntarily to help improve the product, with full transparency about what's collected. This respects user agency and prevents dependency on a system that surveils them.

Success will be measured not by adherence to schedules or tracking metrics, but by sustained engagement, user-reported helpfulness, and qualitative feedback - metrics that reflect the true goal of daily stability for people with executive dysfunction.

