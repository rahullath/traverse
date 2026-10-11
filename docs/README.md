# MeshOS 30-Day Implementation Documentation

## Files

| File                                 | Purpose                                                       |
| ------------------------------------ | ------------------------------------------------------------- |
| [SPEC.md](./SPEC.md)                 | Overall specification, core philosophy, and phase overview    |
| [REQUIREMENTS.md](./REQUIREMENTS.md) | Detailed requirements (R1-R12) with acceptance criteria       |
| [TASKS.md](./TASKS.md)               | Implementation task breakdown with estimates and dependencies |
| [DESIGN.md](./DESIGN.md)             | Design decisions and rationale (D1-D12)                       |

## Quick Reference

### Phases

1. **Phase 1** (Week 1): Zero-context engine + sleep advisory + late-day prompt + tests
2. **Phase 2** (Week 2): Manual degradation (3 stages) + keystone in-plan flow
3. **Phase 3** (Week 3): Settings (exit-gate, durations, sleep) + onboarding expansion
4. **Phase 4** (Week 4): Intent signal banner + day-off experience + polish

### Key Requirements

- R2: Zero-context plan generation (wake/sleep/energy only)
- R3: 7-question onboarding
- R4: Sleep advisory (7h default, research-grounded)
- R5: Late-day prompt (user choice, not auto)
- R6: Manual 3-stage degradation with revert
- R7: Keystone in-plan (not habits-dependent)
- R11: Day-off with suggestions from Q7

### Design Decisions

- D1: Keystone in user_preferences (not habits table)
- D5: No automatic absence detection - explicit user choice
- D6: Keystone confirmation in plan module, zero penalty
- D12: No gamification - never show streak losses or gap summaries

## Usage

These docs should be consulted before making any implementation changes to ensure consistency with the overall vision.

- **Start here**: Read SPEC.md for philosophy
- **Check scope**: Refer to REQUIREMENTS.md for what's in/out
- **Find tasks**: TASKS.md has detailed implementation steps
- **Understand decisions**: DESIGN.md explains why certain choices were made
