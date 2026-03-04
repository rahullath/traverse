# MeshOS 30-Day Requirements

## R1: Intent Signal Banner (Return After Gap)

### Description

Soft, neutral banner shown on first open of daily-plan page after 7+ days gap OR on first-ever login.

### Requirements

- **R1.1**: Banner shows "Good to see you. Need a plan for today?" (one line, neutral tone)
- **R1.2**: Two buttons: "Yes – build my day" and "I'm good today – no plan needed"
- **R1.3**: "Yes" button → normal plan generator flow
- **R1.4**: "I'm good today" → instantly sets day-off status, shows calm tomorrow preview only
- **R1.5**: If user closes app without tapping → nothing stored, no assumption, no streak damage
- **R1.6**: Trigger condition: `gap > 7 days since last_plan_date` OR `no plans ever exist`
- **R1.7**: No gap summary, no "welcome back", no streak diff shown

### Acceptance Criteria

- [ ] Banner appears on daily-plan page load after 7+ day gap
- [ ] Banner appears on first-ever login
- [ ] Both buttons function correctly
- [ ] No data stored on close without action

---

## R2: Zero-Context Plan Generation

### Description

Plan builder must produce a complete, useful day using ONLY onboarding presets + current time + anchors. No habit data, no daily context, no trailing window required.

### Requirements

- **R2.1**: Generation works with ONLY: wake time, sleep time, energy level, and one anchor (or zero anchors)
- **R2.2**: Zero anchors → full gentle chain from wake → sleep using structure style + free-time preferences
- **R2.3**: One anchor → backward chain from anchor + forward wake-ramp
- **R2.4**: Multiple anchors → show all in time order, main focus = earliest unfinished anchor
- **R2.5**: If opened after first anchor passed → auto-focus on next live anchor + note "First anchor passed — here's the rest of today"
- **R2.6**: If current time > 10am AND next anchor at 12pm+ → generate from now onward only
- **R2.7**: All chain steps have valid times when dailyContext = null
- **R2.8**: Onboarding presets used as fallback when no historical data

### Acceptance Criteria

- [ ] Plan generates successfully with wake/sleep/energy only
- [ ] Plan generates with 0, 1, and multiple anchors
- [ ] Late-day (>10am) shows adjusted plan
- [ ] No errors when dailyContext is null

---

## R3: Expanded Onboarding (7 Questions)

### Description

Onboarding expands from 4 to 7 questions to capture all data needed for zero-context plans.

### Requirements

- **R3.1**: Keep existing Q1-Q4 (commitments, hardest thing, structure style, wake time)
- **R3.2**: Q5 - Keystone mini-form:
  - Text: "The one thing that usually makes the rest of my day feel possible"
  - Duration select: 5-60 minutes
  - Frequency select: every_day | most_days | flexible
- **R3.3**: Q6 - Usual bedtime:
  - Time select: 21:00-02:00 in 30-min steps
  - Optional duration override (default: 7h)
- **R3.4**: Q7 - Free-time preferences:
  - Multi-select (max 3): rest_creative, light_chores, movement, social, nothing_specific
- **R3.5**: All new fields stored in user_preferences as JSON
- **R3.6**: Q6 and Q7 are optional (graceful fallback if skipped)

### Acceptance Criteria

- [ ] All 7 questions render correctly
- [ ] Data saves to user_preferences on completion
- [ ] Existing users see updated onboarding (if not completed)

---

## R4: Sleep Advisory Note

### Description

Research-grounded, purely advisory sleep recommendation shown in chain view.

### Requirements

- **R4.1**: Default target = 7 hours (UK Biobank peak EF)
- **R4.2**: If bedtime answered → show "Best to sleep by ~{bedtime} ({duration}h ideal)"
- **R4.3**: If no bedtime but wake time → calculate 7h backward from wake, show advisory
- **R4.4**: If no wake time → no sleep note shown
- **R4.5**: If anchor tomorrow exists → show "Tomorrow's {anchor} → sleep by {calculated} tonight"
- **R4.6**: Style: calm grey box, non-blocking, never prevents plan generation
- **R4.7**: Regularity nudge: if previous plans show wake variance → "Keeping wake times steady helps EF more than hitting exact hours"

### Acceptance Criteria

- [ ] Shows correct advisory based on available data
- [ ] No note shown when no wake time
- [ ] Research-grounded 7h default used
- [ ] Never blocks plan generation

---

## R5: Late-Day Prompt

### Description

One-tap soft prompt when user opens app after their usual wake time has passed.

### Requirements

- **R5.1**: Trigger when: `current_time > (first_anchor - 45min)` AND first_anchor is past or very soon
- **R5.2**: Show banner: "Late start today? Current time: {time}. First anchor ({name}) was at {time}."
- **R5.3**: Two buttons:
  1. "Use my usual wake time" (default, preserves circadian rhythm)
  2. "Adjust wake to now" (regenerate from current time)
- **R5.4**: If user ignores banner → use usual wake time (conservative default)
- **R5.5**: If all anchors in past → show day-off style suggestions instead

### Acceptance Criteria

- [ ] Banner triggers at correct time
- [ ] Both buttons work correctly
- [ ] Default = preserve usual wake time
- [ ] Graceful handling when all anchors past

---

## R6: Manual Degradation (3 Stages)

### Description

User-initiated plan degradation in explicit stages. Replaces auto-triggered behavior.

### Requirements

- **R6.1**: "Today is hard" button always visible on daily plan page (not conditional)
- **R6.2**: Stage 1 - "Degraded":
  - Drops all can_skip_when_late chain steps
  - Keeps anchor + required steps + meals
  - Status → 'degraded'
  - No confirmation dialog
