import type { APIRoute } from "astro";
import { createServerAuth } from "../../../lib/auth/simple-multi-user";
import {
  normalizeLocationLabel,
  parseDepartureSlots,
} from "../../../lib/travel/location-travel-profiles";

function response(status: number, payload: Record<string, unknown>) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: { "Content-Type": "application/json" },
  });
}

export const PATCH: APIRoute = async ({ params, request, cookies }) => {
  const profileId = params.id;
  if (!profileId) {
    return response(400, { error: "Profile id is required" });
  }

  const serverAuth = createServerAuth(cookies);
  const user = await serverAuth.getUser();
  if (!user) {
    return response(401, { error: "Unauthorized" });
  }

  const body = await request.json().catch(() => ({}));
  const updates: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };

  if (typeof body.label === "string") {
    const label = body.label.trim();
    if (!label) return response(400, { error: "label cannot be empty" });
    updates.label = label;
    updates.normalized_label = normalizeLocationLabel(label);
  }

  if (body.travel_minutes !== undefined) {
    const travelMinutes = Number(body.travel_minutes);
    if (!Number.isFinite(travelMinutes) || travelMinutes < 0 || travelMinutes > 480) {
      return response(400, { error: "travel_minutes must be between 0 and 480" });
    }
    updates.travel_minutes = Math.round(travelMinutes);
  }

  if (body.departure_slots !== undefined) {
    updates.departure_slots = parseDepartureSlots(body.departure_slots);
  }

  if (body.strict_by_default !== undefined) {
    updates.strict_by_default = body.strict_by_default !== false;
  }

  if (body.active !== undefined) {
    updates.active = body.active !== false;
  }

  const { data, error } = await serverAuth.supabase
    .from("location_travel_profiles")
    .update(updates)
    .eq("id", profileId)
    .eq("user_id", user.id)
    .select()
    .single();

  if (error) {
    return response(500, { error: error.message });
  }

  return response(200, { profile: data });
};

export const DELETE: APIRoute = async ({ params, cookies }) => {
  const profileId = params.id;
  if (!profileId) {
    return response(400, { error: "Profile id is required" });
  }

  const serverAuth = createServerAuth(cookies);
  const user = await serverAuth.getUser();
  if (!user) {
    return response(401, { error: "Unauthorized" });
  }

  const { error } = await serverAuth.supabase
    .from("location_travel_profiles")
    .delete()
    .eq("id", profileId)
    .eq("user_id", user.id);

  if (error) {
    return response(500, { error: error.message });
  }

  return response(200, { success: true });
};
