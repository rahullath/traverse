// Triage Mirror Stateless Types
// Requirements: All requirements (foundation)

import type { TimeBlock } from "./daily-plan";

/**
 * Runway calculation result
 * Requirements: 1.1, 1.2, 1.4, 1.5
 */
export interface RunwayCalculation {
  /** Minutes until next anchor start time, null if no future anchors */
  runway: number | null;
  /** Total minutes needed for commitment envelope steps */
  required_duration: number | null;
  /** ID of the next anchor */
  next_anchor_id: string | null;
  /** Start time of the next anchor */
  next_anchor_start: Date | null;
  /** Current time used for calculation */
  current_time: Date;
  /** Whether user has sufficient time (runway >= required_duration) */
  has_sufficient_time: boolean;
}

/**
 * Triage decision modes
 * Requirements: 3.1, 3.2, 3.3, 3.4
 */
export type TriageMode = "protect_keystone" | "skip_anchor" | "recalculate";

/**
 * Triage decision payload
 * Requirements: 3.1, 3.2, 3.3, 3.4, 3.5
 */
export interface TriageDecision {
  mode: TriageMode;
  anchor_id: string;
}

/**
 * Triage option for UI display
 * Requirements: 2.3, 2.4
 */
export interface TriageOption {
  id: TriageMode;
  label: string;
  description: string;
}

/**
 * Triage state for UI
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 10.1, 10.2, 10.3, 10.4, 10.5
 */
export interface TriageState {
  /** Whether triage mode is active */
  active: boolean;
  /** The most critical activity to protect */
  keystone_activity: TimeBlock | null;
  /** The anchor block causing triage */
  anchor: TimeBlock | null;
  /** Available triage options */
  options: TriageOption[];
}

/**
 * User state declaration types
 * Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 16.8
 */
export type UserState =
  | "starting_day"
  | "ready_for_anchor"
  | "mid_chain"
  | "at_anchor"
  | "missed_it"
  | "just_checking";

/**
 * State declaration with optional step selection
 * Requirements: 16.1, 16.2, 16.5
 */
export interface StateDeclaration {
  /** User's declared state */
  state: UserState;
  /** Selected step ID for mid_chain state */
  selected_step_id?: string;
  /** Timestamp of declaration */
  timestamp: Date;
}

/**
 * Filtered timeline result
 * Requirements: 16.1, 16.2, 16.3, 16.4, 16.5, 16.6, 16.7, 16.8, 16.9
 */
export interface FilteredTimeline {
  /** Time blocks visible to user */
  visible_blocks: TimeBlock[];
  /** Time blocks hidden by filter */
  hidden_blocks: TimeBlock[];
  /** Reason for filtering */
  filter_reason: string;
}

/**
 * Mirror data payload for UI
 * Requirements: 4.1, 4.2, 4.3, 4.4, 4.5, 5.1, 5.2, 5.3, 5.4
 */
export interface MirrorData {
  /** Time blocks for display */
  time_blocks: TimeBlock[];
  /** Envelope-level timing signals for explicit start/leave/anchor guidance */
  timing_signals?: Array<{
    envelope_id: string;
    anchor_id: string | null;
    suggested_start_by: string;
    ready_to_leave_by: string;
    anchor_at: string;
    effective_arrival_deadline: string;
    max_late_minutes: number;
    travel_duration_minutes: number;
    selected_departure_slot?: string | null;
    next_feasible_departure_slot?: string | null;
  }>;
  /** Runway calculation */
  runway: RunwayCalculation;
  /** Triage state */
  triage_state: TriageState;
  /** Whether to show state declaration prompt */
  show_state_prompt: boolean;
  /** Last state declaration if any */
  last_state_declaration: StateDeclaration | null;
}

/**
 * Completion status update payload
 * Requirements: 17.1, 17.2, 17.3, 17.4, 17.5, 23.1, 23.2, 23.3
 */
export interface CompletionUpdate {
  /** New status */
  status: "completed" | "skipped";
  /** Required if status is skipped */
  skip_reason?: string;
}

/**
 * Time block edit payload
 * Requirements: 18.1, 18.2, 18.3, 18.4, 18.5, 19.1, 19.2, 19.3, 19.4, 19.5
 */
export interface TimeBlockEdit {
  /** New start time */
  start_time?: Date;
  /** New end time */
  end_time?: Date;
  /** New activity name */
  activity_name?: string;
  /** New duration in minutes */
  duration?: number;
  /** New location */
  location?: string;
}

/**
 * Edit result with cascade information
 * Requirements: 19.1, 19.2, 19.3, 19.4, 19.5
 */
export interface EditResult {
  /** Updated block */
  updated_block: TimeBlock;
  /** Other blocks affected by cascade */
  updated_blocks: TimeBlock[];
  /** Conflicts detected */
  conflicts: TimeBlockConflict[];
}

/**
 * Time block conflict
 * Requirements: 18.4
 */
export interface TimeBlockConflict {
  /** Conflicting block ID */
  block_id: string;
  /** Conflict type */
  type: "overlap" | "invalid_time";
  /** Conflict message */
  message: string;
}

/**
 * Step insertion payload
 * Requirements: 19.1, 19.2, 19.3, 19.4, 19.5
 */
export interface StepInsert {
  /** Activity name for new step */
  activity_name: string;
  /** Duration in minutes */
  duration: number;
  /** Insert after this block ID */
  insert_after_id: string;
}

/**
 * Deadline banner data
 * Requirements: 21.1, 21.2, 21.3, 21.4, 21.5
 */
export interface DeadlineBanner {
  /** Deadline time */
  deadline: Date;
  /** Time remaining in minutes */
  time_remaining: number;
  /** Whether user is past deadline */
  is_late: boolean;
  /** Commitment envelope ID */
  envelope_id: string;
}

/**
 * Intent signal data
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */
export interface IntentSignal {
  /** Whether to show intent signal */
  show: boolean;
  /** Number of days absent */
  days_absent: number;
  /** Whether user dismissed in current session */
  dismissed: boolean;
}
