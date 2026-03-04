# Implementation Plan: Triage Mirror Stateless

## Overview

This implementation plan breaks down the triage-mirror-stateless feature into a 4-week sprint covering core services, API endpoints, React components, testing, and integration. The feature extends MeshOS's V2 chain-based planning system with real-time adaptation capabilities for users with executive dysfunction.

## Implementation Approach

- Week 1: Core services (TimePhysics, TriageService, StateFilter) + API foundation
- Week 2: Mirror UI components (MirrorUI, Timeline, prompts)
- Week 3: Inline editing + completion tracking
- Week 4: Polish + testing + integration

All code will be written in TypeScript using the existing MeshOS stack (Astro SSR, React, Tailwind CSS, Supabase).

## Tasks

### Week 1: Core Services & API Foundation

- [x] 1. Set up project structure and type definitions
  - Create `src/lib/triage/` directory for core services
  - Create `src/types/triage.ts` for TypeScript interfaces
  - Define `RunwayCalculation`, `TriageState`, `StateDeclaration`, `FilteredTimeline` interfaces
  - _Requirements: All requirements (foundation)_

- [x] 2. Implement TimePhysicsService
  - [x] 2.1 Create TimePhysicsService class in `src/lib/triage/time-physics.ts`
    - Implement `calculateRunway()` method
    - Handle null cases (no future anchors)
    - Calculate required duration from commitment envelope
    - _Requirements: 1.1, 1.2, 1.4, 1.5_

  - [ ]\* 2.2 Write property test for runway calculation correctness
    - **Property 1: Runway Calculation Correctness**
    - **Validates: Requirements 1.1, 1.2**
    - Test with fast-check: timeline with anchors + current time
    - Verify runway = (next_anchor_start - current_time) in minutes
    - Verify required_duration = sum of envelope step durations

  - [ ]\* 2.3 Write property test for runway null handling
    - **Property 2: Runway Null Handling**
    - **Validates: Requirements 1.4**
    - Test with timeline containing no future anchors
    - Verify both runway and required_duration are null

  - [ ]\* 2.4 Write property test for runway statelessness
    - **Property 3: Runway Statelessness**
    - **Validates: Requirements 1.5**
    - Test same timeline at two different current times
    - Verify results differ based on time position

  - [ ]\* 2.5 Write unit tests for TimePhysicsService edge cases
    - Test empty timeline
    - Test timeline with only past anchors
    - Test timeline with malformed metadata
    - _Requirements: 1.1, 1.2, 1.4, 1.5_

- [x] 3. Implement TriageService
  - [x] 3.1 Create TriageService class in `src/lib/triage/triage-service.ts`
    - Implement `shouldActivateTriage()` method
    - Implement `identifyKeystoneActivity()` method
    - Implement `getTriageState()` method
    - Handle class/seminar vs appointment anchor types
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 10.1, 10.2, 10.3, 10.4, 10.5_

  - [ ]\* 3.2 Write property test for triage activation condition
    - **Property 4: Triage Activation Condition**
    - **Validates: Requirements 2.1, 2.2, 2.5**
    - Test that triage activates if and only if runway < required_duration
    - Use fast-check to generate various runway scenarios

  - [ ]\* 3.3 Write property tests for keystone identification
    - **Property 5: Keystone Identification for Class/Seminar**
    - **Property 6: Keystone Identification for Appointment**
    - **Validates: Requirements 10.2, 10.3**
    - Test class/seminar anchors return anchor as keystone
    - Test appointment anchors return prep if >15min, else anchor

  - [ ]\* 3.4 Write unit tests for TriageService
    - Test triage prompt has 3 options
    - Test keystone identification with missing envelope data
    - Test triage state with no anchors
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 10.1, 10.2, 10.3, 10.4, 10.5_

- [x] 4. Implement StateFilterService
  - [x] 4.1 Create StateFilterService class in `src/lib/triage/state-filter.ts`
    - Implement `filterTimeline()` method with state switch logic
    - Implement private filter methods for each state
    - Implement `shouldShowStatePrompt()` method
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 16.8, 16.9, 16.10, 23.5_

  - [ ]\* 4.2 Write property tests for state filters
    - **Property 20: Starting Day State Filter**
    - **Property 21: Ready for Anchor State Filter**
    - **Property 22: Mid-Chain State Filter**
    - **Property 23: At Anchor State Filter**
    - **Property 24: Missed It State Filter**
    - **Validates: Requirements 16.3, 16.4, 16.5, 16.6, 16.7**
    - Test each state produces correct visible/hidden block sets

  - [ ]\* 4.3 Write property test for state prompt timing
    - **Property 19: State Declaration Prompt Timing**
    - **Validates: Requirements 16.1, 23.5**
    - Test prompt shows only when: no declaration in 30min AND within 2hr of anchor

  - [ ]\* 4.4 Write property test for ready-for-anchor triage trigger
    - **Property 25: Ready for Anchor Triage Trigger**
    - **Validates: Requirements 16.10**
    - Test triage activates when user selects "Ready" but past departure time

  - [ ]\* 4.5 Write unit tests for StateFilterService
    - Test invalid step_id fallback
    - Test "Just checking" shows full timeline
    - Test state filter with empty timeline
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 16.8, 16.9, 16.10_

