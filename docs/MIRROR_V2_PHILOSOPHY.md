# Mirror V2: Cognitive Prosthetic Design

## Core Philosophy

The Mirror is not a plan tracker. It's a cognitive prosthetic for people with executive dysfunction who need help with activation, not accountability.

### Principles

1. **No Inference, Only Declaration**: Never guess where the user is or what they're doing. Always ask.

2. **No Failure States**: There is no "late" or "behind schedule." There's only "anchor at [time]" and "do you want to make it?"

3. **Keystone-Centric**: The goal is activation (shower, meds, whatever unlocks the day), not completing every step.

4. **Flexible Start Points**: Users should be able to start the chain whenever they want, not when the app calculated backward from an anchor.

5. **Minimal Logging**: The visual scaffold IS the support. Checking boxes is optional, not required.

6. **Calm Information**: Show times and anchors as neutral facts, not deadlines with countdown timers.

## What Changed From V1

### V1 (Current Implementation)
- Automatic triage when `runway < required_duration`
- "Complete by" deadlines with color changes when late
- State declaration filters timeline based on assumed position
- Completion tracking as primary interaction
- Fixed backward-calculated start times

### V2 (Philosophy-Aligned)
- User-initiated focus modes (full chain vs keystone-only)
- "Anchor at" information displays (no judgment)
- Intent declaration: "What do you need to see?"
- Timeline as visual scaffold (completion optional)
- Flexible "start in X minutes" controls

## User Flows

### Flow 1: Morning Activation (No Anchor)

**User opens app at 9:00 AM, no commitments today**

```
┌─────────────────────────────────────┐
│ Good morning                        │
│                                     │
│ No anchors today                    │
│                                     │
│ Want to run your activation chain?  │
│                                     │
│ [Start Now]  [Start in 10 min]     │
│                                     │
│ Or just focus on:                   │
│ [Shower] [Meds] [Coffee]           │
└─────────────────────────────────────┘
```

**User taps "Start Now"**

```
┌─────────────────────────────────────┐
│ Activation Chain                    │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Feed cat          5 min         │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ Brush             5 min         │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ 🌟 Shower         15 min        │ │ ← Keystone
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ Skincare          10 min        │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Just show keystone]                │
└─────────────────────────────────────┘
```

No times shown. No "complete by." Just the sequence.

### Flow 2: Morning with Anchor

**User opens app at 9:00 AM, has class at 12:00 PM**

```
┌─────────────────────────────────────┐
│ You have an anchor today            │
│                                     │
│ Class at 12:00 PM                   │
│ (in 3 hours)                        │
│                                     │
│ What do you need?                   │
│                                     │
│ [Full morning chain]                │
│ [Just keystone + anchor]            │
│ [Check if I can make it]            │
└─────────────────────────────────────┘
```

**User taps "Full morning chain"**

```
┌─────────────────────────────────────┐
│ Start chain:                        │
│ ○ Now                               │
│ ○ In 10 minutes                     │
│ ○ In 30 minutes                     │
│ ○ Custom time                       │
│                                     │
│ [Continue]                          │
└─────────────────────────────────────┘
```

**User selects "Now" and continues**

```
┌─────────────────────────────────────┐
│ Activation → Class at 12:00 PM      │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ Feed cat          5 min         │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ 🌟 Shower         15 min        │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ Get ready         20 min        │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ Leave by 11:15 AM               │ │
│ └─────────────────────────────────┘ │
│ ┌─────────────────────────────────┐ │
│ │ 🎯 Class          12:00-1:00 PM │ │
│ └─────────────────────────────────┘ │
│                                     │
│ [Simplify to keystone only]         │
└─────────────────────────────────────┘
```

Times shown only for departure and anchor. Chain steps show durations, not clock times.

### Flow 3: Checking Mid-Day

**User opens app at 11:30 AM, class at 12:00 PM**

```
┌─────────────────────────────────────┐
│ Class at 12:00 PM                   │
│ (in 30 minutes)                     │
│                                     │
│ Where are you?                      │
│                                     │
│ [Haven't started yet]               │
│ [Did the keystone, getting ready]   │
│ [Ready to leave]                    │
│ [Already there]                     │
│ [Not going]                         │
└─────────────────────────────────────┘
```

