import { describe, expect, it } from "vitest";
import {
  attachTimingSignalsToTimeBlocks,
  deriveEnvelopeTimingSignals,
} from "@/lib/daily-plan/time-signals";
import type { TimeBlock } from "@/types/daily-plan";

function block(
  id: string,
  start: string,
  end: string,
  envelopeType: "prep" | "travel_there" | "anchor" | "travel_back" | "recovery",
  metadata: Record<string, unknown> = {},
): TimeBlock {
  return {
    id,
    planId: "plan-1",
    activityType: "routine",
    activityName: id,
    activityId: "anchor-1",
    startTime: new Date(start),
    endTime: new Date(end),
    isFixed: true,
    sequenceOrder: 1,
    status: "pending",
    metadata: {
      role: { type: envelopeType === "anchor" ? "anchor" : "chain-step", required: true },
      anchor_id: "anchor-1",
      commitment_envelope: {
        envelope_id: "env-1",
        envelope_type: envelopeType,
      },
      ...metadata,
    },
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}

describe("time signals", () => {
  it("derives start/leave/anchor/effective-deadline from envelope metadata", () => {
    const blocks = [
      block("prep", "2026-03-07T11:40:00.000Z", "2026-03-07T12:20:00.000Z", "prep"),
      block(
        "travel",
        "2026-03-07T12:20:00.000Z",
        "2026-03-07T12:47:00.000Z",
        "travel_there",
      ),
      block(
        "anchor",
        "2026-03-07T13:00:00.000Z",
        "2026-03-07T14:00:00.000Z",
        "anchor",
        { anchor_constraints: { max_late_minutes: 10 } },
      ),
      block(
        "recovery",
        "2026-03-07T14:00:00.000Z",
        "2026-03-07T14:15:00.000Z",
        "recovery",
      ),
    ];

    const signals = deriveEnvelopeTimingSignals(blocks);
    expect(signals["env-1"].suggested_start_by.toISOString()).toBe(
      "2026-03-07T11:40:00.000Z",
    );
    expect(signals["env-1"].ready_to_leave_by.toISOString()).toBe(
      "2026-03-07T12:20:00.000Z",
    );
    expect(signals["env-1"].anchor_at.toISOString()).toBe(
      "2026-03-07T13:00:00.000Z",
    );
    expect(signals["env-1"].effective_arrival_deadline.toISOString()).toBe(
      "2026-03-07T13:10:00.000Z",
    );
  });

  it("attaches timing signals on every block in an envelope", () => {
    const blocks = [
      block("prep", "2026-03-07T11:40:00.000Z", "2026-03-07T12:20:00.000Z", "prep"),
      block(
        "anchor",
        "2026-03-07T13:00:00.000Z",
        "2026-03-07T14:00:00.000Z",
        "anchor",
      ),
    ];

    const enriched = attachTimingSignalsToTimeBlocks(blocks);
    expect(enriched.every((b) => Boolean(b.metadata?.timing_signals))).toBe(true);
  });
});
