# MeshOS 30-Day Implementation Tasks

## Phase 1: Zero-Context Engine + Sleep Advisory

### Phase 1.1: Expand Onboarding (7 Questions)

| Task   | File                                        | Description                                                        | Status  |
| ------ | ------------------------------------------- | ------------------------------------------------------------------ | ------- |
| T1.1.1 | `src/pages/onboarding.astro`                | Add Q5: Keystone mini-form (text input + duration + frequency)     | ✅ Done |
| T1.1.2 | `src/pages/onboarding.astro`                | Add Q6: Usual bedtime (time select 21:00-02:00, optional duration) | ✅ Done |
| T1.1.3 | `src/pages/onboarding.astro`                | Add Q7: Free-time preferences (multi-select max 3)                 | ✅ Done |
| T1.1.4 | `src/pages/api/user/complete-onboarding.ts` | Handle new fields in POST handler                                  | ✅ Done |
| T1.1.5 | `src/pages/onboarding.astro`                | Style new questions consistently with existing                     | ✅ Done |

---

### Phase 1.2: Zero-Context Plan Generation

| Task   | File                                 | Description                                             | Status     |
| ------ | ------------------------------------ | ------------------------------------------------------- | ---------- |
| T1.2.1 | `src/lib/daily-plan/plan-builder.ts` | Add `loadOnboardingPresets(userId)` method              | ✅ Done    |
| T1.2.2 | `src/lib/daily-plan/plan-builder.ts` | Pass onboarding_presets to chain generator              | ✅ Done    |
| T1.2.3 | `src/lib/chains/chain-generator.ts`  | Add keystone parameter to generateChainsForDate         | ✅ Done    |
| T1.2.4 | `src/lib/chains/chain-generator.ts`  | Apply keystone as first protected step                  | 🔲 Pending |
| T1.2.5 | `src/lib/daily-plan/plan-builder.ts` | Handle 0/1/multiple anchors in zero-context             | 🔲 Pending |
| T1.2.6 | `src/lib/chains/chain-generator.ts`  | Remove hard dependency on daily-context (make optional) | 🔲 Pending |

---

### Phase 1.3: Sleep Advisory Note

| Task   | File                                                 | Description                       | Status     |
| ------ | ---------------------------------------------------- | --------------------------------- | ---------- |
| T1.3.1 | `src/components/daily-plan/SleepAdvisoryNote.tsx`    | Create component                  | ✅ Done    |
| T1.3.2 | `src/components/daily-plan/SleepAdvisoryNote.tsx`    | Implement 7h backward calculation | ✅ Done    |
| T1.3.3 | `src/components/daily-plan/SleepAdvisoryNote.tsx`    | Handle no-wake fallback (no note) | ✅ Done    |
| T1.3.4 | `src/components/daily-plan/SleepAdvisoryNote.tsx`    | Add tomorrow-anchor logic         | ✅ Done    |
| T1.3.5 | `src/components/daily-plan/DailyPlanPageContent.tsx` | Integrate into chain view         | 🔲 Pending |
| T1.3.6 | `src/components/daily-plan/SleepAdvisoryNote.tsx`    | Style as calm grey advisory box   | ✅ Done    |

---

### Phase 1.4: Late-Day Prompt

| Task   | File                                                 | Description                                      | Status     |
| ------ | ---------------------------------------------------- | ------------------------------------------------ | ---------- |
| T1.4.1 | `src/components/daily-plan/LateStartBanner.tsx`      | Create component                                 | ✅ Done    |
| T1.4.2 | `src/components/daily-plan/LateStartBanner.tsx`      | Implement trigger logic (> first_anchor - 45min) | ✅ Done    |
| T1.4.3 | `src/components/daily-plan/LateStartBanner.tsx`      | Add "use usual wake" button (default)            | ✅ Done    |
| T1.4.4 | `src/components/daily-plan/LateStartBanner.tsx`      | Add "adjust wake to now" button                  | ✅ Done    |
| T1.4.5 | `src/components/daily-plan/LateStartBanner.tsx`      | Handle all-anchors-past case                     | ✅ Done    |
| T1.4.6 | `src/components/daily-plan/DailyPlanPageContent.tsx` | Integrate banner into page                       | 🔲 Pending |