**User taps "Haven't started yet"**

```
┌─────────────────────────────────────┐
│ Class at 12:00 PM (in 30 min)       │
│                                     │
│ You have time for:                  │
│                                     │
│ ✓ Quick shower (10 min)             │
│ ✓ Get dressed (5 min)               │
│ ✓ Leave by 11:45 AM                 │
│                                     │
│ Or:                                 │
│                                     │
│ [Skip shower, just go]              │
│ [Skip this anchor]                  │
│ [Show me everything anyway]         │
└─────────────────────────────────────┘
```

This is reality-check mode, not triage mode. No warnings, just options.

### Flow 4: Late Wake (The Critical Case)

**User opens app at 11:50 AM, class at 12:00 PM**

```
┌─────────────────────────────────────┐
│ Class at 12:00 PM                   │
│ (in 10 minutes)                     │
│                                     │
│ What's the plan?                    │
│                                     │
│ [Rush there now]                    │
│ [Skip this one]                     │
│ [Show me the rest of the day]       │
└─────────────────────────────────────┘
```

No "you're late!" No red colors. Just neutral options.

**User taps "Rush there now"**

```
┌─────────────────────────────────────┐
│ 🎯 Class          12:00-1:00 PM     │
│                                     │
│ Leave now                           │
│                                     │
│ [Mark as done when you get there]   │
└─────────────────────────────────────┘
```

That's it. Clean, simple, no guilt.

## Design Changes Required

### 1. Remove Triage System

**Delete:**
- `src/lib/triage/triage-service.ts`
- Automatic runway calculation triggering warnings
- "Protect keystone" / "Skip anchor" / "Recalculate" prompts

**Replace with:**
- Intent-based prompts: "What do you need to see?"
- Reality-check mode: "You have time for X, Y, Z"
- User-initiated simplification: "Just show keystone"

### 2. Redesign State Declaration

**Current:** 6 states that filter timeline based on assumed position
```typescript
type UserState = 
  | "starting_day"
  | "ready_for_anchor"
  | "mid_chain"
  | "at_anchor"
  | "missed_it"
  | "just_checking";
```

**New:** Intent-based display modes
```typescript
type DisplayIntent =
  | "full_chain"           // Show everything
  | "keystone_focus"       // Show only keystone + anchor
  | "reality_check"        // Show what's possible now
  | "anchor_only"          // Just show the anchor
  | "rest_of_day";         // Skip current anchor, show what's next

type ChainStartTime =
  | { type: "now" }
  | { type: "in_minutes"; minutes: number }
  | { type: "at_time"; time: Date }
  | { type: "when_ready" }; // No times, just sequence
```

### 3. Neutral Information Display

**Remove:**
- "Complete by" deadline banners with countdowns
- Color changes when "late"
- "Running behind" warnings
- Runway calculations that trigger alerts

**Replace with:**
- "Anchor at [time]" info cards
- "Leave by [time]" as neutral waypoint
- Time remaining shown as information, not judgment
- Durations instead of clock times for chain steps

### 4. Flexible Start Times

**Add:**
- "Start chain: [Now | In 10 min | In 30 min | Custom]" selector
- "When ready" mode that shows sequence without times
- Ability to regenerate chain from any chosen start point
- No backward-calculated "you should have started at X" times

### 5. Optional Completion Tracking

**Change:**
- Make completion checkboxes hidden by default
- Add "Track progress" toggle in settings
- Timeline is visual scaffold first, tracker second
- No persistence of completion state unless user opts in

### 6. No-Anchor Mode

**Add:**
- Free activation mode for days without commitments
- Keystone-only quick view
- "Just show me [shower/meds/coffee]" shortcuts
- Untimed chain display

## Implementation Priority

### Phase 1: Remove Harmful Patterns (Week 1)
1. Disable automatic triage activation
2. Remove "Complete by" deadline banners
3. Change "running late" colors to neutral
4. Hide completion tracking by default

### Phase 2: Add Neutral Information (Week 2)
1. Replace deadline banners with "Anchor at" cards
2. Show durations instead of clock times for chain steps
3. Add "Leave by" as waypoint, not deadline
4. Implement reality-check mode