- **R6.3**: Stage 2 - "Anchor Only":
  - Strips everything except anchor time block + bare travel
  - No prep chain, no exit gate, no recovery, no meals
  - Status → 'anchor-only'
  - Light confirmation: "Just anchors? OK"
- **R6.4**: Stage 3 - "Day Off":
  - Clears plan entirely
  - Shows tomorrow's first chain completion deadline only
  - Status → 'day-off'
  - Light confirmation: "Take a real break?"
- **R6.5**: Each stage is one tap deeper (no skipping)
- **R6.6**: User can REVERT: tap to upgrade (day-off → anchor-only → degraded → active)
- **R6.7**: Remove all auto-trigger logic (no 30-min-behind detection)

### Acceptance Criteria

- [ ] All 3 stages work correctly
- [ ] Revert capability functional
- [ ] No auto-trigger behavior remains
- [ ] Mobile-friendly placement

---

## R7: Keystone In-Plan Flow

### Description

Keystone appears as first protected block in daily plan, independent of habits module.

### Requirements

- **R7.1**: Keystone stored in user_preferences (JSON: description, duration_minutes, frequency)
- **R7.2**: Shown as first row in plan: "Keystone — {user's words}" with duration
- **R7.3**: Three buttons: Done ✓ | Skipped | Not today
- **R7.4**: No penalty ever, no streak impact
- **R7.5**: If user spends 1+ min in plan but doesn't interact → treated as "probably doing well"
- **R7.6**: If keystone = "whole morning routine" → entire wake-ramp becomes protected in degraded/anchor-only modes
- **R7.7**: If keystone = specific timing (e.g., "get to train") → protected timing block

### Acceptance Criteria

- [ ] Keystone shows as first item in plan
- [ ] All three buttons work
- [ ] No penalty for any interaction
- [ ] Protected in degradation modes

---

## R8: Exit Gate Customization

### Description

User can customize exit gate items in settings. Defaults updated.

### Requirements

- **R8.1**: Default items: keys, phone charge, water, meds, bag-packed (removed: cat-fed)
- **R8.2**: Settings section: "Exit Checklist" with add/remove/reorder
- **R8.3**: When adding new item → show examples: eyeglasses, ID card, earbuds, travel ticket
- **R8.4**: Custom items stored in user_preferences.exit_gate_template
- **R8.5**: Falls back to defaults if no custom items set
- **R8.6**: Persists through collapse

### Acceptance Criteria

- [ ] Settings UI allows adding/removing items
- [ ] Examples shown when adding
- [ ] Custom items used in plan generation
- [ ] Defaults apply when no customization

---

## R9: Chain Step Duration Overrides

### Description

User can customize default durations for chain steps in settings.

### Requirements

- **R9.1**: Settings section: "Customize Prep Times"
- **R9.2**: Show common steps: shower, pack bag, get ready (with defaults)
- **R9.3**: User can adjust duration for each
- **R9.4**: Store in user_preferences.chain_step_overrides
- **R9.5**: Already wired in plan-builder — verify works

### Acceptance Criteria

- [ ] Settings UI shows common steps
- [ ] Adjustments persist
- [ ] Used in plan generation

---

## R10: Sleep Preferences in Settings

### Description

User can set and override sleep preferences in settings.

### Requirements

- **R10.1**: Settings section: "Sleep Settings"
- **R10.2**: Fields: usual wake time, usual bedtime (optional), sleep duration
- **R10.3**: Option: "I wake up at different times — don't show sleep notes"
- **R10.4**: Stored in user_preferences (usual_wake_time, usual_bedtime)

### Acceptance Criteria

- [ ] All fields editable
- [ ] Option to disable sleep notes works

---

## R11: Day-Off Experience

### Description

Calm, peaceful day-off flow with suggestions based on onboarding preferences.

### Requirements

- **R11.1**: When status = 'day-off' → show calm tomorrow preview
- **R11.2**: Tomorrow preview: "Tomorrow first thing: [anchor or chain at XX:XX]"
- **R11.3**: If no tomorrow anchors → show nothing for preview
- **R11.4**: Show 2-3 suggestion cards based on Q7 free_time_preferences:
  - rest_creative → "Rest or creative time"
  - light_chores → "Light chores"
  - movement → "Movement / walk"
  - social → "Call someone or social time"
  - nothing_specific → (hide suggestions)
- **R11.5**: User can tap to add untimed block OR ignore
- **R11.6**: Feels like "closing a book", not failure

### Acceptance Criteria

- [ ] Tomorrow preview shows when anchors exist
- [ ] Suggestions match Q7 preferences
- [ ] Adding suggestion creates untimed block
- [ ] Calm, non-judgmental aesthetic

---

## R12: Tests

### Description

Unit and integration tests for critical path functionality.

### Requirements

- **R12.1**: Create test setup infrastructure (src/test/setup.ts)
- **R12.2**: Unit tests for sleep advisory calculation:
  - 7h backward calculation
  - No-wake fallback
  - Tomorrow-anchor sleep calculation
- **R12.3**: Integration tests for zero-context:
  - Plan with only wake/sleep/energy (no anchors)
  - Plan with 1 anchor
  - Plan with multiple anchors

### Acceptance Criteria

- [ ] Test infrastructure exists
- [ ] Sleep advisory tests pass
- [ ] Zero-context plan tests pass

---

## Data Structures

### user_preferences JSON Schema

```json
{
  "keystone": {
    "description": "Shower",
    "duration_minutes": 15,
    "frequency": "every_day"
  },
  "usual_bedtime": "00:30",
  "free_time_preferences": ["rest_creative", "light_chores", "movement"],
  "exit_gate_template": [
    { "id": "keys", "name": "Keys present", "satisfied": false }
  ],
  "chain_step_overrides": {
    "shower": { "duration_estimate": 20 }
  }
}
```
