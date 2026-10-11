# Requirements Document

## Introduction

This feature extends MeshOS's existing V2 chain-based planning system to handle day-breaking scenarios gracefully. When plans fall apart mid-day (late wake, missed anchor, overwhelm), users need triage prompts, simple interactive views with inline editing, and the ability to track progress and recalculate from "now" without navigating complex UI. This builds on top of the existing ChainGenerator, WakeRampGenerator, and commitment envelope architecture without replacing core planning logic. The Mirror UI provides state declaration, completion tracking, and inline editing capabilities to support users with executive dysfunction who need flexibility and real-time plan adaptation.

## Glossary

- **Triage_Mode**: A decision prompt system that activates when available runway is insufficient for planned activities
- **Mirror_UI**: A simplified, interactive vertical timeline view at `/daily-plan/mirror` showing current plan with inline editing and completion tracking
- **Stateless_Recalc**: Optional user preference to regenerate the daily plan from current time on page load
- **Runway**: Time remaining between current moment and next anchor start time
- **Required_Duration**: Total time needed for all steps in a commitment envelope (prep + travel_there + anchor + travel_back + recovery)
- **Keystone_Activity**: The most critical activity in a chain that should be protected during triage
- **Intent_Signal**: A neutral banner shown after 7+ day absence asking if user needs a plan
- **ChainGenerator**: Existing V2 system component that generates backward chains from anchors
- **Commitment_Envelope**: Existing V2 structure with five steps: prep → travel_there → anchor → travel_back → recovery
- **DailyContext**: Existing V2 component that aggregates D-1 habit data (optional, graceful fallback)
- **State_Declaration**: User input indicating their current position relative to planned activities (starting, ready for anchor, mid-chain, at anchor, missed, or just checking)
- **Completion_State**: Persistent record of which time blocks are completed, skipped, or pending
- **Deadline_Banner**: Prominent UI element showing "Complete by [TIME]" for each commitment envelope
- **Inline_Editor**: UI component allowing direct editing of anchors and chain steps without navigation

## Requirements

### Requirement 1: Runway Calculation

**User Story:** As a user who wakes late or checks my plan mid-day, I want the system to calculate if I have enough time for planned activities, so that I can make informed decisions about what to protect.

#### Acceptance Criteria

1. WHEN the Mirror_UI loads, THE TimePhysics SHALL calculate runway as (next_anchor_start_time - current_time)
2. WHEN a commitment envelope exists for the next anchor, THE TimePhysics SHALL calculate required_duration as sum of (prep_duration + travel_there_duration + anchor_duration + travel_back_duration + recovery_duration)
3. THE runway calculation SHALL complete within 100ms of page load
4. WHEN no anchors exist for the remainder of the day, THE TimePhysics SHALL return null for runway
5. THE runway value SHALL be recalculated on each page load, not cached

### Requirement 2: Triage Mode Activation

**User Story:** As a user running late, I want to see a triage prompt when I don't have enough time, so that I can quickly decide what to protect or skip.

#### Acceptance Criteria

1. WHEN runway is less than required_duration, THE Triage_Mode SHALL activate within 5 seconds of page load
2. WHEN runway is greater than or equal to required_duration, THE Triage_Mode SHALL remain inactive
3. WHEN Triage_Mode activates, THE Mirror_UI SHALL display a triage prompt above the timeline
4. THE triage prompt SHALL identify the keystone_activity from the commitment envelope
5. WHEN no commitment envelope exists, THE Triage_Mode SHALL not activate

### Requirement 3: Triage Decision Options

**User Story:** As a user in triage mode, I want clear options for handling insufficient runway, so that I can quickly adapt my plan without complex navigation.

#### Acceptance Criteria

1. WHEN Triage_Mode is active, THE Triage_Prompt SHALL present three options: "Protect Keystone", "Skip Anchor", "Recalculate"
2. WHEN user selects "Protect Keystone", THE System SHALL preserve only the keystone_activity and anchor, removing prep and recovery steps
3. WHEN user selects "Skip Anchor", THE System SHALL mark the anchor as skipped and remove its commitment envelope from the timeline
4. WHEN user selects "Recalculate", THE System SHALL trigger a stateless recalc from current time
5. THE triage decision SHALL persist for the current session only, not saved to database

### Requirement 4: Mirror UI Route

**User Story:** As a user who is overwhelmed, I want a simple interactive view of my plan, so that I can see what's next and make quick adjustments without complex navigation.

#### Acceptance Criteria