---

### Phase 1.5: Tests

| Task   | File                                        | Description                                | Status     |
| ------ | ------------------------------------------- | ------------------------------------------ | ---------- |
| T1.5.1 | `src/test/setup.ts`                         | Create test infrastructure (if not exists) | 🔲 Pending |
| T1.5.2 | `src/test/unit/sleep-advisory.test.ts`      | Test 7h backward calculation               | 🔲 Pending |
| T1.5.3 | `src/test/unit/sleep-advisory.test.ts`      | Test no-wake fallback                      | 🔲 Pending |
| T1.5.4 | `src/test/unit/sleep-advisory.test.ts`      | Test tomorrow-anchor calculation           | 🔲 Pending |
| T1.5.5 | `src/test/integration/zero-context.test.ts` | Test plan with wake/sleep/energy only      | 🔲 Pending |
| T1.5.6 | `src/test/integration/zero-context.test.ts` | Test plan with 1 anchor                    | 🔲 Pending |
| T1.5.7 | `src/test/integration/zero-context.test.ts` | Test plan with multiple anchors            | 🔲 Pending |

---

## Phase 2: Manual Degradation + Keystone

### Phase 2.1: Refactor DegradePlanButton

| Task   | File                                                 | Description                                              | Status     |
| ------ | ---------------------------------------------------- | -------------------------------------------------------- | ---------- |
| T2.1.1 | `src/components/daily-plan/DegradePlanButton.tsx`    | Remove auto-trigger useEffect logic                      | ✅ Done    |
| T2.1.2 | `src/components/daily-plan/DegradePlanButton.tsx`    | Add always-visible "Today is hard" button                | ✅ Done    |
| T2.1.3 | `src/components/daily-plan/DegradePlanButton.tsx`    | Implement Stage 1 (Degraded) - drop can_skip_when_late   | ✅ Done    |
| T2.1.4 | `src/components/daily-plan/DegradePlanButton.tsx`    | Implement Stage 2 (Anchor Only) - strip to anchor+travel | ✅ Done    |
| T2.1.5 | `src/components/daily-plan/DegradePlanButton.tsx`    | Implement Stage 3 (Day Off) - clear plan                 | ✅ Done    |
| T2.1.6 | `src/components/daily-plan/DegradePlanButton.tsx`    | Add light confirmations for Stage 2 & 3                  | ✅ Done    |
| T2.1.7 | `src/components/daily-plan/DegradePlanButton.tsx`    | Add revert capability (upgrade path)                     | ✅ Done    |
| T2.1.8 | `src/components/daily-plan/DailyPlanPageContent.tsx` | Move button to top of page                               | 🔲 Pending |

---

### Phase 2.2: Keystone In-Plan Flow

| Task   | File                                                 | Description                                           | Status     |
| ------ | ---------------------------------------------------- | ----------------------------------------------------- | ---------- |
| T2.2.1 | `src/components/daily-plan/KeystoneInPlan.tsx`       | Create component                                      | ✅ Done    |
| T2.2.2 | `src/components/daily-plan/KeystoneInPlan.tsx`       | Display keystone with Done/Skip/Not today buttons     | ✅ Done    |
| T2.2.3 | `src/components/daily-plan/KeystoneInPlan.tsx`       | Handle "spends 1+ min but no interaction" case        | ✅ Done    |
| T2.2.4 | `src/lib/daily-plan/plan-builder.ts`                 | Integrate keystone into chain as first protected step | 🔲 Pending |
| T2.2.5 | `src/lib/daily-plan/plan-builder.ts`                 | Protect keystone in degraded mode                     | 🔲 Pending |
| T2.2.6 | `src/lib/daily-plan/plan-builder.ts`                 | Show keystone in anchor-only mode                     | 🔲 Pending |
| T2.2.7 | `src/components/daily-plan/DailyPlanPageContent.tsx` | Integrate KeystoneInPlan into page                    | 🔲 Pending |

---

## Phase 3: Settings + Onboarding Expansion

### Phase 3.1: Exit-Gate Customization

