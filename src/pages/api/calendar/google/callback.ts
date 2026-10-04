/**
 * Google Calendar OAuth callback: exchanges the code and attaches tokens to the
 * signed-in user's calendar source, then runs a first sync.
 */

import type { APIRoute } from "astro";
import { googleCalendar } from "lib/calendar/google-calendar";
import {
  CALENDAR_SETTINGS_PATH,
  finishCalendarConnection,
} from "lib/calendar/oauth-connection";

export const GET: APIRoute = async ({ url, redirect, cookies }) => {
  const back = (query: string) => redirect(`${CALENDAR_SETTINGS_PATH}?${query}`);
  try {
    if (url.searchParams.get("error")) return back("error=oauth_denied");
    const code = url.searchParams.get("code");
    if (!code) return back("error=missing_code");

    const tokens = await googleCalendar.exchangeCodeForTokens(code);
    return back(
      await finishCalendarConnection(cookies, "google", url.searchParams.get("state"), tokens),
    );
  } catch (error) {
    console.error("Error in Google Calendar callback:", error);
    return back("error=callback_failed");
  }
};
