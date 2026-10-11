import { describe, it, expect, vi, afterEach } from "vitest";
import { mutate } from "@/lib/net/mutate";

const json = (status: number, body: unknown) =>
  new Response(JSON.stringify(body), {
    status,
    headers: { "Content-Type": "application/json" },
  });

describe("mutate", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("sends an Idempotency-Key and reports success", async () => {
    const fetchMock = vi.fn().mockResolvedValue(json(200, { id: "b1" }));
    vi.stubGlobal("fetch", fetchMock);
    const r = await mutate("/api/x", "PATCH", { a: 1 }, "key-1");
    expect(r).toEqual({ ok: true, queued: false, data: { id: "b1" } });
    expect(fetchMock.mock.calls[0][1].headers["Idempotency-Key"]).toBe("key-1");
  });

  it("recognises an offline-queued response", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(202, { queued: true })));
    const r = await mutate("/api/x", "POST", {});
    expect(r.ok && r.queued).toBe(true);
  });

  it("surfaces server errors instead of swallowing them", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(500, { message: "boom" })));
    expect(await mutate("/api/x", "POST", {})).toEqual({ ok: false, status: 500, message: "boom" });
  });

  it("explains a signed-out session", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(json(401, {})));
    const r = await mutate("/api/x", "POST", {});
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.message).toMatch(/signed out/i);
  });

  it("reports a network failure that wasn't queued", async () => {
    vi.stubGlobal("fetch", vi.fn().mockRejectedValue(new TypeError("Failed to fetch")));
    const r = await mutate("/api/x", "POST", {});
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.status).toBe(0);
  });
});
