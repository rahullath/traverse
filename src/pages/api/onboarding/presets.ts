import type { APIRoute } from "astro";
import { createServerAuth } from "../../../lib/auth/simple-multi-user";
import { deriveDefaultsFromOnboardingAnswers } from "../../../lib/onboarding/preset-defaults";

function json(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const GET: APIRoute = async ({ cookies }) => {
  const serverAuth = createServerAuth(cookies);
  const user = await serverAuth.getUser();
  if (!user) return json(401, { error: "Unauthorized" });

  const { data, error } = await serverAuth.supabase
    .from("onboarding_presets")
    .select("*")
    .eq("user_id", user.id)
    .order("phase", { ascending: true });

  if (error && error.code !== "42P01") {
    return json(500, { error: error.message });
  }

  return json(200, { presets: data || [] });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const serverAuth = createServerAuth(cookies);
  const user = await serverAuth.getUser();
  if (!user) return json(401, { error: "Unauthorized" });

  const body = await request.json().catch(() => ({}));
  const phaseRaw = Number(body.phase);
  if (!Number.isFinite(phaseRaw) || (phaseRaw !== 1 && phaseRaw !== 2)) {
    return json(400, { error: "phase must be 1 or 2" });
  }

  const phase = phaseRaw as 1 | 2;
  const answers =
    body.answers && typeof body.answers === "object" && !Array.isArray(body.answers)
      ? (body.answers as Record<string, unknown>)
      : {};

  const derivedDefaults = deriveDefaultsFromOnboardingAnswers(phase, answers);
  const completedAt = new Date().toISOString();

  const { data, error } = await serverAuth.supabase
    .from("onboarding_presets")
    .upsert(
      {
        user_id: user.id,
        phase,
        answers,
        derived_defaults: derivedDefaults,
        completed_at: completedAt,
        updated_at: completedAt,
      },
      { onConflict: "user_id,phase" },
    )
    .select()
    .single();

  if (error && error.code !== "42P01") {
    return json(500, { error: error.message });
  }

  // Keep user_preferences in sync so planner can read one source.
  const { data: existingPrefsRow } = await serverAuth.supabase
    .from("user_preferences")
    .select("preferences")
    .eq("user_id", user.id)
    .maybeSingle();
  const existingPrefs =
    existingPrefsRow?.preferences && typeof existingPrefsRow.preferences === "object"
      ? (existingPrefsRow.preferences as Record<string, unknown>)
      : {};
  const existingPresetBag =
    existingPrefs.onboarding_presets &&
    typeof existingPrefs.onboarding_presets === "object"
      ? (existingPrefs.onboarding_presets as Record<string, unknown>)
      : {};
  const existingDerivedBag =
    existingPrefs.derived_planner_defaults &&
    typeof existingPrefs.derived_planner_defaults === "object"
      ? (existingPrefs.derived_planner_defaults as Record<string, unknown>)
      : {};

  const nextPreferences = {
    ...existingPrefs,
    onboarding_presets: {
      ...existingPresetBag,
      [`phase_${phase}`]: {
        answers,
        completed_at: completedAt,
      },
    },
    derived_planner_defaults: {
      ...existingDerivedBag,
      [`phase_${phase}`]: derivedDefaults,
    },
    max_late_minutes_default: derivedDefaults.anchor.default_max_late_minutes,
    strict_late_default: derivedDefaults.anchor.strict_by_default,
  };

  await serverAuth.supabase.from("user_preferences").upsert(
    {
      user_id: user.id,
      preferences: nextPreferences,
      updated_at: completedAt,
    },
    { onConflict: "user_id" },
  );

  return json(200, {
    preset: data || {
      user_id: user.id,
      phase,
      answers,
      derived_defaults: derivedDefaults,
      completed_at: completedAt,
    },
    derived_defaults: derivedDefaults,
  });
};