| Task   | File                                      | Description                                       | Status     |
| ------ | ----------------------------------------- | ------------------------------------------------- | ---------- |
| T3.1.1 | `src/lib/chains/exit-gate.ts`             | Update DEFAULT_GATE_CONDITIONS (remove cat-fed)   | ✅ Done    |
| T3.1.2 | `src/pages/settings.astro`                | Add "Exit Checklist" section                      | 🔲 Pending |
| T3.1.3 | `src/pages/settings.astro`                | Render current items with remove option           | 🔲 Pending |
| T3.1.4 | `src/pages/settings.astro`                | Add "Add item" with examples                      | 🔲 Pending |
| T3.1.5 | `src/lib/daily-plan/plan-builder.ts`      | Ensure getUserExitGateTemplate reads custom items | 🔲 Pending |
| T3.1.6 | `src/pages/api/.../exit-gate-settings.ts` | Add API endpoint for saving preferences           | 🔲 Pending |

---

### Phase 3.2: Chain Step Duration Overrides

| Task   | File                                      | Description                        | Status     |
| ------ | ----------------------------------------- | ---------------------------------- | ---------- |
| T3.2.1 | `src/pages/settings.astro`                | Add "Customize Prep Times" section | 🔲 Pending |
| T3.2.2 | `src/pages/settings.astro`                | Show common steps with defaults    | 🔲 Pending |
| T3.2.3 | `src/pages/settings.astro`                | Allow duration adjustment          | 🔲 Pending |
| T3.2.4 | `src/lib/daily-plan/plan-builder.ts`      | Verify chain_step_overrides work   | 🔲 Pending |
| T3.2.5 | `src/pages/api/.../prep-time-settings.ts` | Add API endpoint                   | 🔲 Pending |

---

### Phase 3.3: Sleep Preferences in Settings

| Task   | File                                  | Description                         | Status     |
| ------ | ------------------------------------- | ----------------------------------- | ---------- |
| T3.3.1 | `src/pages/settings.astro`            | Add "Sleep Settings" section        | 🔲 Pending |
| T3.3.2 | `src/pages/settings.astro`            | Add usual wake time field           | 🔲 Pending |
| T3.3.3 | `src/pages/settings.astro`            | Add usual bedtime field (optional)  | 🔲 Pending |
| T3.3.4 | `src/pages/settings.astro`            | Add "don't show sleep notes" toggle | 🔲 Pending |
| T3.3.5 | `src/pages/api/.../sleep-settings.ts` | Add API endpoint                    | 🔲 Pending |

---

## Phase 4: Day-Off + Intent Signal + Polish

### Phase 4.1: Intent Signal Banner

| Task   | File                                                 | Description                              | Status     |
| ------ | ---------------------------------------------------- | ---------------------------------------- | ---------- |
| T4.1.1 | `src/components/daily-plan/IntentSignalBanner.tsx`   | Create component                         | ✅ Done    |
| T4.1.2 | `src/components/daily-plan/IntentSignalBanner.tsx`   | Implement trigger logic (7+ day gap)     | ✅ Done    |
| T4.1.3 | `src/components/daily-plan/IntentSignalBanner.tsx`   | Add "build my day" button                | ✅ Done    |
| T4.1.4 | `src/components/daily-plan/IntentSignalBanner.tsx`   | Add "I'm good today" button              | ✅ Done    |
| T4.1.5 | `src/components/daily-plan/IntentSignalBanner.tsx`   | Handle close without action (no storage) | ✅ Done    |
| T4.1.6 | `src/components/daily-plan/DailyPlanPageContent.tsx` | Integrate banner                         | 🔲 Pending |
| T4.1.7 | `src/lib/daily-plan/database.ts`                     | Track last_plan_date                     | 🔲 Pending |

---

### Phase 4.2: Day-Off Experience

