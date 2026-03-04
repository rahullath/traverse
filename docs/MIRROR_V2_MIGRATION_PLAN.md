# Mirror V2 Migration Plan

## Overview

This document outlines the step-by-step migration from the current judgment-based Mirror UI to the philosophy-aligned cognitive prosthetic design.

## Strategy: Feature Flag + Parallel Implementation

We'll use feature flags to run both systems in parallel, allowing gradual migration and A/B testing.

### Feature Flags

```typescript
// Add to src/lib/feature-flags.ts
export const MIRROR_V2_ENABLED = 'MIRROR_V2_ENABLED';
export const MIRROR_V2_NEUTRAL_DISPLAY = 'MIRROR_V2_NEUTRAL_DISPLAY';
export const MIRROR_V2_FLEXIBLE_START = 'MIRROR_V2_FLEXIBLE_START';
export const MIRROR_V2_OPTIONAL_TRACKING = 'MIRROR_V2_OPTIONAL_TRACKING';
```

## Phase 1: Remove Harmful Patterns (Week 1)

### 1.1 Disable Automatic Triage Activation

**Goal:** Stop automatically showing "you're running late" warnings

**Changes:**
- Modify `MirrorUI.tsx` to not auto-display triage prompt
- Add manual "Check if I can make it" button instead
- Keep triage logic but make it user-initiated


**Files to modify:**
- `src/components/daily-plan/MirrorUI.tsx`
- `src/lib/triage/triage-service.ts`

**Implementation:**
```typescript
// In MirrorUI.tsx
const [showTriageManually, setShowTriageManually] = useState(false);

// Don't auto-show triage
{showTriageManually && memoizedTriageState.active && (
  <TriagePrompt ... />
)}

// Add button to trigger it
<button onClick={() => setShowTriageManually(true)}>
  Can I make it?
</button>
```

### 1.2 Replace "Complete by" with "Anchor at"

**Goal:** Change deadline banners to neutral information displays

**Changes:**
- Modify `DeadlineBanner.tsx` to show "Anchor at [time]" instead of "Complete by"
- Remove countdown timer
- Remove color changes when "late"
- Show time remaining as neutral info: "(in 2 hours)" not "(2 hours left!)"

**Files to modify:**
- `src/components/daily-plan/DeadlineBanner.tsx`


### 1.3 Neutralize Timeline Colors

**Goal:** Remove red/warning colors that signal "failure"

**Changes:**
- Remove time-based color changes in `TimeBlock.tsx`
- Use consistent neutral colors for all blocks
- Keep only: pending (default), completed (green), skipped (gray)
- Remove "late" or "behind" visual states

**Files to modify:**
- `src/components/daily-plan/TimeBlock.tsx`
- `src/components/daily-plan/Timeline.tsx`

### 1.4 Hide Completion Tracking by Default

**Goal:** Make timeline a visual scaffold first, tracker second

**Changes:**
- Add user preference: `show_completion_controls` (default: false)
- Hide checkboxes/completion buttons unless enabled
- Add toggle in settings: "Track step completion"

**Files to modify:**
- `src/components/daily-plan/Timeline.tsx`
- `src/pages/settings.astro` (or settings component)
- Database: `user_preferences.preferences.show_completion_controls`


## Phase 2: Add Neutral Information Display (Week 2)

### 2.1 Create AnchorInfoCard Component

**Goal:** Replace deadline banners with calm information cards

**New component:**
```typescript
// src/components/daily-plan/AnchorInfoCard.tsx
interface AnchorInfoCardProps {
  anchor: TimeBlock;
  currentTime: Date;
}

// Shows:
// "Class at 12:00 PM"
// "(in 2 hours)"
// No countdown, no colors, just info
```

### 2.2 Show Durations Instead of Clock Times

**Goal:** Chain steps show "15 min" not "9:00-9:15 AM"

**Changes:**
- Modify `TimeBlock.tsx` to show duration for chain steps
- Show clock times only for: anchors, departure ("Leave by"), arrival
- Add prop: `showClockTime: boolean`

**Logic:**
```typescript
// Show clock time for:
- Anchors (commitment_envelope.envelope_type === 'anchor')
- Travel blocks (envelope_type === 'travel_there')
- Everything else: show duration only
```


### 2.3 Add "Leave by" Waypoint Display

**Goal:** Show departure time as neutral waypoint, not deadline

**Changes:**
- Find first `travel_there` block before anchor
- Display as: "Leave by 11:15 AM" (neutral styling)
- No countdown, no color changes
- Just a waypoint marker in the timeline

### 2.4 Implement Reality Check Mode

**Goal:** User-initiated "Can I make it?" check