### Phase 3: Add Flexibility (Week 3)
1. Add "Start chain in X minutes" selector
2. Implement "when ready" untimed mode
3. Add keystone-focus display mode
4. Implement no-anchor free activation

### Phase 4: Refine Intent System (Week 4)
1. Replace state declaration with intent prompts
2. Add "What do you need to see?" entry point
3. Implement display mode switching
4. Add keystone shortcuts

## Success Metrics

**Not:**
- Completion rates
- On-time percentages
- Adherence to schedule

**Instead:**
- Daily app opens (engagement without guilt)
- Keystone completion (the actual win)
- Anchor attendance (did they make it?)
- User-reported "felt helpful" ratings
- Reduction in plan regenerations (less chaos)

## Technical Architecture

### New Service: DisplayModeService

```typescript
class DisplayModeService {
  // Replaces TriageService and StateFilterService
  
  getDisplayOptions(
    timeBlocks: TimeBlock[],
    currentTime: Date
  ): DisplayOption[] {
    // Returns neutral options based on context
    // No automatic triggering, no assumptions
  }
  
  applyDisplayMode(
    timeBlocks: TimeBlock[],
    mode: DisplayIntent,
    startTime?: ChainStartTime
  ): DisplayedTimeline {
    // Filters and formats timeline based on user choice
    // No status changes, no database writes
  }
  
  getRealityCheck(
    timeBlocks: TimeBlock[],
    currentTime: Date,
    nextAnchor: TimeBlock
  ): RealityCheckInfo {
    // "You have time for X, Y, Z"
    // Neutral information, not warnings
  }
}
```

### New Component: IntentPrompt

```typescript
interface IntentPromptProps {
  anchors: TimeBlock[];
  currentTime: Date;
  onSelectIntent: (intent: DisplayIntent, startTime?: ChainStartTime) => void;
}

// Replaces StateDeclarationPrompt and TriagePrompt
// Asks "What do you need?" not "Where are you?"
```

### Modified Component: Timeline

```typescript
interface TimelineProps {
  blocks: TimeBlock[];
  displayMode: DisplayIntent;
  showTimes: boolean; // false for "when ready" mode
  showCompletion: boolean; // false by default
  keystoneId?: string; // highlight the keystone
}

// Shows durations, not clock times (except anchor/departure)
// No color-coded "late" states
// Keystone visually emphasized
```

## Migration Path

1. **Feature flag the new system**: `MIRROR_V2_ENABLED`
2. **Run both in parallel**: Let users opt into V2
3. **Gather feedback**: "Does this feel less judgmental?"
4. **Iterate on intent prompts**: Get the language right
5. **Deprecate V1**: Once V2 proves less stressful

## Open Questions

1. **How to handle multiple anchors in one day?**
   - Show all? Let user pick which to focus on?
   - Current thinking: Show next anchor, with "Show all" option

2. **What about recovery time after anchors?**
   - Keep it? Make it optional?
   - Current thinking: Show as "Rest" block, user can hide

3. **Should we show estimated completion time for chain?**
   - "This will take about 45 minutes"
   - Risk: Feels like a deadline
   - Current thinking: Only show if user asks "Can I make it?"

4. **How to handle the exit gate checklist?**
   - Keep as-is? Integrate into departure block?
   - Current thinking: Show as expandable "Before you leave" section

## Conclusion

The V1 Mirror was built as a plan execution tracker with failure detection. V2 needs to be a cognitive prosthetic that provides scaffolding without judgment.

The key shift: From "Are you following the plan?" to "What helps you activate today?"


## Addressing Key Concerns

### 1. Telemetry Without Opt-In Tracking

**Problem:** If completion tracking is hidden by default, how do we measure keystone completion as a success metric?

**Solution:** Passive telemetry that doesn't require user interaction:

