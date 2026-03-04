# MeshOS 30-Day Specification: Resilient Core + Manual Degradation

## Core Philosophy

> "Give the user a useful day from **only** what they told us in onboarding + the anchors they actually have today + what time it is right now."

Everything else is optional enhancement. No NLP, no background monitoring, no "we think you're collapsing" logic.

---

## Design Principles

1. **Zero-Context Resilience**: The plan builder must produce a useful day from zero historical data — same quality on day 1 and on the return from a 3-month gap

2. **No Absence Commentary**: The system never comments on absence, never weaponizes streaks, never plays therapist

3. **Manual Degradation**: Collapse isn't a mode to enter — it's a degradation of the user's own plan, triggered manually

4. **Optional Enhancement**: Daily context (D-1 habit data) enhances plans when available but is never required

5. **Persistent Configuration**: Settings set during functional periods (keystone, exit gate items, chain step durations) persist through collapse and are immediately useful on return

---

## Current State

| Feature                    | Status                            |
| -------------------------- | --------------------------------- |
| PlanStatus enum (5 values) | ✅ Done                           |
| Keystone habit (DB + API)  | ✅ Done                           |
| Chain step overrides       | ✅ Done                           |
| Daily context (null-safe)  | ✅ Done                           |
| DegradePlanButton          | ⚠️ Auto-triggered, needs refactor |
| Exit gate customization    | ❌ Not in settings                |
| Onboarding (4 questions)   | ⚠️ Missing 3 questions            |
| Streak display (gap-aware) | ❌ Not implemented                |
| Day-off tomorrow deadline  | ❌ Not implemented                |
| Integration tests          | ❌ No tests exist                 |

---

## Phase Overview

### Phase 1: Zero-Context Engine + Sleep Advisory (Week 1)

- Expand onboarding to 7 questions
- Hardening zero-context plan generation
- Sleep advisory note (research-grounded)
- Late-day prompt logic
- Unit + integration tests

### Phase 2: Manual Degradation + Keystone (Week 2)

- 3-stage manual degradation with revert capability
- Keystone in-plan flow (not habits-dependent)
- Protected keystone step in chains

### Phase 3: Settings + Onboarding Expansion (Week 3)

- Exit-gate customization in settings
- Chain step duration overrides UI
- Sleep preferences in settings

### Phase 4: Day-Off + Intent Signal + Polish (Week 4)

- Intent signal banner (first-open after gap)
- Day-off with free-time suggestions
- Tomorrow deadline preview
- Mobile UX polish

---

## Out of Scope

- AI-based collapse detection or suggestions
- Substance tracking or clinical features
- Automatic degradation based on inferred behavior
- Gamification of recovery or streaks
- Push notifications for absent users
- Background monitoring or surveillance

---

## Research References

### Sleep & Executive Function

- **UK Biobank**: Peak EF at 7 hours sleep (quadratic drop on both sides)
- **Regularity**: Consistency in wake times matters more than exact hours
- **Implication**: Sleep advisory should promote 7h target + regularity, not rigid schedules

---

## Related Documents

- [REQUIREMENTS.md](./REQUIREMENTS.md) - Detailed requirements
- [TASKS.md](./TASKS.md) - Implementation task breakdown
- [DESIGN.md](./DESIGN.md) - Design decisions and rationale
