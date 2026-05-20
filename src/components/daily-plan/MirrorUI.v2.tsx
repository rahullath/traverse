// src/components/daily-plan/MirrorUI.v2.tsx
// Phase 3: new visual shell around identical business logic.
// All state, effects, computed values, and handlers are unchanged from MirrorUI.tsx.
// Only the render layer is replaced with tv/ primitives.
import React, {
  useState,
  useEffect,
  useMemo,
  lazy,
  Suspense,
  useRef,
} from "react";
import type { MirrorData, TriageDecision, UserState } from "@/types/triage";
import type { TimeBlock } from "@/types/daily-plan";
import type {
  RealityCheckAlternative,
  RealityCheckResult,
} from "@/lib/display/reality-check";
import type { TelemetryEvent } from "@/lib/monitoring/mirror-analytics";

// Sub-components not yet reskinned — kept exactly as-is
import { StateDeclarationPrompt } from "./StateDeclarationPrompt";
import { RealityCheckPrompt } from "./RealityCheckPrompt";
import { IntentPrompt } from "./IntentPrompt";
import { FreeActivationPrompt } from "./FreeActivationPrompt";
import IntentSignalBanner from "./IntentSignalBanner";
import { InstallButton } from "@/components/pwa/InstallPrompt";
import {
  getQueuedMutationCount,
  resilientMutationFetch,
} from "@/lib/triage/retry-handler";
import { isFeatureEnabled } from "@/lib/feature-flags";
import {
  DisplayModeService,
  type DisplayIntent,
} from "@/lib/display/display-mode-service";
import {
  DisplayModeSerializer,
  type ChainStartTime,
  type DisplayModeState,
} from "@/lib/display/serializer";

// tv/ design system
import { Block, type BlockState } from "@/components/tv/Block";
import { Button } from "@/components/tv/Button";
import { Card } from "@/components/tv/Card";
import { Label } from "@/components/tv/Label";
import { Page } from "@/components/tv/Page";
import { Prompt } from "@/components/tv/Prompt";
import { Prose } from "@/components/tv/Prose";
import { Rule } from "@/components/tv/Rule";
import { Runway } from "@/components/tv/Runway";

// Voice register
import { copy, type Register } from "@/lib/copy/voice";

// Lazy-loaded heavy components
const TriagePrompt = lazy(() =>
  import("./TriagePrompt").then((m) => ({ default: m.TriagePrompt })),
);

const PromptLoadingFallback = () => (
  <div className="tv-card" style={{ opacity: 0.5 }}>
    <div className="tv-label">loading…</div>
  </div>
);

// ─── Helpers ─────────────────────────────────────────────────────

const ENV_LABELS: Record<string, string> = {
  prep:          "prep",
  travel_there:  "travel",
  anchor:        "anchor",
  travel_back:   "travel · back",
  recovery:      "recovery",
};

function toBlockState(block: TimeBlock, now: Date): BlockState {
  if (block.status === "completed" || block.status === "skipped") return "past";
  const start = new Date(block.startTime).getTime();
  const end   = new Date(block.endTime).getTime();
  const t     = now.getTime();
  if (t >= start && t < end) return "now";
  return "future";
}

function toBlockTime(block: TimeBlock, showTimes: boolean): string {
  if (!showTimes) return "";
  return new Date(block.startTime).toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

function toBlockMeta(block: TimeBlock): string {
  const env  = block.metadata?.commitment_envelope?.envelope_type;
  const role = block.metadata?.role?.type;
  if (env)  return ENV_LABELS[env] ?? env;
  if (role && role !== "chain-step") return role;
  return block.activityType ?? "";
}

function formatDate(d: Date): string {
  return d.toLocaleDateString("en-GB", {
    weekday: "short",
    day: "numeric",
    month: "short",
  }).replace(",", " ·");
}

function formatClock(d: Date): string {
  return d.toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });
}

// ─── Component ───────────────────────────────────────────────────

export interface MirrorUIV2Props {
  userId: string;
}