```typescript
// Track app opens and anchor attendance without requiring checkboxes
interface PassiveTelemetry {
  // When user opens app
  app_opens: {
    timestamp: Date;
    had_anchor_today: boolean;
    time_until_next_anchor: number | null;
  };
  
  // When user views an anchor block
  anchor_views: {
    anchor_id: string;
    viewed_at: Date;
    anchor_time: Date;
    viewed_before_anchor: boolean; // Did they check before it started?
  };
  
  // Infer attendance from subsequent app opens
  anchor_attendance: {
    anchor_id: string;
    likely_attended: boolean; // True if app opened after anchor time
    confidence: 'high' | 'medium' | 'low';
  };
  
  // Track keystone views (not completion)
  keystone_views: {
    keystone_type: string; // "shower", "meds", etc.
    viewed_at: Date;
    display_mode: 'full_chain' | 'keystone_focus';
  };
}
```

**Key insight:** We measure engagement (opens, views) and infer outcomes (attendance) rather than requiring explicit tracking. If someone opens the app at 9 AM, views their 12 PM class, then opens again at 1 PM, we can infer they likely attended.

### 2. "Leave by" Prominence

**Problem:** Durations are great for chain steps, but departure time is the critical anchor point.

**Solution:** Hybrid display with prominent departure waypoint:

```
┌─────────────────────────────────────┐
│ 🎯 Class at 12:00 PM (in 3h)        │
│                                     │
│ ┌─────────────────────────────────┐ │
│ │ 🚪 Leave by 11:15 AM            │ │ ← Prominent waypoint
│ │    (in 2h 30m)                  │ │
│ └─────────────────────────────────┘ │
│                                     │
│ Before leaving:                     │
│ • Feed cat (5 min)                  │ ← Durations only
│ • 🌟 Shower (15 min)                │
│ • Get ready (20 min)                │
│                                     │
│ Total: 40 minutes                   │
└─────────────────────────────────────┘
```

**Rules:**
- Anchor time: Always show clock time
- Departure time: Always show clock time + countdown
- Chain steps: Show durations only
- Total duration: Show sum at bottom

### 3. Multi-Anchor Handling

**Problem:** What happens when there are multiple anchors in one day?

**Solution:** Progressive disclosure with focus on next anchor:

```typescript
interface MultiAnchorDisplay {
  // Always show next anchor prominently
  next_anchor: {
    anchor: TimeBlock;
    show_full_chain: boolean;
  };
  
  // Show subsequent anchors as info cards
  upcoming_anchors: {
    anchor: TimeBlock;
    collapsed: boolean; // Expand on tap
  }[];
  
  // User can switch focus
  focused_anchor_id: string | null;
}
```

**UI Flow:**
```
┌─────────────────────────────────────┐
│ Next: Class at 12:00 PM             │ ← Full chain shown
│ [Full chain displayed here]         │
│                                     │
│ Later today:                        │
│ • Meeting at 3:00 PM [Expand]       │ ← Collapsed
│ • Dinner at 7:00 PM [Expand]        │
│                                     │
│ [Focus on different anchor]         │
└─────────────────────────────────────┘
```

**Interaction:**
- Default: Show full chain for next anchor only
- Tap "Expand" on later anchor: Collapse current, expand selected
- "Show all" option: Expand all chains (can be overwhelming, not default)

### 4. Missed Anchor Flow

**Problem:** What happens when user misses an anchor entirely?

**Solution:** Neutral pivot to next anchor or rest of day:

**When user opens app after anchor has passed:**

```
┌─────────────────────────────────────┐
│ Class at 12:00 PM                   │
│ (30 minutes ago)                    │
│                                     │
│ What now?                           │
│                                     │
│ [Show rest of day]                  │
│ [Just show next anchor]             │
│ [Done for today]                    │
└─────────────────────────────────────┘
```

**Options explained:**
- **Show rest of day**: Display all remaining anchors and free time
- **Just show next anchor**: Skip to next anchor's chain (if any)
- **Done for today**: Hide all anchors, show free activation mode

**No "missed" language, no red colors, no guilt.** Just "that was then, what's next?"

**If they select "Show rest of day":**
```
┌─────────────────────────────────────┐
│ Rest of your day:                   │
│                                     │
│ Next: Meeting at 3:00 PM            │
│ [Show chain]                        │
│                                     │
│ Then: Dinner at 7:00 PM             │
│ [Show chain]                        │
│                                     │
│ Or: [Free time mode]                │
└─────────────────────────────────────┘
```