1. THE System SHALL serve Mirror_UI at route `/daily-plan/mirror`
2. WHEN Mirror_UI loads, THE System SHALL read existing daily_plans and time_blocks data for current user and date
3. THE Mirror_UI SHALL display time blocks in vertical chronological order with inline editing capabilities
4. THE Mirror_UI SHALL include completion controls, edit icons, and state declaration prompts
5. THE Mirror_UI SHALL load and render within 500ms for plans with up to 20 time blocks

### Requirement 5: Mirror UI Content Display

**User Story:** As a user viewing the mirror UI, I want to see essential information for each time block with completion controls and edit options, so that I know what to do, when, and can adjust as needed.

#### Acceptance Criteria

1. FOR EACH time block, THE Mirror_UI SHALL display start_time, end_time, activity_name, block_type, and completion controls
2. WHEN a time block is part of a commitment envelope, THE Mirror_UI SHALL display the envelope step label (prep, travel_there, anchor, travel_back, recovery) with edit icon
3. WHEN a time block represents the wake ramp, THE Mirror_UI SHALL display "Wake Ramp" with duration
4. WHEN current time falls within a time block, THE Mirror_UI SHALL highlight that block with visual emphasis
5. THE Mirror_UI SHALL display a "current time" indicator line at the user's current position in the timeline

### Requirement 6: Stateless Recalc Preference

**User Story:** As a user who wants fresh plans, I want to enable automatic recalculation on page load, so that my plan always reflects current time without manual action.

#### Acceptance Criteria

1. THE System SHALL store a boolean preference `recalc_on_open` in the `user_preferences.preferences` JSONB field
2. WHEN `recalc_on_open` is true and Mirror_UI loads, THE System SHALL trigger plan regeneration from current time before rendering
3. WHEN `recalc_on_open` is false, THE Mirror_UI SHALL display the existing plan without regeneration
4. THE default value for `recalc_on_open` SHALL be false for all users
5. WHEN recalc is triggered, THE System SHALL use existing `generateDailyPlan()` function with current time as effective wake time

### Requirement 7: Manual Recalc Trigger

**User Story:** As a user whose plan has broken mid-day, I want to manually trigger recalculation, so that I can get a fresh plan from now without changing my preferences.

#### Acceptance Criteria

1. THE Mirror_UI SHALL display a "Recalculate from Now" button at the top of the timeline
2. WHEN user clicks "Recalculate from Now", THE System SHALL call `generateDailyPlan()` with current time as effective wake time
3. WHEN recalculation completes, THE Mirror_UI SHALL refresh to display the new plan
4. THE recalculation SHALL preserve the user's original wake_time and sleep_time preferences for future days
5. WHEN recalculation is in progress, THE button SHALL display a loading state and be disabled

### Requirement 8: Recalc Integration with Existing Plan Builder

**User Story:** As a developer, I want recalculation to reuse existing plan generation logic, so that behavior remains consistent and maintainable.

#### Acceptance Criteria

1. WHEN stateless recalc is triggered, THE System SHALL call the existing `POST /api/daily-plan/generate` endpoint
2. THE recalc request SHALL include current time as `wakeTime`, user's stored `sleepTime`, and current `energyState`
3. WHEN recalc completes, THE System SHALL replace the existing daily_plan record for the current date
4. THE recalc SHALL use existing ChainGenerator, WakeRampGenerator, and LocationStateTracker without modification
5. WHEN DailyContext data is unavailable, THE recalc SHALL proceed with graceful fallback as existing system does

### Requirement 9: Intent Signal After Long Absence

**User Story:** As a user returning after a week away, I want a neutral prompt asking if I need a plan, so that I can re-engage without pressure.

#### Acceptance Criteria

1. WHEN user has no daily_plan record for 7 or more consecutive days and opens the app, THE System SHALL display an Intent_Signal banner
2. THE Intent_Signal SHALL present two options: "Yes, generate plan" and "No, not today"
3. WHEN user selects "Yes, generate plan", THE System SHALL navigate to the plan generation flow with onboarding presets
4. WHEN user selects "No, not today", THE Intent_Signal SHALL dismiss and not reappear until next app open
5. THE Intent_Signal SHALL appear above the Mirror_UI content, not blocking the view

### Requirement 10: Triage Mode Keystone Identification

**User Story:** As a user in triage mode, I want the system to identify the most important activity to protect, so that I can make quick decisions without analysis paralysis.

#### Acceptance Criteria

1. WHEN identifying keystone_activity, THE System SHALL prioritize in order: anchor activity, prep activity, recovery activity
2. FOR anchor types "class" or "seminar", THE keystone_activity SHALL be the anchor itself
3. FOR anchor types "appointment", THE keystone_activity SHALL be the prep step if prep_duration exceeds 15 minutes, otherwise the anchor
4. THE keystone identification SHALL complete within 50ms
5. WHEN commitment envelope has only anchor step remaining, THE keystone_activity SHALL be the anchor

