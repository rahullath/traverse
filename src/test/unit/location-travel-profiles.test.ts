import { describe, expect, it } from "vitest";
import {
  normalizeLocationLabel,
  selectDepartureSlotForAnchor,
  shouldSuppressTravel,
} from "@/lib/travel/location-travel-profiles";

describe("location travel profiles", () => {
  it("normalizes labels and suppresses home/same-location travel", () => {
    expect(normalizeLocationLabel("  University  Campus ")).toBe(
      "university campus",
    );
    expect(shouldSuppressTravel("Home", "Workplace")).toBe(true);
    expect(shouldSuppressTravel("University", "University")).toBe(true);
    expect(shouldSuppressTravel("University", "Workplace")).toBe(false);
  });

  it("selects latest feasible departure slot when planning ahead", () => {
    const anchorStart = new Date("2026-03-07T13:00:00.000Z");
    const effectiveDeadline = new Date("2026-03-07T13:10:00.000Z");
    const result = selectDepartureSlotForAnchor(
      anchorStart,
      effectiveDeadline,
      15,
      ["12:20", "12:27", "12:47"],
    );

    expect(result.selectedSlotLabel).toBe("12:47");
  });

  it("returns next feasible slot from current projection time", () => {
    const anchorStart = new Date("2026-03-07T13:00:00.000Z");
    const effectiveDeadline = new Date("2026-03-07T13:10:00.000Z");
    const now = new Date("2026-03-07T12:30:00.000Z");
    const result = selectDepartureSlotForAnchor(
      anchorStart,
      effectiveDeadline,
      15,
      ["12:20", "12:27", "12:47"],
      now,
    );

    expect(result.selectedSlotLabel).toBe("12:47");
    expect(result.nextFeasibleSlotLabel).toBe("12:47");
  });
});