- [x] 5. Create test data generators for property tests
  - [x] 5.1 Create `src/test/generators/timeline-generators.ts`
    - Implement `timeBlockArbitrary` using fast-check
    - Implement `timelineWithAnchors()` generator
    - Implement `commitmentEnvelopeArbitrary` generator
    - Ensure generated timelines are chronologically sorted
    - _Requirements: All (testing foundation)_

- [ ] 6. Implement Mirror API endpoint
  - [x] 6.1 Create `src/pages/api/daily-plan/mirror.ts`
    - Implement GET handler with serverAuth.requireAuth()
    - Fetch today's daily_plan with time_blocks
    - Calculate runway using TimePhysicsService
    - Get triage state using TriageService
    - Check if state prompt should show
    - Return complete mirror data payload
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4_

  - [ ]\* 6.2 Write integration test for mirror API
    - Test successful data load with valid plan
    - Test 404 when no plan exists
    - Test 401 when not authenticated
    - Test runway calculation in response
    - Test triage state in response
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [ ] 7. Implement Recalculate API endpoint
  - [x] 7.1 Create `src/pages/api/daily-plan/recalculate.ts`
    - Implement POST handler with serverAuth.requireAuth()
    - Fetch user preferences (sleep_time, energy_state)
    - Get current location state
    - Call PlanBuilder.generateDailyPlan() with current time as wakeTime
    - Implement 4-second timeout with Promise.race
    - Return new plan or timeout error
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 8.1, 8.2, 8.3, 8.4, 8.5_

  - [ ]\* 7.2 Write property test for recalc preference preservation
    - **Property 14: Recalc Preference Preservation**
    - **Validates: Requirements 7.4**
    - Test wake_time and sleep_time preferences unchanged after recalc

  - [ ]\* 7.3 Write property test for recalc plan replacement
    - **Property 15: Recalc Plan Replacement**
    - **Validates: Requirements 8.3**
    - Test recalc replaces (not duplicates) existing daily_plan record

  - [ ]\* 7.4 Write property test for recalc graceful fallback
    - **Property 16: Recalc Graceful Fallback**
    - **Validates: Requirements 8.5**
    - Test recalc succeeds with default values when DailyContext unavailable

  - [ ]\* 7.5 Write integration tests for recalculate API
    - Test successful recalculation
    - Test timeout after 4 seconds (408 status)
    - Test preservation of completed blocks
    - Test 401 when not authenticated
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 8.1, 8.2, 8.3, 8.4, 8.5_

- [x] 8. Implement State Declaration API endpoint
  - [x] 8.1 Create `src/pages/api/daily-plan/state.ts`
    - Implement POST handler with serverAuth.requireAuth()
    - Validate state against whitelist
    - Validate selected_step_id for mid_chain state
    - Fetch current plan
    - Apply state filter using StateFilterService
    - Update time_blocks statuses in database
    - Save state declaration to user_preferences
    - Check if triage should trigger for ready_for_anchor
    - Return filtered timeline and triage_triggered flag
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 16.8, 16.9, 16.10_

  - [ ]\* 8.2 Write integration tests for state API
    - Test each state type (starting_day, ready_for_anchor, etc.)
    - Test 400 for invalid state
    - Test 400 for mid_chain without selected_step_id
    - Test 404 when no plan exists
    - Test database persistence of state declaration
    - Test triage trigger for ready_for_anchor past departure
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 16.8, 16.9, 16.10_

- [x] 9. Checkpoint - Core services and APIs complete
  - Ensure all tests pass for Week 1 tasks
  - Verify TimePhysicsService, TriageService, StateFilterService working
  - Verify mirror, recalculate, and state APIs functional
  - Ask user if questions arise

### Week 2: Mirror UI Components

- [x] 10. Create Mirror UI page and routing
  - [x] 10.1 Create `src/pages/daily-plan/mirror.astro`
    - Set up Astro page with SSR
    - Add authentication check
    - Embed MirrorUI React component with client:load
    - Add page metadata and title
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

  - [x] 10.2 Update navigation to include Mirror link
    - Add "Mirror View" link to main navigation
    - Add mobile hamburger menu item
    - _Requirements: 4.1_

- [x] 11. Implement MirrorUI main component
  - [x] 11.1 Create `src/components/daily-plan/MirrorUI.tsx`
    - Set up component state (data, loading, error, editMode)
    - Implement loadMirrorData() using fetch to /api/daily-plan/mirror
    - Implement handleRecalculate() using fetch to /api/daily-plan/recalculate
    - Implement handleStateDeclaration() using fetch to /api/daily-plan/state
    - Implement handleTriageDecision() using fetch to /api/daily-plan/triage
    - Render MirrorHeader, TriagePrompt, StateDeclarationPrompt, Timeline
    - Add loading spinner and error states
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4_

  - [ ]\* 11.2 Write unit tests for MirrorUI component
    - Test loading state displays spinner
    - Test error state displays error message
    - Test successful data load renders timeline
    - Test recalculate button triggers API call
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 12. Implement MirrorHeader component
  - [x] 12.1 Create `src/components/daily-plan/MirrorHeader.tsx`
    - Implement header layout with title, edit toggle, recalc button
    - Add token balance display using useAuth()
    - Implement responsive breakpoints (mobile, tablet, desktop)
    - Add hamburger menu for mobile
    - Style with Tailwind semantic tokens (bg-surface, text-text-primary)
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [ ]\* 12.2 Write unit tests for MirrorHeader
    - Test edit mode toggle
    - Test recalculate button click
    - Test token balance display
    - Test responsive layout changes
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

