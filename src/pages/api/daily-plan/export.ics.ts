import type { APIRoute } from "astro";
import { createServerClient } from "../../../lib/supabase/server";
import { getDailyPlanByDateWithBlocks } from "../../../lib/daily-plan/database";

function icsEscape(text: string): string {
  return text.replace(/\\/g, "\\\\").replace(/,/g, "\\,").replace(/;/g, "\\;").replace(/\n/g, "\\n");
}

function icsDate(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").split(".")[0] + "Z";
}

export const GET: APIRoute = async ({ cookies }) => {
  const supabase = createServerClient(cookies);
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const plan = await getDailyPlanByDateWithBlocks(supabase, user.id, today);

  const blocks = plan?.timeBlocks ?? [];
  const now = icsDate(new Date());

  const events = blocks
    .map((b) => {
      const uid = `${b.id}@traverse.app`;
      return [
        "BEGIN:VEVENT",
        `UID:${uid}`,
        `DTSTAMP:${now}`,
        `DTSTART:${icsDate(new Date(b.startTime))}`,
        `DTEND:${icsDate(new Date(b.endTime))}`,
        `SUMMARY:${icsEscape(b.activityName)}`,
        "END:VEVENT",
      ].join("\r\n");
    })
    .join("\r\n");

  const ics = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//traverse//today//EN",
    "CALSCALE:GREGORIAN",
    events,
    "END:VCALENDAR",
  ]
    .filter(Boolean)
    .join("\r\n");

  return new Response(ics, {
    status: 200,
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Content-Disposition": `attachment; filename="traverse-today.ics"`,
    },
  });
};
