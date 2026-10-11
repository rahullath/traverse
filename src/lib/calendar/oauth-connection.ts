import type { AstroCookies } from "astro";
import { createServerAuth } from "../auth/simple-multi-user";
import { calendarService } from "./calendar-service";

export const CALENDAR_SETTINGS_PATH = "/settings/calendar";

/**
 * Finish a Google/Outlook OAuth connection for the signed-in user.
 *
 * The user comes from the session, never from the (unsigned) OAuth `state`;
 * `state` only names which of *their* calendar sources to attach tokens to.
 * Returns the query string for the redirect back to Settings → Calendar.
 */
export async function finishCalendarConnection(
  cookies: AstroCookies,
  provider: "google" | "outlook",
  rawState: string | null,
  tokens: { access_token: string; refresh_token: string; expires_in: number },
): Promise<string> {
  const serverAuth = createServerAuth(cookies);
  const user = await serverAuth.getUser();
  if (!user) return "error=signed_out";

  let sourceId: string | undefined;
  try {
    sourceId = rawState ? JSON.parse(decodeURIComponent(rawState)).sourceId : undefined;
  } catch {
    sourceId = undefined;
  }
  if (!sourceId) return "error=invalid_state";

  const service = calendarService.forClient(serverAuth.supabase);
  const owned = (await service.getCalendarSources(user.id)).find((s) => s.id === sourceId);
  if (!owned || owned.type !== provider) return "error=unknown_source";

  await service.storeGoogleCredentials(sourceId, {
    access_token: tokens.access_token,
    refresh_token: tokens.refresh_token,
    expires_in: tokens.expires_in,
    ...(provider === "google" ? { calendar_id: "primary" } : {}),
  });

  // Re-read so the sync sees the credentials just stored.
  const source = (await service.getCalendarSources(user.id)).find((s) => s.id === sourceId);
  if (source) {
    const result = await service.syncCalendarSource(source);
    if (!result.success) {
      console.error(`Initial ${provider} sync failed:`, result.errors);
      return `success=${provider}_connected&warning=first_sync_failed`;
    }
  }
  return `success=${provider}_connected`;
}
