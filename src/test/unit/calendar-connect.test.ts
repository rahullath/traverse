import { describe, it, expect, vi, beforeEach } from "vitest";
import { normalizeICalUrl } from "@/lib/calendar/ical-url";

describe("normalizeICalUrl", () => {
  it("turns webcal links into https", () => {
    expect(normalizeICalUrl("webcal://p01-caldav.icloud.com/published/2/abc")).toEqual({
      ok: true,
      url: "https://p01-caldav.icloud.com/published/2/abc",
    });
  });

  it("accepts Google secret iCal addresses", () => {
    const r = normalizeICalUrl(" https://calendar.google.com/calendar/ical/x%40gmail.com/private-abc/basic.ics ");
    expect(r.ok).toBe(true);
  });

  it.each([
    "http://localhost:4321/x.ics",
    "http://127.0.0.1/x.ics",
    "http://10.0.0.5/x.ics",
    "http://192.168.1.1/x.ics",
    "http://172.20.0.1/x.ics",
    "http://169.254.169.254/latest/meta-data",
    "http://[::1]/x.ics",
    "file:///etc/passwd",
    "not a url",
    "",
  ])("rejects %s", (u) => {
    expect(normalizeICalUrl(u).ok).toBe(false);
  });
});

const sources: any[] = [];
const store = vi.fn();
const sync = vi.fn();
let sessionUser: { id: string } | null = { id: "me" };

vi.mock("../../lib/auth/simple-multi-user", () => ({
  createServerAuth: () => ({ getUser: async () => sessionUser, supabase: {} }),
}));
vi.mock("../../lib/calendar/calendar-service", () => ({
  calendarService: {
    forClient: () => ({
      getCalendarSources: async (userId: string) => sources.filter((s) => s.user_id === userId),
      storeGoogleCredentials: store,
      syncCalendarSource: sync,
    }),
  },
}));

import { finishCalendarConnection } from "@/lib/calendar/oauth-connection";

const tokens = { access_token: "a", refresh_token: "r", expires_in: 3600 };
const state = (o: unknown) => encodeURIComponent(JSON.stringify(o));

describe("finishCalendarConnection", () => {
  beforeEach(() => {
    sessionUser = { id: "me" };
    sources.length = 0;
    sources.push({ id: "mine", user_id: "me", type: "google" }, { id: "theirs", user_id: "other", type: "google" });
    store.mockReset();
    sync.mockReset().mockResolvedValue({ success: true });
  });

  it("attaches tokens to the session user's own source and syncs", async () => {
    expect(await finishCalendarConnection({} as any, "google", state({ sourceId: "mine" }), tokens)).toBe("success=google_connected");
    expect(store).toHaveBeenCalledWith("mine", expect.objectContaining({ access_token: "a" }));
    expect(sync).toHaveBeenCalled();
  });

  it("ignores a userId in state and refuses someone else's source", async () => {
    const q = await finishCalendarConnection({} as any, "google", state({ userId: "other", sourceId: "theirs" }), tokens);
    expect(q).toBe("error=unknown_source");
    expect(store).not.toHaveBeenCalled();
  });

  it("requires a session", async () => {
    sessionUser = null;
    expect(await finishCalendarConnection({} as any, "google", state({ sourceId: "mine" }), tokens)).toBe("error=signed_out");
  });

  it("reports a failed first sync without failing the connection", async () => {
    sync.mockResolvedValue({ success: false, errors: ["boom"] });
    expect(await finishCalendarConnection({} as any, "google", state({ sourceId: "mine" }), tokens)).toMatch(/warning=first_sync_failed/);
  });
});
