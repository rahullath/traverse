# MeshOS 30-Day Design Decisions

## D1: Keystone Storage

### Decision

Store keystone in `user_preferences` as JSON object, NOT in `habits` table.

### Rationale

| Option                           | Pros                                       | Cons                                     |
| -------------------------------- | ------------------------------------------ | ---------------------------------------- |
| `habits.is_keystone` column      | Links to habits module                     | Creates dependency, requires foreign key |
| `user_preferences.keystone` JSON | Simple, zero dependency, survives collapse | Not relational                           |

### Chosen: `user_preferences.keystone`

**Reasoning**:

- Only one keystone per user ever needed → no relational complexity
- Survives collapse perfectly (same goal as exit-gate)
- Extremely easy to read/write
- Can evolve to array later if needed

### Data Structure

```typescript
interface KeystonePreset {
  description: string; // "Shower"
  duration_minutes: number; // 15
  frequency: "every_day" | "most_days" | "flexible";
  created_at?: string;
}
```

---

## D2: Sleep Advisory Default

### Decision

Default to 7 hours backward from wake time. No note if no wake time.

### Rationale

| Scenario              | Behavior              | Reasoning                 |
| --------------------- | --------------------- | ------------------------- |
| Wake time + bedtime   | Show bedtime advisory | User told us              |
| Wake time, no bedtime | 7h backward from wake | Research-grounded default |
| No wake time          | No note               | Don't guess wildly        |

### Chosen: 7h backward calculation

**Research Basis**:

- UK Biobank: Peak EF at 7 hours sleep
- Quadratic drop on both sides (<6h and >8h)
- Regularity > raw hours (2024-2025 studies)

### Edge Cases

- User sets wake 07:30 → suggest sleep by 00:30
- User sets wake 10:00 → suggest sleep by 03:00 (valid)
- No wake answered → no advisory shown

---

## D3: Free-Time Preferences Storage

### Decision

Simple string array in `user_preferences.free_time_preferences`.

### Rationale

| Option          | Pros                         | Cons                             |
| --------------- | ---------------------------- | -------------------------------- |
| String array    | Simple, trivial to map to UI | Limited structure                |
| Weighted object | More precise                 | Over-engineered for current need |

### Chosen: String array

```json
{
  "free_time_preferences": ["rest_creative", "light_chores", "movement"]
}
```

**Reasoning**:

- Day-off suggestions are lightweight (2-4 cards)
- No need for weights at this stage
- Easy to randomize later if desired
- Zero risk of over-structuring

---

## D4: Late-Day Prompt Behavior

### Decision

One-tap banner with "Use my usual wake time" as default (not auto-adjust).

### Rationale

| Option         | Behavior             | Risk                           |
| -------------- | -------------------- | ------------------------------ |
| Auto-adjust    | Change plan silently | Breaks predictability, trust   |
| One-tap prompt | User chooses         | Low friction, preserves rhythm |

### Chosen: Soft prompt with choice

**UI Flow**:

1. User opens app at 10:45
2. First anchor was 09:00 (passed)
3. Banner: "Late start today?"
4. Two buttons: "Use my usual wake time" (default) | "Adjust wake to now"

**Reasoning**:

- Many users want to preserve circadian anchor even if they woke late
- Default preserves "regularity > raw hours" principle
- One-tap choice is very low friction

---

## D5: Absence Detection Strategy

### Decision

NO automatic detection. User explicitly chooses "I'm good today" on intent signal banner.

### Rationale

| Approach                 | Problem                        |
| ------------------------ | ------------------------------ |
| Login frequency analysis | Surveillance, privacy invasion |
| Time-in-app tracking     | Assumes app = success          |
| Energy trend inference   | Guessing, wrong often          |

### Chosen: Explicit user choice

**Philosophy**: "I didn't need the app today = success" without any guessing.

**Flow**:

1. User returns after 7+ days
2. Banner: "Good to see you. Need a plan for today?"
3. User taps "I'm good today" → day-off set, tomorrow preview shown
4. User ignores banner → nothing stored, no assumption

---

## D6: Keystone In-Plan vs Habits Module

### Decision

Keystone confirmation lives in PLAN module, not habits module. Zero dependency on habits.

### Rationale

| Approach         | Coupling                 | Complexity               |
| ---------------- | ------------------------ | ------------------------ |
| In habits module | Tight coupling to habits | Requires habits to exist |
| In plan module   | Loose coupling           | Works standalone         |

### Chosen: Plan module

**Reasoning**:

- "The one thing" doesn't have to be a tracked habit
- User might say "shower" but not want habit tracking
- Works even if user has never used habits module
- If user writes "whole morning routine" → entire wake-ramp protected

**Interaction Design**:

