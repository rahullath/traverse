import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, waitFor, fireEvent } from "@testing-library/react";
import MirrorUI from "@/components/daily-plan/MirrorUI";

const mockFetch = vi.fn();
global.fetch = mockFetch;

vi.mock("@/lib/feature-flags", () => ({
  isFeatureEnabled: (flag: string) => {
    if (flag === "MIRROR_V2_ENABLED") return true;
    if (flag === "TRIAGE_MIRROR_ENABLED") return true;
    return false;
  },
}));

describe("Mirror V2 - Complete Wiring Integration Tests", () => {
  const mockUserId = "test-user-123";

  const createBlock = (
    id: string,
    name: string,
    startOffsetMin: number,
    durationMin: number,
    envelopeId: string,
    envelopeType: "prep" | "travel_there" | "anchor" | "travel_back" | "recovery",
    roleType: "chain-step" | "anchor" | "recovery" = "chain-step",
    anchorId = "anchor-1",
  ) => {
    const start = new Date(Date.now() + startOffsetMin * 60000);
    const end = new Date(start.getTime() + durationMin * 60000);

    return {
      id,
      planId: "plan-1",
      activityId: envelopeType === "anchor" ? anchorId : anchorId,
      activityName: name,
      startTime: start,
      endTime: end,
      activityType: envelopeType === "anchor" ? "commitment" : "routine",
      isFixed: true,
      sequenceOrder: startOffsetMin,
      status: "pending",
      metadata: {
        role: { type: roleType, required: true, chain_id: `chain-${anchorId}` },
        chain_id: `chain-${anchorId}`,
        anchor_id: anchorId,
        commitment_envelope: {
          envelope_id: envelopeId,
          envelope_type: envelopeType,
        },
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    } as any;
  };

  const singleAnchorData = {
    time_blocks: [
      createBlock("prep-1", "Shower", 30, 10, "env-1", "prep", "chain-step", "anchor-1"),
      createBlock(
        "travel-1",
        "Travel to Class",
        40,
        20,
        "env-1",
        "travel_there",
        "chain-step",
        "anchor-1",
      ),
      createBlock("anchor-1-block", "Class", 60, 60, "env-1", "anchor", "anchor", "anchor-1"),
      createBlock(
        "travel-back-1",
        "Travel from Class",
        120,
        20,
        "env-1",
        "travel_back",
        "chain-step",
        "anchor-1",
      ),
    ],
    runway: {
      runway: 120,
      required_duration: 75,
      next_anchor_id: "anchor-1",
      next_anchor_start: new Date(Date.now() + 60 * 60000).toISOString(),
      current_time: new Date().toISOString(),
      has_sufficient_time: true,
    },
    triage_state: {
      active: false,
      keystone_activity: null,
      anchor: null,
      options: [],
    },
    show_state_prompt: false,
    last_state_declaration: null,
  } as any;

  const multiAnchorData = {
    ...singleAnchorData,
    time_blocks: [
      createBlock("prep-a", "Feed cat", 20, 5, "env-a", "prep", "chain-step", "anchor-a"),
      createBlock(
        "travel-a",
        "Travel to Class",
        25,
        15,
        "env-a",
        "travel_there",
        "chain-step",
        "anchor-a",
      ),
      createBlock("anchor-a", "Class", 40, 60, "env-a", "anchor", "anchor", "anchor-a"),
      createBlock("prep-b", "Feed cat", 200, 5, "env-b", "prep", "chain-step", "anchor-b"),
      createBlock(
        "travel-b",
        "Travel to Seminar",
        205,
        15,
        "env-b",
        "travel_there",
        "chain-step",
        "anchor-b",
      ),
      createBlock(
        "anchor-b",
        "Seminar",
        220,
        60,
        "env-b",
        "anchor",
        "anchor",
        "anchor-b",
      ),
    ],
  } as any;

  const noAnchorData = {
    ...singleAnchorData,
    time_blocks: [
      createBlock("prep-only-1", "Shower", 30, 10, "env-free", "prep", "chain-step", "free"),
      createBlock(
        "prep-only-2",
        "Pack bag",
        40,
        8,
        "env-free",
        "prep",
        "chain-step",
        "free",
      ),
    ],
    runway: {
      runway: null,
      required_duration: null,
      next_anchor_id: null,
      next_anchor_start: null,
      current_time: new Date().toISOString(),
      has_sufficient_time: true,
    },
  } as any;

  const basePreferencesResponse = {
    data: {
      enable_usage_analytics: false,
      show_completion_controls: false,
      show_recovery_blocks: true,
      keystone_activity: "Shower",
      preferences: {
        felt_helpful_dismissed_dates: [],
      },
    },
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockClear();
    sessionStorage.clear();

    mockFetch.mockImplementation((url: string, options?: any) => {
      if (url === "/api/daily-plan/mirror") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(singleAnchorData) });
      }
      if (url === "/api/tokens/balance") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ balance: 100 }) });
      }
      if (url === "/api/auth/preferences") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(basePreferencesResponse) });
      }
      if (url === "/api/daily-plan/reality-check" && options?.method === "POST") {
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              possible_steps: ["Shower"],
              skipped_steps: [],
              alternatives: [
                {
                  id: "keystone_only",
                  label: "Just do keystone",
                  description: "Quick shower and go",
                  steps: ["Shower"],
                },
              ],
              runway: 120,
              required_duration: 75,
            }),
        });
      }

      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });
  });

  afterEach(() => {
    vi.restoreAllMocks();
    sessionStorage.clear();
  });

  it("shows intent prompt when anchors exist", async () => {
    render(<MirrorUI userId={mockUserId} />);

    await waitFor(() => {
      expect(screen.queryByText(/Loading mirror view/i)).not.toBeInTheDocument();
    });

    expect(screen.getByText(/What do you need\?/i)).toBeInTheDocument();
  });

  it("renders AnchorInfoCard and DepartureWaypoint in live timeline", async () => {
    render(<MirrorUI userId={mockUserId} />);

    await waitFor(() => {
      expect(screen.getByText(/Anchor at/i)).toBeInTheDocument();
      expect(screen.getByText(/Leave by/i)).toBeInTheDocument();
    });
  });

  it("persists selected display mode to sessionStorage", async () => {
    render(<MirrorUI userId={mockUserId} />);

    await waitFor(() => {
      expect(screen.getByText(/Full morning chain/i)).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole("button", { name: /Show full morning chain/i }),
    );

    await waitFor(() => {
      const storageKey = Object.keys(sessionStorage).find((key) =>
        key.startsWith("mirror_display_mode_"),
      );
      expect(storageKey).toBeDefined();
      if (!storageKey) {
        throw new Error("Expected mirror display mode key in sessionStorage");
      }
      expect(sessionStorage.getItem(storageKey)).toContain("full_chain");
    });
  });

  it("prevents repeated chain clutter in full_chain by showing one expanded chain", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url === "/api/daily-plan/mirror") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(multiAnchorData) });
      }
      if (url === "/api/tokens/balance") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ balance: 100 }) });
      }
      if (url === "/api/auth/preferences") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(basePreferencesResponse) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<MirrorUI userId={mockUserId} />);

    await waitFor(() => {
      expect(screen.getByText(/What do you need\?/i)).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole("button", { name: /Show full morning chain/i }),
    );

    await waitFor(() => {
      const feedCatEntries = screen.getAllByText("Feed cat");
      expect(feedCatEntries).toHaveLength(1);
      expect(screen.getAllByText("Class").length).toBeGreaterThan(0);
      expect(screen.getAllByText("Seminar").length).toBeGreaterThan(0);
    });
  });

  it("shows free activation prompt when no anchors exist", async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url === "/api/daily-plan/mirror") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(noAnchorData) });
      }
      if (url === "/api/tokens/balance") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve({ balance: 100 }) });
      }
      if (url === "/api/auth/preferences") {
        return Promise.resolve({ ok: true, json: () => Promise.resolve(basePreferencesResponse) });
      }
      return Promise.resolve({ ok: true, json: () => Promise.resolve({}) });
    });

    render(<MirrorUI userId={mockUserId} />);

    await waitFor(() => {
      expect(screen.getByText(/No anchors today/i)).toBeInTheDocument();
    });
  });

  it("calls reality check endpoint from AnchorInfoCard", async () => {
    render(<MirrorUI userId={mockUserId} />);

    await waitFor(() => {
      expect(screen.getByRole("button", { name: /Check if you can make this anchor/i })).toBeInTheDocument();
    });

    fireEvent.click(
      screen.getByRole("button", { name: /Check if you can make this anchor/i }),
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        "/api/daily-plan/reality-check",
        expect.objectContaining({ method: "POST" }),
      );
    });
  });
});
