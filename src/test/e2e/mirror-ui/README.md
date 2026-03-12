# Mirror UI End-to-End Tests

This directory contains end-to-end tests for complete user flows through the Triage Mirror interface.

## Test Organization

### user-flows.test.ts

Tests complete user journeys:

- **Triage Flow**: Load → Triage prompt → Select option → Verify filtered timeline
- **State Declaration Flow**: Load → State prompt → Select state → Verify filtered timeline
- **Recalculation Flow**: Load → Click recalc → Verify new plan → Verify completion preserved
- **Completion Tracking Flow**: Load → Mark complete → Refresh → Verify persisted
- **Inline Editing Flow**: Load → Edit anchor → Verify cascade → Handle conflicts
- **Intent Signal Flow**: Load after 7+ days → Verify banner → Dismiss

## Running Tests

```bash
# Run all e2e tests
npm test src/test/e2e/

# Run specific test file
npm test src/test/e2e/mirror-ui/user-flows.test.ts

# Run with UI (if using Playwright in future)
npm run test:e2e:ui
```

## Test Scenarios

### 1. Triage Flow (Requirements 1.1, 1.2, 2.1, 2.2, 2.3, 3.1, 3.2, 10.1, 10.2)

**Given**: User has insufficient runway (30 min available, 90 min needed)
**When**: User loads Mirror UI
**Then**: Triage prompt displays with 3 options
**When**: User selects "Protect Keystone"
**Then**: Timeline shows only keystone activity and anchor

### 2. State Declaration Flow (Requirements 16.1, 16.2, 16.4)

**Given**: User is within 2 hours of anchor
**When**: User loads Mirror UI
**Then**: State declaration prompt displays
**When**: User selects "Ready for anchor"
**Then**: Activation chain steps are hidden, only travel/anchor/recovery visible

### 3. Recalculation Flow (Requirements 6.1-6.5, 7.1-7.4, 8.1-8.5, 23.4)

**Given**: User has existing plan with completed blocks
**When**: User clicks "Recalculate from Now"
**Then**: Loading state displays
**Then**: New plan generated with current time as wake
**Then**: Completed blocks preserved by start time match

### 4. Completion Tracking Flow (Requirements 17.1-17.5, 23.1-23.3)

**Given**: User has pending time blocks
**When**: User clicks checkmark on block
**Then**: Block status updates to completed immediately
**When**: User refreshes page
**Then**: Completed status persists

### 5. Inline Editing Flow (Requirements 18.1-18.5, 19.1-19.3)

**Given**: User is in edit mode
**When**: User clicks edit on anchor
**When**: User changes anchor time
**Then**: Conflict detection runs
**When**: User saves changes
**Then**: Subsequent blocks cascade to new times

### 6. Intent Signal Flow (Requirements 9.1-9.5)

**Given**: User has no plan for 7+ consecutive days
**When**: User opens app
**Then**: Intent signal banner displays
**When**: User dismisses banner
**Then**: Banner doesn't reappear until next session

## User Personas

### Persona 1: Late Waker

- Wakes 2 hours late
- Needs immediate triage
- Protects keystone activity
- Skips non-essential prep

### Persona 2: Mid-Day Checker

- Opens app at lunch
- Declares "mid-chain" state
- Marks morning blocks complete
- Continues with afternoon plan

### Persona 3: Plan Breaker

- Plan falls apart mid-day
- Triggers recalculation
- Gets fresh plan from now
- Preserves completed work

### Persona 4: Flexible Editor

- Anchor time changes
- Edits inline without navigation
- Resolves conflicts
- Adjusts chain durations

## Success Criteria

Each flow must:

1. Complete without errors
2. Preserve data integrity
3. Provide clear feedback
4. Handle edge cases gracefully
5. Work on mobile and desktop

## Browser Coverage

Tests should pass on:

- Chrome (latest)
- Firefox (latest)
- Safari (latest)
- Edge (latest)
- Mobile Safari (iOS)
- Chrome Mobile (Android)

## Performance Targets

- Page load: < 500ms
- Triage activation: < 5s
- Recalculation: < 4s
- State declaration: < 2s
- Completion update: < 1s

## Accessibility Requirements

All flows must:

- Work with keyboard only
- Announce changes to screen readers
- Maintain focus management
- Meet WCAG 2.1 AA standards

## Next Steps

After e2e tests pass:

1. Manual testing on real devices
2. Accessibility audit with screen readers
3. Performance audit with Lighthouse
4. Security audit
5. Staged rollout to production
