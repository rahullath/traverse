export interface OnboardingDerivedDefaults {
  planner: {
    primary_goal: string;
    infeasible_response: "alternatives" | "strict_skip";
    success_mode: "attendance" | "partial_attendance" | "activation_only";
    prompt_intensity: "minimal" | "balanced" | "explicit";
  };
  timing: {
    wake_window_start: string | null;
    wake_window_end: string | null;
    sleep_window_start: string | null;
    sleep_window_end: string | null;
    min_sleep_hours: number | null;
    activation_chain_minutes: number | null;
  };
  travel: {
    first_location_label: string | null;
    first_location_travel_minutes: number | null;
    first_location_departure_slots: string[];
    strict_by_default: boolean;
  };
  anchor: {
    default_max_late_minutes: number;
    strict_by_default: boolean;
  };
}

function asString(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}

function asNumber(value: unknown): number | null {
  if (typeof value === "number" && Number.isFinite(value)) return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) return parsed;
  }
  return null;
}

function asSlots(value: unknown): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .filter((slot): slot is string => typeof slot === "string")
    .map((slot) => slot.trim())
    .filter((slot) => /^([01]\d|2[0-3]):[0-5]\d$/.test(slot));
}

export function deriveDefaultsFromOnboardingAnswers(
  phase: number,
  answers: Record<string, unknown>,
): OnboardingDerivedDefaults {
  const primaryGoal = asString(answers.primary_goal) || "activation";
  const infeasibleResponseRaw = asString(answers.infeasible_response);
  const infeasibleResponse =
    infeasibleResponseRaw === "strict_skip" ? "strict_skip" : "alternatives";
  const promptIntensityRaw = asString(answers.prompt_intensity);
  const promptIntensity =
    promptIntensityRaw === "minimal" ||
    promptIntensityRaw === "explicit" ||
    promptIntensityRaw === "balanced"
      ? promptIntensityRaw
      : "balanced";
  const successModeRaw = asString(answers.success_mode);
  const successMode =
    successModeRaw === "partial_attendance" ||
    successModeRaw === "activation_only" ||
    successModeRaw === "attendance"
      ? successModeRaw
      : primaryGoal === "activation"
        ? "activation_only"
        : "attendance";

  const activationChainMinutesRaw = asNumber(answers.activation_chain_minutes);
  const activationChainMinutes =
    activationChainMinutesRaw === null
      ? null
      : Math.max(5, Math.min(240, Math.round(activationChainMinutesRaw)));

  const minSleepHoursRaw = asNumber(answers.min_sleep_hours);
  const minSleepHours =
    minSleepHoursRaw === null
      ? null
      : Math.max(4, Math.min(12, Math.round(minSleepHoursRaw * 10) / 10));

  const firstLocationTravelRaw = asNumber(answers.first_location_travel_minutes);
  const firstLocationTravel =
    firstLocationTravelRaw === null
      ? null
      : Math.max(0, Math.min(480, Math.round(firstLocationTravelRaw)));

  const defaultMaxLateRaw = asNumber(
    answers.default_max_late_minutes ?? answers.max_late_minutes,
  );
  const defaultMaxLate =
    defaultMaxLateRaw === null
      ? 0
      : Math.max(0, Math.min(240, Math.round(defaultMaxLateRaw)));

  const strictByDefault =
    phase === 1
      ? true
      : answers.strict_by_default === undefined
        ? defaultMaxLate === 0
        : answers.strict_by_default !== false;

  return {
    planner: {
      primary_goal: primaryGoal,
      infeasible_response: infeasibleResponse,
      success_mode: successMode,
      prompt_intensity: promptIntensity,
    },
    timing: {
      wake_window_start: asString(answers.wake_window_start),
      wake_window_end: asString(answers.wake_window_end),
      sleep_window_start: asString(answers.sleep_window_start),
      sleep_window_end: asString(answers.sleep_window_end),
      min_sleep_hours: minSleepHours,
      activation_chain_minutes: activationChainMinutes,
    },
    travel: {
      first_location_label: asString(
        answers.first_location_label ?? answers.location_label,
      ),
      first_location_travel_minutes: firstLocationTravel,
      first_location_departure_slots: asSlots(
        answers.first_location_departure_slots ?? answers.departure_slots,
      ),
      strict_by_default: strictByDefault,
    },
    anchor: {
      default_max_late_minutes: defaultMaxLate,
      strict_by_default: strictByDefault,
    },
  };
}
