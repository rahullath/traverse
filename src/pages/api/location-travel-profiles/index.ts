import type { APIRoute } from "astro";
import { createServerAuth } from "../../../lib/auth/simple-multi-user";
import {
  normalizeLocationLabel,
  parseDepartureSlots,
} from "../../../lib/travel/location-travel-profiles";

function badRequest(message: string) {
  return new Response(JSON.stringify({ error: message }), {
    status: 400,
    headers: { "Content-Type": "application/json" },
  });
}

export const GET: APIRoute = async ({ cookies }) => {
  const serverAuth = createServerAuth(cookies);
  const user = await serverAuth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const { data, error } = await serverAuth.supabase
    .from("location_travel_profiles")
    .select("*")
    .eq("user_id", user.id)
    .order("label", { ascending: true });

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ profiles: data || [] }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};

export const POST: APIRoute = async ({ request, cookies }) => {
  const serverAuth = createServerAuth(cookies);
  const user = await serverAuth.getUser();
  if (!user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const body = await request.json().catch(() => ({}));
  const label = typeof body.label === "string" ? body.label.trim() : "";
  if (!label) return badRequest("label is required");

  const travelMinutes = Number(body.travel_minutes);
  if (!Number.isFinite(travelMinutes) || travelMinutes < 0 || travelMinutes > 480) {
    return badRequest("travel_minutes must be between 0 and 480");
  }

  const normalizedLabel = normalizeLocationLabel(label);
  if (!normalizedLabel) return badRequest("label is invalid");

  const departureSlots = parseDepartureSlots(body.departure_slots);
  const strictByDefault = body.strict_by_default !== false;

  const payload = {
    user_id: user.id,
    label,
    normalized_label: normalizedLabel,
    travel_minutes: Math.round(travelMinutes),
    departure_slots: departureSlots,
    strict_by_default: strictByDefault,
    active: body.active !== false,
    updated_at: new Date().toISOString(),
  };

  const { data, error } = await serverAuth.supabase
    .from("location_travel_profiles")
    .upsert(payload, { onConflict: "user_id,normalized_label" })
    .select()
    .single();

  if (error) {
    return new Response(JSON.stringify({ error: error.message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }

  return new Response(JSON.stringify({ profile: data }), {
    status: 201,
    headers: { "Content-Type": "application/json" },
  });
};
