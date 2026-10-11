/**
 * Calendar Sync API
 * POST /api/calendar/sync[?source_id=...] — syncs one or all active sources
 * (iCal, Google, Outlook) for the signed-in user.
 */

import type { APIRoute } from "astro";
import { createServerAuth } from "../../../lib/auth/simple-multi-user";
import { calendarService } from "../../../lib/calendar/calendar-service";

const json = (body: unknown, status = 200) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

export const POST: APIRoute = async ({ url, cookies }) => {
  const serverAuth = createServerAuth(cookies);
  const user = await serverAuth.getUser();
  if (!user) return json({ error: "Authentication required" }, 401);

  try {
    const service = calendarService.forClient(serverAuth.supabase);
    const sourceId = url.searchParams.get("source_id");

    if (sourceId) {
      const source = (await service.getCalendarSources(user.id)).find(
        (s) => s.id === sourceId,
      );
      if (!source) return json({ error: "Calendar source not found" }, 404);
      const result = await service.syncCalendarSource(source);
      return json({ result }, result.success ? 200 : 502);
    }

    const results = await service.syncAllSources(user.id);
    return json({
      results,
      summary: {
        total_sources: results.length,
        successful_syncs: results.filter((r) => r.success).length,
        failed_syncs: results.filter((r) => !r.success).length,
      },
    });
  } catch (error) {
    console.error("Calendar sync error:", error);
    return json(
      {
        error: "Failed to sync calendars",
        details: error instanceof Error ? error.message : "Unknown error",
      },
      500,
    );
  }
};