### Requirement 11: Mirror UI Navigation

**User Story:** As a user in the mirror UI, I want to access settings, return to full view, and optionally lock editing, so that I can adjust preferences or prevent accidental taps.

#### Acceptance Criteria

1. THE Mirror_UI SHALL display a navigation link to `/settings` in the header
2. THE Mirror_UI SHALL display a navigation link to `/daily-plan` (full view) in the header
3. THE Mirror_UI SHALL display an "Edit Mode" toggle that locks/unlocks inline editing when toggled
4. WHEN user navigates away from Mirror_UI, THE System SHALL preserve any triage decisions and completion state for the current session
5. THE navigation links SHALL be accessible via keyboard navigation
6. THE Mirror_UI SHALL display the user's current token balance in the header

### Requirement 12: Recalc Performance Constraints

**User Story:** As a user triggering recalculation, I want it to complete quickly, so that I can adapt my plan without long waits.

#### Acceptance Criteria

1. WHEN stateless recalc is triggered with 0-3 anchors, THE System SHALL complete plan generation within 2 seconds
2. WHEN stateless recalc is triggered with 4-6 anchors, THE System SHALL complete plan generation within 4 seconds
3. WHEN plan generation exceeds timeout thresholds, THE System SHALL return an error message and preserve the existing plan
4. THE recalc SHALL reuse existing database queries and not introduce N+1 query patterns
5. WHEN recalc fails, THE Mirror_UI SHALL display an error message and allow retry

### Requirement 13: Settings UI for Recalc Preference

**User Story:** As a user who wants control over recalculation behavior, I want to toggle the auto-recalc preference in settings, so that I can customize when plans regenerate.

#### Acceptance Criteria

1. THE Settings page SHALL display a toggle control labeled "Recalculate plan on open"
2. WHEN user toggles the control, THE System SHALL update `user_preferences.preferences.recalc_on_open` in the database
3. THE toggle state SHALL reflect the current value of `recalc_on_open` on page load
4. THE Settings page SHALL display explanatory text: "When enabled, your plan regenerates from current time each time you open the app"
5. THE preference update SHALL complete within 500ms and display confirmation feedback

### Requirement 14: Triage Mode Accessibility

**User Story:** As a user with accessibility needs, I want triage prompts to be keyboard navigable and screen-reader friendly, so that I can make decisions without a mouse.

#### Acceptance Criteria

1. THE Triage_Prompt buttons SHALL be focusable via keyboard tab navigation
2. THE Triage_Prompt SHALL include ARIA labels describing each option
3. WHEN Triage_Mode activates, THE System SHALL announce the triage state to screen readers
4. THE Triage_Prompt buttons SHALL be activatable via Enter or Space key
5. THE Triage_Prompt SHALL maintain focus trap until user makes a decision or dismisses

### Requirement 15: Mirror UI Responsive Design

**User Story:** As a mobile user, I want the mirror UI to work well on small screens, so that I can check my plan on the go.

#### Acceptance Criteria

1. THE Mirror_UI SHALL render correctly on viewport widths from 320px to 1920px
2. WHEN viewport width is below 640px, THE Mirror_UI SHALL stack time block information vertically
3. THE Mirror_UI SHALL use touch-friendly button sizes (minimum 44x44px) on mobile devices
4. THE current time indicator SHALL remain visible when scrolling on mobile devices
5. THE Mirror_UI SHALL load without horizontal scrolling on any supported viewport width

### Requirement 16: State Declaration on App Open

**User Story:** As a user opening the app at any time, I want to declare my current state, so the system knows whether I'm starting, mid-chain, at anchor, or missed it, and shows only relevant information.

#### Acceptance Criteria

1. WHEN user opens Mirror_UI and current time is within 2 hours of any anchor, THE System SHALL display a State_Declaration_Prompt
2. THE State_Declaration_Prompt SHALL present 6 options: "Starting my day", "Ready for anchor", "Mid-chain", "At anchor", "Missed it", "Just checking"
3. WHEN user selects "Starting my day", THE System SHALL show full activation chain from current time and mark all steps as pending
4. WHEN user selects "Ready for anchor", THE System SHALL hide all activation chain steps and show only departure time, travel, anchor, and recovery
5. WHEN user selects "Mid-chain", THE System SHALL prompt user to select which step they're on, then mark prior steps as completed
6. WHEN user selects "At anchor", THE System SHALL mark all prep and travel_there steps as completed and highlight anchor block
7. WHEN user selects "Missed it", THE System SHALL mark anchor and all related steps as skipped
8. WHEN user selects "Just checking", THE System SHALL display plan without state changes
9. THE State_Declaration_Prompt SHALL be dismissible and not block view of timeline
10. WHEN user selects "Ready for anchor" and current time is past departure time, THE System SHALL trigger triage mode

