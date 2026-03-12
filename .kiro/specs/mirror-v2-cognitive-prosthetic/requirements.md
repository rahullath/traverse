# Requirements Document: Mirror V2 - Cognitive Prosthetic

## Introduction

Mirror V2 transforms the daily plan interface from a judgment-based plan tracker into a cognitive prosthetic for executive dysfunction. The current Mirror UI (V1) contains harmful patterns that create guilt and stress: automatic "you're running late" warnings, deadline countdowns with red colors, forced completion tracking, and fixed backward-calculated start times. Mirror V2 removes these judgment-based patterns and replaces them with supportive scaffolding that asks "What do you need?" instead of "Where are you?", shows neutral information instead of deadlines, allows flexible start times, makes completion tracking optional, and focuses on activation (keystone) rather than full adherence.

## Glossary

- **Mirror_UI**: The primary interface component that displays the daily plan and chain execution timeline
- **Triage_System**: The current automatic warning system that activates when runway < required_duration
- **Keystone**: The most critical activity in a chain that unlocks the day (e.g., shower, meds)
- **Anchor**: A fixed external commitment (class, appointment, meeting) with a specific time
- **Chain**: A sequence of activities generated backward from an anchor, including prep, travel, anchor, and recovery
- **Commitment_Envelope**: The structured container for chain steps (prep → travel_there → anchor → travel_back → recovery)
- **Runway**: Time available between current moment and next anchor start time
- **Required_Duration**: Total time needed to complete all chain steps before an anchor
- **Display_Mode**: User-selected view configuration (full_chain, keystone_focus, reality_check, anchor_only, rest_of_day)
- **Reality_Check**: User-initiated assessment showing what activities are possible given current time
- **Departure_Waypoint**: The "Leave by" time block showing when user must depart for an anchor
- **Optional_Usage_Analytics**: Engagement metrics that users can optionally enable to help improve the app (app opens, views, inferred attendance). Default: OFF. Requires explicit opt-in.
- **Completion_Tracking**: Optional checkbox-based system for marking activities as done
- **Intent_Prompt**: User interface asking "What do you need?" to determine display mode
- **Free_Activation_Mode**: Display mode for days without anchors, showing only the activation chain
- **AnchorInfoCard**: Neutral information display showing "Anchor at [time]" without judgment
- **ChainStartSelector**: Interface allowing users to choose when to begin their chain (now, in X minutes, custom, when ready)
- **Session**: A continuous period of app usage within the same calendar day, ending when the user closes the browser tab or navigates away, or when the calendar day changes (midnight in user's timezone)
- **Gentle_Highlight**: A subtle visual emphasis using slightly bolder text weight (font-weight: 600) or a soft accent border (2px solid with theme accent color at 40% opacity), without using red, orange, or alarm colors
- **Recovery_Block**: An optional rest period after an anchor, displayed as a neutral "Rest" time block that users can show or hide via display mode preferences
- **End_of_Day**: The time when the last anchor of the day has passed and at least 2 hours have elapsed, or when the user explicitly marks the day as complete, or at 10:00 PM (user's local time), whichever comes first

## Requirements

### Requirement 1: Remove Automatic Triage Activation

**User Story:** As a user with executive dysfunction, I want triage warnings to be user-initiated rather than automatic, so that I don't experience judgment and stress from unsolicited "you're running late" messages.

#### Acceptance Criteria

1. WHEN runway is less than required_duration, THE Mirror_UI SHALL NOT automatically display the Triage_System prompt
2. THE Mirror_UI SHALL provide a "Can I make it?" button for user-initiated Reality_Check
3. WHEN the user activates the "Can I make it?" button, THE Mirror_UI SHALL display Reality_Check results
4. THE Triage_System logic SHALL remain available for user-initiated Reality_Check calculations
5. THE Mirror_UI SHALL NOT change colors or display warnings based on runway calculations without user request

### Requirement 2: Replace Deadline Displays with Neutral Information

**User Story:** As a user with executive dysfunction, I want to see anchor times as neutral information rather than deadlines with countdowns, so that I receive scaffolding without judgment.

#### Acceptance Criteria

1. THE Mirror_UI SHALL display anchors using AnchorInfoCard showing "Anchor at [time]" format
2. THE AnchorInfoCard SHALL show time remaining in neutral format "(in X hours)" without countdown timers
3. THE Mirror_UI SHALL NOT display "Complete by" deadline banners
4. THE AnchorInfoCard SHALL use neutral colors without red or warning states
5. WHEN displaying time remaining, THE AnchorInfoCard SHALL present information without urgency indicators

### Requirement 3: Neutralize Timeline Visual States

**User Story:** As a user with executive dysfunction, I want timeline blocks to use neutral colors, so that I don't experience visual signals of failure when time passes.

#### Acceptance Criteria

1. THE Timeline SHALL NOT change block colors based on current time relative to planned start time
2. THE Timeline SHALL use only three visual states: pending (neutral), completed (green), skipped (gray)
3. THE Timeline SHALL NOT display "late" or "behind schedule" visual indicators
4. THE Timeline SHALL NOT use red or warning colors for time-based states
5. WHEN current time exceeds a block's planned start time, THE Timeline SHALL maintain neutral pending state

### Requirement 4: Make Completion Tracking Optional

**User Story:** As a user with executive dysfunction, I want completion tracking to be hidden by default, so that the timeline serves as visual scaffolding rather than a mandatory tracker.

#### Acceptance Criteria

1. THE Mirror_UI SHALL hide completion checkboxes and buttons by default
2. THE User_Preferences SHALL include a show_completion_controls setting with default value false
3. WHEN show_completion_controls is false, THE Timeline SHALL display blocks without completion controls
4. WHEN show_completion_controls is true, THE Timeline SHALL display completion checkboxes and buttons
5. THE Settings interface SHALL provide a "Track step completion" toggle for show_completion_controls

### Requirement 5: Display Durations Instead of Clock Times for Chain Steps

**User Story:** As a user with executive dysfunction, I want chain steps to show durations rather than clock times, so that I see the sequence without feeling pressure from specific times.

#### Acceptance Criteria

1. THE Timeline SHALL display chain step blocks with duration format "X min" instead of clock times
2. THE Timeline SHALL display clock times only for Anchor blocks and Departure_Waypoint blocks
3. WHEN a block is part of a Commitment_Envelope with envelope_type not equal to "anchor" or "travel_there", THE Timeline SHALL show duration only
4. WHEN a block has envelope_type equal to "anchor", THE Timeline SHALL show clock time
5. WHEN a block has envelope_type equal to "travel_there", THE Timeline SHALL show clock time as Departure_Waypoint

### Requirement 6: Prominent Departure Waypoint Display

**User Story:** As a user with executive dysfunction, I want the "Leave by" time to be highly prominent, so that I have a clear critical waypoint while other chain steps remain flexible.

#### Acceptance Criteria

1. THE Mirror_UI SHALL create a DepartureWaypoint component for travel_there blocks
2. THE DepartureWaypoint SHALL display "Leave by [time]" in larger text than chain steps
3. THE DepartureWaypoint SHALL show both clock time and countdown "(in X hours Y minutes)"
4. THE DepartureWaypoint SHALL use visual hierarchy: Anchor time (largest) → Departure time (prominent) → Chain steps (smaller)
5. THE DepartureWaypoint SHALL use neutral styling without red or warning colors until departure time is within 10 minutes

### Requirement 7: Implement Reality Check Mode

**User Story:** As a user with executive dysfunction, I want to request a reality check showing what I can accomplish, so that I receive neutral options rather than automatic warnings.

#### Acceptance Criteria

1. THE Mirror_UI SHALL provide a user-initiated Reality_Check button
2. WHEN the user activates Reality_Check, THE Reality_Check_Service SHALL calculate which chain steps fit within available runway
3. THE Reality_Check_Prompt SHALL display possible steps in neutral language "You have time for: [steps]"
4. THE Reality_Check_Prompt SHALL offer alternative options "Or: [simplified options]"
5. THE Reality_Check_Prompt SHALL NOT use judgment language such as "late", "behind", or "missed"

### Requirement 8: Flexible Chain Start Time Selection

**User Story:** As a user with executive dysfunction, I want to choose when to start my chain, so that I have control over timing rather than being told when I "should have started."

#### Acceptance Criteria

1. THE Mirror_UI SHALL display a ChainStartSelector when the user opens the interface
2. THE ChainStartSelector SHALL offer options: "Now", "In 10 minutes", "In 30 minutes", "Custom time", "When ready"
3. WHEN the user selects "When ready", THE Timeline SHALL display chain sequence without clock times
4. WHEN the user selects a start time, THE Mirror_UI SHALL regenerate the timeline from the chosen start point
5. THE ChainStartSelector SHALL store the user's last selected start mode in session state

### Requirement 9: Keystone-Focus Display Mode

**User Story:** As a user with executive dysfunction, I want to view only the keystone activity and anchor, so that I can focus on the essential activation step without being overwhelmed.

#### Acceptance Criteria

1. THE Mirror_UI SHALL provide a "Just show keystone" display mode option
2. WHEN keystone_focus mode is active, THE Timeline SHALL display only the Keystone block and Anchor block
3. THE Mirror_UI SHALL identify the Keystone using existing Triage_System keystone identification logic
4. THE Mirror_UI SHALL provide a toggle to switch between full_chain and keystone_focus modes
5. THE Timeline SHALL visually emphasize the Keystone block with a distinctive indicator

### Requirement 10: Free Activation Mode for No-Anchor Days

**User Story:** As a user with executive dysfunction, I want to see my activation chain on days without anchors, so that I receive scaffolding support even without external commitments.

#### Acceptance Criteria

1. WHEN no Anchor blocks exist for the current day, THE Mirror_UI SHALL detect the no-anchor condition
2. THE Mirror_UI SHALL display a FreeActivationPrompt asking "No anchors today. Want to run your activation chain?"
3. THE FreeActivationPrompt SHALL offer ChainStartSelector options for flexible start times
4. WHEN Free_Activation_Mode is active, THE Timeline SHALL display chain steps without Anchor or Departure_Waypoint blocks
5. THE Timeline SHALL emphasize the Keystone as the primary daily goal in Free_Activation_Mode

### Requirement 11: Intent-Based Display Mode Selection

**User Story:** As a user with executive dysfunction, I want to be asked "What do you need?" rather than "Where are you?", so that the interface supports my needs rather than tracking my position.

#### Acceptance Criteria

1. THE Mirror_UI SHALL display an Intent_Prompt when the user opens the interface
2. THE Intent_Prompt SHALL display the exact text "What do you need?" as the primary heading
3. THE Intent_Prompt SHALL offer options: "Full morning chain", "Just keystone + anchor", "Check if I can make it"
4. WHEN the user selects a Display_Mode, THE Mirror_UI SHALL apply the corresponding timeline filter
5. THE Mirror_UI SHALL allow switching between Display_Mode options during the session

### Requirement 12: Multi-Anchor Progressive Disclosure

**User Story:** As a user with executive dysfunction, I want to see my next anchor prominently with subsequent anchors collapsed, so that I can focus on one commitment at a time without being overwhelmed.

#### Acceptance Criteria

1. WHEN multiple Anchor blocks exist for the current day, THE Mirror_UI SHALL display the next Anchor with full chain
2. THE Mirror_UI SHALL display subsequent Anchor blocks in collapsed format showing only anchor time
3. WHEN the user taps a collapsed Anchor, THE Mirror_UI SHALL expand that Anchor's chain and collapse the previously expanded Anchor
4. THE Mirror_UI SHALL provide a "Show all" option to expand all Anchor chains simultaneously
5. THE Mirror_UI SHALL determine "next anchor" as the first Anchor with start time after current time

### Requirement 13: Neutral Missed Anchor Flow

**User Story:** As a user with executive dysfunction, I want neutral options when I open the app after an anchor has passed, so that I can pivot to what's next without experiencing guilt.

#### Acceptance Criteria

1. WHEN the user opens Mirror_UI or brings the app to foreground after an Anchor's start time has passed, THE Mirror_UI SHALL detect the passed anchor condition
2. THE Mirror_UI SHALL check for passed anchors on page load, app foreground event, and every 60 seconds while the app is in foreground
3. THE Mirror_UI SHALL display neutral pivot options: "Show rest of day", "Just show next anchor", "Done for today"
4. THE Mirror_UI SHALL NOT use language such as "missed", "late", or "failed"
5. WHEN the user selects "Show rest of day", THE Mirror_UI SHALL display all remaining Anchor blocks
6. WHEN the user selects "Just show next anchor", THE Mirror_UI SHALL skip to the next Anchor's chain if one exists

### Requirement 14: Optional Usage Analytics with Explicit Opt-In

**User Story:** As a user with executive dysfunction, I want complete control over whether usage data is collected, so that I can use the app without feeling surveilled or tracked, especially if I only use it sporadically.

#### Acceptance Criteria

1. THE User_Preferences SHALL include an enable_usage_analytics setting with default value false
2. WHEN enable_usage_analytics is false, THE Analytics_Service SHALL NOT record any usage events
3. WHEN enable_usage_analytics is true, THE Analytics_Service SHALL record app_opens, anchor_views, keystone_views, and display_mode_switches
4. THE Settings interface SHALL provide an "Enable usage analytics" toggle with transparent explanation
5. THE explanation text SHALL state: "We don't track your usage by default. If you'd like to help us improve the app, you can optionally enable anonymous usage analytics. This is completely optional and the app works perfectly without it."
6. THE Mirror_UI SHALL function identically whether analytics are enabled or disabled

### Requirement 15: Unified Opt-In Analytics Strategy

**User Story:** As a user with executive dysfunction, I want all tracking to be opt-in, so that I maintain agency over my data and don't feel dependent on a system that surveils me.

#### Acceptance Criteria

1. THE Analytics_Service SHALL check enable_usage_analytics preference before recording ANY events
2. WHEN enable_usage_analytics is false, THE Analytics_Service SHALL NOT record any usage data (app opens, views, completion metrics, or inferred metrics)
3. WHEN enable_usage_analytics is true AND show_completion_controls is true, THE Analytics_Service SHALL record both usage events and completion metrics
4. WHEN enable_usage_analytics is true AND show_completion_controls is false, THE Analytics_Service SHALL record usage events but NOT completion metrics
5. THE Analytics_Service SHALL NOT calculate adherence_scores or on_time_percentages under any circumstances

### Requirement 16: Remove Judgment Language Throughout Interface

**User Story:** As a user with executive dysfunction, I want all interface text to be neutral and supportive, so that I never encounter language that signals failure or judgment.

#### Acceptance Criteria

1. THE Mirror_UI SHALL NOT display text containing "running late", "behind schedule", "missed it", "failed", or "should have started"
2. THE Mirror_UI SHALL replace "Complete by" with "Anchor at" in all displays
3. THE Reality_Check_Prompt SHALL use neutral language such as "You have time for" instead of "You're running out of time"
4. THE Intent_Prompt SHALL ask "What do you need?" instead of "Where are you?"
5. WHEN an Anchor time has passed, THE Mirror_UI SHALL use "Skip this anchor" instead of "Missed" or "Failed"

### Requirement 17: Keystone Shortcuts for Quick Access

**User Story:** As a user with executive dysfunction, I want quick access to just my keystone activity, so that I can immediately see the one thing that will unlock my day.

#### Acceptance Criteria

1. THE User_Preferences SHALL include a keystone_activity setting storing the user's primary keystone
2. THE Mirror_UI SHALL display a quick action button "Just show me [keystone_activity]"
3. WHEN the user activates the keystone shortcut, THE Mirror_UI SHALL switch to keystone_focus Display_Mode
4. THE Mirror_UI SHALL identify the Keystone from user preferences or chain metadata
5. THE keystone shortcut button SHALL be prominently displayed on the Mirror_UI entry screen

### Requirement 18: Session-Based Display Mode Persistence

**User Story:** As a user with executive dysfunction, I want my chosen display mode to persist during my session, so that I don't have to repeatedly select my preferred view.

#### Acceptance Criteria

1. THE Mirror*UI SHALL store the current Display_Mode in browser sessionStorage with key "mirror_display_mode*{date}"
2. WHEN the user switches Display_Mode, THE Mirror_UI SHALL update sessionStorage
3. WHEN the user refreshes the page within the same Session, THE Mirror_UI SHALL restore the previous Display_Mode from sessionStorage
4. WHEN the calendar day changes (midnight in user's timezone), THE Mirror_UI SHALL clear the previous day's sessionStorage entry
5. WHEN the user closes the browser tab or navigates away, THE Session SHALL end and Display_Mode SHALL NOT persist to a new session

### Requirement 19: Gentle Departure Time Highlighting

**User Story:** As a user with executive dysfunction, I want a gentle visual cue when departure time is very close, so that I have awareness without experiencing alarm.

#### Acceptance Criteria

1. WHEN current time is more than 10 minutes before Departure_Waypoint time, THE DepartureWaypoint SHALL use neutral styling
2. WHEN current time is within 10 minutes of Departure_Waypoint time, THE DepartureWaypoint SHALL apply Gentle_Highlight styling
3. THE Gentle_Highlight styling SHALL use font-weight 600 (semibold) or a 2px solid border with theme accent color at 40% opacity
4. THE DepartureWaypoint SHALL NOT use red, orange, yellow, or alarm colors at any time
5. THE DepartureWaypoint SHALL maintain calm presentation even when departure time has passed

### Requirement 20: Optional "Felt Helpful" Feedback

**User Story:** As a product team, we want to collect qualitative feedback about whether the Mirror helped users, so that we can measure supportiveness beyond engagement metrics.

#### Acceptance Criteria

1. THE Mirror_UI SHALL display an optional "Did this help today?" prompt when End_of_Day condition is met
2. THE feedback prompt SHALL offer simple options: "Yes", "Somewhat", "Not really", "Skip"
3. WHEN the user selects "Skip", THE Mirror_UI SHALL not show the prompt again that day
4. THE Analytics_Service SHALL record felt_helpful responses without requiring explanation
5. THE feedback prompt SHALL appear no more than once per calendar day

### Requirement 21: Optional Recovery Block Display

**User Story:** As a user with executive dysfunction, I want recovery time after anchors to be optional, so that I can choose whether to see rest periods in my timeline.

#### Acceptance Criteria

1. THE User_Preferences SHALL include a show_recovery_blocks setting with default value true
2. WHEN show_recovery_blocks is true, THE Timeline SHALL display Recovery_Block time blocks after each Anchor
3. WHEN show_recovery_blocks is false, THE Timeline SHALL hide Recovery_Block time blocks
4. THE Recovery_Block SHALL be labeled "Rest" with neutral styling
5. THE Settings interface SHALL provide a "Show recovery time" toggle for show_recovery_blocks

## Parser and Serializer Requirements

### Requirement 22: Display Mode State Serialization

**User Story:** As a developer, I want to serialize and deserialize Display_Mode state, so that the system can persist and restore user preferences correctly.

#### Acceptance Criteria

1. THE DisplayModeSerializer SHALL serialize Display_Mode objects to JSON format
2. THE DisplayModeSerializer SHALL deserialize JSON to Display_Mode objects
3. THE DisplayModeSerializer SHALL validate that deserialized Display_Mode values match the allowed enum values
4. WHEN an invalid Display_Mode value is encountered during deserialization, THE DisplayModeSerializer SHALL return a default value of "full_chain"
5. FOR ALL valid Display_Mode objects, serializing then deserializing SHALL produce an equivalent object (round-trip property)

### Requirement 23: Optional Analytics Event Serialization

**User Story:** As a developer, I want to serialize analytics events for storage when users opt in, so that we can improve the app based on voluntary feedback.

#### Acceptance Criteria

1. THE TelemetrySerializer SHALL serialize Optional_Usage_Analytics events to JSON format
2. THE TelemetrySerializer SHALL include timestamp, event_type, and event_data fields in serialized format
3. THE TelemetrySerializer SHALL deserialize JSON to Optional_Usage_Analytics event objects
4. WHEN deserializing analytics events, THE TelemetrySerializer SHALL validate timestamp format and event_type values
5. FOR ALL valid Optional_Usage_Analytics events, serializing then deserializing SHALL produce an equivalent object (round-trip property)

## Testing and Quality Requirements

### Requirement 24: Judgment Language Detection

**User Story:** As a developer, I want automated detection of judgment language in the UI, so that we can prevent harmful patterns from being introduced.

#### Acceptance Criteria

1. THE test suite SHALL include a string matching test that scans all Mirror_UI component files
2. THE test SHALL fail if any component contains the forbidden terms: "running late", "behind schedule", "missed it", "failed", "should have started"
3. THE test SHALL scan files matching pattern: src/components/daily-plan/**/\*.tsx and src/components/daily-plan/**/\*.astro
4. THE test SHALL provide the filename and line number for any detected forbidden terms
5. THE test SHALL run as part of the standard test suite (npm test)

## Success Metrics

### Opt-In Analytics Metrics (Only When User Enables)

- Daily app opens (engagement) - requires enable_usage_analytics
- Anchor views before anchor time (planning ahead) - requires enable_usage_analytics
- Inferred anchor attendance (app opens after anchor) - requires enable_usage_analytics
- Keystone views (activation attempts) - requires enable_usage_analytics
- Reality check requests (user-initiated support) - requires enable_usage_analytics
- Display mode switches (flexibility usage) - requires enable_usage_analytics
- Completion rates - requires enable_usage_analytics AND show_completion_controls
- Time estimates vs actuals - requires enable_usage_analytics AND show_completion_controls

### Non-Tracking Success Indicators

- User retention (continued account activity)
- Feature flag adoption rates (A/B testing participation)
- Support ticket trends (reduced confusion/stress reports)

### Qualitative Metrics

- "Did this help today?" responses
- Support request reduction
- Continued daily use without burnout

### Anti-Metrics (What We Do NOT Measure)

- On-time percentage (judgment-based)
- Adherence to schedule (productivity trap)
- Failure counts (harmful)
- "Behind schedule" occurrences (creates guilt)

## Implementation Notes

### Database Schema Requirements

The following Supabase tables and columns are required for telemetry support:

**New table: `mirror_telemetry_events`**

```sql
CREATE TABLE mirror_telemetry_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  event_type TEXT NOT NULL,
  event_data JSONB NOT NULL,
  timestamp TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_mirror_telemetry_user_time ON mirror_telemetry_events(user_id, timestamp DESC);
CREATE INDEX idx_mirror_telemetry_event_type ON mirror_telemetry_events(event_type);
```

**Update to `user_preferences` table:**

```sql
ALTER TABLE user_preferences
ADD COLUMN IF NOT EXISTS show_completion_controls BOOLEAN DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS show_recovery_blocks BOOLEAN DEFAULT TRUE,
ADD COLUMN IF NOT EXISTS keystone_activity TEXT,
ADD COLUMN IF NOT EXISTS enable_usage_analytics BOOLEAN DEFAULT FALSE;
```

### Analytics Infrastructure

The Analytics_Service implementation SHALL use the existing monitoring infrastructure in `src/lib/monitoring/analytics.ts` and extend it with Mirror V2-specific event types. No new analytics backend is required beyond the Supabase table schema above.
