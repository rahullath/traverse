# Implementation Plan: Mirror V2 - Cognitive Prosthetic

## Overview

This implementation plan transforms the Mirror UI from a judgment-based plan tracker into a cognitive prosthetic for executive dysfunction. The plan follows a 5-phase approach: Foundation (remove harmful patterns), User-Initiated Support (reality check and flexible start times), Display Modes (intent-based filtering), Telemetry & Analytics (passive engagement tracking), and Polish & Testing (comprehensive validation).

The implementation leverages the existing MeshOS architecture (Astro SSR + React + TypeScript + Supabase) and maintains backward compatibility with existing chain generation and plan builder systems. All new components follow the established patterns from the codebase, including authentication via `createServerAuth()`, styling with Tailwind semantic tokens, and testing with Vitest + fast-check for property-based tests.

## Tasks

- [x] 1. Phase 1: Foundation - Remove Harmful Patterns
  - [x] 1.1 Disable automatic triage activation in MirrorUI
    - Modify `src/components/daily-plan/MirrorUI.tsx` to remove automatic triage trigger
    - Change triage activation to user-initiated only (button click)
    - Remove runway-based automatic warning display
    - _Requirements: 1.1, 1.5_

  - [x] 1.2 Create AnchorInfoCard component with neutral display
    - Create `src/components/daily-plan/AnchorInfoCard.tsx`
    - Display "Anchor at [time]" format instead of "Complete by"
    - Show time remaining as "(in X hours)" without countdown timer
    - Use neutral colors from theme (no red, orange, yellow)
    - Include "Can I make it?" button for user-initiated reality check
    - Support collapsed/expanded states for multi-anchor scenarios
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 12.2, 12.3_

  - [x] 1.3 Create DepartureWaypoint component
    - Create `src/components/daily-plan/DepartureWaypoint.tsx`
    - Display "Leave by [time]" in prominent text (larger than chain steps)
    - Show both clock time and countdown "(in X hours Y minutes)"
    - Use neutral styling when > 10 minutes away
    - Apply gentle highlight (font-weight 600 or 2px accent border at 40% opacity) when within 10 minutes
    - Never use red, orange, yellow, or alarm colors
    - _Requirements: 6.2, 6.3, 6.4, 6.5, 19.1, 19.2, 19.3, 19.4, 19.5_

  - [x] 1.4 Modify Timeline to display durations vs clock times
    - Modify `src/components/daily-plan/Timeline.tsx`
    - Change chain step blocks to show "X min" duration format
    - Keep clock times only for anchor and travel_there (departure) blocks
    - Update display logic based on envelope_type metadata
    - Maintain existing Timeline props interface for backward compatibility
    - _Requirements: 5.1, 5.2, 5.3, 5.4, 5.5_

  - [x] 1.5 Remove time-based color changes from TimeBlock
    - Modify `src/components/daily-plan/TimeBlock.tsx`
    - Remove automatic color changes based on current time vs start time
    - Use only three visual states: pending (neutral), completed (green), skipped (gray)
    - Maintain neutral pending state even when current time exceeds start time
    - Remove red, orange, yellow warning colors
    - _Requirements: 3.1, 3.2, 3.4, 3.5_

  - [x] 1.6 Hide completion controls by default
    - Modify `src/components/daily-plan/Timeline.tsx` to check user preference
    - Add `showCompletionControls` prop based on `show_completion_controls` preference
    - Hide completion checkboxes when preference is false (default)
    - Show completion checkboxes when preference is true
    - _Requirements: 4.1, 4.2, 4.3, 4.4_

  - [x] 1.7 Create database migration for user preferences
    - Create migration file in `supabase/migrations/`
    - Add `show_completion_controls BOOLEAN DEFAULT FALSE` to user_preferences
    - Add `show_recovery_blocks BOOLEAN DEFAULT TRUE` to user_preferences
    - Add `keystone_activity TEXT` to user_preferences
    - _Requirements: 4.2, 21.1, 9.4_

  - [x] 1.8 Write unit tests for new components
    - Test AnchorInfoCard displays "Anchor at" format (not "Complete by")
    - Test AnchorInfoCard shows neutral time format
    - Test AnchorInfoCard includes "Can I make it?" button
    - Test DepartureWaypoint displays "Leave by" prominently
    - Test DepartureWaypoint applies gentle highlight within 10 minutes
    - Test Timeline shows durations for chain steps
    - Test Timeline shows clock times for anchors and departure
    - Test TimeBlock uses only three visual states
    - _Requirements: 2.1, 2.2, 2.3, 6.2, 6.3, 19.1, 19.2, 5.1, 5.2, 3.2_

