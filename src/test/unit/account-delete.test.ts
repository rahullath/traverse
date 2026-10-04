import { describe, it, expect, vi, beforeEach } from "vitest";

const rpc = vi.fn();
const signOut = vi.fn().mockResolvedValue({});
let authed = true;

vi.mock("../../lib/auth/simple-multi-user", () => ({
  createServerAuth: () => ({
    requireAuth: async () => {
      if (!authed) throw new Error("Authentication required");
      return { id: "user-1" };
    },
    supabase: { rpc, auth: { signOut } },
  }),
}));

import { POST } from "../../pages/api/account/delete";

const call = (body: unknown) =>
  POST({
    request: new Request("http://x/api/account/delete", { method: "POST", body: JSON.stringify(body) }),
    cookies: { delete: vi.fn() },
  } as any);

describe("POST /api/account/delete", () => {
  beforeEach(() => {
    authed = true;
    rpc.mockReset();
  });

  it("requires auth", async () => {
    authed = false;
    expect((await call({ confirm: "delete" })).status).toBe(401);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("requires explicit confirmation", async () => {
    expect((await call({})).status).toBe(400);
    expect(rpc).not.toHaveBeenCalled();
  });

  it("calls delete_my_account and signs out", async () => {
    rpc.mockResolvedValue({ error: null });
    const res = await call({ confirm: "delete" });
    expect(res.status).toBe(200);
    expect(rpc).toHaveBeenCalledWith("delete_my_account");
    expect(signOut).toHaveBeenCalled();
  });

  it("reports failure without claiming success", async () => {
    rpc.mockResolvedValue({ error: { message: "fk" } });
    const res = await call({ confirm: "delete" });
    expect(res.status).toBe(500);
  });
});
