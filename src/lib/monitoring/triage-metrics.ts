// src/lib/monitoring/triage-metrics.ts
// Specific metrics tracking for triage-mirror-stateless feature

import { AnalyticsService, PerformanceTimer } from "./analytics";
import type { UserState } from "@/types/triage";

/**
 * Track runway calculation performance
 */
export function trackRunwayCalculation(
  durationMs: number,
  userId: string,
  metadata?: {
    hasAnchors?: boolean;
    blockCount?: number;
    hasSufficientTime?: boolean;
  },
): void {
  AnalyticsService.getInstance().trackMetric({
    name: "runway_calculation_latency",
    value: durationMs,
    timestamp: new Date(),
    userId,
    metadata,
  });
}

/**
 * Track recalculation performance and success
 */
export function trackRecalculation(
  success: boolean,
  durationMs: number,
  userId: string,
  metadata?: {
    anchorCount?: number;
    blockCount?: number;
    errorMessage?: string;
  },
): void {
  AnalyticsService.getInstance().trackMetric({
    name: "recalculation_latency",
    value: durationMs,
    timestamp: new Date(),
    userId,
    metadata: {
      ...metadata,
      success,
    },
  });

  AnalyticsService.getInstance().trackEvent({
    event: success ? "recalculation_success" : "recalculation_failure",
    userId,
    timestamp: new Date(),
    properties: metadata,
  });
}

/**
 * Track triage mode activation
 */
export function trackTriageActivation(
  userId: string,
  metadata: {
    runway: number;
    requiredDuration: number;
    keystoneActivity?: string;
    anchorType?: string;
  },
): void {
  AnalyticsService.getInstance().trackEvent({
    event: "triage_mode_activated",
    userId,
    timestamp: new Date(),
    properties: metadata,
  });
}

/**
 * Track triage decision
 */
export function trackTriageDecision(
  userId: string,
  decision: "protect_keystone" | "skip_anchor" | "recalculate",
  metadata?: {
    anchorId?: string;
    keystoneActivity?: string;
  },
): void {
  AnalyticsService.getInstance().trackEvent({
    event: "triage_decision",
    userId,
    timestamp: new Date(),
    properties: {
      decision,
      ...metadata,
    },
  });
}

/**
 * Track state declaration
 */
export function trackStateDeclaration(
  userId: string,
  state: UserState,
  metadata?: {
    selectedStepId?: string;
    hasAnchors?: boolean;
    triggeredTriage?: boolean;
  },
): void {
  AnalyticsService.getInstance().trackEvent({
    event: "state_declaration",
    userId,
    timestamp: new Date(),
    properties: {
      state,
      ...metadata,
    },
  });
}

/**
 * Track completion action
 */
export function trackCompletion(
  userId: string,
  action: "completed" | "skipped",
  metadata?: {
    blockId?: string;
    blockType?: string;
    skipReason?: string;
  },
): void {
  AnalyticsService.getInstance().trackEvent({
    event: "block_completion",
    userId,
    timestamp: new Date(),
    properties: {
      action,
      ...metadata,
    },
  });
}

/**
 * Track inline edit
 */
export function trackInlineEdit(
  userId: string,
  editType: "anchor" | "step" | "insert" | "delete",
  metadata?: {
    blockId?: string;
    changes?: string[];
    hadConflict?: boolean;
  },
): void {
  AnalyticsService.getInstance().trackEvent({
    event: "inline_edit",
    userId,
    timestamp: new Date(),
    properties: {
      editType,
      ...metadata,
    },
  });
}

/**
 * Track Mirror UI session
 */
export function trackMirrorSession(
  userId: string,
  action: "start" | "end",
  metadata?: {
    durationMs?: number;
    interactionCount?: number;
  },
): void {
  AnalyticsService.getInstance().trackEvent({
    event: `mirror_session_${action}`,
    userId,
    timestamp: new Date(),
    properties: metadata,
  });
}

/**
 * Get triage activation rate
 */
export function getTriageActivationRate(
  timeWindowMs: number = 86400000,
): number {
  const analytics = AnalyticsService.getInstance();
  const now = Date.now();

  // Count mirror loads
  const mirrorLoads = (analytics as any).events.filter(
    (e: any) =>
      e.event === "mirror_session_start" &&
      now - e.timestamp.getTime() < timeWindowMs,
  ).length;

  // Count triage activations
  const triageActivations = (analytics as any).events.filter(
    (e: any) =>
      e.event === "triage_mode_activated" &&
      now - e.timestamp.getTime() < timeWindowMs,
  ).length;

  if (mirrorLoads === 0) return 0;
  return triageActivations / mirrorLoads;
}

/**
 * Get state declaration usage by type
 */
export function getStateDeclarationUsage(
  timeWindowMs: number = 86400000,
): Record<UserState, number> {
  const analytics = AnalyticsService.getInstance();
  const now = Date.now();

  const declarations = (analytics as any).events.filter(
    (e: any) =>
      e.event === "state_declaration" &&
      now - e.timestamp.getTime() < timeWindowMs,
  );

  const usage: Record<string, number> = {
    starting_day: 0,
    ready_for_anchor: 0,
    mid_chain: 0,
    at_anchor: 0,
    missed_it: 0,
    just_checking: 0,
  };

  declarations.forEach((d: any) => {
    const state = d.properties?.state;
    if (state && usage[state] !== undefined) {
      usage[state]++;
    }
  });

  return usage as Record<UserState, number>;
}

/**
 * Get completion rate
 */
export function getCompletionRate(timeWindowMs: number = 86400000): number {
  const analytics = AnalyticsService.getInstance();
  const now = Date.now();

  const completions = (analytics as any).events.filter(
    (e: any) =>
      e.event === "block_completion" &&
      now - e.timestamp.getTime() < timeWindowMs,
  );

  const completed = completions.filter(
    (c: any) => c.properties?.action === "completed",
  ).length;

  if (completions.length === 0) return 0;
  return completed / completions.length;
}

/**
 * Create performance timer for runway calculation
 */
export function createRunwayTimer(userId: string): PerformanceTimer {
  return new PerformanceTimer("runway_calculation_latency", userId);
}

/**
 * Create performance timer for recalculation
 */
export function createRecalcTimer(
  userId: string,
  anchorCount: number,
): PerformanceTimer {
  return new PerformanceTimer("recalculation_latency", userId, { anchorCount });
}