- [x] 2. Checkpoint - Verify foundation changes
  - Ensure all tests pass, ask the user if questions arise.

- [x] 3. Phase 2: User-Initiated Support - Reality Check and Flexible Start Times
  - [x] 3.1 Create RealityCheckService
    - Create `src/lib/display/reality-check.ts`
    - Implement `calculatePossibleSteps()` method to determine which steps fit within runway
    - Implement `generateAlternatives()` method for simplified options (keystone only, skip all, show all)
    - Implement `formatRealityCheck()` method using neutral language
    - Use existing TriageService logic for calculations
    - _Requirements: 7.2, 7.4_

  - [x] 3.2 Create RealityCheckPrompt component
    - Create `src/components/daily-plan/RealityCheckPrompt.tsx`
    - Display "You have time for: [steps]" in neutral language
    - Show alternative options "Or: [simplified options]"
    - Never use judgment terms: "late", "behind", "missed", "failed", "should have started"
    - Include dismiss button
    - _Requirements: 7.3, 7.4, 7.5, 16.1, 16.4, 16.5_

  - [x] 3.3 Create ChainStartSelector component
    - Create `src/components/daily-plan/ChainStartSelector.tsx`
    - Offer five options: "Now", "In 10 minutes", "In 30 minutes", "Custom time", "When ready"
    - Store last selected mode in sessionStorage
    - Trigger timeline regeneration with chosen start point
    - _Requirements: 8.2, 8.4, 8.5_

  - [x] 3.4 Add reality check API endpoint
    - Create `src/pages/api/daily-plan/reality-check.ts`
    - Accept anchor_id in request body
    - Calculate runway and possible steps using RealityCheckService
    - Return possible_steps, skipped_steps, alternatives, runway, required_duration
    - Record telemetry event for reality check request
    - Use `createServerAuth()` for authentication
    - _Requirements: 7.1, 7.2_

  - [x] 3.5 Integrate reality check flow in MirrorUI
    - Modify `src/components/daily-plan/MirrorUI.tsx`
    - Add state for `showRealityCheck`
    - Connect "Can I make it?" button to reality check API
    - Display RealityCheckPrompt when user clicks button
    - Handle user selection of alternatives
    - _Requirements: 1.2, 1.3, 1.4, 7.1_

  - [x] 3.6 Implement "when ready" mode
    - Modify Timeline to accept `showTimes` prop
    - When "When ready" selected, set `showTimes = false`
    - Display all blocks with duration format only (no clock times)
    - Show sequence without time pressure
    - _Requirements: 8.3_

  - [ ]\* 3.7 Write unit tests for RealityCheckService
    - Test calculatePossibleSteps returns correct steps within runway
    - Test generateAlternatives includes keystone-only, skip-all, show-all options
    - Test formatRealityCheck uses neutral language only
    - Test no judgment terms in output
    - _Requirements: 7.2, 7.3, 7.4, 7.5_

  - [ ]\* 3.8 Write property test for reality check neutral language
    - **Property 9: Reality Check Neutral Language**
    - **Validates: Requirements 7.3, 7.5**
    - Use fast-check to generate random reality check results
    - Verify output never contains forbidden terms: "late", "behind", "missed", "failed", "should have started"
    - Run 100+ iterations

  - [ ]\* 3.9 Write integration tests for reality check flow
    - Test user clicks "Can I make it?" → API called → results displayed
    - Test alternative selection updates timeline
    - Test reality check with various runway scenarios
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