- [x] 13. Implement TriagePrompt component
  - [x] 13.1 Create `src/components/daily-plan/TriagePrompt.tsx`
    - Implement triage prompt layout with warning icon
    - Display runway vs required duration message
    - Display keystone activity name
    - Render 3 option buttons (Protect Keystone, Skip Anchor, Recalculate)
    - Style with bg-surface, border-warning accent
    - Ensure 44x44px minimum touch targets
    - Add ARIA labels for accessibility
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 10.1, 10.2, 10.3, 10.4, 10.5_

  - [ ]\* 13.2 Write accessibility tests for TriagePrompt
    - Test keyboard-focusable buttons (tabindex="0")
    - Test ARIA labels on all options
    - Test screen reader announcement (aria-live="polite")
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

  - [ ]\* 13.3 Write unit tests for TriagePrompt
    - Test 3 options displayed when active
    - Test option click triggers onDecision callback
    - Test keystone activity name displayed
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_

- [x] 14. Implement StateDeclarationPrompt component
  - [x] 14.1 Create `src/components/daily-plan/StateDeclarationPrompt.tsx`
    - Implement bottom sheet pattern for mobile
    - Render 6 radio button options (starting_day, ready_for_anchor, etc.)
    - Implement mid_chain expansion with step selector
    - Add dismiss button and swipe-down gesture
    - Add Continue button to submit selection
    - Style with backdrop overlay and safe area insets
    - Make keyboard navigable (Tab, Enter, Escape)
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 16.8, 16.9, 16.10_

  - [ ]\* 14.2 Write accessibility tests for StateDeclarationPrompt
    - Test keyboard navigation (Tab, Enter, Escape)
    - Test radio button ARIA roles
    - Test focus management on open/close
    - _Requirements: 16.1, 16.2_

  - [ ]\* 14.3 Write unit tests for StateDeclarationPrompt
    - Test 6 options displayed
    - Test mid_chain expands to show step selector
    - Test dismiss button closes prompt
    - Test Continue button triggers onDeclare callback
    - _Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 16.8_

- [x] 15. Implement Timeline component
  - [x] 15.1 Create `src/components/daily-plan/Timeline.tsx`
    - Implement vertical timeline layout
    - Render current time indicator (sticky)
    - Render deadline banners for commitment envelopes
    - Render time blocks with start/end times, duration, activity name
    - Implement visual states (pending, current, completed, skipped, late)
    - Add completion controls (checkmark, skip buttons)
    - Add edit button when editMode enabled
    - Style with Tailwind semantic tokens
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4, 17.1, 17.2, 17.3, 17.4, 17.5_

  - [ ]\* 15.2 Write property test for timeline chronological ordering
    - **Property 10: Timeline Chronological Ordering**
    - **Validates: Requirements 4.3**
    - Test any set of time blocks displayed sorted by start_time ascending

  - [ ]\* 15.3 Write property test for current block highlighting
    - **Property 11: Current Block Highlighting**
    - **Validates: Requirements 5.4**
    - Test block highlighted when current time within [start_time, end_time]

  - [ ]\* 15.4 Write unit tests for Timeline component
    - Test time blocks rendered in order
    - Test current time indicator displayed
    - Test deadline banner displayed
    - Test visual states (pending, current, completed, skipped)
    - Test completion controls visible
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4_

- [x] 16. Implement TimeBlock component
  - [x] 16.1 Create `src/components/daily-plan/TimeBlock.tsx`
    - Implement time block card layout
    - Display time range, duration, activity name
    - Add completion checkbox and skip button
    - Add edit button (when editMode enabled)
    - Implement visual state styling
    - Add touch gesture support (swipe right = complete, swipe left = skip)
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_

  - [ ]\* 16.2 Write unit tests for TimeBlock component
    - Test time range displayed correctly
    - Test completion checkbox click
    - Test skip button click
    - Test edit button visible in edit mode
    - Test visual state classes applied
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5_

- [x] 17. Implement DeadlineBanner component
  - [x] 17.1 Create `src/components/daily-plan/DeadlineBanner.tsx`
    - Calculate deadline from last prep/activation step before travel_there
    - Display "Complete by [time]" with time remaining
    - Implement color transition (warning when past deadline)
    - Make sticky when approaching deadline
    - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5_

  - [ ]\* 17.2 Write property test for deadline banner time calculation
    - **Property 30: Deadline Banner Time Calculation**
    - **Validates: Requirements 21.1**
    - Test deadline = end_time of last prep/activation step before travel_there

  - [ ]\* 17.3 Write property test for deadline banner color transition
    - **Property 31: Deadline Banner Color Transition**
    - **Validates: Requirements 21.3, 21.5**
    - Test banner warning color if and only if current time > deadline time

  - [ ]\* 17.4 Write unit tests for DeadlineBanner
    - Test deadline time displayed
    - Test time remaining calculated
    - Test warning color when past deadline
    - Test sticky behavior
    - _Requirements: 21.1, 21.2, 21.3, 21.4, 21.5_

- [x] 18. Checkpoint - Mirror UI components complete
  - Ensure all tests pass for Week 2 tasks
  - Verify MirrorUI, Timeline, prompts render correctly
  - Verify responsive design works on mobile, tablet, desktop
  - Test accessibility with keyboard navigation
  - Ask user if questions arise

