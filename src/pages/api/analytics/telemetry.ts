// src/pages/api/analytics/telemetry.ts
// API endpoint for recording Mirror V2 telemetry events (opt-in only)
// Requirements: 14.2, 14.3

import type { APIRoute } from "astro";
import { createServerAuth } from "@/lib/auth/simple-multi-user";
import { MirrorAnalyticsService } from "@/lib/monitoring/mirror-analytics";
import { TelemetrySerializer } from "@/lib/monitoring/telemetry-serializer";

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Authenticate user
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.requireAuth();

    // Parse request body
    const body = await request.json();
    const { event_type, event_data } = body;

    if (!event_type || !event_data) {
      return new Response(
        JSON.stringify({
          error: "Missing required fields: event_type, event_data",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Validate event using TelemetrySerializer
    try {
      TelemetrySerializer.validate({
        timestamp: new Date().toISOString(),
        event_type,
        event_data,
      });
    } catch (validationError) {
      return new Response(
        JSON.stringify({
          error: "Invalid telemetry event",
          details:
            validationError instanceof Error
              ? validationError.message
              : "Unknown validation error",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Check if analytics are enabled for this user (Requirement 14.2)
    const analyticsService = new MirrorAnalyticsService(serverAuth.supabase);
    const analyticsEnabled = await analyticsService.isAnalyticsEnabled(
      user.id,
    );

    // If analytics disabled, return success without recording (Requirement 14.3)
    // This ensures the app functions identically whether analytics are enabled or disabled
    if (!analyticsEnabled) {
      return new Response(
        JSON.stringify({
          success: true,
          recorded: false,
          message: "Analytics disabled for user",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Record event in database (only if analytics enabled)
    const { error: insertError } = await serverAuth.supabase
      .from("mirror_telemetry_events")
      .insert({
        user_id: user.id,
        event_type,
        event_data,
        timestamp: new Date().toISOString(),
      });

    if (insertError) {
      // Fail silently - don't block user experience (Requirement 14.3)
      console.error("Error inserting telemetry event:", insertError);
      return new Response(
        JSON.stringify({
          success: true,
          recorded: false,
          message: "Event recording failed silently",
        }),
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        recorded: true,
        message: "Event recorded successfully",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    // Fail silently on errors - don't block user experience (Requirement 14.3)
    console.error("Error in telemetry endpoint:", error);
    return new Response(
      JSON.stringify({
        success: true,
        recorded: false,
        message: "Error handled silently",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
