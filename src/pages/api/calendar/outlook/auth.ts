/**
 * Microsoft Outlook Calendar OAuth Initiation
 */

import type { APIRoute } from "astro";
import { outlookCalendar } from "lib/calendar/outlook-calendar";
import { createServerAuth } from "lib/auth/simple-multi-user";

export const POST: APIRoute = async ({ request, cookies }) => {
  try {
    const serverAuth = createServerAuth(cookies);
    const user = await serverAuth.getUser();

    if (!user) {
      return new Response(JSON.stringify({ error: "Authentication required" }), {
        status: 401,
        headers: { "Content-Type": "application/json" },
      });
    }

    const { sourceId } = await request.json();

    if (!sourceId) {
      return new Response(
        JSON.stringify({ error: "Source ID is required" }),
        { status: 400, headers: { "Content-Type": "application/json" } },
      );
    }

    const state = encodeURIComponent(
      JSON.stringify({ userId: user.id, sourceId }),
    );

    const authUrl = outlookCalendar.getAuthUrl(state);

    return new Response(JSON.stringify({ authUrl }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("Error generating Outlook auth URL:", error);
    return new Response(
      JSON.stringify({
        error: "Failed to generate authorization URL",
        details: error instanceof Error ? error.message : "Unknown error",
      }),
      { status: 500, headers: { "Content-Type": "application/json" } },
    );
  }
};
