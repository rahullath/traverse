// src/pages/api/monitoring/session.ts
// API endpoint for tracking Mirror UI sessions

import type { APIRoute } from "astro";
import { trackMirrorSession } from "@/lib/monitoring/triage-metrics";

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { event, userId, durationMs, interactionCount } = body;

    if (!event || !userId) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const action = event === "mirror_session_start" ? "start" : "end";

    trackMirrorSession(userId, action, {
      durationMs,
      interactionCount,
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error tracking session:", error);
    return new Response(JSON.stringify({ error: "Failed to track session" }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
};