### Week 3: Inline Editing & Completion Tracking

- [x] 19. Implement Triage API endpoint
  - [x] 19.1 Create `src/pages/api/daily-plan/triage.ts`
    - Implement POST handler with serverAuth.requireAuth()
    - Validate mode (protect_keystone, skip_anchor, recalculate)
    - Validate anchor_id provided
    - Fetch current plan
    - Apply triage decision based on mode
    - For protect_keystone: keep only keystone + anchor blocks
    - For skip_anchor: mark all anchor blocks as skipped
    - For recalculate: trigger full recalculation
    - Return updated timeline and recalc_triggered flag
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

  - [ ]\* 19.2 Write property test for protect keystone transformation
    - **Property 7: Protect Keystone Transformation**
    - **Validates: Requirements 3.2**
    - Test result contains only keystone activity and anchor blocks

  - [ ]\* 19.3 Write property test for skip anchor transformation
    - **Property 8: Skip Anchor Transformation**
    - **Validates: Requirements 3.3**
    - Test all blocks with anchor_id marked as skipped and removed

  - [ ]\* 19.4 Write property test for triage session persistence
    - **Property 9: Triage Session Persistence**
    - **Validates: Requirements 3.5**
    - Test no database writes occur for triage decisions

  - [ ]\* 19.5 Write integration tests for triage API
    - Test protect_keystone mode
    - Test skip_anchor mode
    - Test recalculate mode triggers recalc
    - Test 400 for invalid mode
    - Test 404 for missing anchor
    - _Requirements: 3.1, 3.2, 3.3, 3.4, 3.5_

- [x] 20. Implement Completion API endpoint
  - [x] 20.1 Create `src/pages/api/time-blocks/[id]/complete.ts`
    - Implement PATCH handler with serverAuth.requireAuth()
    - Validate status (completed or skipped)
    - Validate skip_reason required if status is skipped
    - Fetch time_block by id and verify user ownership
    - Update status and skip_reason in database
    - Calculate remaining time until deadline
    - Return updated block and remaining_time
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 23.1, 23.2, 23.3_

  - [ ]\* 20.2 Write property test for completion status persistence
    - **Property 26: Completion Status Persistence**
    - **Validates: Requirements 17.2, 17.3, 23.1, 23.2, 23.3**
    - Test status change persisted to database and restored on reload

  - [ ]\* 20.3 Write integration tests for completion API
    - Test mark as completed
    - Test mark as skipped with reason
    - Test 400 for invalid status
    - Test 400 for skipped without reason
    - Test 404 for non-existent block
    - Test 401 for unauthorized access
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 23.1, 23.2, 23.3_

- [x] 21. Implement Edit API endpoint
  - [x] 21.1 Create `src/pages/api/time-blocks/[id]/edit.ts`
    - Implement PATCH handler with serverAuth.requireAuth()
    - Validate start_time, end_time, activity_name, duration
    - Fetch time_block by id and verify user ownership
    - Check for time conflicts with other anchors
    - Update time_block in database
    - Cascade time changes to subsequent blocks in same chain
    - Return updated block, updated_blocks array, and conflicts array
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 19.1, 19.2, 19.3, 19.4, 19.5_

  - [ ]\* 21.2 Write property test for anchor edit conflict detection
    - **Property 27: Anchor Edit Conflict Detection**
    - **Validates: Requirements 18.4**
    - Test validation error when new time overlaps existing anchor

  - [ ]\* 21.3 Write property test for step duration cascade
    - **Property 28: Step Duration Cascade**
    - **Validates: Requirements 19.3**
    - Test subsequent steps recalculated to maintain continuity

  - [ ]\* 21.4 Write integration tests for edit API
    - Test anchor time edit
    - Test step duration edit with cascade
    - Test activity name edit
    - Test conflict detection
    - Test 400 for invalid data
    - Test 404 for non-existent block
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 19.1, 19.2, 19.3, 19.4, 19.5_

- [x] 22. Implement InlineEditor component
  - [x] 22.1 Create `src/components/daily-plan/InlineEditor.tsx`
    - Implement inline expansion layout
    - Add time range inputs (start, end)
    - Add duration input (minutes)
    - Add activity name input
    - Add location input (optional)
    - Implement real-time conflict detection
    - Display conflict warnings with visual indicator
    - Add Cancel, Save, and Recalculate All buttons
    - Validate duration 5-480 minutes
    - Validate end time after start time
    - Debounce inputs (300ms)
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 19.1, 19.2, 19.3, 19.4, 19.5_

  - [ ]\* 22.2 Write unit tests for InlineEditor
    - Test input validation (duration range, time order)
    - Test conflict detection display
    - Test save button triggers onSave callback
    - Test cancel button triggers onCancel callback
    - Test debouncing on inputs
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5_

- [x] 23. Implement anchor deletion functionality
  - [x] 23.1 Add delete button to InlineEditor for anchors
    - Add "Delete Anchor" button with confirmation dialog
    - Call DELETE endpoint for anchor
    - Refresh timeline after deletion
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5_

  - [x] 23.2 Create `src/pages/api/time-blocks/[id]/delete.ts`
    - Implement DELETE handler with serverAuth.requireAuth()
    - Verify block is an anchor
    - Delete all time_blocks with matching anchor_id
    - Return success status
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5_

  - [ ]\* 23.3 Write property test for anchor deletion envelope removal
    - **Property 29: Anchor Deletion Envelope Removal**
    - **Validates: Requirements 20.5**
    - Test all blocks with anchor_id removed from timeline

  - [ ]\* 23.4 Write integration tests for delete API
    - Test anchor deletion removes all related blocks
    - Test 400 for non-anchor blocks
    - Test 404 for non-existent block
    - Test 401 for unauthorized access
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5_