- [x] 4. Checkpoint - Verify user-initiated support
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Phase 3: Display Modes - Intent-Based Filtering
  - [x] 5.1 Create DisplayModeService
    - Create `src/lib/display/display-mode-service.ts`
    - Implement `getDisplayOptions()` to return available display modes based on context
    - Implement `applyDisplayMode()` to filter timeline by mode (full_chain, keystone_focus, anchor_only, rest_of_day)
    - Implement `getNextAnchor()` to identify next anchor chronologically
    - Implement `hasAnchorPassed()` to detect passed anchors
    - Implement `getPivotOptions()` for passed anchor scenarios
    - _Requirements: 9.2, 11.3, 11.4, 12.1, 12.2, 12.5, 13.1, 13.3_

  - [x] 5.2 Create DisplayModeSerializer
    - Create `src/lib/display/serializer.ts`
    - Implement `serialize()` to convert DisplayModeState to JSON
    - Implement `deserialize()` to parse JSON to DisplayModeState
    - Implement `validate()` to check display mode values
    - Implement `getDefault()` to return "full_chain" as default
    - Handle invalid values by falling back to default
    - _Requirements: 22.1, 22.2, 22.3, 22.4_

  - [x] 5.3 Create IntentPrompt component
    - Create `src/components/daily-plan/IntentPrompt.tsx`
    - Display "What do you need?" as primary heading
    - Show anchor information if anchors exist
    - Offer three options: "Full morning chain", "Just keystone + anchor", "Check if I can make it"
    - Store selected intent in session state
    - For no-anchor days, show FreeActivationPrompt instead
    - _Requirements: 11.1, 11.2, 11.3_

  - [x] 5.4 Create FreeActivationPrompt component
    - Create `src/components/daily-plan/FreeActivationPrompt.tsx`
    - Detect when no anchor blocks exist
    - Display "No anchors today. Want to run your activation chain?"
    - Include ChainStartSelector for flexible start times
    - Offer keystone-only shortcut
    - Emphasize keystone as primary daily goal
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [x] 5.5 Add display mode state management to MirrorUI
    - Modify `src/components/daily-plan/MirrorUI.tsx`
    - Add state for `displayMode`, `showIntentPrompt`, `chainStartTime`
    - Render IntentPrompt on initial load
    - Store display mode in sessionStorage with key `mirror_display_mode_{date}`
    - Check for passed anchors on load, foreground, and every 60 seconds
    - Display neutral pivot options when anchor has passed
    - _Requirements: 11.1, 18.1, 13.2, 13.3_

  - [x] 5.6 Implement keystone-focus filtering
    - Modify Timeline to filter blocks based on display mode
    - For keystone_focus mode, show only keystone and anchor blocks
    - Visually emphasize keystone block (icon, subtle highlight)
    - Hide all other chain steps
    - _Requirements: 9.2, 9.5_

  - [x] 5.7 Implement multi-anchor progressive disclosure
    - Modify MirrorUI to identify next anchor
    - Show full chain for next anchor only
    - Collapse subsequent anchors (show AnchorInfoCard only)
    - Allow user to expand any anchor to focus on it
    - _Requirements: 12.1, 12.2, 12.3, 12.4, 12.5_

  - [x] 5.8 Add display mode switcher to MirrorHeader
    - Modify `src/components/daily-plan/MirrorHeader.tsx`
    - Add display mode switcher buttons
    - Add keystone shortcut button "Just show me [keystone]"
    - Record display mode switches in telemetry
    - _Requirements: 11.5, 17.2, 17.5_

  - [x] 5.9 Implement sessionStorage persistence
    - Store display mode state in sessionStorage on change
    - Restore display mode state on page load
    - Clear previous day's entry at midnight (day boundary)
    - Handle corrupted storage by falling back to default
    - _Requirements: 18.1, 18.2, 18.3, 18.4_

  - [ ]\* 5.10 Write property test for display mode filtering
    - **Property 12: Display Mode Filtering**
    - **Validates: Requirements 9.2, 11.4, 12.1, 12.2**
    - Use fast-check to generate random time blocks and display modes
    - Verify filtering logic for all modes: full_chain, keystone_focus, anchor_only, rest_of_day
    - Run 100+ iterations

  - [ ]\* 5.11 Write property test for sessionStorage round-trip
    - **Property 24: SessionStorage Round-Trip**
    - **Validates: Requirements 18.1, 18.2, 18.3**
    - Use fast-check to generate random DisplayModeState objects
    - Verify serialize → deserialize produces equivalent state
    - Run 100+ iterations

  - [ ]\* 5.12 Write integration tests for display mode switching
    - Test mode switch persists in sessionStorage
    - Test mode switch updates timeline filtering
    - Test keystone shortcut switches to keystone_focus mode
    - Test day boundary clears previous day's state
    - _Requirements: 11.5, 17.3, 18.4_

- [x] 6. Checkpoint - Verify display modes
  - Ensure all tests pass, ask the user if questions arise.