```
┌─────────────────────────────────────────┐
│  Keystone — "Shower"               15m  │
│  ┌───────┐  ┌─────────┐  ┌──────────┐  │
│  │ Done ✓│  │ Skipped │  │ Not today│  │
│  └───────┘  └─────────┘  └──────────┘  │
└─────────────────────────────────────────┘
```

**No penalty ever**:

- Done → mark complete
- Skipped → no penalty
- Not today → no penalty
- Ignored (1+ min in plan) → "probably doing well"

---

## D7: Exit Gate Defaults

### Decision

5 default items: keys, phone charge, water, meds, bag-packed.

### Changed from Original

| Original   | New                 | Reason             |
| ---------- | ------------------- | ------------------ |
| cat-fed    | (removed)           | Not universal      |
| bag-packed | (kept)              | Common need        |
| eyeglasses | (moved to examples) | Not everyone needs |

### Chosen Defaults

```typescript
DEFAULT_GATE_CONDITIONS = [
  { id: "keys", name: "Keys present", satisfied: false },
  { id: "phone", name: "Phone charged ≥20%", satisfied: false },
  { id: "water", name: "Water bottle filled", satisfied: false },
  { id: "meds", name: "Meds taken", satisfied: false },
  { id: "bag-packed", name: "Bag packed", satisfied: false },
];
```

### Examples for Custom Items

When user adds new item, show examples:

- Eyeglasses
- ID card
- Earbuds
- Travel ticket (train/bus/cab)

---

## D8: Degradation Stages

### Decision

3 manual stages: Degraded → Anchor Only → Day Off. User can revert.

### Stage Definitions

| Stage       | What Stays                | What Drops                       | Status        |
| ----------- | ------------------------- | -------------------------------- | ------------- |
| Active      | Full chain                | Nothing                          | `active`      |
| Degraded    | Anchor + required + meals | can_skip_when_late steps         | `degraded`    |
| Anchor Only | Anchor + travel           | Prep, exit-gate, recovery, meals | `anchor-only` |
| Day Off     | Tomorrow deadline only    | Everything                       | `day-off`     |

### Rationale

- Stage 1 (Degraded): Close to existing behavior, low friction
- Stage 2 (Anchor Only): For really hard days
- Stage 3 (Day Off): Feels like "closing a book", not failure

### Revert Path

```
Day Off → Anchor Only → Degraded → Active
```

(User can tap to upgrade)

---

## D9: Day-Off Suggestions

### Decision

Show 2-3 suggestion cards based on Q7 free_time_preferences.

### Mapping Q7 → Suggestions

| Q7 Value         | Suggestion Card               |
| ---------------- | ----------------------------- |
| rest_creative    | "Rest or creative time"       |
| light_chores     | "Light chores"                |
| movement         | "Movement / walk"             |
| social           | "Call someone or social time" |
| nothing_specific | (hide suggestions)            |

### Rationale

- Uses data user already provided
- Low pressure: user can tap to add OR ignore
- Untimed blocks (no schedule pressure)

---

## D10: Test Strategy

### Decision

Unit tests for logic, integration tests for full flows.

### Unit Tests

- Sleep advisory calculation
- Date/time utilities
- Chain step filtering

### Integration Tests

- Zero-context plan generation
- Multi-anchor handling
- Late-day banner triggers

### Rationale

- Logic functions are pure → easy unit tests
- Full flows need integration tests to verify DB/API/component interaction
- No e2e needed (Astro SSR, would require browser automation)

---

## D11: Data Persistence Strategy

### Decision

All new data in `user_preferences` JSONB column.

### Why Not New Tables?

| Approach          | Migration Risk          | Complexity |
| ----------------- | ----------------------- | ---------- |
| New tables        | Higher (schema changes) | More setup |
| JSONB in existing | Lower (add column)      | Simpler    |

### Chosen: JSONB in user_preferences

**Fields Added**:

```typescript
interface UserPreferences {
  // Existing
  commitments_pattern?: string;
  hardest_thing?: string;
  structure_style?: string;
  usual_wake_time?: string;

  // New
  keystone?: KeystonePreset;
  usual_bedtime?: string;
  free_time_preferences?: string[];
  exit_gate_template?: GateCondition[];
  chain_step_overrides?: Record<string, { duration_estimate?: number }>;
}
```

---

## D12: No Gamification

### Decision

Never show streak losses, gap summaries, or "welcome back" messaging.

### Rationale

| Anti-Pattern           | Why Avoid           |
| ---------------------- | ------------------- |
| Streak lost            | Weaponizes absence  |
| Gap summary            | Comments on absence |
| "Welcome back"         | Assumes collapse    |
| Best streak comparison | Guilt-inducing      |

### What We Show Instead

- Intent signal: "Good to see you" (neutral)
- Streak: Just the number when > 0, nothing when = 0
- Gap: No data shown, no assumption made