- [x] 24. Implement custom step insertion
  - [x] 24.1 Add "Insert Step" button to Timeline
    - Add button between time blocks in edit mode
    - Open inline form for new step
    - Allow user to specify activity name and duration
    - Insert step and cascade subsequent times
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_

  - [x] 24.2 Create `src/pages/api/time-blocks/insert.ts`
    - Implement POST handler with serverAuth.requireAuth()
    - Validate activity_name, duration, insert_after_id
    - Create new time_block
    - Cascade times for subsequent blocks
    - Return new block and updated_blocks array
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_

  - [ ]\* 24.3 Write integration tests for insert API
    - Test step insertion
    - Test time cascade after insertion
    - Test 400 for invalid data
    - Test 404 for invalid insert_after_id
    - _Requirements: 19.1, 19.2, 19.3, 19.4, 19.5_

- [x] 25. Implement "Start at" label
  - [x] 25.1 Add StartTimeLabel component
    - Create `src/components/daily-plan/StartTimeLabel.tsx`
    - Calculate start time from first step in commitment envelope
    - Display "Start at [time]" above envelope
    - Style with text-text-secondary
    - _Requirements: 22.1, 22.2, 22.3, 22.4, 22.5_

  - [ ]\* 25.2 Write property test for start time label calculation
    - **Property 32: Start Time Label Calculation**
    - **Validates: Requirements 22.2**
    - Test label displays start_time of first envelope step

  - [ ]\* 25.3 Write unit tests for StartTimeLabel
    - Test start time displayed correctly
    - Test label positioned above envelope
    - _Requirements: 22.1, 22.2, 22.3, 22.4, 22.5_

- [x] 26. Checkpoint - Inline editing and completion tracking complete
  - Ensure all tests pass for Week 3 tasks
  - Verify inline editing works for anchors and steps
  - Verify completion tracking persists to database
  - Verify time cascade works correctly
  - Ask user if questions arise

### Week 4: Polish, Testing & Integration

- [x] 27. Implement recalc-on-open preference
  - [x] 27.1 Add recalc_on_open toggle to user preferences UI
    - Add toggle in settings page
    - Save to user_preferences.preferences JSONB
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

  - [x] 27.2 Implement auto-recalc on Mirror UI load
    - Check recalc_on_open preference in MirrorUI useEffect
    - Trigger recalculate before rendering if enabled
    - Show loading state during auto-recalc
    - _Requirements: 6.2, 6.5, 7.2, 8.1_

  - [ ]\* 27.3 Write property test for recalc preference storage
    - **Property 12: Recalc Preference Storage Round-Trip**
    - **Validates: Requirements 6.1**
    - Test storing and retrieving recalc_on_open returns same value

  - [ ]\* 27.4 Write property test for recalc on open behavior
    - **Property 13: Recalc on Open Behavior**
    - **Validates: Requirements 6.2, 6.5, 7.2, 8.1**
    - Test loading Mirror with recalc_on_open=true triggers generateDailyPlan()

  - [ ]\* 27.5 Write integration tests for recalc-on-open
    - Test preference toggle saves to database
    - Test auto-recalc triggered when enabled
    - Test no auto-recalc when disabled
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5_

- [x] 28. Implement Intent Signal banner
  - [x] 28.1 Create IntentSignalBanner component
    - Create `src/components/daily-plan/IntentSignalBanner.tsx`
    - Check for 7+ day absence (no daily_plan records)
    - Display neutral re-engagement message
    - Add dismiss button
    - Store dismissal in session (not persistent)
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

  - [ ]\* 28.2 Write property test for intent signal absence detection
    - **Property 17: Intent Signal Absence Detection**
    - **Validates: Requirements 9.1**
    - Test banner shows when no daily_plan for N >= 7 consecutive days

  - [ ]\* 28.3 Write property test for intent signal dismissal persistence
    - **Property 18: Intent Signal Dismissal Persistence**
    - **Validates: Requirements 9.4**
    - Test banner doesn't reappear until next session after dismissal

  - [ ]\* 28.4 Write unit tests for IntentSignalBanner
    - Test banner displays after 7+ day absence
    - Test dismiss button hides banner
    - Test banner doesn't show for recent users
    - _Requirements: 9.1, 9.2, 9.3, 9.4, 9.5_

- [x] 29. Implement recalc completion state preservation
  - [x] 29.1 Update recalculate API to preserve completed blocks
    - Modify `src/pages/api/daily-plan/recalculate.ts`
    - After generating new plan, check for completed blocks in old plan
    - Match blocks by start_time
    - Preserve status='completed' for matching blocks
    - _Requirements: 23.4_

  - [ ]\* 29.2 Write property test for recalc completion preservation
    - **Property 33: Recalc Completion State Preservation**
    - **Validates: Requirements 23.4**
    - Test completed blocks retain status in new plan if same time

  - [ ]\* 29.3 Write integration test for completion preservation
    - Create plan with completed blocks
    - Trigger recalculation
    - Verify completed blocks still marked complete
    - _Requirements: 23.4_