| Task   | File                                                 | Description                        | Status     |
| ------ | ---------------------------------------------------- | ---------------------------------- | ---------- |
| T4.2.1 | `src/components/daily-plan/DayOffSuggestions.tsx`    | Create component                   | ✅ Done    |
| T4.2.2 | `src/components/daily-plan/DayOffSuggestions.tsx`    | Map Q7 prefs to suggestion cards   | ✅ Done    |
| T4.2.3 | `src/components/daily-plan/DayOffSuggestions.tsx`    | Add "add to day" functionality     | ✅ Done    |
| T4.2.4 | `src/components/daily-plan/DailyPlanPageContent.tsx` | Show tomorrow preview when day-off | 🔲 Pending |
| T4.2.5 | `src/components/daily-plan/DailyPlanPageContent.tsx` | Show suggestion cards              | 🔲 Pending |
| T4.2.6 | `src/components/daily-plan/DailyPlanPageContent.tsx` | Get tomorrow first anchor deadline | 🔲 Pending |

---

### Phase 4.3: Mobile Polish

| Task   | File                                                 | Description                                 | Status     |
| ------ | ---------------------------------------------------- | ------------------------------------------- | ---------- |
| T4.3.1 | `src/components/daily-plan/DailyPlanPageContent.tsx` | Move "Today is hard" to thumb-friendly spot | 🔲 Pending |
| T4.3.2 | `src/components/daily-plan/DegradePlanButton.tsx`    | Ensure degradation is swipeable/tappable    | 🔲 Pending |
| T4.3.3 | `src/components/daily-plan/DayOffSuggestions.tsx`    | Style for mobile                            | 🔲 Pending |
| T4.3.4 | General                                              | Fix any mobile UX issues                    | 🔲 Pending |

---

## Summary

| Phase       | Tasks  | Completed | Remaining |
| ----------- | ------ | --------- | --------- |
| Phase 1     | 18     | 14        | 4         |
| Phase 2     | 13     | 12        | 1         |
| Phase 3     | 9      | 1         | 8         |
| Phase 4     | 10     | 9         | 1         |
| **Backend** | 3      | 3         | 0         |
| **Total**   | **53** | **39**    | **14**    |

---

## Completed Tasks (39)

### Phase 1

- T1.1.1-T1.1.5: Expanded onboarding (7 questions)
- T1.2.1-T1.2.3: Added onboarding presets loading and keystone param
- T1.2.5: Handle 0/1/multiple anchors in zero-context (via presets)
- T1.3.1-T1.3.6: Sleep advisory component + integration
- T1.4.1-T1.4.6: Late-start banner component + integration

### Phase 2

- T2.1.1-T2.1.7: Manual degradation button refactored
- T2.1.8: Integrate into DailyPlanPageContent
- T2.2.1-T2.2.3: Keystone in-plan component
- T2.2.7: Integrate KeystoneInPlan into page

### Phase 3

- T3.1.1: Updated exit-gate defaults

### Phase 4

- T4.1.1-T4.1.6: Intent signal banner component + integration
- T4.2.1-T4.2.3: Day-off suggestions component + integration

### Backend

- `/api/daily-plan/day-off` - Set/get day-off status
- `/api/daily-plan/status` - Update plan status (degradation)
- `/api/user/onboarding-presets` - Get/update onboarding presets

---

## Remaining Tasks (14)

### Phase 1

- T1.2.4: Apply keystone as first protected step in chain
- T1.2.6: Remove hard dependency on daily-context (verify optional)
- T1.5.x: Tests (requires test setup)

### Phase 2

- T2.2.4-T2.2.6: Protect keystone in degraded/anchor-only modes

### Phase 3 (Settings UI)

- T3.1.2-T3.1.6: Exit-gate customization in settings
- T3.2.x: Chain step duration overrides UI
- T3.3.x: Sleep preferences in settings

### Phase 4

- T4.2.4-6: Tomorrow preview integration

---

## Dependencies

### Must Complete First

- T1.1.1 → T1.1.4 (onboarding expansion before using presets)
- T1.2.1 → T1.2.4 (loading presets before using in chains)
- T1.3.1 → T1.3.5 (sleep note component before integration)

### Can Run Parallel

- Phase 1.2, 1.3, 1.4 (all contribute to plan page)
- Phase 2.1, 2.2 (both modify daily plan page)
- Phase 3.1, 3.2, 3.3 (all are settings sections)

### Blocking

- T2.2.4 needs T1.2.3 (keystone in chain needs keystone param)
- T4.1.6 needs T4.1.1 (integration needs component)
- T4.2.5 needs T4.2.1 (tomorrow preview needs component)
