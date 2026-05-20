/**
 * Microsoft Outlook Calendar OAuth Callback
 */

import type { APIRoute } from "astro";
import { outlookCalendar } from "lib/calendar/outlook-calendar";
import { calendarService } from "lib/calendar/calendar-service";

export const GET: APIRoute = async ({ url, redirect }) => {
  try {
    const code = url.searchParams.get("code");
    const state = url.searchParams.get("state");
    const error = url.searchParams.get("error");

    if (error) {
      console.error("Outlook OAuth error:", error);
      return redirect("/calendar?error=oauth_denied");
    }

    if (!code) {
      return redirect("/calendar?error=missing_code");
    }

    const tokens = await outlookCalendar.exchangeCodeForTokens(code);

    let userId: string;
    let sourceId: string;

    if (state) {
      try {
        const stateData = JSON.parse(decodeURIComponent(state));
        userId = stateData.userId;
        sourceId = stateData.sourceId;
      } catch {
        return redirect("/calendar?error=invalid_state");
      }
    } else {
      return redirect("/calendar?error=missing_state");
    }

    await calendarService.storeGoogleCredentials(sourceId, {
      access_token: tokens.access_token,
      refresh_token: tokens.refresh_token,
      expires_in: tokens.expires_in,
    });

    const sources = await calendarService.getCalendarSources(userId);
    const source = sources.find((s) => s.id === sourceId);

    if (source) {
      try {
        await calendarService.syncCalendarSource(source);
      } catch (syncError) {
        console.error("Initial Outlook sync failed:", syncError);
      }
    }

    return redirect("/calendar?success=outlook_connected");
  } catch (error) {
    console.error("Error in Outlook Calendar callback:", error);
    return redirect("/calendar?error=callback_failed");
  }
};