- [x] 30. Implement mobile-specific features
  - [x] 30.1 Add touch gesture support to TimeBlock
    - Implement swipe right gesture for mark complete
    - Implement swipe left gesture for mark skipped
    - Implement long press for context menu
    - Use touch event handlers with threshold detection
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

  - [x] 30.2 Implement bottom sheet pattern for prompts
    - Update StateDeclarationPrompt with slide-up animation
    - Update TriagePrompt with slide-up animation
    - Add backdrop overlay (semi-transparent)
    - Implement swipe-down to dismiss
    - Respect safe area insets (env(safe-area-inset-\*))
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

  - [x] 30.3 Add mobile viewport handling CSS
    - Add to `src/styles/messy-theme.css`
    - Set min-height: 100vh and -webkit-fill-available
    - Add safe area inset padding to header and footer
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

  - [ ]\* 30.4 Write unit tests for touch gestures
    - Test swipe right marks complete
    - Test swipe left marks skipped
    - Test long press shows context menu
    - _Requirements: 13.1, 13.2, 13.3, 13.4, 13.5_

- [x] 31. Implement performance optimizations
  - [x] 31.1 Add memoization to expensive calculations
    - Memoize runway calculation in MirrorUI
    - Memoize filtered timeline in Timeline component
    - Use React.useMemo with proper dependencies
    - _Requirements: 1.3, 4.5, 12.1, 12.2, 13.5_

  - [x] 31.2 Add debouncing to inputs
    - Debounce inline edit inputs (300ms)
    - Throttle scroll events (100ms)
    - Use lodash.debounce or custom hook
    - _Requirements: 12.1, 12.2, 13.5_

  - [x] 31.3 Implement lazy loading for heavy components
    - Use React.lazy() for InlineEditor
    - Use React.lazy() for TriagePrompt
    - Add Suspense boundaries with loading fallbacks
    - _Requirements: 12.1, 12.2, 13.5_

  - [ ]\* 31.4 Write performance tests
    - Test runway calculation <100ms for 20 blocks
    - Test recalculation <4s
    - Test keystone identification <50ms
    - Test state filter <100ms
    - _Requirements: 1.3, 4.5, 10.4, 12.1, 12.2, 13.5_

- [x] 32. Implement error handling and logging
  - [x] 32.1 Add error boundaries to React components
    - Create ErrorBoundary component
    - Wrap MirrorUI with ErrorBoundary
    - Display user-friendly error messages
    - Log errors to monitoring service
    - _Requirements: All (error handling)_

  - [x] 32.2 Add error handling to all API endpoints
    - Add try-catch blocks to all handlers
    - Return appropriate HTTP status codes
    - Log errors with context (user_id, anchor_id, etc.)
    - Implement graceful fallbacks
    - _Requirements: All (error handling)_

  - [x] 32.3 Implement retry logic for failed operations
    - Add automatic retry for completion updates (1 retry after 2s)
    - Add manual retry button for recalculation failures
    - Display retry UI with error message
    - _Requirements: All (error handling)_

- [x] 33. Add comprehensive accessibility features
  - [x] 33.1 Ensure keyboard navigation works throughout
    - Test Tab navigation through all interactive elements
    - Test Enter/Space to activate buttons
    - Test Escape to dismiss prompts
    - Add visible focus indicators
    - _Requirements: All (accessibility)_

  - [x] 33.2 Add ARIA labels and roles
    - Add aria-label to all buttons
    - Add role="button" where needed
    - Add aria-live regions for dynamic updates
    - Add aria-expanded for expandable sections
    - _Requirements: All (accessibility)_

  - [x] 33.3 Ensure color contrast meets WCAG 2.1 AA
    - Verify all text has 4.5:1 contrast ratio
    - Verify interactive elements have 3:1 contrast
    - Test with color contrast analyzer
    - _Requirements: All (accessibility)_

  - [ ]\* 33.4 Write comprehensive accessibility tests
    - Test keyboard navigation
    - Test ARIA labels present
    - Test screen reader announcements
    - Test focus management
    - _Requirements: All (accessibility)_

- [x] 34. Create comprehensive integration tests
  - [ ]\* 34.1 Write end-to-end test for triage flow
    - Load Mirror UI with insufficient runway
    - Verify triage prompt displays
    - Select "Protect Keystone" option
    - Verify timeline filtered correctly
    - _Requirements: 1.1, 1.2, 2.1, 2.2, 2.3, 3.1, 3.2, 10.1, 10.2_

  - [ ]\* 34.2 Write end-to-end test for state declaration flow
    - Load Mirror UI near anchor time
    - Verify state prompt displays
    - Select "Ready for anchor" state
    - Verify timeline filtered (activation chain hidden)
    - _Requirements: 16.1, 16.2, 16.4_

  - [ ]\* 34.3 Write end-to-end test for recalculation flow
    - Load Mirror UI with existing plan
    - Click "Recalculate from Now" button
    - Verify loading state displays
    - Verify new plan generated with current time as wake
    - Verify completed blocks preserved
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 7.1, 7.2, 7.3, 7.4, 8.1, 8.2, 8.3, 23.4_

  - [ ]\* 34.4 Write end-to-end test for completion tracking flow
    - Load Mirror UI with pending blocks
    - Click checkmark to mark block complete
    - Verify block status updates immediately
    - Refresh page and verify status persisted
    - _Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 23.1, 23.2, 23.3_

  - [ ]\* 34.5 Write end-to-end test for inline editing flow
    - Load Mirror UI in edit mode
    - Click edit button on anchor
    - Change anchor time
    - Verify conflict detection if overlap
    - Save changes and verify cascade to subsequent blocks
    - _Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 19.1, 19.2, 19.3_