- [x] 7. Phase 4: Optional Analytics - Opt-In Usage Tracking
  - [x] 7.1 Create database migration for analytics tables
    - Create migration file in `supabase/migrations/`
    - Create `mirror_telemetry_events` table with columns: id, user_id, event_type, event_data (JSONB), timestamp, created_at
    - Add indexes: user_id + timestamp DESC, event_type, user_id + event_type
    - Enable RLS on mirror_telemetry_events table
    - Add `enable_usage_analytics BOOLEAN DEFAULT FALSE` to user_preferences table
    - _Requirements: 14.1, 14.2_

  - [x] 7.2 Extend AnalyticsService with opt-in analytics methods
    - Modify `src/lib/monitoring/analytics.ts`
    - Add `isAnalyticsEnabled()` method to check user preference
    - Add `recordAppOpen()` method (only records if analytics enabled)
    - Add `recordAnchorView()` method (only records if analytics enabled)
    - Add `recordKeystoneView()` method (only records if analytics enabled)
    - Add `recordDisplayModeSwitch()` method (only records if analytics enabled)
    - Add `recordRealityCheckRequest()` method (only records if analytics enabled)
    - Add `inferAnchorAttendance()` method (returns null if analytics disabled)
    - Add `shouldRecordCompletionMetrics()` method (checks both enable_usage_analytics AND show_completion_controls)
    - All recording methods must check `isAnalyticsEnabled()` first and silently skip if disabled
    - _Requirements: 14.2, 14.3, 14.6, 15.1, 15.2, 15.3, 15.4_

  - [x] 7.3 Create TelemetrySerializer
    - Create `src/lib/monitoring/telemetry-serializer.ts`
    - Implement `serialize()` to convert analytics events to JSON
    - Implement `deserialize()` to parse JSON to analytics events
    - Implement `validate()` to check event_type and timestamp format
    - Ensure required fields: timestamp, event_type, event_data
    - _Requirements: 23.1, 23.2, 23.3, 23.4_

  - [x] 7.4 Add analytics API endpoint with opt-in check
    - Create `src/pages/api/analytics/telemetry.ts`
    - Accept event_type and event_data in request body
    - Check user's enable_usage_analytics preference BEFORE recording
    - Return success even if analytics disabled (silently skip)
    - Validate event using TelemetrySerializer
    - Store event in mirror_telemetry_events table only if analytics enabled
    - Use `createServerAuth()` for authentication
    - Fail silently on errors (don't block user experience)
    - _Requirements: 14.2, 14.3_

  - [x] 7.5 Add felt helpful feedback API endpoint
    - Create `src/pages/api/analytics/felt-helpful.ts`
    - Accept response ('yes' | 'somewhat' | 'not_really') and date
    - Store feedback without requiring explanation
    - Update user preferences with dismissed date
    - Use `createServerAuth()` for authentication
    - _Requirements: 20.4_

  - [x] 7.6 Integrate opt-in analytics recording in MirrorUI
    - Modify `src/components/daily-plan/MirrorUI.tsx`
    - Check enable_usage_analytics preference on mount
    - Record app_open event ONLY if analytics enabled
    - Record anchor_view event ONLY if analytics enabled
    - Record keystone_view event ONLY if analytics enabled
    - Record display_mode_switch event ONLY if analytics enabled
    - Batch events and send every 30 seconds (fire-and-forget)
    - App must function identically whether analytics are enabled or disabled
    - _Requirements: 14.2, 14.3, 14.6_

  - [x] 7.7 Implement "Did this help today?" prompt
    - Create `src/components/daily-plan/FeltHelpfulPrompt.tsx`
    - Display prompt at end of day (after last anchor + 2 hours, or 10pm, or explicit completion)
    - Show once per day maximum
    - Offer three options: "Yes", "Somewhat", "Not really"
    - Record response without requiring explanation
    - Store dismissed date in user preferences
    - _Requirements: 20.1, 20.2, 20.3, 20.4, 20.5_

  - [ ]\* 7.8 Write property test for analytics serialization
    - **Property 32: Analytics Event Serialization Round-Trip**
    - **Validates: Requirements 23.5**
    - Use fast-check to generate random Optional_Usage_Analytics event objects
    - Verify serialize → deserialize produces equivalent event
    - Run 100+ iterations

  - [ ]\* 7.9 Write property test for analytics required fields
    - **Property 33: Analytics Event Required Fields**
    - **Validates: Requirements 23.2**
    - Use fast-check to generate random analytics events
    - Verify serialized JSON includes timestamp, event_type, event_data
    - Run 100+ iterations

  - [ ]\* 7.10 Write integration tests for opt-in analytics recording
    - Test analytics NOT recorded when enable_usage_analytics is false
    - Test app_open event recorded when analytics enabled
    - Test anchor_view event recorded when analytics enabled
    - Test display_mode_switch event recorded when analytics enabled
    - Test felt helpful feedback recorded (always available, separate from analytics)
    - Test analytics fails silently on errors
    - Test app functions identically with analytics disabled
    - _Requirements: 14.2, 14.3, 14.6, 20.4_

- [x] 8. Checkpoint - Verify telemetry and analytics
  - Ensure all tests pass, ask the user if questions arise.

- [-] 9. Phase 5: Polish & Testing - Comprehensive Validation
  - [x] 9.1 Implement judgment language detection test
    - Create `src/test/unit/mirror-v2/properties/judgment-language.test.ts`
    - Scan all Mirror UI component files (tsx, astro) for forbidden terms
    - Forbidden terms: "running late", "behind schedule", "missed it", "failed", "should have started"
    - Fail test if any forbidden terms found
    - Report file, line number, and term for each violation
    - _Requirements: 16.1, 16.4, 16.5, 24.2, 24.4_

  - [x] 9.2 Write property test for no warning colors
    - **Property 4: No Warning Colors**
    - **Validates: Requirements 2.4, 3.4, 19.4**
    - Use fast-check to generate random timeline states and time conditions
    - Verify no red, orange, yellow, or warning colors used in display
    - Run 100+ iterations

  - [x] 9.3 Write property test for visual state constraint
    - **Property 5: Visual State Constraint**
    - **Validates: Requirements 3.1, 3.2, 3.5**
    - Use fast-check to generate random timeline blocks
    - Verify each block has exactly one state: pending, completed, or skipped
    - Verify no time-based color changes
    - Run 100+ iterations

  - [x] 9.4 Write property test for completion controls visibility
    - **Property 6: Completion Controls Visibility**
    - **Validates: Requirements 4.3, 4.4**
    - Use fast-check to generate random preference values
    - Verify controls visible iff show_completion_controls is true
    - Run 100+ iterations

  - [x] 9.5 Write property test for duration vs clock time display
    - **Property 7: Duration vs Clock Time Display**
    - **Validates: Requirements 5.1, 5.2, 5.3, 5.4, 5.5**
    - Use fast-check to generate random time blocks with various envelope_types
    - Verify duration shown for non-anchor/non-travel blocks
    - Verify clock time shown for anchor and travel_there blocks
    - Run 100+ iterations

  - [x] 9.6 Write property test for keystone focus filtering
    - **Property 13: Keystone Focus Filtering**
    - **Validates: Requirements 9.2**
    - Use fast-check to generate random timelines with keystone
    - Verify keystone_focus mode shows only keystone and anchor blocks
    - Run 100+ iterations

  - [ ]\* 9.7 Write property test for next anchor identification
    - **Property 15: Next Anchor Identification**
    - **Validates: Requirements 12.5**
    - Use fast-check to generate random anchor sets and current times
    - Verify next anchor is first anchor after current time, sorted chronologically
    - Run 100+ iterations

  - [ ]\* 9.8 Write property test for passed anchor detection
    - **Property 16: Passed Anchor Detection**
    - **Validates: Requirements 13.1**
    - Use fast-check to generate random anchors and current times
    - Verify passed anchor detected when current time > anchor start time
    - Run 100+ iterations

  - [x] 9.9 Write property test for gentle highlight timing
    - **Property 26: Gentle Highlight Timing**
    - **Validates: Requirements 19.1, 19.2**
    - Use fast-check to generate random departure times and current times
    - Verify gentle highlight applied iff within 10 minutes of departure
    - Run 100+ iterations

  - [x] 9.10 Write property test for recovery block visibility
    - **Property 29: Recovery Block Visibility**
    - **Validates: Requirements 21.2, 21.3**
    - Use fast-check to generate random preference values
    - Verify recovery blocks visible iff show_recovery_blocks is true
    - Run 100+ iterations

  - [ ]\* 9.11 Write E2E test for complete user flow
    - Test user opens Mirror UI → sees IntentPrompt
    - Test user selects "Full morning chain" → sees complete timeline
    - Test user clicks "Can I make it?" → sees reality check results
    - Test user selects alternative → timeline updates
    - Test user switches display mode → timeline filters correctly
    - _Requirements: 11.1, 11.3, 7.1, 7.3, 11.5_

  - [ ]\* 9.12 Write E2E test for multi-anchor scenario
    - Test timeline shows next anchor with full chain
    - Test subsequent anchors collapsed (AnchorInfoCard only)
    - Test user can expand any anchor to focus on it
    - Test progressive disclosure works correctly
    - _Requirements: 12.1, 12.2, 12.3, 12.4_

  - [ ]\* 9.13 Write E2E test for no-anchor scenario
    - Test FreeActivationPrompt displayed when no anchors
    - Test user can start activation chain with flexible start time
    - Test keystone-only shortcut works
    - Test timeline displays chain without anchor/departure blocks
    - _Requirements: 10.1, 10.2, 10.3, 10.4, 10.5_

  - [ ]\* 9.14 Write E2E test for passed anchor pivot flow
    - Test system detects passed anchor
    - Test neutral pivot options displayed
    - Test user can select "rest of day" mode
    - Test timeline shows remaining anchors and activities
    - _Requirements: 13.1, 13.2, 13.3, 13.5, 13.6_

  - [ ]\* 9.15 Performance testing for display mode switching
    - Test display mode switch completes in < 100ms
    - Test reality check calculation completes in < 200ms
    - Test telemetry recording is non-blocking (< 50ms)
    - Test initial render completes in < 500ms
    - _Requirements: Performance targets from design_

  - [ ]\* 9.16 Accessibility audit of new components
    - Test keyboard navigation through all interactive elements
    - Test screen reader announces all content correctly
    - Test focus indicators visible on all controls
    - Test minimum 4.5:1 contrast ratio for text
    - Test ARIA labels present on all interactive elements
    - _Requirements: Accessibility compliance from design_

- [x] 10. Checkpoint - Verify all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 11. Integration and Wiring
  - [x] 11.1 Wire all components together in MirrorUI
    - Ensure IntentPrompt, AnchorInfoCard, DepartureWaypoint, RealityCheckPrompt, FreeActivationPrompt all integrated
    - Verify display mode state management works end-to-end
    - Verify sessionStorage persistence works across page reloads
    - Verify telemetry recording works for all events
    - _Requirements: All requirements_

  - [x] 11.2 Update MirrorUI page to use new components
    - Modify Astro page that renders MirrorUI
    - Ensure user preferences loaded and passed to components
    - Ensure authentication context available
    - Verify backward compatibility with existing plan data
    - _Requirements: All requirements_

  - [x] 11.3 Add feature flags for gradual rollout
    - Add MIRROR_V2_ENABLED flag to feature flags system
    - Add MIRROR_V2_NEUTRAL_DISPLAY flag
    - Add MIRROR_V2_FLEXIBLE_START flag
    - Add MIRROR_V2_OPTIONAL_TRACKING flag
    - Add MIRROR_V2_TELEMETRY flag
    - Configure flags for development environment initially
    - _Requirements: Migration strategy from design_

  - [x] 11.4 Update user preferences UI with transparent analytics opt-in
    - Add "Track step completion" toggle to settings
    - Add "Show recovery blocks" toggle to settings
    - Add "Keystone activity" input to settings
    - Add "Enable usage analytics" toggle to settings with transparent explanation
    - Explanation text: "We don't track your usage by default. If you'd like to help us improve the app, you can optionally enable anonymous usage analytics. This is completely optional and the app works perfectly without it."
    - Ensure preferences saved to user_preferences table
    - Make it clear that analytics are OFF by default
    - _Requirements: 4.5, 14.4, 14.5, 21.4_

  - [x] 11.5 Write integration tests for complete wiring
    - Test all components render correctly in MirrorUI
    - Test state flows correctly between components
    - Test API calls work end-to-end
    - Test preferences loaded and applied correctly
    - _Requirements: All requirements_

- [ ] 12. Final checkpoint - Complete system verification
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. Recovery V2: Seamless + Mobile/PWA + Onboarding Presets
  - [ ] 13.1 Stabilize mirror mutation flow (no full-refresh dependence)
    - Ensure complete/skip/delete/update all use resilient queue path and optimistic UI
    - Add silent reconcile after queued replay to avoid stale cards
    - Remove remaining forced full timeline reloads after local-safe actions
    - Files:
      - `src/components/daily-plan/MirrorUI.tsx`
      - `src/lib/triage/retry-handler.ts`
      - `src/components/daily-plan/DeletePlanButton.tsx`
    - _Goal: zero blank/reload loops during normal block interactions_

  - [ ] 13.2 Add timeline data integrity guardrails
    - Add runtime guard for malformed/serialized dates and missing envelope metadata
    - Fail soft with inline warning + retry action instead of crashing render tree
    - Log integrity anomalies for follow-up
    - Files:
      - `src/components/daily-plan/Timeline.tsx`
      - `src/components/daily-plan/AnchorInfoCard.tsx`
      - `src/components/daily-plan/DepartureWaypoint.tsx`
      - `src/components/daily-plan/ErrorBoundary.tsx`
    - _Goal: mirror never hard-crashes from partial payloads_

  - [ ] 13.3 Mobile-first timeline/card pass
    - Convert all mirror cards to strict mobile-first hierarchy: context → core action → optional details
    - Keep one compact sticky context bar only; remove stacked sticky layers
    - Move low-priority metadata under collapsible "Details" on small screens
    - Enforce touch targets >= 44x44 and spacing between action buttons
    - Files:
      - `src/components/daily-plan/Timeline.tsx`
      - `src/components/daily-plan/AnchorInfoCard.tsx`
      - `src/components/daily-plan/DepartureWaypoint.tsx`
      - `src/components/daily-plan/MirrorHeader.tsx`
    - _Goal: no horizontal squeeze, no accidental taps, high scanability on phones_

  - [ ] 13.4 Small-screen typography and spacing tokens
    - Define and apply explicit mobile typographic scale for Mirror cards
    - Reduce dense text blocks in timeline rows and normalize vertical rhythm
    - Add small-screen-specific utility classes for card padding and label stacks
    - Files:
      - `src/components/daily-plan/Timeline.tsx`
      - `src/components/daily-plan/AnchorInfoCard.tsx`
      - `src/components/daily-plan/DepartureWaypoint.tsx`
      - `src/styles/messy-theme.css`
    - _Goal: readable at a glance on 320-430px widths_

  - [ ] 13.5 PWA resilient-online UX hardening
    - Surface explicit sync states: Offline, Queued, Syncing, Synced
    - Retry and replay queued actions on reconnect/foreground without user action
    - Ensure install prompt is non-intrusive and dismissible
    - Keep scope as resilient-online (no full offline editing)
    - Files:
      - `src/lib/pwa/service-worker.ts`
      - `public/sw.js`
      - `src/components/pwa/InstallPrompt.tsx`
      - `src/components/daily-plan/MirrorUI.tsx`
    - _Goal: predictable behavior during flaky network conditions_

  - [ ] 13.6 Remove unstable legacy surface from active paths
    - Verify Degrade Plan controls are absent from Mirror and Daily Plan primary flows
    - Remove or gate legacy dead-end actions that trigger stale states
    - Files:
      - `src/components/daily-plan/DailyPlanPageContent.tsx`
      - `src/components/daily-plan/MirrorUI.tsx`
      - `src/components/daily-plan/MirrorHeader.tsx`
    - _Goal: reduce confusing branches and stale UI paths_

  - [ ] 13.7 Onboarding Phase 2 prompt and trigger
    - Trigger phase 2 after first successful day or after first 1-2 mirror sessions
    - Build explicit phase-2 prompt UI with only behavior-mapped questions
    - Persist answers and derived defaults via onboarding presets API
    - Files:
      - `src/pages/onboarding.astro`
      - `src/pages/api/onboarding/presets.ts`
      - `src/pages/api/user/complete-onboarding.ts`
      - `src/lib/onboarding/preset-defaults.ts`
    - _Goal: remove assumption drift by collecting high-signal intent early_

  - [ ] 13.8 Onboarding presets: required behavior mapping matrix
    - Document and enforce mapping of each onboarding question to planner/mirror knobs
    - Reject or remove descriptive-only questions with no runtime effect
    - Include mappings for:
      - lateness policy (`max_late_minutes_default`, strict vs alternatives)
      - success mode (`attendance`, `partial_attendance`, `activation_only`)
      - prompt intensity (`minimal`, `balanced`, `explicit`)
      - routine flexibility (fixed order vs flexible cluster)
      - exit-gate essentials
    - Files:
      - `.kiro/specs/mirror-v2-cognitive-prosthetic/requirements.md`
      - `.kiro/specs/mirror-v2-cognitive-prosthetic/design.md`
      - `src/lib/onboarding/preset-defaults.ts`
    - _Goal: every onboarding answer must produce deterministic behavior changes_

  - [ ] 13.9 Travel profile UX clarity and slot semantics
    - Add clear helper copy: travel minutes must include total door-to-destination duration
    - Show slot result consistently: selected slot, next feasible slot, latest viable arrival
    - Confirm home/same-location suppression in UI and generation paths
    - Files:
      - `src/pages/onboarding.astro`
      - `src/pages/settings.astro`
      - `src/components/daily-plan/DepartureWaypoint.tsx`
      - `src/lib/travel/location-travel-profiles.ts`
      - `src/lib/chains/chain-generator.ts`
    - _Goal: reduce user confusion and “random travel block” perception_

  - [ ] 13.10 API contract parity between Daily Plan and Mirror
    - Verify both `/api/daily-plan/today` and `/api/daily-plan/mirror` expose identical timing/envelope semantics
    - Enforce no synthetic V1 reconstruction paths for active rendering
    - Add contract test snapshots for both endpoints from same seed plan
    - Files:
      - `src/pages/api/daily-plan/today.ts`
      - `src/pages/api/daily-plan/mirror.ts`
      - `src/lib/daily-plan/time-signals.ts`
      - `src/lib/daily-plan/chain-reconstruction.ts`
    - _Goal: eliminate cross-surface drift_

  - [ ] 13.11 Mobile + resilience integration test suite
    - Add integration tests for queued mutation replay and optimistic UI continuity
    - Add viewport-based tests for 320/375/430 widths:
      - single sticky bar
      - stacked card layout
      - visible/tappable controls
    - Add regression test for serialized date payloads across mirror cards
    - Files:
      - `src/test/integration/mirror-v2/`
      - `src/test/unit/mirror-v2/`
      - `src/test/e2e/mirror-ui/`
    - _Goal: block regressions that break mobile or flaky-network behavior_

  - [ ] 13.12 Release checklist for this recovery phase
    - Run targeted test matrix before merge:
      - mirror-v2 integration
      - mobile viewport checks
      - queue replay tests
      - onboarding phase 1/2 flow tests
    - Verify migrations applied and RLS policies active:
      - `location_travel_profiles`
      - `onboarding_presets`
    - Add rollout note and fallback flags in deployment checklist
    - Files:
      - `docs/DEPLOYMENT_CHECKLIST_TRIAGE_MIRROR.md`
      - `docs/RUNBOOK_TRIAGE_MIRROR.md`
      - `supabase/migrations/20260307000000_location_travel_profiles_and_onboarding_presets.sql`
    - _Goal: safe rollout without user-facing regressions_

## Notes

- Tasks marked with `*` are optional testing tasks and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at phase boundaries
- Property tests validate universal correctness properties using fast-check with 100+ iterations
- Unit tests validate specific examples and edge cases
- Integration tests validate component interactions and API flows
- E2E tests validate complete user journeys
- All new code follows existing MeshOS patterns: TypeScript + React, Tailwind semantic tokens, createServerAuth() for API routes
- Feature flags enable gradual rollout and safe rollback
- Backward compatibility maintained with existing chain generation and plan builder systems
- **CRITICAL**: ALL usage analytics are opt-in by default (OFF). The app must function identically whether analytics are enabled or disabled. This is an ethical requirement to prevent surveillance and dependency.

## Implementation Strategy

This implementation follows a phased approach to minimize risk:

1. **Phase 1 (Foundation)**: Remove harmful patterns first - this provides immediate value by reducing guilt and stress
2. **Phase 2 (User-Initiated Support)**: Add reality check and flexible start times - empowers users with agency
3. **Phase 3 (Display Modes)**: Add intent-based filtering - provides flexibility for different needs
4. **Phase 4 (Optional Analytics)**: Add opt-in usage analytics - enables data-driven improvements ONLY for users who consent
5. **Phase 5 (Polish)**: Comprehensive testing and validation - ensures quality and correctness

Each phase builds on the previous, with checkpoints to verify stability before proceeding. Feature flags allow gradual rollout to users, starting with internal testing, then beta users, then gradual percentage-based rollout.

The design maintains backward compatibility with existing systems, so V1 and V2 can coexist during migration. All database changes are additive (new columns, new tables), never breaking existing schemas.

## Testing Philosophy

This feature uses a dual testing approach:

- **Unit tests**: Verify specific examples, edge cases, and error conditions
- **Property tests**: Verify universal properties across all possible inputs using fast-check

Together, these provide comprehensive coverage: unit tests catch concrete bugs, property tests verify general correctness. All property tests run 100+ iterations to explore the input space thoroughly.

The judgment language detection test is particularly important - it acts as a guardrail to prevent harmful language from creeping back into the UI over time.

## Success Metrics

After implementation, success will be measured by:

- Zero automatic triage activations (verified by system logs)
- Increased reality check usage (user-initiated support)
- Diverse display mode usage (flexibility meeting different needs)
- High felt helpful feedback scores (qualitative validation)
- Maintained or improved user retention (effectiveness)
- Reduced user-reported stress and guilt (qualitative feedback)
- **Ethical compliance**: Analytics opt-in rate reflects genuine user choice, not coercion

These metrics align with the core goal: transform Mirror from a judgment-based tracker into a supportive cognitive prosthetic that respects user agency and privacy.