**New component:**
```typescript
// src/components/daily-plan/RealityCheckPrompt.tsx
interface RealityCheckResult {
  canMakeIt: boolean;
  possibleSteps: string[]; // What they have time for
  suggestions: string[]; // "Quick shower" vs "Skip shower"
}

// Shows neutral options:
// "You have time for: Quick shower, Get dressed, Leave by 11:45"
// "Or: Skip shower and go now"
```

**Files to create:**
- `src/components/daily-plan/RealityCheckPrompt.tsx`
- `src/lib/display/reality-check.ts` (logic)


## Phase 3: Add Flexibility (Week 3)

### 3.1 Flexible Chain Start Time Selector

**Goal:** Let users choose when to start the chain

**New component:**
```typescript
// src/components/daily-plan/ChainStartSelector.tsx
interface ChainStartSelectorProps {
  onSelectStart: (startTime: ChainStartTime) => void;
}

type ChainStartTime =
  | { type: 'now' }
  | { type: 'in_minutes'; minutes: number }
  | { type: 'at_time'; time: Date }
  | { type: 'when_ready' }; // No times shown
```

**Integration:**
- Show selector when user opens Mirror UI
- Regenerate timeline with chosen start time
- Store preference: last used start mode

### 3.2 "When Ready" Untimed Mode

**Goal:** Show chain sequence without clock times

**Changes:**
- Add display mode: `showTimes: false`
- Timeline shows only: step names + durations
- No "you should start at X" messaging
- Just the sequence to follow

**Implementation:**
```typescript
// In Timeline.tsx
{!showTimes && (
  <div className="chain-sequence">
    {blocks.map(block => (
      <div>{block.activityName} • {block.duration} min</div>
    ))}
  </div>
)}
```


### 3.3 Keystone-Focus Display Mode

**Goal:** Show only keystone + anchor, hide everything else

**New service:**
```typescript
// src/lib/display/display-mode-service.ts
class DisplayModeService {
  applyKeystoneFocus(
    blocks: TimeBlock[],
    keystoneId: string
  ): TimeBlock[] {
    // Return only: keystone block + anchor block
    // Hide all other chain steps
  }
}
```

**UI:**
- Add button: "Just show keystone"
- Filters timeline to essential blocks
- Can toggle back to full view

### 3.4 No-Anchor Free Activation Mode

**Goal:** Support days without commitments

**Changes:**
- Detect when no anchors exist
- Show different prompt: "No anchors today. Want to run your activation chain?"
- Display chain without anchor/departure blocks
- Emphasize keystone as the daily win

**New component:**
```typescript
// src/components/daily-plan/FreeActivationPrompt.tsx
// Shows: "Start activation chain" with flexible start options
// No anchor context, just the chain
```


## Phase 4: Refine Intent System (Week 4)

### 4.1 Replace State Declaration with Intent Prompt

**Goal:** Ask "What do you need?" not "Where are you?"

**New component:**
```typescript
// src/components/daily-plan/IntentPrompt.tsx
interface IntentPromptProps {
  anchors: TimeBlock[];
  keystoneId: string;
  onSelectIntent: (intent: DisplayIntent) => void;
}

type DisplayIntent =
  | 'full_chain'
  | 'keystone_focus'
  | 'reality_check'
  | 'anchor_only'
  | 'rest_of_day';
```

**Prompt text:**
```
"You have Class at 12:00 PM (in 3 hours)"
"What do you need?"

[Full morning chain]
[Just keystone + anchor]
[Check if I can make it]
```

### 4.2 Implement Display Mode Switching

**Goal:** Let users switch modes mid-session

**Changes:**
- Add mode switcher in header
- Persist current mode in session state (not database)
- Allow toggling between: full / keystone / reality-check

**UI:**
```
Header: [Full View] [Keystone Only] [Can I Make It?]
```


### 4.3 Add Keystone Shortcuts

**Goal:** Quick access to just the keystone

**Changes:**
- Detect keystone from user preferences or chain metadata
- Add quick action: "Just show me [Shower]"
- Single-tap access to keystone-only view

**Implementation:**
```typescript
// In user_preferences
preferences: {
  keystone_activity: "shower", // or "meds", "coffee", etc.
}

// Quick action button
<button onClick={() => showKeystoneOnly()}>
  Just show me {keystoneActivity}
</button>
```

### 4.4 Refine Language Throughout

**Goal:** Remove all judgment language

**Changes to make:**
- "Complete by" → "Anchor at"
- "Running late" → Remove entirely
- "Behind schedule" → Remove entirely
- "You should start at" → "Start chain: [Now/Later/When ready]"
- "Missed it" → "Skip this anchor"
- "Failed" → Never use this word
- "On time" → Remove (no judgment)

**Files to audit:**
- All component text
- All error messages
- All user-facing strings