- [x] 35. Add feature flags and configuration
  - [x] 35.1 Create feature flag configuration
    - Add to `src/lib/feature-flags.ts`
    - Define TRIAGE_MIRROR_ENABLED flag
    - Define STATE_DECLARATION_ENABLED flag
    - Define INLINE_EDITING_ENABLED flag
    - Define STATELESS_RECALC_ENABLED flag
    - _Requirements: All (deployment)_

  - [x] 35.2 Add environment variables
    - Add RECALC_TIMEOUT_MS (default 4000)
    - Add RUNWAY_CALC_TIMEOUT_MS (default 100)
    - Add TRIAGE_KEYSTONE_TIMEOUT_MS (default 50)
    - Document in .env.example
    - _Requirements: 1.3, 4.5, 10.4, 12.1, 12.2_

  - [x] 35.3 Implement feature flag checks in components
    - Check TRIAGE_MIRROR_ENABLED before rendering Mirror UI
    - Check STATE_DECLARATION_ENABLED before showing state prompt
    - Check INLINE_EDITING_ENABLED before showing edit controls
    - Check STATELESS_RECALC_ENABLED before showing recalc button
    - _Requirements: All (deployment)_

- [x] 36. Add monitoring and analytics
  - [x] 36.1 Add performance monitoring
    - Track runway calculation latency (p50, p95, p99)
    - Track recalculation success rate and latency
    - Track triage mode activation rate
    - Track state declaration usage by type
    - Track completion tracking usage
    - Track inline edit usage
    - Track error rates by endpoint
    - _Requirements: All (monitoring)_

  - [x] 36.2 Add user engagement tracking
    - Track time spent on Mirror UI
    - Track feature usage (triage, state declaration, editing)
    - Track recalculation frequency
    - Track completion rate
    - _Requirements: All (monitoring)_

- [x] 37. Write documentation
  - [x] 37.1 Create user-facing documentation
    - Write guide for Mirror UI usage
    - Document triage mode and options
    - Document state declaration options
    - Document inline editing features
    - Add screenshots and examples
    - _Requirements: All (documentation)_

  - [x] 37.2 Create developer documentation
    - Document API endpoints with examples
    - Document service classes and methods
    - Document component props and usage
    - Document testing strategy
    - Add architecture diagrams
    - _Requirements: All (documentation)_

- [x] 38. Conduct final testing and QA
  - [x] 38.1 Run full test suite
    - Run all unit tests (npm test)
    - Run all property tests (100 iterations each)
    - Run all integration tests
    - Run all e2e tests
    - Run all performance tests
    - Verify 80% code coverage minimum
    - _Requirements: All (testing)_

  - [x] 38.2 Manual testing on all devices
    - Test on mobile (iOS Safari, Android Chrome)
    - Test on tablet (iPad, Android tablet)
    - Test on desktop (Chrome, Firefox, Safari, Edge)
    - Test responsive breakpoints (320px, 640px, 1024px, 1920px)
    - Test touch gestures on mobile
    - Test keyboard navigation on desktop
    - _Requirements: All (testing)_

  - [x] 38.3 Accessibility audit
    - Run axe DevTools accessibility scan
    - Test with screen reader (NVDA, JAWS, VoiceOver)
    - Verify WCAG 2.1 AA compliance
    - Test keyboard-only navigation
    - Verify color contrast ratios
    - _Requirements: All (accessibility)_

  - [x] 38.4 Performance audit
    - Run Lighthouse performance audit
    - Verify bundle size targets (<200KB gzipped total)
    - Verify runtime performance (runway calc <100ms, recalc <4s)
    - Test with slow 3G network throttling
    - Test with CPU throttling (4x slowdown)
    - _Requirements: 1.3, 4.5, 10.4, 12.1, 12.2, 13.5_

  - [x] 38.5 Security audit
    - Verify all API endpoints require authentication
    - Verify user_id derived from session, not request body
    - Verify RLS policies enforced
    - Test for SQL injection vulnerabilities
    - Test for XSS vulnerabilities
    - Verify rate limiting works
    - _Requirements: All (security)_

- [x] 39. Prepare for deployment
  - [x] 39.1 Update database schema documentation
    - Document metadata JSONB extensions for time_blocks
    - Document user_preferences extensions
    - Verify no schema migrations needed
    - _Requirements: All (deployment)_

  - [x] 39.2 Create deployment checklist - Verify environment variables set in Vercel - Verify feature flags configured - Verify monitoring/logging configured - Create rollback plan - Document deployment steps - _Requirements: All (deployment)_
        3 - [~] 39.3 Set up staged rollout - Deploy to staging environment - Test with internal users - Enable for 10% of production users - Monitor error rates and performance - Gradually increase to 50%, then 100% - _Requirements: All (deployment)_

