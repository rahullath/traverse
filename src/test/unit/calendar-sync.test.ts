import { describe, it, expect, vi } from "vitest";

vi.mock("../../lib/calendar/ical-parser", () => ({
  icalParser: {
    parseFromUrl: vi.fn().mockResolvedValue({}),
    convertToCalendarEvents: vi.fn(() => [
      {
        user_id: "u1",
        source_id: "s1",
        external_id: "ev-1",
        title: "Lecture",
        // iCal hands back strings, not Dates
        start_time: "2026-10-12T09:00:00.000Z",
        end_time: "2026-10-12T10:00:00.000Z",
        location: undefined,
        description: undefined,
        event_type: "class",
        flexibility: "fixed",
        importance: "medium",
      },
    ]),
  },
}));
vi.mock("../../lib/supabase/client", () => ({ supabase: {} }));

import { CalendarService } from "../../lib/calendar/calendar-service";

function fakeDb(existing: any[]) {
  const writes: { op: string; payload?: any }[] = [];
  const chain = (result: any) => {
    const q: any = {
      select: () => q,
      eq: () => q,
      update: (payload: any) => (writes.push({ op: "update", payload }), q),
      insert: (payload: any) => (writes.push({ op: "insert", payload }), Promise.resolve({ error: null })),
      delete: () => (writes.push({ op: "delete" }), q),
      then: (res: any) => Promise.resolve(result).then(res),
    };
    return q;
  };
  return { writes, db: { from: (t: string) => chain(t === "calendar_events" ? { data: existing } : { data: null }) } };
}

const source: any = { id: "s1", user_id: "u1", type: "ical", url: "https://example.com/a.ics" };

describe("CalendarService.syncCalendarSource", () => {
  it("inserts iCal events whose times are strings", async () => {
    const { db, writes } = fakeDb([]);
    const r = await new CalendarService(db).syncCalendarSource(source);
    expect(r.success).toBe(true);
    expect(r.events_added).toBe(1);
    expect(writes.find((w) => w.op === "insert")!.payload.start_time).toBe("2026-10-12T09:00:00.000Z");
  });

  it("does not rewrite unchanged events (db nulls vs provider undefined, +00:00 vs Z)", async () => {
    const { db } = fakeDb([
      {
        id: "row-1",
        external_id: "ev-1",
        title: "Lecture",
        start_time: "2026-10-12T09:00:00+00:00",
        end_time: "2026-10-12T10:00:00+00:00",
        location: null,
        description: null,
        event_type: "class",
        flexibility: "fixed",
        importance: "medium",
      },
    ]);
    const r = await new CalendarService(db).syncCalendarSource(source);
    expect(r.success).toBe(true);
    expect(r.events_updated).toBe(0);
    expect(r.events_added).toBe(0);
  });
});
