import React from "react";
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import PlanPage from "@/components/plan/PlanPageContent";

const json = (body: unknown, status = 200) =>
  Promise.resolve(new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json" } }));

describe("PlanPage", () => {
  let generateBodies: any[];

  beforeEach(() => {
    generateBodies = [];
    vi.stubGlobal(
      "fetch",
      vi.fn((url: string, init?: RequestInit) => {
        if (url.startsWith("/api/calendar/events")) return json({ events: [] });
        if (url.startsWith("/api/location-travel-profiles")) return json({ profiles: [] });
        if (url === "/api/daily-plan/generate") {
          generateBodies.push(JSON.parse(String(init?.body)));
          return json({ plan: { timeBlocks: [] } });
        }
        return json({});
      }),
    );
  });
  afterEach(() => vi.unstubAllGlobals());

  it("sends the chosen anchor type, duration and onboarding sleep time", async () => {
    render(<PlanPage voice="plain" anchorless="choice" wakeDefault="08:00" sleepDefault="00:00" />);

    fireEvent.change(screen.getByPlaceholderText(/What, and when/i), { target: { value: "Linguistics lecture" } });
    fireEvent.change(screen.getByLabelText("anchor duration"), { target: { value: "120" } });
    fireEvent.click(screen.getByText("Use this anchor"));
    fireEvent.click(screen.getByText("Washed and dressed."));
    fireEvent.click(screen.getByText("A bit foggy."));
    fireEvent.click(screen.getByText(/Same location/));

    await waitFor(() => expect(generateBodies).toHaveLength(1));
    const body = generateBodies[0];
    expect(body.manualAnchor.anchor_type).toBe("class");
    const mins = (+new Date(body.manualAnchor.end_time) - +new Date(body.manualAnchor.start_time)) / 60000;
    expect(mins).toBe(120);
    // 00:00 sleep rolls over to after wake
    expect(+new Date(body.sleepTime)).toBeGreaterThan(+new Date(body.wakeTime));
    expect(new Date(body.sleepTime).getHours()).toBe(0);

    // Adjusting the type and rebuilding sends the new value
    await screen.findByText(/adjust · day bounds/);
    fireEvent.click(screen.getByText("Appt"));
    fireEvent.click(screen.getByText("Rebuild the chain"));
    await waitFor(() => expect(generateBodies).toHaveLength(2));
    expect(generateBodies[1].manualAnchor.anchor_type).toBe("appointment");
  });

});
