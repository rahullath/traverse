// src/pages/api/user/complete-onboarding.ts - Simple onboarding completion for existing flow
import type { APIRoute } from "astro";
import { createServerAuth } from "../../../lib/auth/simple-multi-user";
import { sendWelcomeEmail } from "../../../lib/notifications/email";
import {
  deriveDefaultsFromOnboardingAnswers,
  type OnboardingDerivedDefaults,
} from "../../../lib/onboarding/preset-defaults";
import {
  normalizeLocationLabel,
  parseDepartureSlots,
} from "../../../lib/travel/location-travel-profiles";

function getDefaultPreferencePatch() {
  return {
    enabled_modules: ["daily-plan", "habits", "calendar"],
    module_order: ["daily-plan", "habits", "calendar"],
    accent_color: "#06b6d4",
    ai_personality: "professional",
    ai_proactivity_level: 3,
  };
}

function buildPhaseOneAnswers(payload: Record<string, unknown>) {
  const parseSlotsFromAny = (value: unknown): string[] => {
    if (Array.isArray(value)) {
      return parseDepartureSlots(value);
    }
    if (typeof value === "string" && value.trim().length > 0) {
      return parseDepartureSlots(
        value
          .split(",")
          .map((slot) => slot.trim())
          .filter(Boolean),
      );
    }
    return [];
  };

  return {
    primary_goal:
      typeof payload.primary_goal === "string" ? payload.primary_goal : null,
    keystone_activity:
      typeof payload.keystone_activity === "string"
        ? payload.keystone_activity
        : null,
    activation_chain_minutes:
      typeof payload.activation_chain_minutes === "string" ||
      typeof payload.activation_chain_minutes === "number"
        ? Number(payload.activation_chain_minutes)
        : null,
    wake_window_start:
      typeof payload.wake_window_start === "string"
        ? payload.wake_window_start
        : null,
    wake_window_end:
      typeof payload.wake_window_end === "string" ? payload.wake_window_end : null,
    sleep_window_start:
      typeof payload.sleep_window_start === "string"
        ? payload.sleep_window_start
        : null,
    sleep_window_end:
      typeof payload.sleep_window_end === "string"
        ? payload.sleep_window_end
        : null,
    min_sleep_hours:
      typeof payload.min_sleep_hours === "string" ||
      typeof payload.min_sleep_hours === "number"
        ? Number(payload.min_sleep_hours)
        : null,
    first_location_label:
      typeof payload.first_location_label === "string"
        ? payload.first_location_label
        : null,
    first_location_travel_minutes:
      typeof payload.first_location_travel_minutes === "string" ||
      typeof payload.first_location_travel_minutes === "number"
        ? Number(payload.first_location_travel_minutes)
        : null,
    first_location_departure_slots: parseSlotsFromAny(
      payload.first_location_departure_slots,
    ),
    infeasible_response:
      typeof payload.infeasible_response === "string"
        ? payload.infeasible_response
        : null,
  };
}