### Requirement 17: Chain Step Completion Tracking

**User Story:** As a user executing my chain, I want to mark steps as done or skipped, so the system knows my progress and can adjust remaining time.

#### Acceptance Criteria

1. EACH chain step in Mirror_UI SHALL display a completion control with tap-to-mark-done and tap-to-skip options
2. WHEN user marks a step as done, THE System SHALL update time_blocks.status to 'completed' and record completion timestamp
3. WHEN user marks a step as skipped, THE System SHALL update time_blocks.status to 'skipped' and record skip reason
4. THE Mirror_UI SHALL display visual progress: completed steps in green, skipped in gray, pending in default color, current highlighted
5. WHEN a step is marked done or skipped, THE System SHALL recalculate remaining time until deadline

### Requirement 18: Inline Anchor Editing

**User Story:** As a user whose plans change, I want to edit anchor times and details directly in Mirror UI, so I don't need to navigate away to make adjustments.

#### Acceptance Criteria

1. EACH anchor block in Mirror_UI SHALL display an edit icon
2. WHEN user taps edit icon, THE System SHALL display an inline editor with fields for time, location, and duration
3. WHEN user saves anchor edits, THE System SHALL regenerate the commitment envelope with new timing
4. THE inline editor SHALL validate that new anchor time does not conflict with other anchors
5. WHEN anchor edit causes chain overlap, THE System SHALL display a warning and offer to recalculate full plan

### Requirement 19: Inline Chain Step Editing

**User Story:** As a user who needs flexibility, I want to adjust chain step durations or add custom steps, so my plan matches my actual needs.

#### Acceptance Criteria

1. EACH chain step in Mirror_UI SHALL display a duration badge that is tappable
2. WHEN user taps duration badge, THE System SHALL display a duration picker with 5-120 minutes in 5-minute increments
3. WHEN user changes step duration, THE System SHALL recalculate all subsequent step times and the "Complete by" deadline
4. THE Mirror_UI SHALL display an "Add step" button between existing steps
5. WHEN user adds a custom step, THE System SHALL insert it into the chain and adjust timing

### Requirement 20: Quick Anchor Add and Delete

**User Story:** As a user whose commitments change, I want to quickly add or remove anchors, so my plan stays current without full regeneration.

#### Acceptance Criteria

1. THE Mirror_UI SHALL display a "+" button at the top to add new anchors
2. WHEN user taps "+", THE System SHALL display a quick-add form with fields for title, time, and optional location
3. WHEN user saves new anchor, THE System SHALL generate a commitment envelope and insert into timeline
4. EACH anchor block SHALL display a delete icon
5. WHEN user deletes an anchor, THE System SHALL remove its commitment envelope and recalculate remaining timeline

### Requirement 21: Prominent Time Deadline Display

**User Story:** As a user executing a chain, I want to see the "Complete by" deadline prominently, so I know if I'm on track without mental math.

#### Acceptance Criteria

1. EACH commitment envelope in Mirror_UI SHALL display a deadline banner showing "Complete by [TIME]"
2. THE deadline banner SHALL be positioned above the first chain step in the commitment envelope
3. WHEN current time exceeds deadline, THE banner SHALL change color to indicate lateness
4. THE deadline banner SHALL show time remaining in human-readable format such as "45 mins left"
5. WHEN user is on track, THE banner SHALL display in neutral color; when late, in warning color

### Requirement 22: Chain Start Time Visibility

**User Story:** As a user planning my morning, I want to see when I need to start my chain, so I can time my wake-up or current activity accordingly.

#### Acceptance Criteria

1. EACH commitment envelope SHALL display a "Start at [TIME]" label at the top
2. THE start time SHALL be calculated as first_step_start_time from the commitment envelope
3. WHEN current time is before start time, THE label SHALL show countdown such as "Start in 23 mins"
4. WHEN current time is after start time, THE label SHALL show how late such as "Started 12 mins ago"
5. THE start time label SHALL be visually distinct from the deadline banner

### Requirement 23: Mid-Chain State Persistence

**User Story:** As a user who closes and reopens the app mid-chain, I want my completion state to persist, so I don't lose progress.

#### Acceptance Criteria

1. WHEN user marks steps as done or skipped, THE System SHALL persist status to time_blocks table immediately
2. WHEN user reopens Mirror_UI, THE System SHALL restore completion state from database
3. THE completion state SHALL persist across browser sessions and device switches
4. WHEN user triggers recalculation, THE System SHALL preserve completion state for already-done steps
5. THE System SHALL not re-prompt State_Declaration if user has already declared state within the last 30 minutes
