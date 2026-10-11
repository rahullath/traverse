// src/pages/api/analytics/felt-helpful.ts
// API endpoint for "Did this help today?" feedback
// This is ALWAYS available, separate from usage analytics opt-in
// Requirements: 20.4

import type { APIRoute } from "astro";
import { createServerAuth } from "@/lib/auth/simple-multi-user";

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    // Authenticate user
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.requireAuth();

    // Parse request body
    const body = await request.json();
    const { response, date } = body;

    // Validate response
    const validResponses = ["yes", "somewhat", "not_really"];
    if (!response || !validResponses.includes(response)) {
      return new Response(
        JSON.stringify({
          error: `Invalid response. Must be one of: ${validResponses.join(", ")}`,
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Validate date format (YYYY-MM-DD)
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!date || !dateRegex.test(date)) {
      return new Response(
        JSON.stringify({
          error: "Invalid date format. Expected YYYY-MM-DD",
        }),
        {
          status: 400,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Get current user preferences
    const { data: currentPrefs, error: fetchError } = await serverAuth.supabase
      .from("user_preferences")
      .select("preferences")
      .eq("user_id", user.id)
      .single();

    if (fetchError) {
      console.error("Error fetching user preferences:", fetchError);
      return new Response(
        JSON.stringify({
          error: "Failed to fetch user preferences",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    // Parse existing preferences JSONB
    const preferences = (currentPrefs?.preferences as any) || {};

    // Initialize felt_helpful_dismissed_dates if not exists
    if (!preferences.felt_helpful_dismissed_dates) {
      preferences.felt_helpful_dismissed_dates = [];
    }

    // Add current date to dismissed dates (prevent showing again today)
    if (!preferences.felt_helpful_dismissed_dates.includes(date)) {
      preferences.felt_helpful_dismissed_dates.push(date);
    }

    // Initialize felt_helpful_responses if not exists
    if (!preferences.felt_helpful_responses) {
      preferences.felt_helpful_responses = [];
    }

    // Store the feedback response
    preferences.felt_helpful_responses.push({
      date,
      response,
      timestamp: new Date().toISOString(),
    });

    // Update user preferences with new dismissed date and response
    const { error: updateError } = await serverAuth.supabase
      .from("user_preferences")
      .update({
        preferences,
      })
      .eq("user_id", user.id);

    if (updateError) {
      console.error("Error updating user preferences:", updateError);
      return new Response(
        JSON.stringify({
          error: "Failed to update user preferences",
        }),
        {
          status: 500,
          headers: { "Content-Type": "application/json" },
        },
      );
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: "Feedback recorded successfully",
      }),
      {
        status: 200,
        headers: { "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Error in felt-helpful endpoint:", error);
    return new Response(
      JSON.stringify({
        error: "Internal server error",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      {
        status: 500,
        headers: { "Content-Type": "application/json" },
      },
    );
  }
};
