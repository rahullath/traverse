// src/pages/api/monitoring/interaction.ts
// API endpoint for tracking user interactions

import type { APIRoute } from "astro";
import { AnalyticsService } from "@/lib/monitoring/analytics";

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = await request.json();
    const { event, userId, interactionType } = body;

    if (!event || !userId || !interactionType) {
      return new Response(
        JSON.stringify({ error: "Missing required fields" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    AnalyticsService.getInstance().trackEvent({
      event,
      userId,
      timestamp: new Date(),
      properties: { interactionType },
    });

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error tracking interaction:", error);
    return new Response(
      JSON.stringify({ error: "Failed to track interaction" }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};