export default function MirrorUIV2({ userId }: MirrorUIV2Props) {
  // ── All state identical to MirrorUI.tsx ─────────────────────────
  const [data, setData] = useState<MirrorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [isAutoRecalculating, setIsAutoRecalculating] = useState(false);

  const [showRealityCheck, setShowRealityCheck] = useState(false);
  const [realityCheckResult, setRealityCheckResult] = useState<any>(null);
  const [realityCheckAnchorId, setRealityCheckAnchorId] = useState<string | null>(null);
  const [showTriageManually, setShowTriageManually] = useState(false);

  const [displayMode, setDisplayMode] = useState<DisplayIntent>("full_chain");
  const [showIntentPrompt, setShowIntentPrompt] = useState(true);
  const [chainStartTime, setChainStartTime] = useState<ChainStartTime>({ type: "now" });
  const [showTimes, setShowTimes] = useState(true);
  const [expandedAnchorId, setExpandedAnchorId] = useState<string | null>(null);
  const [showCompletionControls, setShowCompletionControls] = useState(false);
  const [showRecoveryBlocks, setShowRecoveryBlocks] = useState(true);
  const [isOnline, setIsOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [queuedMutationCount, setQueuedMutationCount] = useState(0);

  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const telemetryBatchRef = useRef<TelemetryEvent[]>([]);
  const telemetryTimerRef = useRef<NodeJS.Timeout | null>(null);

  const [showFeltHelpful, setShowFeltHelpful] = useState(false);
  const [feltHelpfulDismissed, setFeltHelpfulDismissed] = useState(false);

  // Live clock for tv-head
  const [now, setNow] = useState(new Date());
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);

  // Voice register (read from preferences — defaults to plain)
  const [voice, setVoice] = useState<Register>("plain");

  // Services
  const displayModeService = useMemo(() => new DisplayModeService(), []);
  const displayModeSerializer = useMemo(() => new DisplayModeSerializer(), []);

  // Feature flags
  const isFeatureDisabled = !isFeatureEnabled("TRIAGE_MIRROR_ENABLED");
  const isV2Enabled = isFeatureEnabled("MIRROR_V2_ENABLED");

  if (isFeatureDisabled) {
    return (
      <Page>
        <Prose style={{ margin: 0 }}>Mirror view is currently disabled.</Prose>
      </Page>
    );
  }

  // ── Memos (identical to MirrorUI.tsx) ───────────────────────────
  const memoizedRunway = useMemo(() => data?.runway || null, [data?.runway]);

  const memoizedTriageState = useMemo(() => (
    data?.triage_state || { active: false, keystone_activity: null, anchor: null, options: [] }
  ), [data?.triage_state]);

  const memoizedTimeBlocks = useMemo(() => data?.time_blocks || [], [data?.time_blocks]);

  const projectedCurrentTime = useMemo(() => {
    const n = new Date();
    switch (chainStartTime.type) {
      case "now":         return n;
      case "in_minutes":  return new Date(n.getTime() + chainStartTime.minutes * 60_000);
      case "at_time":     return new Date(chainStartTime.time);
      case "when_ready":  return null;
      default:            return n;
    }
  }, [chainStartTime]);

  const anchorBlocks = useMemo(() => (
    memoizedTimeBlocks.filter((b) => b.metadata?.role?.type === "anchor")
  ), [memoizedTimeBlocks]);

  const filteredTimeBlocks = useMemo(() => {
    if (!isV2Enabled) return memoizedTimeBlocks;
    const referenceTime = projectedCurrentTime || new Date();
    const keystoneId = displayModeService.findKeystoneId(memoizedTimeBlocks);
    const modeFiltered = displayModeService.applyDisplayMode(
      memoizedTimeBlocks, displayMode, keystoneId || undefined,
    );

    if (anchorBlocks.length > 1 && displayMode === "full_chain") {
      const nextAnchor =
        displayModeService.getNextAnchor(modeFiltered, referenceTime) ||
        modeFiltered.find((b) => b.metadata?.role?.type === "anchor");
      const activeAnchorId = expandedAnchorId || nextAnchor?.id;
      if (!activeAnchorId) return modeFiltered;

      const anchorChain    = displayModeService.getAnchorChain(modeFiltered, activeAnchorId);
      const collapsedAnchors = modeFiltered.filter(
        (b) => b.metadata?.role?.type === "anchor" && b.id !== activeAnchorId,
      );
      const activeChainIds = new Set(anchorChain.map((b) => b.id));
      const supplementalBlocks = modeFiltered.filter((b) => {
        if (activeChainIds.has(b.id)) return false;
        if (collapsedAnchors.some((a) => a.id === b.id)) return false;
        return !b.metadata?.commitment_envelope?.envelope_id;
      });

      const deduped = new Map<string, TimeBlock>();
      for (const b of [...anchorChain, ...collapsedAnchors, ...supplementalBlocks]) {
        if (!deduped.has(b.id)) deduped.set(b.id, b);
      }
      return Array.from(deduped.values()).sort(
        (a, b) => new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      );
    }

    return modeFiltered;
  }, [isV2Enabled, memoizedTimeBlocks, displayMode, anchorBlocks, expandedAnchorId, projectedCurrentTime, displayModeService]);

  const keystoneActivity = useMemo(() => {
    const k = memoizedTimeBlocks.find(
      (b) =>
        b.metadata?.role?.type === "chain-step" &&
        (b.activityName.toLowerCase().includes("shower") ||
          b.activityName.toLowerCase().includes("meds")),
    );
    return k?.activityName || null;
  }, [memoizedTimeBlocks]);

  const projectionNote = useMemo(() => {
    if (!isV2Enabled) return null;
    if (!projectedCurrentTime) return "When ready mode: sequence first, clock pressure reduced.";
    const nextAnchor = displayModeService.getNextAnchor(memoizedTimeBlocks, projectedCurrentTime);
    if (!nextAnchor) return "No upcoming anchors. Free activation mode.";
    const timing = nextAnchor.metadata?.timing_signals;
    if (!timing?.ready_to_leave_by || !timing?.effective_arrival_deadline) return null;

    const leaveBy          = new Date(timing.ready_to_leave_by);
    const effectiveDeadline = new Date(timing.effective_arrival_deadline);
    const projectedMs      = projectedCurrentTime.getTime();

    if (projectedMs <= leaveBy.getTime()) {
      return `On track. Leave by ${formatClock(leaveBy)}.`;
    }
    if (projectedMs <= effectiveDeadline.getTime()) {
      const lateBy = Math.max(0, Math.round((projectedMs - leaveBy.getTime()) / 60_000));
      const nextSlot = timing.next_feasible_departure_slot;
      return nextSlot
        ? `Likely late by ${lateBy}m. Next feasible departure slot: ${nextSlot}.`
        : `Likely late by ${lateBy}m. Latest viable arrival: ${formatClock(effectiveDeadline)}.`;
    }
    const missedBy = Math.max(0, Math.round((projectedMs - effectiveDeadline.getTime()) / 60_000));
    return `Past effective arrival deadline by ${missedBy}m.`;
  }, [isV2Enabled, projectedCurrentTime, memoizedTimeBlocks, displayModeService]);

  // ── Effects (identical to MirrorUI.tsx) ─────────────────────────
  useEffect(() => {
    initializeMirrorView();
    loadTokenBalance();
    loadAnalyticsPreference();
    checkFeltHelpfulPrompt();
  }, [userId]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const onOnline  = () => setIsOnline(true);
    const onOffline = () => setIsOnline(false);
    const onQueue   = (e: Event) => {
      const size = Number((e as CustomEvent<{ size?: number }>).detail?.size || 0);
      setQueuedMutationCount(size);
    };
    window.addEventListener("online", onOnline);
    window.addEventListener("offline", onOffline);
    window.addEventListener("offline-queue-size", onQueue as EventListener);
    setQueuedMutationCount(getQueuedMutationCount());
    return () => {
      window.removeEventListener("online", onOnline);
      window.removeEventListener("offline", onOffline);
      window.removeEventListener("offline-queue-size", onQueue as EventListener);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (telemetryTimerRef.current) {
        clearInterval(telemetryTimerRef.current);
        flushTelemetryBatch();
      }
    };
  }, []);

  useEffect(() => {
    if (isV2Enabled && analyticsEnabled) {
      telemetryTimerRef.current = setInterval(() => flushTelemetryBatch(), 30_000);
      return () => { if (telemetryTimerRef.current) clearInterval(telemetryTimerRef.current); };
    }
  }, [isV2Enabled, analyticsEnabled]);

  useEffect(() => {
    if (isV2Enabled && analyticsEnabled && data) {
      const hadAnchorToday = anchorBlocks.length > 0;
      const nextAnchor = displayModeService.getNextAnchor(memoizedTimeBlocks, new Date());
      const timeUntilNextAnchor = nextAnchor
        ? Math.floor((new Date(nextAnchor.startTime).getTime() - Date.now()) / 60_000)
        : null;
      recordTelemetryEvent({ event_type: "app_open", had_anchor_today: hadAnchorToday, time_until_next_anchor: timeUntilNextAnchor });
    }
  }, [isV2Enabled, analyticsEnabled, data]);

  useEffect(() => {
    displayModeSerializer.clearOldEntries();
    if (isV2Enabled) {
      const stored = displayModeSerializer.loadFromStorage();
      if (stored) {
        const isToday = new Date(stored.timestamp).toDateString() === new Date().toDateString();
        if (isToday) {
          setDisplayMode(stored.mode);
          setChainStartTime(stored.startTime);
          setShowTimes(stored.showTimes);
          setShowIntentPrompt(false);
        } else {
          displayModeSerializer.clearOldEntries();
        }
      }
    }
  }, [isV2Enabled]);

  useEffect(() => {
    if (!isV2Enabled || !data) return;
    const checkPassedAnchors = () => {
      const anchors = memoizedTimeBlocks.filter((b) => b.metadata?.role?.type === "anchor");
      const passed  = anchors.find((a) => displayModeService.hasAnchorPassed(a, new Date()));
      if (passed) setShowIntentPrompt(true);
    };
    checkPassedAnchors();
    const interval = setInterval(checkPassedAnchors, 60_000);
    const onVisibility = () => { if (!document.hidden) checkPassedAnchors(); };
    document.addEventListener("visibilitychange", onVisibility);
    return () => { clearInterval(interval); document.removeEventListener("visibilitychange", onVisibility); };
  }, [isV2Enabled, data, memoizedTimeBlocks]);

  useEffect(() => {
    if (!isV2Enabled || !data || feltHelpfulDismissed) return;
    const checkEndOfDay = () => {
      const n = new Date();
      if (n.getHours() >= 22) { setShowFeltHelpful(true); return; }
      const anchors = memoizedTimeBlocks.filter((b) => b.metadata?.role?.type === "anchor");
      if (anchors.length > 0) {
        const last      = anchors[anchors.length - 1];
        const twoHoursAfter = new Date(new Date(last.startTime).getTime() + 2 * 60 * 60 * 1000);
        if (n >= twoHoursAfter) setShowFeltHelpful(true);
      }
    };
    checkEndOfDay();
    const interval = setInterval(checkEndOfDay, 5 * 60 * 1000);
    return () => clearInterval(interval);
  }, [isV2Enabled, data, memoizedTimeBlocks, feltHelpfulDismissed]);

  useEffect(() => {
    if (!isV2Enabled) return;
    if (anchorBlocks.length <= 1) { if (expandedAnchorId !== null) setExpandedAnchorId(null); return; }
    if (expandedAnchorId) return;
    const nextAnchor =
      displayModeService.getNextAnchor(memoizedTimeBlocks, projectedCurrentTime || new Date()) ||
      anchorBlocks[0];
    if (nextAnchor) setExpandedAnchorId(nextAnchor.id);
  }, [isV2Enabled, anchorBlocks, expandedAnchorId, memoizedTimeBlocks, projectedCurrentTime, displayModeService]);

  // ── Async handlers (identical to MirrorUI.tsx) ──────────────────
  async function loadTokenBalance() {
    try {
      const r = await fetch("/api/tokens/balance");
      if (r.ok) { const d = await r.json(); setTokenBalance(d.balance); }
    } catch { /* non-critical */ }
  }

  async function loadAnalyticsPreference() {
    try {
      const r = await fetch("/api/auth/preferences");
      if (r.ok) {
        const d = await r.json();
        const prefs  = d?.data || {};
        const nested = prefs?.preferences || {};
        setAnalyticsEnabled(prefs?.enable_usage_analytics === true || nested?.enable_usage_analytics === true);
        setShowCompletionControls(prefs?.show_completion_controls === true || nested?.show_completion_controls === true);
        setShowRecoveryBlocks(prefs?.show_recovery_blocks !== false && nested?.show_recovery_blocks !== false);
        // Read voice register
        const reg = prefs?.voice || nested?.voice;
        if (reg === "clinical" || reg === "warm" || reg === "plain") setVoice(reg);
      }
    } catch {
      setAnalyticsEnabled(false);
      setShowCompletionControls(false);
      setShowRecoveryBlocks(true);
    }
  }

  async function checkFeltHelpfulPrompt() {
    try {
      const r = await fetch("/api/auth/preferences");
      if (r.ok) {
        const d = await r.json();
        const dismissedDates = d?.data?.preferences?.felt_helpful_dismissed_dates || [];
        const today = new Date().toISOString().split("T")[0];
        if (dismissedDates.includes(today)) setFeltHelpfulDismissed(true);
      }
    } catch { /* non-critical */ }
  }

  async function handleFeltHelpfulSubmit(response: "yes" | "somewhat" | "not_really") {
    try {
      await fetch("/api/analytics/felt-helpful", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response, date: new Date().toISOString().split("T")[0] }),
      });
    } catch { /* fail silently */ }
    setShowFeltHelpful(false);
    setFeltHelpfulDismissed(true);
  }

  async function handleFeltHelpfulDismiss() {
    try {
      await fetch("/api/analytics/felt-helpful", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: "not_really", date: new Date().toISOString().split("T")[0] }),
      });
    } catch { /* fail silently */ }
    setShowFeltHelpful(false);
    setFeltHelpfulDismissed(true);
  }

  function recordTelemetryEvent(event: TelemetryEvent) {
    if (!analyticsEnabled) return;
    telemetryBatchRef.current.push(event);
  }

  async function flushTelemetryBatch() {
    if (telemetryBatchRef.current.length === 0) return;
    const batch = [...telemetryBatchRef.current];
    telemetryBatchRef.current = [];
    for (const event of batch) {
      fetch("/api/analytics/telemetry", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ event_type: event.event_type, event_data: event }),
      }).catch(() => {});
    }
  }

  async function initializeMirrorView() {
    try {
      setLoading(true);
      setError(null);
      if (isFeatureEnabled("STATELESS_RECALC_ENABLED")) {
        const prefsR = await fetch("/api/auth/preferences");
        if (prefsR.ok) {
          const prefsD = await prefsR.json();
          if (prefsD?.data?.preferences?.recalc_on_open === true) {
            setIsAutoRecalculating(true);
            await fetch("/api/daily-plan/recalculate", { method: "POST" }).catch(() => {});
            setIsAutoRecalculating(false);
          }
        }
      }
      await loadMirrorData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to initialize mirror view");
      setLoading(false);
      setIsAutoRecalculating(false);
    }
  }

  async function loadMirrorData() {
    try {
      setLoading(true);
      const r = await fetch("/api/daily-plan/mirror");
      if (!r.ok) throw new Error(r.status === 404 ? "No plan found for today" : "Failed to load mirror data");
      setData(await r.json());
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function handleRecalculate() {
    if (!isFeatureEnabled("STATELESS_RECALC_ENABLED")) { setError("Recalculation is currently disabled"); return; }
    try {
      setLoading(true);
      setError(null);
      const r = await fetch("/api/daily-plan/recalculate", { method: "POST" });
      if (!r.ok) throw new Error(r.status === 408 ? "Recalculation timed out. Please try again." : "Recalculation failed");
      await loadMirrorData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Recalculation failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleStateDeclaration(state: UserState, stepId?: string) {
    if (!isFeatureEnabled("STATE_DECLARATION_ENABLED")) { setError("State declaration is currently disabled"); return; }
    try {
      setError(null);
      const r = await fetch("/api/daily-plan/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state, selected_step_id: stepId }),
      });
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.error || "State declaration failed"); }
      await loadMirrorData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "State declaration failed");
    }
  }

  async function handleTriageDecision(decision: TriageDecision) {
    try {
      setError(null);
      const r = await fetch("/api/daily-plan/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(decision),
      });
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.error || "Triage decision failed"); }
      const result = await r.json();
      if (result.recalc_triggered || decision.mode === "recalculate") {
        await loadMirrorData();
      } else {
        setData((prev) => prev ? {
          ...prev,
          time_blocks: result.time_blocks || prev.time_blocks,
          triage_state: { ...prev.triage_state, active: false },
        } : null);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Triage decision failed");
    }
  }

  function patchLocalBlockStatus(blockId: string, status: "completed" | "skipped", skipReason?: string) {
    setData((prev) => {
      if (!prev) return prev;
      return {
        ...prev,
        time_blocks: prev.time_blocks.map((b) =>
          b.id === blockId ? { ...b, status, skipReason: status === "skipped" ? skipReason : undefined } : b,
        ),
      };
    });
  }

  async function handleBlockComplete(blockId: string) {
    try {
      setError(null);
      const r = await resilientMutationFetch(
        `/api/time-blocks/${blockId}/complete`,
        { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "completed" }) },
        { maxRetries: 1, initialDelay: 2000 },
      );
      if (r.status === 202) { patchLocalBlockStatus(blockId, "completed"); return; }
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.message || "Failed to mark block as complete"); }
      await loadMirrorData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to mark block as complete");
    }
  }

  async function handleBlockSkip(blockId: string, reason: string) {
    try {
      setError(null);
      const r = await resilientMutationFetch(
        `/api/time-blocks/${blockId}/complete`,
        { method: "PATCH", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ status: "skipped", skip_reason: reason }) },
        { maxRetries: 1, initialDelay: 2000 },
      );
      if (r.status === 202) { patchLocalBlockStatus(blockId, "skipped", reason); return; }
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.message || "Failed to skip block"); }
      await loadMirrorData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to skip block");
    }
  }

  async function handleBlockDelete(blockId: string) {
    try {
      setError(null);
      const r = await resilientMutationFetch(
        `/api/time-blocks/${blockId}/delete`,
        { method: "DELETE", headers: { "x-idempotency-key": `time-block:${blockId}:delete` } },
        { maxRetries: 1, initialDelay: 1500 },
      );
      if (r.status === 202) {
        setData((prev) => prev ? { ...prev, time_blocks: prev.time_blocks.filter((b) => b.id !== blockId) } : prev);
        return;
      }
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.error || "Failed to delete anchor"); }
      await loadMirrorData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete anchor");
    }
  }

  function normalizeRealityCheckResult(raw: any): RealityCheckResult {
    const n = new Date();
    const toDate = (v: unknown, fallback: Date): Date => {
      if (v instanceof Date && !Number.isNaN(v.getTime())) return v;
      if (typeof v === "string" || typeof v === "number") { const p = new Date(v); if (!Number.isNaN(p.getTime())) return p; }
      return fallback;
    };
    const toNum = (v: unknown, fb = 0): number => {
      if (typeof v === "number" && Number.isFinite(v)) return v;
      if (typeof v === "string") { const p = Number(v); if (Number.isFinite(p)) return p; }
      return fb;
    };
    const mapStep = (step: any, i: number): TimeBlock => {
      if (typeof step === "string") {
        const s = new Date(n.getTime() + i * 15 * 60000);
        return { id: `rc-${i}`, planId: "", activityName: step, activityType: "routine", startTime: s, endTime: new Date(s.getTime() + 15 * 60000), isFixed: false, sequenceOrder: i, status: "pending", createdAt: n, updatedAt: n };
      }
      const s = toDate(step?.startTime ?? step?.start_time, n);
      const dur = toNum(step?.duration, 15);
      return {
        id: typeof step?.id === "string" && step.id.length > 0 ? step.id : `rc-${i}`,
        planId: "", activityName: step?.activityName ?? step?.activity_name ?? `Step ${i + 1}`,
        activityType: "routine", startTime: s, endTime: toDate(step?.endTime ?? step?.end_time, new Date(s.getTime() + dur * 60000)),
        isFixed: false, sequenceOrder: i, status: "pending", createdAt: n, updatedAt: n,
      };
    };
    const mapAlt = (alt: any, i: number): RealityCheckAlternative => ({
      id: typeof alt?.id === "string" && alt.id.length > 0 ? alt.id : `alt-${i}`,
      label: alt?.label ?? `Option ${i + 1}`,
      description: alt?.description ?? "",
      steps: Array.isArray(alt?.steps) ? alt.steps.map((s: any, si: number) => mapStep(s, si)) : [],
      estimatedDuration: toNum(alt?.estimatedDuration ?? alt?.estimated_duration, 0),
    });
    const stepsRaw = Array.isArray(raw?.possibleSteps) ? raw.possibleSteps : Array.isArray(raw?.possible_steps) ? raw.possible_steps : [];
    const skippedRaw = Array.isArray(raw?.skippedSteps) ? raw.skippedSteps : Array.isArray(raw?.skipped_steps) ? raw.skipped_steps : [];
    const altsRaw = Array.isArray(raw?.alternatives) ? raw.alternatives : [];
    return {
      possibleSteps: stepsRaw.map((s: any, i: number) => mapStep(s, i)),
      skippedSteps: skippedRaw.map((s: any, i: number) => mapStep(s, i)),
      canMakeAnchor: raw?.canMakeAnchor === true || raw?.can_make_anchor === true,
      alternatives: altsRaw.map((a: any, i: number) => mapAlt(a, i)),
      runway: toNum(raw?.runway, 0),
      requiredDuration: toNum(raw?.requiredDuration ?? raw?.required_duration, 0),
    };
  }

  async function handleRealityCheck(anchorId: string) {
    try {
      setError(null);
      const r = await fetch("/api/daily-plan/reality-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anchor_id: anchorId }),
      });
      if (!r.ok) { const d = await r.json().catch(() => ({})); throw new Error(d.message || "Reality check failed"); }
      const result = normalizeRealityCheckResult(await r.json());
      setRealityCheckResult(result);
      setRealityCheckAnchorId(anchorId);
      setShowRealityCheck(true);
      if (isV2Enabled && analyticsEnabled) {
        recordTelemetryEvent({ event_type: "reality_check_request", runway: result.runway || 0, required_duration: result.requiredDuration || 0, anchor_id: anchorId });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reality check failed");
    }
  }

  async function handleAlternativeSelection(alternativeId: string) {
    if (!realityCheckAnchorId) return;
    try {
      setError(null);
      switch (alternativeId) {
        case "keystone_only": await handleTriageDecision({ mode: "protect_keystone", anchor_id: realityCheckAnchorId }); break;
        case "skip_all":      await handleTriageDecision({ mode: "skip_anchor",      anchor_id: realityCheckAnchorId }); break;
      }
      setShowRealityCheck(false);
      setRealityCheckResult(null);
      setRealityCheckAnchorId(null);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to apply alternative");
    }
  }

  function handleDismissRealityCheck() {
    setShowRealityCheck(false);
    setRealityCheckResult(null);
    setRealityCheckAnchorId(null);
  }

  function handleIntentSelection(intent: DisplayIntent, startTime?: ChainStartTime) {
    const prev = displayMode;
    setDisplayMode(intent);
    if (startTime) { setChainStartTime(startTime); setShowTimes(startTime.type !== "when_ready"); }
    setShowIntentPrompt(false);
    displayModeSerializer.saveToStorage({ mode: intent, startTime: startTime || chainStartTime, showTimes: startTime ? startTime.type !== "when_ready" : showTimes, timestamp: new Date() });
    if (isV2Enabled && analyticsEnabled) {
      if (prev !== intent) recordTelemetryEvent({ event_type: "display_mode_switch", from_mode: prev, to_mode: intent });
      if (intent === "keystone_focus" && keystoneActivity) recordTelemetryEvent({ event_type: "keystone_view", keystone_type: keystoneActivity, display_mode: intent });
    }
    if (intent === "reality_check") {
      const next = displayModeService.getNextAnchor(memoizedTimeBlocks, new Date());
      if (next?.activityId) handleRealityCheck(next.activityId);
    }
  }

  function handleDisplayModeChange(mode: DisplayIntent) {
    const prev = displayMode;
    setDisplayMode(mode);
    displayModeSerializer.saveToStorage({ mode, startTime: chainStartTime, showTimes, timestamp: new Date() });
    if (isV2Enabled && analyticsEnabled && prev !== mode) recordTelemetryEvent({ event_type: "display_mode_switch", from_mode: prev, to_mode: mode });
  }

  function handleKeystoneShortcut() {
    const prev = displayMode;
    setDisplayMode("keystone_focus");
    setShowIntentPrompt(false);
    displayModeSerializer.saveToStorage({ mode: "keystone_focus", startTime: chainStartTime, showTimes, timestamp: new Date() });
    if (isV2Enabled && analyticsEnabled) {
      if (keystoneActivity) recordTelemetryEvent({ event_type: "keystone_view", keystone_type: keystoneActivity, display_mode: "keystone_focus" });
      if (prev !== "keystone_focus") recordTelemetryEvent({ event_type: "display_mode_switch", from_mode: prev, to_mode: "keystone_focus" });
    }
  }

  function handleFreeActivationStart(startTime: ChainStartTime) {
    setChainStartTime(startTime);
    setShowTimes(startTime.type !== "when_ready");
    setDisplayMode("full_chain");
    setShowIntentPrompt(false);
    displayModeSerializer.saveToStorage({ mode: "full_chain", startTime, showTimes: startTime.type !== "when_ready", timestamp: new Date() });
  }

  function handleKeystoneOnly() {
    const prev = displayMode;
    setDisplayMode("keystone_focus");
    setShowIntentPrompt(false);
    displayModeSerializer.saveToStorage({ mode: "keystone_focus", startTime: { type: "now" }, showTimes: true, timestamp: new Date() });
    if (isV2Enabled && analyticsEnabled) {
      if (keystoneActivity) recordTelemetryEvent({ event_type: "keystone_view", keystone_type: keystoneActivity, display_mode: "keystone_focus" });
      if (prev !== "keystone_focus") recordTelemetryEvent({ event_type: "display_mode_switch", from_mode: prev, to_mode: "keystone_focus" });
    }
  }

  function handleAnchorExpand(anchorId: string) {
    setExpandedAnchorId(anchorId);
  }

  // ── Render ───────────────────────────────────────────────────────

  if (loading) {
    return (
      <Page>
        <Label>{isAutoRecalculating ? "recalculating plan…" : "loading…"}</Label>
      </Page>
    );
  }

  if (error) {
    const noPlan = error.includes("No plan");
    return (
      <Page>
        <Prompt
          label="something went wrong"
          title={error}
          caption={
            noPlan
              ? "Generate a daily plan first to use the mirror view."
              : error.includes("timed out")
              ? "The operation took too long. Please try again."
              : "There was a problem loading your plan."
          }
        >
          <Button onClick={() => { setError(null); loadMirrorData(); }} hint="→">
            Retry
          </Button>
          {noPlan && (
            <Button onClick={() => { window.location.href = "/daily-plan"; }} hint="→">
              Generate a plan
            </Button>
          )}
          {error.includes("Recalculation") && (
            <Button onClick={() => { setError(null); handleRecalculate(); }} hint="→">
              Try recalculate again
            </Button>
          )}
        </Prompt>
      </Page>
    );
  }

  if (!data) {
    return (
      <Page>
        <Prose style={{ margin: 0 }}>No data available.</Prose>
      </Page>
    );
  }

  // Compute runway display values
  const runway = memoizedRunway;
  const runwayMin = runway?.runway ?? null;
  const requiredMin = runway?.required_duration ?? null;
  const hasSufficientTime = runway?.has_sufficient_time ?? true;
  const nextAnchorName = anchorBlocks[0]?.activityName ?? "";

  const blocksToShow = isV2Enabled ? filteredTimeBlocks : memoizedTimeBlocks;

  return (
    <Page>
      {/* Date / time header */}
      <header className="tv-head">
        <div className="tv-head__date">{formatDate(now)}</div>
        <div style={{ display: "flex", gap: 12, alignItems: "baseline" }}>
          {displayMode !== "full_chain" && (
            <button
              className="tv-close"
              onClick={() => handleDisplayModeChange("full_chain")}
              title="Show full chain"
            >
              {displayMode.replace(/_/g, " ")}
            </button>
          )}
          <div className="tv-head__clock">{formatClock(now)}</div>
        </div>
      </header>

      {/* Offline / queue banner */}
      {(!isOnline || queuedMutationCount > 0) && (
        <Label>
          {!isOnline
            ? "offline — actions will sync when connection returns"
            : `connection unstable — ${queuedMutationCount} action${queuedMutationCount === 1 ? "" : "s"} queued`}
        </Label>
      )}

      <InstallButton />

      {/* Intent / free activation prompts — kept as-is, reskinned in Phase 7 */}
      <IntentSignalBanner userId={userId} onGeneratePlan={() => { window.location.href = "/daily-plan"; }} />

      {isV2Enabled && showIntentPrompt && anchorBlocks.length > 0 && (
        <IntentPrompt
          anchors={anchorBlocks}
          keystoneActivity={keystoneActivity}
          currentTime={new Date()}
          onSelectIntent={handleIntentSelection}
          onDismiss={() => setShowIntentPrompt(false)}
        />
      )}

      {isV2Enabled && showIntentPrompt && anchorBlocks.length === 0 && (
        <FreeActivationPrompt
          keystoneActivity={keystoneActivity}
          onStartChain={handleFreeActivationStart}
          onKeystoneOnly={handleKeystoneOnly}
          onDismiss={() => setShowIntentPrompt(false)}
        />
      )}

      {/* Triage prompt (lazy) */}
      {isV2Enabled
        ? showTriageManually && memoizedTriageState.active && runway && (
            <Suspense fallback={<PromptLoadingFallback />}>
              <TriagePrompt triageState={memoizedTriageState} runway={runway.runway || 0} requiredDuration={runway.required_duration || 0} onDecision={handleTriageDecision} />
            </Suspense>
          )
        : memoizedTriageState.active && runway && (
            <Suspense fallback={<PromptLoadingFallback />}>
              <TriagePrompt triageState={memoizedTriageState} runway={runway.runway || 0} requiredDuration={runway.required_duration || 0} onDecision={handleTriageDecision} />
            </Suspense>
          )}

      {/* State declaration prompt — kept as-is */}
      {isFeatureEnabled("STATE_DECLARATION_ENABLED") && data.show_state_prompt && (
        <StateDeclarationPrompt
          timeBlocks={memoizedTimeBlocks}
          onDeclare={handleStateDeclaration}
          onDismiss={() => setData({ ...data, show_state_prompt: false })}
        />
      )}

      {/* Reality check prompt — kept as-is */}
      {isV2Enabled && showRealityCheck && realityCheckResult && (
        <RealityCheckPrompt result={realityCheckResult} onSelectAlternative={handleAlternativeSelection} onDismiss={handleDismissRealityCheck} />
      )}

      {/* Felt helpful — re-skinned with tv/ Prompt */}
      {isV2Enabled && showFeltHelpful && !feltHelpfulDismissed && (
        <Prompt
          label="closing the day"
          title={copy.feltHelpful.title[voice]}
          caption={copy.feltHelpful.caption[voice]}
          onClose={handleFeltHelpfulDismiss}
          closeLabel="skip"
          footer={copy.feltHelpful.footer[voice]}
        >
          <Button onClick={() => handleFeltHelpfulSubmit("yes")}      hint="→">Yes, it helped.</Button>
          <Button onClick={() => handleFeltHelpfulSubmit("somewhat")} hint="→">Somewhat.</Button>
          <Button onClick={() => handleFeltHelpfulSubmit("not_really")} hint="→">Not really.</Button>
        </Prompt>
      )}

      {/* Runway */}
      {runwayMin !== null && (
        <Runway
          num={runwayMin}
          unit="min"
          label={`runway · ${nextAnchorName}`}
          caption={
            hasSufficientTime
              ? <>prep needs <span className="tv-mono">{requiredMin}m</span>. enough.</>
              : <>chain wants <span className="tv-mono">{requiredMin}m</span>.{" "}
                  <em>time physics is running tight, not you.</em>
                  {!showTriageManually && memoizedTriageState.active && (
                    <> &nbsp;<button className="tv-close" onClick={() => setShowTriageManually(true)}>open triage</button></>
                  )}
                </>
          }
        />
      )}

      {/* Projection note */}
      {projectionNote && (
        <Card variant="quote">
          <Label>timing</Label>
          <p className="tv-prose" style={{ margin: 0, fontSize: 14 }}>{projectionNote}</p>
        </Card>
      )}

      {/* Timeline */}
      <section aria-label="today's chain" style={{ display: "flex", flexDirection: "column" }}>
        <Label style={{ paddingBottom: 8 }}>chain · backward from anchor</Label>

        {blocksToShow.map((block) => {
          const state   = toBlockState(block, now);
          const isAnchor = block.metadata?.role?.type === "anchor";
          const isKeystone = block.metadata?.triage?.is_keystone === true;
          const blockMeta = toBlockMeta(block);

          return (
            <div key={block.id}>
              <Block
                time={toBlockTime(block, showTimes)}
                state={state}
                name={block.activityName}
                meta={blockMeta}
                keystone={isKeystone}
                anchor={isAnchor}
              />

              {/* Completion controls — only when enabled and block is in a completable state */}
              {(showCompletionControls || editMode) && state !== "past" && (
                <div style={{ display: "flex", gap: 8, paddingLeft: 68, paddingBottom: 4 }}>
                  <button
                    className="tv-close"
                    onClick={() => handleBlockComplete(block.id)}
                  >
                    done
                  </button>
                  <button
                    className="tv-close"
                    onClick={() => handleBlockSkip(block.id, "user skipped")}
                  >
                    skip
                  </button>
                  {isAnchor && isV2Enabled && (
                    <button
                      className="tv-close"
                      onClick={() => handleRealityCheck(block.activityId || block.id)}
                    >
                      reality check
                    </button>
                  )}
                  {editMode && (
                    <button
                      className="tv-close"
                      style={{ color: "var(--warn)" }}
                      onClick={() => handleBlockDelete(block.id)}
                    >
                      delete
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </section>

      {/* Edit / recalculate controls */}
      <Rule />
      <div className="tv-actions">
        <Button
          variant="quiet"
          hint={editMode ? "done" : "edit"}
          onClick={() => setEditMode(!editMode)}
        >
          {editMode ? "Stop editing" : "Edit blocks"}
        </Button>
        <Button
          variant="quiet"
          hint="recalc"
          onClick={handleRecalculate}
        >
          Recalculate from now
        </Button>
      </div>

      <p className="tv-foot-note">{copy.footer[voice]}</p>
    </Page>
  );
}
