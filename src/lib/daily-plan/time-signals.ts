import type { TimeBlock } from "@/types/daily-plan";

export interface EnvelopeTimingSignals {
  envelope_id: string;
  anchor_id: string | null;
  suggested_start_by: Date;
  ready_to_leave_by: Date;
  anchor_at: Date;
  effective_arrival_deadline: Date;
  max_late_minutes: number;
  travel_duration_minutes: number;
  selected_departure_slot?: string;
  next_feasible_departure_slot?: string;
}

export interface TimingSignalDTO {
  envelope_id: string;
  anchor_id: string | null;
  suggested_start_by: string;
  ready_to_leave_by: string;
  anchor_at: string;
  effective_arrival_deadline: string;
  max_late_minutes: number;
  travel_duration_minutes: number;
  selected_departure_slot: string | null;
  next_feasible_departure_slot: string | null;
}

function toDate(value: unknown): Date | null {
  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    return value;
  }

  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }

  return null;
}

function toNumber(value: unknown, fallback = 0): number {
  if (typeof value === "number" && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === "string") {
    const parsed = Number(value);
    if (Number.isFinite(parsed)) {
      return parsed;
    }
  }

  return fallback;
}

function getEnvelopeId(block: TimeBlock): string | null {
  return block.metadata?.commitment_envelope?.envelope_id || null;
}

export function deriveEnvelopeTimingSignals(
  timeBlocks: TimeBlock[],
): Record<string, EnvelopeTimingSignals> {
  const grouped = new Map<string, TimeBlock[]>();

  for (const block of timeBlocks) {
    const envelopeId = getEnvelopeId(block);
    if (!envelopeId) continue;
    if (!grouped.has(envelopeId)) {
      grouped.set(envelopeId, []);
    }
    grouped.get(envelopeId)!.push(block);
  }

  const signals: Record<string, EnvelopeTimingSignals> = {};

  for (const [envelopeId, blocks] of grouped.entries()) {
    const anchorBlock =
      blocks.find(
        (block) => block.metadata?.commitment_envelope?.envelope_type === "anchor",
      ) || blocks.find((block) => block.metadata?.role?.type === "anchor");
    if (!anchorBlock) continue;

    const prepBlocks = blocks
      .filter(
        (block) => block.metadata?.commitment_envelope?.envelope_type === "prep",
      )
      .sort((a, b) => a.startTime.getTime() - b.startTime.getTime());

    const travelThereBlock = blocks.find(
      (block) => block.metadata?.commitment_envelope?.envelope_type === "travel_there",
    );

    const anchorAt = new Date(anchorBlock.startTime);
    const suggestedStartBy = prepBlocks[0]
      ? new Date(prepBlocks[0].startTime)
      : travelThereBlock
        ? new Date(travelThereBlock.startTime)
        : new Date(anchorAt);

    const readyToLeaveBy = travelThereBlock
      ? new Date(travelThereBlock.startTime)
      : new Date(anchorAt);

    const maxLateMinutes = Math.max(
      0,
      toNumber(
        anchorBlock.metadata?.anchor_constraints?.max_late_minutes ??
          anchorBlock.metadata?.max_late_minutes,
        0,
      ),
    );

    const effectiveArrivalDeadline = new Date(
      anchorAt.getTime() + maxLateMinutes * 60_000,
    );

    const selectedDepartureSlot =
      typeof travelThereBlock?.metadata?.travel_profile?.selected_slot === "string"
        ? travelThereBlock.metadata.travel_profile.selected_slot
        : undefined;

    const nextFeasibleDepartureSlot =
      typeof travelThereBlock?.metadata?.travel_profile?.next_feasible_slot ===
      "string"
        ? travelThereBlock.metadata.travel_profile.next_feasible_slot
        : undefined;

    const travelDurationMinutes = travelThereBlock
      ? Math.max(
          0,
          Math.floor(
            (travelThereBlock.endTime.getTime() -
              travelThereBlock.startTime.getTime()) /
              60_000,
          ),
        )
      : Math.max(
          0,
          Math.floor(
            (anchorAt.getTime() - readyToLeaveBy.getTime()) / 60_000,
          ),
        );

    signals[envelopeId] = {
      envelope_id: envelopeId,
      anchor_id: anchorBlock.activityId || anchorBlock.metadata?.anchor_id || null,
      suggested_start_by: suggestedStartBy,
      ready_to_leave_by: readyToLeaveBy,
      anchor_at: anchorAt,
      effective_arrival_deadline: effectiveArrivalDeadline,
      max_late_minutes: maxLateMinutes,
      travel_duration_minutes: travelDurationMinutes,
      selected_departure_slot: selectedDepartureSlot,
      next_feasible_departure_slot: nextFeasibleDepartureSlot,
    };
  }

  return signals;
}

export function attachTimingSignalsToTimeBlocks(
  timeBlocks: TimeBlock[],
): TimeBlock[] {
  const signalsByEnvelope = deriveEnvelopeTimingSignals(timeBlocks);

  return timeBlocks.map((block) => {
    const envelopeId = getEnvelopeId(block);
    const signal = envelopeId ? signalsByEnvelope[envelopeId] : undefined;
    if (!signal) return block;

    const metadata = block.metadata || {};
    return {
      ...block,
      metadata: {
        ...metadata,
        timing_signals: {
          suggested_start_by: signal.suggested_start_by.toISOString(),
          ready_to_leave_by: signal.ready_to_leave_by.toISOString(),
          anchor_at: signal.anchor_at.toISOString(),
          effective_arrival_deadline:
            signal.effective_arrival_deadline.toISOString(),
          max_late_minutes: signal.max_late_minutes,
          travel_duration_minutes: signal.travel_duration_minutes,
          selected_departure_slot: signal.selected_departure_slot,
          next_feasible_departure_slot: signal.next_feasible_departure_slot,
        },
      },
    };
  });
}

export function buildTimingSignalArray(
  timeBlocks: TimeBlock[],
): TimingSignalDTO[] {
  return Object.values(deriveEnvelopeTimingSignals(timeBlocks)).map((signal) => ({
    envelope_id: signal.envelope_id,
    anchor_id: signal.anchor_id,
    suggested_start_by: signal.suggested_start_by.toISOString(),
    ready_to_leave_by: signal.ready_to_leave_by.toISOString(),
    anchor_at: signal.anchor_at.toISOString(),
    effective_arrival_deadline: signal.effective_arrival_deadline.toISOString(),
    max_late_minutes: signal.max_late_minutes,
    travel_duration_minutes: signal.travel_duration_minutes,
    selected_departure_slot: signal.selected_departure_slot || null,
    next_feasible_departure_slot: signal.next_feasible_departure_slot || null,
  }));
}

export function getEffectiveArrivalDeadline(block: TimeBlock): Date | null {
  const deadline = toDate(block.metadata?.timing_signals?.effective_arrival_deadline);
  return deadline;
}
