import { describe, it, expect, vi, beforeEach } from "vitest";

const mockGetUser = vi.fn();
const mockGetDailyPlanByDateWithBlocks = vi.fn();
const mockGenerateDailyPlan = vi.fn();

vi.mock("@/lib/supabase/server", () => ({
  createServerClient: () => ({
    auth: {
      getUser: mockGetUser,
    },
  }),
}));

vi.mock("@/lib/daily-plan/database", () => ({
  getDailyPlanByDateWithBlocks: mockGetDailyPlanByDateWithBlocks,
  deleteExitTimesByPlan: vi.fn(),
  deleteTimeBlocksByPlan: vi.fn(),
  deleteDailyPlan: vi.fn(),
}));

vi.mock("@/lib/daily-plan/plan-builder", () => ({
  createPlanBuilderService: () => ({
    generateDailyPlan: mockGenerateDailyPlan,
  }),
}));

describe("POST /api/daily-plan/generate - no-anchor flow", () => {
  beforeEach(() => {
    vi.clearAllMocks();

    mockGetUser.mockResolvedValue({
      data: { user: { id: "user-1" } },
      error: null,
    });

    mockGetDailyPlanByDateWithBlocks.mockResolvedValue(null);
    mockGenerateDailyPlan.mockResolvedValue({
      id: "plan-1",
      status: "active",
      timeBlocks: [],
    });
  });

  it("generates a plan without returning MANUAL_ANCHOR_REQUIRED when no anchors are provided", async () => {
    const { POST } = await import("@/pages/api/daily-plan/generate");

    const request = new Request("http://localhost/api/daily-plan/generate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        wakeTime: new Date().toISOString(),
        sleepTime: new Date(Date.now() + 12 * 60 * 60 * 1000).toISOString(),
        energyState: "medium",
      }),
    });

    const response = await POST({ request, cookies: {} } as any);
    const payload = await response.json();

    expect(response.status).toBe(201);
    expect(payload.plan).toBeDefined();
    expect(mockGenerateDailyPlan).toHaveBeenCalledTimes(1);
  });
});
