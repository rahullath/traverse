import type { Anchor } from "@/lib/anchors/types";
import type {
  ChainStepInstance,
  CommitmentEnvelope,
  ExecutionChain,
} from "@/lib/chains/types";
import type { TimeBlock } from "@/types/daily-plan";

function mapBlockStatus(status: TimeBlock["status"]): ChainStepInstance["status"] {
  if (status === "completed") return "completed";
  if (status === "skipped") return "skipped";
  return "pending";
}

function deriveChainStatus(
  steps: ChainStepInstance[],
): ExecutionChain["status"] {
  if (steps.length > 0 && steps.every((step) => step.status === "completed")) {
    return "completed";
  }
  if (steps.some((step) => step.status === "in-progress")) {
    return "in-progress";
  }
  return "pending";
}

function createStepFromBlock(block: TimeBlock, chainId: string): ChainStepInstance {
  const duration = Math.max(
    1,
    Math.round((block.endTime.getTime() - block.startTime.getTime()) / 60_000),
  );

  return {
    step_id: String(block.metadata?.step_id || block.id),
    chain_id: chainId,
    name: block.activityName,
    start_time: new Date(block.startTime),
    end_time: new Date(block.endTime),
    duration,
    is_required: Boolean(block.metadata?.role?.required ?? true),
    can_skip_when_late: false,
    status: mapBlockStatus(block.status),
    role: block.metadata?.role?.type === "exit-gate" ? "exit-gate" : "chain-step",
    skip_reason: block.skipReason,
    metadata: {
      ...(block.metadata || {}),
      time_block_id: block.id,
    },
  };
}

function createEnvelopeStep(
  block: TimeBlock,
  chainId: string,
  role: ChainStepInstance["role"] = "chain-step",
): ChainStepInstance {
  const duration = Math.max(
    1,
    Math.round((block.endTime.getTime() - block.startTime.getTime()) / 60_000),
  );
  return {
    step_id: String(block.metadata?.step_id || block.id),
    chain_id: chainId,
    name: block.activityName,
    start_time: new Date(block.startTime),
    end_time: new Date(block.endTime),
    duration,
    is_required: Boolean(block.metadata?.role?.required ?? true),
    can_skip_when_late: false,
    status: mapBlockStatus(block.status),
    role,
    metadata: {
      ...(block.metadata || {}),
      time_block_id: block.id,
    },
  };
}

function pickEnvelopeBlock(
  blocks: TimeBlock[],
  envelopeId: string,
  envelopeType: "prep" | "travel_there" | "anchor" | "travel_back" | "recovery",
): TimeBlock | undefined {
  return blocks.find(
    (block) =>
      block.metadata?.commitment_envelope?.envelope_id === envelopeId &&
      block.metadata?.commitment_envelope?.envelope_type === envelopeType,
  );
}

function parseIsoDate(value: unknown, fallback: Date): Date {
  if (typeof value === "string" || typeof value === "number") {
    const parsed = new Date(value);
    if (!Number.isNaN(parsed.getTime())) {
      return parsed;
    }
  }
  return fallback;
}

export function buildExecutionChainsFromTimeBlocks(
  timeBlocks: TimeBlock[],
): ExecutionChain[] {
  const grouped = new Map<string, TimeBlock[]>();

  for (const block of timeBlocks) {
    const chainId = block.metadata?.chain_id || block.metadata?.role?.chain_id;
    if (typeof chainId !== "string" || !chainId) continue;
    if (!grouped.has(chainId)) {
      grouped.set(chainId, []);
    }
    grouped.get(chainId)!.push(block);
  }

  const chains: ExecutionChain[] = [];

  for (const [chainId, blocks] of grouped.entries()) {
    const sorted = [...blocks].sort((a, b) => {
      const timeDiff = a.startTime.getTime() - b.startTime.getTime();
      if (timeDiff !== 0) return timeDiff;
      return a.sequenceOrder - b.sequenceOrder;
    });

    const anchorBlock =
      sorted.find(
        (block) => block.metadata?.commitment_envelope?.envelope_type === "anchor",
      ) || sorted.find((block) => block.metadata?.role?.type === "anchor");
    if (!anchorBlock) continue;

    const envelopeId = anchorBlock.metadata?.commitment_envelope?.envelope_id;
    if (!envelopeId) continue;

    const prepBlock = pickEnvelopeBlock(sorted, envelopeId, "prep");
    const travelThereBlock = pickEnvelopeBlock(sorted, envelopeId, "travel_there");
    const travelBackBlock = pickEnvelopeBlock(sorted, envelopeId, "travel_back");
    const recoveryBlock = pickEnvelopeBlock(sorted, envelopeId, "recovery");

    if (!prepBlock || !recoveryBlock) {
      continue;
    }

    const anchor: Anchor = {
      id: String(
        anchorBlock.activityId ||
          anchorBlock.metadata?.anchor_id ||
          anchorBlock.id,
      ),
      title: anchorBlock.activityName,
      start: new Date(anchorBlock.startTime),
      end: new Date(anchorBlock.endTime),
      location:
        typeof anchorBlock.metadata?.anchor_location === "string"
          ? anchorBlock.metadata.anchor_location
          : undefined,
      type:
        typeof anchorBlock.metadata?.anchor_type === "string"
          ? (anchorBlock.metadata.anchor_type as Anchor["type"])
          : "other",
      must_attend: true,
      calendar_event_id: String(anchorBlock.activityId || anchorBlock.id),
      max_late_minutes: Math.max(
        0,
        Number(anchorBlock.metadata?.anchor_constraints?.max_late_minutes || 0),
      ),
      location_label:
        typeof anchorBlock.metadata?.travel_profile?.label === "string"
          ? anchorBlock.metadata.travel_profile.label
          : undefined,
    };

    const prepSteps = sorted
      .filter(
        (block) =>
          block.metadata?.commitment_envelope?.envelope_id === envelopeId &&
          block.metadata?.commitment_envelope?.envelope_type === "prep" &&
          (block.metadata?.role?.type === "chain-step" ||
            block.metadata?.role?.type === "exit-gate"),
      )
      .map((block) => createStepFromBlock(block, chainId));

    const commitmentEnvelope: CommitmentEnvelope = {
      envelope_id: envelopeId,
      prep: createEnvelopeStep(prepBlock, chainId, "chain-step"),
      travel_there: createEnvelopeStep(
        travelThereBlock || anchorBlock,
        chainId,
        "chain-step",
      ),
      anchor: createEnvelopeStep(anchorBlock, chainId, "anchor"),
      travel_back: createEnvelopeStep(
        travelBackBlock || recoveryBlock,
        chainId,
        "chain-step",
      ),
      recovery: createEnvelopeStep(recoveryBlock, chainId, "recovery"),
    };

    const timingSignals = anchorBlock.metadata?.timing_signals;
    const chainCompletionDeadline = timingSignals?.ready_to_leave_by
      ? parseIsoDate(
          timingSignals.ready_to_leave_by,
          commitmentEnvelope.travel_there.start_time,
        )
      : commitmentEnvelope.travel_there.start_time;

    chains.push({
      chain_id: chainId,
      anchor_id: anchor.id,
      anchor,
      chain_completion_deadline: chainCompletionDeadline,
      steps: prepSteps,
      commitment_envelope: commitmentEnvelope,
      status: deriveChainStatus(prepSteps),
      metadata: {
        reconstructed_from_time_blocks: true,
      },
    });
  }

  return chains.sort(
    (a, b) => a.anchor.start.getTime() - b.anchor.start.getTime(),
  );
}
