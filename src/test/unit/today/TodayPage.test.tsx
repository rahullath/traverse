import React from "react";
import { describe, it, expect, vi, afterEach, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import TodayPage from "@/components/today/TodayPageContent";

describe("TodayPage error boundary", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("renders the fallback instead of a blank page when rendering throws", async () => {
    // Malformed payload: time_blocks missing makes the timeline render throw.
    vi.stubGlobal(
      "fetch",
      vi.fn(() =>
        Promise.resolve(
          new Response(JSON.stringify({ show_state_prompt: false, triage_state: {}, runway: null }), {
            status: 200,
            headers: { "Content-Type": "application/json" },
          }),
        ),
      ),
    );
    const spy = vi.spyOn(console, "error").mockImplementation(() => {});
    render(<TodayPage voice="plain" />);
    expect(await screen.findByText(/Today hit an error/i)).toBeTruthy();
    expect(screen.getByText("Try again")).toBeTruthy();
    spy.mockRestore();
  });
});

describe("TodayPage actions", () => {
  const inMin = (m: number) => new Date(Date.now() + m * 60000).toISOString();
  const block = (id: string, name: string, start: number, end: number, extra: Record<string, unknown> = {}) => ({
    id, planId: "p1", activityName: name, activityType: "routine", isFixed: false, sequenceOrder: 0,
    status: "pending", startTime: inMin(start), endTime: inMin(end), metadata: {}, ...extra,
  });
  const anchor = block("blk-anchor", "Lecture", 120, 180, {
    activityId: "act-anchor",
    metadata: { role: { type: "anchor", required: true } },
  });
  const mirror = {
    show_state_prompt: false,
    time_blocks: [block("s1", "Shower", 10, 30), block("s2", "Breakfast", 30, 50), anchor],
    timing_signals: [],
    runway: null,
    triage_state: { active: true, anchor, keystone_activity: null, options: [] },
  };

  let calls: { url: string; body: any }[];
  afterEach(() => vi.unstubAllGlobals());
  beforeEach(() => {
    calls = [];
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string, init?: RequestInit) => {
        const body = init?.body ? JSON.parse(String(init.body)) : undefined;
        calls.push({ url, body });
        const ok = (b: unknown) => Promise.resolve(new Response(JSON.stringify(b), { status: 200 }));
        if (url === "/api/daily-plan/mirror") return ok(mirror);
        if (url === "/api/daily-plan/reality-check")
          return ok({
            possible_steps: [{ id: "s1", activity_name: "Shower", duration: 20 }],
            skipped_steps: [{ id: "s2", activity_name: "Breakfast", duration: 20 }],
            alternatives: [
              { id: "keystone_only", label: "Just do keystone", description: "x", estimated_duration: 5 },
              { id: "skip_all", label: "Skip prep, just go", description: "y", estimated_duration: 0 },
            ],
            runway: 30,
            required_duration: 40,
          });
        return ok({});
      }),
    );
  });

  it("offers all six states and sends the picked mid-chain step", async () => {
    render(<TodayPage voice="plain" />);
    fireEvent.click(await screen.findByText("Declare a state"));
    for (const label of ["Just starting the day.", "Ready — I just need to leave.", "Somewhere in the middle.", "I'm already there.", "It's not happening today.", "Just looking."]) {
      expect(screen.getByText(label)).toBeTruthy();
    }
    fireEvent.click(screen.getByText("Somewhere in the middle."));
    fireEvent.click(await screen.findByText("Breakfast"));
    await waitFor(() => expect(calls.some((c) => c.url === "/api/daily-plan/state")).toBe(true));
    expect(calls.find((c) => c.url === "/api/daily-plan/state")!.body).toEqual({ state: "mid_chain", selected_step_id: "s2" });
  });

  it("runs a reality check and 'just go' skips the prep steps, not the anchor", async () => {
    render(<TodayPage voice="plain" />);
    fireEvent.click(await screen.findByText("What can I still fit?"));
    expect((await screen.findAllByText(/Shower/)).length).toBeGreaterThan(0);
    expect(calls.find((c) => c.url === "/api/daily-plan/reality-check")!.body).toEqual({ anchor_id: "act-anchor" });
    fireEvent.click(screen.getByText("Skip prep, just go"));
    await waitFor(() => expect(calls.filter((c) => c.url.includes("/complete")).length).toBe(2));
    const skipped = calls.filter((c) => c.url.includes("/complete")).map((c) => c.url);
    expect(skipped).toEqual(["/api/time-blocks/s1/complete", "/api/time-blocks/s2/complete"]);
  });

  it("sends the anchor's activityId to triage", async () => {
    render(<TodayPage voice="plain" />);
    fireEvent.click(await screen.findByText("What can I still fit?"));
    fireEvent.click(await screen.findByText("Just do keystone"));
    await waitFor(() => expect(calls.some((c) => c.url === "/api/daily-plan/triage")).toBe(true));
    expect(calls.find((c) => c.url === "/api/daily-plan/triage")!.body).toEqual({ mode: "protect_keystone", anchor_id: "act-anchor" });
  });
});
