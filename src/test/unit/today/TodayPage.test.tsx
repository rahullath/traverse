import React from "react";
import { describe, it, expect, vi, afterEach } from "vitest";
import { render, screen } from "@testing-library/react";
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
