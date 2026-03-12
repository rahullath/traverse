import { beforeEach, describe, expect, it, vi } from "vitest";
import {
  clearQueuedMutations,
  flushQueuedMutations,
  getQueuedMutationCount,
  resilientMutationFetch,
} from "@/lib/triage/retry-handler";

function setOnlineState(isOnline: boolean) {
  Object.defineProperty(window.navigator, "onLine", {
    configurable: true,
    get: () => isOnline,
  });
}

describe("retry-handler resilient mutation queue", () => {
  beforeEach(() => {
    clearQueuedMutations();
    setOnlineState(true);
    vi.restoreAllMocks();
  });

  it("queues mutation and returns 202 when offline", async () => {
    setOnlineState(false);

    const response = await resilientMutationFetch("/api/test/mutation", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status: "completed" }),
    });

    expect(response.status).toBe(202);
    expect(getQueuedMutationCount()).toBe(1);
  });

  it("flushes queued mutations when back online", async () => {
    setOnlineState(false);
    await resilientMutationFetch("/api/test/mutation", {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
    });
    expect(getQueuedMutationCount()).toBe(1);

    setOnlineState(true);
    const fetchMock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 200 }));

    await flushQueuedMutations();

    expect(fetchMock).toHaveBeenCalledTimes(1);
    expect(getQueuedMutationCount()).toBe(0);
  });
});