- [x] 40. Final checkpoint - Feature complete
  - Ensure all tests pass (unit, property, integration, e2e, performance)
  - Verify 80% code coverage achieved
  - Verify all 33 correctness properties implemented and passing
  - Verify accessibility compliance (WCAG 2.1 AA)
  - Verify performance targets met
  - Verify security audit passed
  - Verify documentation complete
  - Ask user if questions arise before deployment

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at end of each week
- Property tests validate universal correctness properties with fast-check (100 iterations minimum)
- Unit tests validate specific examples and edge cases
- Integration tests validate API endpoints and database operations
- All code uses TypeScript with existing MeshOS architecture
- No schema changes required - uses existing time_blocks table with metadata JSONB extensions

## Implementation Guidelines

### Code Organization

```
src/
├── lib/
│   └── triage/
│       ├── time-physics.ts          # TimePhysicsService
│       ├── triage-service.ts        # TriageService
│       └── state-filter.ts          # StateFilterService
├── types/
│   └── triage.ts                    # TypeScript interfaces
├── pages/
│   ├── daily-plan/
│   │   └── mirror.astro             # Mirror UI page
│   └── api/
│       ├── daily-plan/
│       │   ├── mirror.ts            # GET mirror data
│       │   ├── recalculate.ts       # POST recalculate
│       │   ├── state.ts             # POST state declaration
│       │   └── triage.ts            # POST triage decision
│       └── time-blocks/
│           ├── [id]/
│           │   ├── complete.ts      # PATCH completion
│           │   ├── edit.ts          # PATCH edit
│           │   └── delete.ts        # DELETE anchor
│           └── insert.ts            # POST insert step
├── components/
│   └── daily-plan/
│       ├── MirrorUI.tsx             # Main Mirror component
│       ├── MirrorHeader.tsx         # Header with controls
│       ├── TriagePrompt.tsx         # Triage mode prompt
│       ├── StateDeclarationPrompt.tsx  # State declaration
│       ├── Timeline.tsx             # Vertical timeline
│       ├── TimeBlock.tsx            # Individual time block
│       ├── DeadlineBanner.tsx       # Deadline warning
│       ├── InlineEditor.tsx         # Inline editing
│       ├── StartTimeLabel.tsx       # Start time label
│       └── IntentSignalBanner.tsx   # 7-day absence banner
└── test/
    ├── unit/
    │   ├── triage/
    │   │   ├── time-physics.test.ts
    │   │   ├── triage-service.test.ts
    │   │   └── state-filter.test.ts
    │   └── mirror-ui/
    │       └── components.test.ts
    ├── property/
    │   └── triage/
    │       ├── time-physics.property.test.ts
    │       ├── triage-service.property.test.ts
    │       └── state-filter.property.test.ts
    ├── integration/
    │   └── mirror-ui/
    │       ├── api-endpoints.test.ts
    │       └── recalculation.test.ts
    ├── e2e/
    │   └── mirror-ui/
    │       └── user-flows.test.ts
    ├── performance/
    │   └── runway-calculation.perf.test.ts
    └── generators/
        └── timeline-generators.ts   # fast-check generators
```

### Testing Strategy

1. **Property-Based Tests**: Use fast-check with 100 iterations minimum
   - Test universal properties across all inputs
   - Generate random timelines, dates, states
   - Verify invariants hold for all generated inputs

2. **Unit Tests**: Test specific cases and edge cases
   - Empty timelines, no anchors, malformed data
   - UI component rendering and interactions
   - Error conditions and fallbacks

3. **Integration Tests**: Test API endpoints and database
   - Full request/response cycles
   - Database persistence
   - Authentication and authorization

4. **E2E Tests**: Test complete user flows
   - Triage flow from start to finish
   - State declaration and filtering
   - Recalculation with completion preservation
   - Inline editing with cascade

5. **Performance Tests**: Verify performance targets
   - Runway calculation <100ms
   - Recalculation <4s
   - Keystone identification <50ms

### Security Checklist

- [ ] All API endpoints call `serverAuth.requireAuth()`
- [ ] User ID derived from session, never from request body
- [ ] All database queries filter by `user_id`
- [ ] Input validation on all user-provided data
- [ ] Rate limiting on expensive operations
- [ ] No PII in logs (user_id only)
- [ ] HTTPS enforced (Vercel default)

### Accessibility Checklist

- [ ] Keyboard navigation works throughout
- [ ] All interactive elements have ARIA labels
- [ ] Focus indicators visible
- [ ] Color contrast meets WCAG 2.1 AA (4.5:1 for text, 3:1 for UI)
- [ ] Screen reader announcements for dynamic updates
- [ ] No keyboard traps
- [ ] Skip links for navigation

### Performance Checklist

- [ ] Bundle size <200KB gzipped total
- [ ] Runway calculation <100ms for 20 blocks
- [ ] Recalculation <4s
- [ ] Memoization for expensive calculations
- [ ] Debouncing for inputs (300ms)
- [ ] Lazy loading for heavy components
- [ ] Virtualized scrolling for >20 blocks (future enhancement)

### Mobile Checklist

- [ ] Touch targets minimum 44x44px
- [ ] Swipe gestures work (right=complete, left=skip, down=dismiss)
- [ ] Bottom sheet pattern for prompts
- [ ] Safe area insets respected
- [ ] Viewport handling (-webkit-fill-available)
- [ ] Responsive breakpoints (320px, 640px, 1024px, 1920px)
- [ ] Works on iOS Safari and Android Chrome