async function persistPhaseOnePreset(
  supabase: any,
  userId: string,
  answers: Record<string, unknown>,
  defaults: OnboardingDerivedDefaults,
) {
  const timestamp = new Date().toISOString();
  const { error } = await supabase.from("onboarding_presets").upsert(
    {
      user_id: userId,
      phase: 1,
      answers,
      derived_defaults: defaults,
      completed_at: timestamp,
      updated_at: timestamp,
    },
    { onConflict: "user_id,phase" },
  );

  if (error && error.code !== "42P01") {
    console.warn("Failed to persist onboarding preset phase 1:", error.message);
  }
}

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.getUser();

    if (!user) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Not authenticated",
        }),
        {
          status: 401,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    console.log("Marking onboarding as complete for user:", user.id);

    // Ensure preferences row exists (signals onboarding completion in middleware).
    const existingPrefs = await serverAuth.getUserPreferences(user.id);
    if (!existingPrefs) {
      const created = await serverAuth.createDefaultPreferences(
        user.id,
        user.email,
      );
      if (!created) {
        return new Response(
          JSON.stringify({
            success: false,
            error: "Failed to initialize preferences",
          }),
          {
            status: 500,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
    }

    const contentType = request.headers.get("content-type") || "";
    const isJson = contentType.includes("application/json");
    const requestPayload = isJson
      ? await request.json().catch(() => ({}))
      : Object.fromEntries((await request.formData()).entries());

    const onboardingProfile = {
      commitments:
        typeof requestPayload.commitments === "string"
          ? requestPayload.commitments
          : null,
      starting_difficulty:
        typeof requestPayload.starting_difficulty === "string"
          ? requestPayload.starting_difficulty
          : null,
      structure_style:
        typeof requestPayload.structure_style === "string"
          ? requestPayload.structure_style
          : null,
      usual_wake_time:
        typeof requestPayload.usual_wake_time === "string"
          ? requestPayload.usual_wake_time
          : null,
      collected_at: new Date().toISOString(),
    };
    const phaseOneAnswers = buildPhaseOneAnswers(
      requestPayload as Record<string, unknown>,
    );
    const phaseOneDefaults = deriveDefaultsFromOnboardingAnswers(1, phaseOneAnswers);

    // Apply an onboarding defaults patch to keep behavior deterministic.
    const { data: existingRow } = await serverAuth.supabase
      .from("user_preferences")
      .select("preferences")
      .eq("user_id", user.id)
      .maybeSingle();

    const existingPreferences =
      existingRow?.preferences && typeof existingRow.preferences === "object"
        ? (existingRow.preferences as Record<string, any>)
        : {};
    const firstCompletion = !existingPreferences.onboarding_completed_at;

    const mergedPreferences = {
      ...existingPreferences,
      ...getDefaultPreferencePatch(),
      onboarding_profile: onboardingProfile,
      onboarding_presets: {
        ...(existingPreferences.onboarding_presets || {}),
        phase_1: {
          answers: phaseOneAnswers,
          completed_at: new Date().toISOString(),
        },
      },
      derived_planner_defaults: {
        ...(existingPreferences.derived_planner_defaults || {}),
        phase_1: phaseOneDefaults,
      },
      max_late_minutes_default: phaseOneDefaults.anchor.default_max_late_minutes,
      strict_late_default: phaseOneDefaults.anchor.strict_by_default,
      keystone_activity:
        phaseOneAnswers.keystone_activity || existingPreferences.keystone_activity || null,
      onboarding_completed_at: new Date().toISOString(),
    };

    const { error: upsertError } = await serverAuth.supabase
      .from("user_preferences")
      .upsert(
        {
          user_id: user.id,
          preferences: mergedPreferences,
          updated_at: new Date().toISOString(),
        },
        { onConflict: "user_id" },
      );

    if (upsertError) {
      return new Response(
        JSON.stringify({
          success: false,
          error: `Failed to persist onboarding completion: ${upsertError.message}`,
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    await persistPhaseOnePreset(
      serverAuth.supabase,
      user.id,
      phaseOneAnswers,
      phaseOneDefaults,
    );

    if (
      phaseOneDefaults.travel.first_location_label &&
      phaseOneDefaults.travel.first_location_travel_minutes !== null
    ) {
      const label = phaseOneDefaults.travel.first_location_label;
      const normalizedLabel = normalizeLocationLabel(label);
      if (normalizedLabel) {
        await serverAuth.supabase.from("location_travel_profiles").upsert(
          {
            user_id: user.id,
            label,
            normalized_label: normalizedLabel,
            travel_minutes: phaseOneDefaults.travel.first_location_travel_minutes,
            departure_slots: phaseOneDefaults.travel.first_location_departure_slots,
            strict_by_default: phaseOneDefaults.travel.strict_by_default,
            active: true,
            updated_at: new Date().toISOString(),
          },
          { onConflict: "user_id,normalized_label" },
        );
      }
    }

    if (firstCompletion && user.email) {
      await sendWelcomeEmail(user.email);
    }

    // Optional form submission redirect for onboarding.astro.
    const isFormSubmission = !isJson;

    if (isFormSubmission) {
      return new Response(null, {
        status: 302,
        headers: {
          Location: "/dashboard",
        },
      });
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Onboarding completed successfully",
      }),
      {
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error: any) {
    console.error("Complete onboarding error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message || "Unknown error occurred",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