### 5. Completion Tracking Telemetry Strategy

**Hybrid approach:**

```typescript
// Always track (no opt-in needed)
interface AlwaysTracked {
  app_opens: number;
  anchor_views: number;
  keystone_views: number;
  reality_checks_requested: number;
  display_mode_switches: number;
  recalculations_triggered: number;
}

// Only track if user enables completion tracking
interface OptInTracked {
  steps_completed: number;
  steps_skipped: number;
  completion_rate: number;
  time_to_complete_chain: number;
}

// Inferred metrics (no user action required)
interface InferredMetrics {
  likely_anchor_attendance: boolean;
  app_engagement_pattern: 'morning_only' | 'throughout_day' | 'sporadic';
  preferred_display_mode: DisplayIntent;
  keystone_focus_frequency: number;
}
```

**Success metrics become:**
1. Daily app opens (engagement without guilt)
2. Anchor views before anchor time (planning ahead)
3. Inferred anchor attendance (opened app after anchor)
4. Keystone views (activation attempts)
5. User-reported "felt helpful" (optional survey)

**NOT:**
- Completion rates (requires opt-in)
- On-time percentages (judgment-based)
- Adherence scores (productivity trap)

### 6. "Leave by" Implementation Details

**Component structure:**
```typescript
// New component: DepartureWaypoint
interface DepartureWaypointProps {
  departureTime: Date;
  currentTime: Date;
  anchor: TimeBlock;
}

// Displays prominently above chain steps
<DepartureWaypoint
  departureTime={travelBlock.startTime}
  currentTime={new Date()}
  anchor={nextAnchor}
/>

// Styling: Larger, distinct from chain steps
// Color: Neutral (not warning) until very close (<10 min)
// Then: Gentle highlight (not red/urgent)
```

**Visual hierarchy:**
1. Anchor time (largest, top)
2. Departure time (prominent, before chain)
3. Chain steps (smaller, durations only)
4. Total duration (summary, bottom)

## Updated Success Metrics

### Primary Metrics (No Opt-In Required)
1. **Daily Engagement**: App opens per day
2. **Anchor Awareness**: Views of anchor before anchor time
3. **Inferred Attendance**: App opens after anchor time
4. **Keystone Focus**: Views of keystone activity
5. **Adaptation Usage**: Reality checks requested, display mode switches

### Secondary Metrics (Opt-In Only)
1. **Completion Tracking**: If user enables, track completion rates
2. **Time Estimates**: If user tracks, measure actual vs estimated durations

### Qualitative Metrics
1. **User Feedback**: "Did this help today?" (optional prompt)
2. **Support Requests**: Reduction in "I'm confused" messages
3. **Retention**: Continued daily use without burnout

### Anti-Metrics (What We Don't Measure)
1. ~~On-time percentage~~ (judgment-based)
2. ~~Adherence to schedule~~ (productivity trap)
3. ~~Completion rates~~ (unless opt-in)
4. ~~Failure counts~~ (harmful)

## Implementation Priority (Revised)

### Phase 1: Remove Harmful Patterns (Week 1) ✓
1. Disable automatic triage ✓
2. Add "Can I make it?" button ✓
3. Create neutral AnchorInfoCard ✓
4. Hide completion tracking by default
5. Remove "late" colors

### Phase 2: Add Neutral Information (Week 2)
1. Implement DepartureWaypoint component
2. Show durations for chain steps
3. Add prominent "Leave by" display
4. Implement multi-anchor progressive disclosure
5. Add "missed anchor" neutral pivot flow

### Phase 3: Add Flexibility (Week 3)
1. Flexible chain start time selector
2. "When ready" untimed mode
3. Keystone-focus display mode
4. No-anchor free activation mode

### Phase 4: Refine Intent System (Week 4)
1. Replace state declaration with intent prompts
2. Add display mode switching
3. Add keystone shortcuts
4. Implement passive telemetry

### Phase 5: Telemetry & Iteration (Week 5)
1. Implement passive telemetry system
2. Add optional "felt helpful" prompt
3. Monitor engagement metrics
4. Iterate based on real usage patterns
