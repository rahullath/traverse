// src/components/daily-plan/MirrorUI.tsx
import React, {
  useState,
  useEffect,
  useMemo,
  lazy,
  Suspense,
  useRef,
} from "react";
import type { MirrorData, TriageDecision, UserState } from "@/types/triage";
import { MirrorHeader } from "./MirrorHeader";
import { StateDeclarationPrompt } from "./StateDeclarationPrompt";
import { RealityCheckPrompt } from "./RealityCheckPrompt";
import { IntentPrompt } from "./IntentPrompt";
import { FreeActivationPrompt } from "./FreeActivationPrompt";
import { FeltHelpfulPrompt } from "./FeltHelpfulPrompt";
import IntentSignalBanner from "./IntentSignalBanner";
import Timeline from "./Timeline";
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
import type { TimeBlock } from "@/types/daily-plan";
import type {
  RealityCheckAlternative,
  RealityCheckResult,
} from "@/lib/display/reality-check";
import type { TelemetryEvent } from "@/lib/monitoring/mirror-analytics";

// Lazy load heavy components - Requirements: 12.1, 12.2, 13.5
const TriagePrompt = lazy(() =>
  import("./TriagePrompt").then((module) => ({ default: module.TriagePrompt })),
);

// Loading fallback component
const PromptLoadingFallback = () => (
  <div className="mb-6 p-4 bg-surface-primary border border-border-primary rounded-lg animate-pulse">
    <div className="h-6 bg-surface-secondary rounded w-3/4 mb-3"></div>
    <div className="h-4 bg-surface-secondary rounded w-full mb-2"></div>
    <div className="h-4 bg-surface-secondary rounded w-5/6"></div>
  </div>
);

export interface MirrorUIProps {
  userId: string;
}

export default function MirrorUI({ userId }: MirrorUIProps) {
  // All hooks must be called before any conditional returns
  const [data, setData] = useState<MirrorData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editMode, setEditMode] = useState(false);
  const [tokenBalance, setTokenBalance] = useState<number | null>(null);
  const [isAutoRecalculating, setIsAutoRecalculating] = useState(false);

  // V2 state
  const [showRealityCheck, setShowRealityCheck] = useState(false);
  const [realityCheckResult, setRealityCheckResult] = useState<any>(null);
  const [realityCheckAnchorId, setRealityCheckAnchorId] = useState<
    string | null
  >(null);
  const [showTriageManually, setShowTriageManually] = useState(false);

  // V2 Display Mode state (Req 11.1, 18.1)
  const [displayMode, setDisplayMode] = useState<DisplayIntent>("full_chain");
  const [showIntentPrompt, setShowIntentPrompt] = useState(true);
  const [chainStartTime, setChainStartTime] = useState<ChainStartTime>({
    type: "now",
  });
  const [showTimes, setShowTimes] = useState(true);
  const [expandedAnchorId, setExpandedAnchorId] = useState<string | null>(null); // For multi-anchor progressive disclosure (Req 12.3)
  const [showCompletionControls, setShowCompletionControls] = useState(false);
  const [showRecoveryBlocks, setShowRecoveryBlocks] = useState(true);
  const [isOnline, setIsOnline] = useState(
    typeof navigator === "undefined" ? true : navigator.onLine,
  );
  const [queuedMutationCount, setQueuedMutationCount] = useState(0);

  // V2 Analytics state (Req 14.2, 14.3, 14.6)
  const [analyticsEnabled, setAnalyticsEnabled] = useState(false);
  const telemetryBatchRef = useRef<TelemetryEvent[]>([]);
  const telemetryTimerRef = useRef<NodeJS.Timeout | null>(null);

  // V2 Felt Helpful state (Req 20.1, 20.2, 20.3)
  const [showFeltHelpful, setShowFeltHelpful] = useState(false);
  const [feltHelpfulDismissed, setFeltHelpfulDismissed] = useState(false);

  // Services
  const displayModeService = useMemo(() => new DisplayModeService(), []);
  const displayModeSerializer = useMemo(() => new DisplayModeSerializer(), []);

  // Check feature flags
  const isFeatureDisabled = !isFeatureEnabled("TRIAGE_MIRROR_ENABLED");
  const isV2Enabled = isFeatureEnabled("MIRROR_V2_ENABLED");

  if (isFeatureDisabled) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <p className="text-text-muted">Mirror view is currently disabled.</p>
        </div>
      </div>
    );
  }

  // Memoize runway calculation to avoid recalculating on every render
  // Requirements: 1.3, 4.5, 12.1, 12.2, 13.5
  // Must be called before any conditional returns
  const memoizedRunway = useMemo(() => {
    return data?.runway || null;
  }, [data?.runway]);

  // Memoize triage state to avoid recalculating on every render
  const memoizedTriageState = useMemo(() => {
    return (
      data?.triage_state || {
        active: false,
        keystone_activity: null,
        anchor: null,
        options: [],
      }
    );
  }, [data?.triage_state]);

  // Memoize time blocks to prevent unnecessary Timeline re-renders
  const memoizedTimeBlocks = useMemo(() => {
    return data?.time_blocks || [];
  }, [data?.time_blocks]);

  const projectedCurrentTime = useMemo(() => {
    const now = new Date();
    switch (chainStartTime.type) {
      case "now":
        return now;
      case "in_minutes":
        return new Date(now.getTime() + chainStartTime.minutes * 60_000);
      case "at_time":
        return new Date(chainStartTime.time);
      case "when_ready":
        return null;
      default:
        return now;
    }
  }, [chainStartTime]);

  // Load mirror data with optional auto-recalc
  useEffect(() => {
    initializeMirrorView();
    loadTokenBalance();
    loadAnalyticsPreference(); // Load analytics preference (Req 14.2)
    checkFeltHelpfulPrompt(); // Check if we should show felt helpful prompt (Req 20.1)
  }, [userId]);

  useEffect(() => {
    if (typeof window === "undefined") return;

    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    const handleQueueSize = (event: Event) => {
      const custom = event as CustomEvent<{ size?: number }>;
      const size = Number(custom.detail?.size || 0);
      setQueuedMutationCount(size);
    };

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);
    window.addEventListener("offline-queue-size", handleQueueSize as EventListener);
    setQueuedMutationCount(getQueuedMutationCount());

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
      window.removeEventListener(
        "offline-queue-size",
        handleQueueSize as EventListener,
      );
    };
  }, []);

  // Cleanup telemetry batch timer on unmount
  useEffect(() => {
    return () => {
      if (telemetryTimerRef.current) {
        clearInterval(telemetryTimerRef.current);
        // Flush any remaining events
        flushTelemetryBatch();
      }
    };
  }, []);

  // Start telemetry batch timer (Req 14.6)
  useEffect(() => {
    if (isV2Enabled && analyticsEnabled) {
      // Send batched events every 30 seconds
      telemetryTimerRef.current = setInterval(() => {
        flushTelemetryBatch();
      }, 30000);

      return () => {
        if (telemetryTimerRef.current) {
          clearInterval(telemetryTimerRef.current);
        }
      };
    }
  }, [isV2Enabled, analyticsEnabled]);

  // Record app_open event on mount (Req 14.3)
  useEffect(() => {
    if (isV2Enabled && analyticsEnabled && data) {
      const hadAnchorToday = anchorBlocks.length > 0;
      const nextAnchor = displayModeService.getNextAnchor(
        memoizedTimeBlocks,
        new Date(),
      );
      const timeUntilNextAnchor = nextAnchor
        ? Math.floor(
            (new Date(nextAnchor.startTime).getTime() - Date.now()) / 60000,
          )
        : null;

      recordTelemetryEvent({
        event_type: "app_open",
        had_anchor_today: hadAnchorToday,
        time_until_next_anchor: timeUntilNextAnchor,
      });
    }
  }, [isV2Enabled, analyticsEnabled, data]);

  // Load display mode from sessionStorage on mount (Req 18.2, 18.3)
  // Always clear stale entries — stale times cause "anchor time has passed" bug
  useEffect(() => {
    displayModeSerializer.clearOldEntries();

    if (isV2Enabled) {
      const stored = displayModeSerializer.loadFromStorage();
      if (stored) {
        // Only restore if the stored timestamp is from today
        const storedDate = new Date(stored.timestamp);
        const isToday = storedDate.toDateString() === new Date().toDateString();
        if (isToday) {
          setDisplayMode(stored.mode);
          setChainStartTime(stored.startTime);
          setShowTimes(stored.showTimes);
          setShowIntentPrompt(false);
        } else {
          // Stale — clear it
          displayModeSerializer.clearOldEntries();
        }
      }
    }
  }, [isV2Enabled]);

  // Check for passed anchors periodically (Req 13.2)
  useEffect(() => {
    if (!isV2Enabled || !data) return;

    const checkPassedAnchors = () => {
      const anchors = memoizedTimeBlocks.filter(
        (block) => block.metadata?.role?.type === "anchor",
      );

      const now = new Date();
      const passedAnchor = anchors.find((anchor) =>
        displayModeService.hasAnchorPassed(anchor, now),
      );

      if (passedAnchor) {
        // Show neutral pivot options (Req 13.3)
        // This will be handled by showing IntentPrompt with passed anchor context
        setShowIntentPrompt(true);
      }
    };

    // Check on load
    checkPassedAnchors();

    // Check every 60 seconds
    const interval = setInterval(checkPassedAnchors, 60000);

    // Check on foreground (page visibility change)
    const handleVisibilityChange = () => {
      if (!document.hidden) {
        checkPassedAnchors();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(interval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isV2Enabled, data, memoizedTimeBlocks]);

  // Check if we should show felt helpful prompt (Req 20.1, 20.2)
  useEffect(() => {
    if (!isV2Enabled || !data || feltHelpfulDismissed) return;

    const checkEndOfDay = () => {
      const now = new Date();
      const currentHour = now.getHours();

      // Check if it's after 10pm (Req 20.1)
      if (currentHour >= 22) {
        setShowFeltHelpful(true);
        return;
      }

      // Check if last anchor + 2 hours has passed (Req 20.1)
      const anchors = memoizedTimeBlocks.filter(
        (block) => block.metadata?.role?.type === "anchor",
      );

      if (anchors.length > 0) {
        const lastAnchor = anchors[anchors.length - 1];
        const lastAnchorTime = new Date(lastAnchor.startTime);
        const twoHoursAfterLastAnchor = new Date(
          lastAnchorTime.getTime() + 2 * 60 * 60 * 1000,
        );

        if (now >= twoHoursAfterLastAnchor) {
          setShowFeltHelpful(true);
        }
      }
    };

    // Check on load
    checkEndOfDay();

    // Check every 5 minutes
    const interval = setInterval(checkEndOfDay, 5 * 60 * 1000);

    return () => {
      clearInterval(interval);
    };
  }, [isV2Enabled, data, memoizedTimeBlocks, feltHelpfulDismissed]);

  // Get anchor blocks for IntentPrompt - must be declared before filteredTimeBlocks
  const anchorBlocks = useMemo(() => {
    return memoizedTimeBlocks.filter(
      (block) => block.metadata?.role?.type === "anchor",
    );
  }, [memoizedTimeBlocks]);

  // Set default expanded anchor outside memoized render logic.
  useEffect(() => {
    if (!isV2Enabled) return;
    if (anchorBlocks.length <= 1) {
      if (expandedAnchorId !== null) {
        setExpandedAnchorId(null);
      }
      return;
    }
    if (expandedAnchorId) return;

    const nextAnchor =
      displayModeService.getNextAnchor(
        memoizedTimeBlocks,
        projectedCurrentTime || new Date(),
      ) ||
      anchorBlocks[0];

    if (nextAnchor) {
      setExpandedAnchorId(nextAnchor.id);
    }
  }, [
    isV2Enabled,
    anchorBlocks,
    expandedAnchorId,
    memoizedTimeBlocks,
    projectedCurrentTime,
    displayModeService,
  ]);

  // Apply display mode filtering (Req 9.2, 11.4, 12.1, 12.2)
  const filteredTimeBlocks = useMemo(() => {
    if (!isV2Enabled) {
      return memoizedTimeBlocks;
    }
    const referenceTime = projectedCurrentTime || new Date();

    const keystoneId = displayModeService.findKeystoneId(memoizedTimeBlocks);
    const modeFiltered = displayModeService.applyDisplayMode(
      memoizedTimeBlocks,
      displayMode,
      keystoneId || undefined,
    );

    // Multi-anchor progressive disclosure also applies in full_chain mode.
    if (anchorBlocks.length > 1 && displayMode === "full_chain") {
      const nextAnchor =
        displayModeService.getNextAnchor(modeFiltered, referenceTime) ||
        modeFiltered.find((block) => block.metadata?.role?.type === "anchor");
      const activeAnchorId = expandedAnchorId || nextAnchor?.id;
      if (!activeAnchorId) return modeFiltered;

      const anchorChain = displayModeService.getAnchorChain(
        modeFiltered,
        activeAnchorId,
      );

      const collapsedAnchors = modeFiltered.filter(
        (block) =>
          block.metadata?.role?.type === "anchor" && block.id !== activeAnchorId,
      );

      const activeChainIds = new Set(anchorChain.map((block) => block.id));
      const supplementalBlocks = modeFiltered.filter((block) => {
        if (activeChainIds.has(block.id)) return false;
        if (collapsedAnchors.some((anchor) => anchor.id === block.id)) {
          return false;
        }

        // Preserve non-envelope blocks (for the rest-of-day tail) while
        // keeping only one expanded anchor chain in focus.
        return !block.metadata?.commitment_envelope?.envelope_id;
      });

      const deduped = new Map<string, TimeBlock>();
      for (const block of [
        ...anchorChain,
        ...collapsedAnchors,
        ...supplementalBlocks,
      ]) {
        if (!deduped.has(block.id)) {
          deduped.set(block.id, block);
        }
      }

      return Array.from(deduped.values()).sort(
        (a, b) =>
          new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
      );
    }

    return modeFiltered;
  }, [
    isV2Enabled,
    memoizedTimeBlocks,
    displayMode,
    anchorBlocks,
    expandedAnchorId,
    projectedCurrentTime,
    displayModeService,
  ]);

  // Get keystone activity name
  const keystoneActivity = useMemo(() => {
    const keystone = memoizedTimeBlocks.find(
      (block) =>
        block.metadata?.role?.type === "chain-step" &&
        (block.activityName.toLowerCase().includes("shower") ||
          block.activityName.toLowerCase().includes("meds")),
    );
    return keystone?.activityName || null;
  }, [memoizedTimeBlocks]);

  const projectionNote = useMemo(() => {
    if (!isV2Enabled) return null;
    if (!projectedCurrentTime) {
      return "When ready mode: sequence first, clock pressure reduced.";
    }

    const nextAnchor = displayModeService.getNextAnchor(
      memoizedTimeBlocks,
      projectedCurrentTime,
    );
    if (!nextAnchor) return "No upcoming anchors. Free activation mode.";

    const timing = nextAnchor.metadata?.timing_signals;
    if (!timing?.ready_to_leave_by || !timing?.effective_arrival_deadline) {
      return null;
    }

    const leaveBy = new Date(timing.ready_to_leave_by);
    const effectiveDeadline = new Date(timing.effective_arrival_deadline);
    const projectedMs = projectedCurrentTime.getTime();

    const formatClock = (date: Date) =>
      date.toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
        hour12: false,
      });

    if (projectedMs <= leaveBy.getTime()) {
      return `On track. Leave by ${formatClock(leaveBy)}.`;
    }

    if (projectedMs <= effectiveDeadline.getTime()) {
      const lateBy = Math.max(
        0,
        Math.round((projectedMs - leaveBy.getTime()) / 60_000),
      );
      const nextSlot = timing.next_feasible_departure_slot;
      if (nextSlot) {
        return `Likely late by ${lateBy}m. Next feasible departure slot: ${nextSlot}.`;
      }
      return `Likely late by ${lateBy}m. Latest viable arrival: ${formatClock(
        effectiveDeadline,
      )}.`;
    }

    const missedBy = Math.max(
      0,
      Math.round((projectedMs - effectiveDeadline.getTime()) / 60_000),
    );
    return `Past effective arrival deadline by ${missedBy}m.`;
  }, [isV2Enabled, projectedCurrentTime, memoizedTimeBlocks, displayModeService]);

  async function loadTokenBalance() {
    try {
      const response = await fetch("/api/tokens/balance");
      if (response.ok) {
        const data = await response.json();
        setTokenBalance(data.balance);
      }
    } catch (err) {
      console.error("Failed to load token balance:", err);
    }
  }

  // Load analytics preference (Req 14.2)
  async function loadAnalyticsPreference() {
    try {
      const response = await fetch("/api/auth/preferences");
      if (response.ok) {
        const data = await response.json();
        const prefs = data?.data || {};
        const nestedPrefs = prefs?.preferences || {};
        const enabled =
          prefs?.enable_usage_analytics === true ||
          nestedPrefs?.enable_usage_analytics === true;
        setAnalyticsEnabled(enabled);
        setShowCompletionControls(
          prefs?.show_completion_controls === true ||
            nestedPrefs?.show_completion_controls === true,
        );
        setShowRecoveryBlocks(
          prefs?.show_recovery_blocks !== false &&
            nestedPrefs?.show_recovery_blocks !== false,
        );
      }
    } catch (err) {
      console.error("Failed to load analytics preference:", err);
      setAnalyticsEnabled(false); // Default to disabled on error
      setShowCompletionControls(false);
      setShowRecoveryBlocks(true);
    }
  }

  // Check if felt helpful prompt should be shown (Req 20.2, 20.3)
  async function checkFeltHelpfulPrompt() {
    try {
      const response = await fetch("/api/auth/preferences");
      if (response.ok) {
        const data = await response.json();
        const dismissedDates =
          data?.data?.preferences?.felt_helpful_dismissed_dates || [];

        // Get today's date in YYYY-MM-DD format
        const today = new Date().toISOString().split("T")[0];

        // Check if already dismissed today (Req 20.3)
        if (dismissedDates.includes(today)) {
          setFeltHelpfulDismissed(true);
        }
      }
    } catch (err) {
      console.error("Failed to check felt helpful status:", err);
    }
  }

  // Handle felt helpful feedback submission (Req 20.4)
  async function handleFeltHelpfulSubmit(
    response: "yes" | "somewhat" | "not_really",
  ) {
    try {
      const today = new Date().toISOString().split("T")[0];

      const apiResponse = await fetch("/api/analytics/felt-helpful", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response, date: today }),
      });

      if (!apiResponse.ok) {
        throw new Error("Failed to submit feedback");
      }

      // Hide prompt after successful submission
      setShowFeltHelpful(false);
      setFeltHelpfulDismissed(true);
    } catch (err) {
      console.error("Failed to submit felt helpful feedback:", err);
      // Still hide the prompt even on error to avoid annoying the user
      setShowFeltHelpful(false);
      setFeltHelpfulDismissed(true);
    }
  }

  // Handle felt helpful dismiss (Req 20.3)
  async function handleFeltHelpfulDismiss() {
    try {
      const today = new Date().toISOString().split("T")[0];

      // Record dismissal (same as submitting "skip")
      await fetch("/api/analytics/felt-helpful", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ response: "not_really", date: today }),
      });
    } catch (err) {
      console.error("Failed to record dismissal:", err);
    } finally {
      // Always hide the prompt
      setShowFeltHelpful(false);
      setFeltHelpfulDismissed(true);
    }
  }

  // Record telemetry event (batched, fire-and-forget) (Req 14.3, 14.6)
  function recordTelemetryEvent(event: TelemetryEvent) {
    if (!analyticsEnabled) return; // Silently skip if analytics disabled

    // Add to batch
    telemetryBatchRef.current.push(event);
  }

  // Flush telemetry batch to API (Req 14.6)
  async function flushTelemetryBatch() {
    if (telemetryBatchRef.current.length === 0) return;

    const batch = [...telemetryBatchRef.current];
    telemetryBatchRef.current = []; // Clear batch

    try {
      // Fire-and-forget - don't await or block on errors
      for (const event of batch) {
        const request = fetch("/api/analytics/telemetry", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            event_type: event.event_type,
            event_data: event,
          }),
        });

        if (request && typeof (request as Promise<Response>).catch === "function") {
          (request as Promise<Response>).catch((err) => {
            // Fail silently - don't block user experience
            console.debug("Telemetry send failed:", err);
          });
        }
      }
    } catch (err) {
      // Fail silently
      console.debug("Telemetry batch flush failed:", err);
    }
  }

  async function initializeMirrorView() {
    try {
      setLoading(true);
      setError(null);

      // Check if stateless recalc feature is enabled
      const statelessRecalcEnabled = isFeatureEnabled(
        "STATELESS_RECALC_ENABLED",
      );

      if (statelessRecalcEnabled) {
        // Check if recalc_on_open preference is enabled
        const prefsResponse = await fetch("/api/auth/preferences");
        if (prefsResponse.ok) {
          const prefsData = await prefsResponse.json();
          const recalcOnOpen =
            prefsData?.data?.preferences?.recalc_on_open === true;

          if (recalcOnOpen) {
            // Auto-recalculate before loading mirror data
            setIsAutoRecalculating(true);
            const recalcResponse = await fetch("/api/daily-plan/recalculate", {
              method: "POST",
            });

            if (!recalcResponse.ok) {
              // If recalc fails, still try to load existing plan
              console.warn("Auto-recalculation failed, loading existing plan");
            }
            setIsAutoRecalculating(false);
          }
        }
      }

      // Load mirror data (either newly recalculated or existing)
      await loadMirrorData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to initialize mirror view",
      );
      setLoading(false);
      setIsAutoRecalculating(false);
    }
  }

  async function loadMirrorData() {
    try {
      setLoading(true);
      const response = await fetch("/api/daily-plan/mirror");
      if (!response.ok) {
        if (response.status === 404) {
          throw new Error("No plan found for today");
        }
        throw new Error("Failed to load mirror data");
      }
      const mirrorData = await response.json();
      setData(mirrorData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unknown error");
    } finally {
      setLoading(false);
    }
  }

  async function handleRecalculate() {
    // Check if stateless recalc feature is enabled
    if (!isFeatureEnabled("STATELESS_RECALC_ENABLED")) {
      setError("Recalculation is currently disabled");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      const response = await fetch("/api/daily-plan/recalculate", {
        method: "POST",
      });
      if (!response.ok) {
        if (response.status === 408) {
          throw new Error("Recalculation timed out. Please try again.");
        }
        throw new Error("Recalculation failed");
      }
      await loadMirrorData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Recalculation failed");
    } finally {
      setLoading(false);
    }
  }

  async function handleStateDeclaration(state: UserState, stepId?: string) {
    // Check if state declaration feature is enabled
    if (!isFeatureEnabled("STATE_DECLARATION_ENABLED")) {
      setError("State declaration is currently disabled");
      return;
    }

    try {
      setError(null);
      const response = await fetch("/api/daily-plan/state", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ state, selected_step_id: stepId }),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "State declaration failed");
      }
      await loadMirrorData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "State declaration failed");
    }
  }

  async function handleTriageDecision(decision: TriageDecision) {
    try {
      setError(null);
      const response = await fetch("/api/daily-plan/triage", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(decision),
      });
      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Triage decision failed");
      }

      const result = await response.json();

      // If recalculate was triggered, reload data
      if (result.recalc_triggered || decision.mode === "recalculate") {
        await loadMirrorData();
      } else {
        // Update data with filtered timeline
        setData((prevData) =>
          prevData
            ? {
                ...prevData,
                time_blocks: result.time_blocks || prevData.time_blocks,
                triage_state: { ...prevData.triage_state, active: false },
              }
            : null,
        );
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Triage decision failed");
    }
  }

  function patchLocalBlockStatus(
    blockId: string,
    status: "completed" | "skipped",
    skipReason?: string,
  ) {
    setData((prevData) => {
      if (!prevData) return prevData;
      return {
        ...prevData,
        time_blocks: prevData.time_blocks.map((block) =>
          block.id === blockId
            ? {
                ...block,
                status,
                skipReason: status === "skipped" ? skipReason : undefined,
              }
            : block,
        ),
      };
    });
  }

  async function handleBlockComplete(blockId: string) {
    try {
      setError(null);
      // Retry transient failures first, then queue if still unstable.
      const response = await resilientMutationFetch(
        `/api/time-blocks/${blockId}/complete`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "completed" }),
        },
        {
          maxRetries: 1,
          initialDelay: 2000,
        },
      );

      if (response.status === 202) {
        patchLocalBlockStatus(blockId, "completed");
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(
          errorData.message || "Failed to mark block as complete",
        );
      }
      await loadMirrorData();
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to mark block as complete",
      );
    }
  }

  async function handleBlockSkip(blockId: string, reason: string) {
    try {
      setError(null);
      // Retry transient failures first, then queue if still unstable.
      const response = await resilientMutationFetch(
        `/api/time-blocks/${blockId}/complete`,
        {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ status: "skipped", skip_reason: reason }),
        },
        {
          maxRetries: 1,
          initialDelay: 2000,
        },
      );

      if (response.status === 202) {
        patchLocalBlockStatus(blockId, "skipped", reason);
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to skip block");
      }
      await loadMirrorData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to skip block");
    }
  }

  async function handleBlockEdit(blockId: string) {
    // TODO: Implement inline editing (Task 22)
    console.log("Edit block:", blockId);
  }

  async function handleBlockDelete(blockId: string) {
    try {
      setError(null);
      const response = await resilientMutationFetch(
        `/api/time-blocks/${blockId}/delete`,
        {
          method: "DELETE",
          headers: {
            "x-idempotency-key": `time-block:${blockId}:delete`,
          },
        },
        {
          maxRetries: 1,
          initialDelay: 1500,
        },
      );
      if (response.status === 202) {
        setData((prevData) =>
          prevData
            ? {
                ...prevData,
                time_blocks: prevData.time_blocks.filter(
                  (block) => block.id !== blockId,
                ),
              }
            : prevData,
        );
        return;
      }

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || "Failed to delete anchor");
      }
      // Refresh timeline after successful deletion
      await loadMirrorData();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete anchor");
    }
  }

  function normalizeRealityCheckResult(raw: any): RealityCheckResult {
    const now = new Date();

    const toDate = (value: unknown, fallback: Date): Date => {
      if (value instanceof Date && !Number.isNaN(value.getTime())) {
        return value;
      }
      if (typeof value === "string" || typeof value === "number") {
        const parsed = new Date(value);
        if (!Number.isNaN(parsed.getTime())) {
          return parsed;
        }
      }
      return fallback;
    };

    const toNumber = (value: unknown, fallback = 0): number => {
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
    };

    const mapStep = (step: any, index: number): TimeBlock => {
      if (typeof step === "string") {
        const startTime = new Date(now.getTime() + index * 15 * 60000);
        const endTime = new Date(startTime.getTime() + 15 * 60000);
        return {
          id: `reality-check-step-${index}`,
          planId: "",
          activityName: step,
          activityType: "routine",
          startTime,
          endTime,
          isFixed: false,
          sequenceOrder: index,
          status: "pending",
          createdAt: now,
          updatedAt: now,
        };
      }

      const startTime = toDate(step?.startTime ?? step?.start_time, now);
      const durationMinutes = toNumber(step?.duration, 15);
      const endTime = toDate(
        step?.endTime ?? step?.end_time,
        new Date(startTime.getTime() + durationMinutes * 60000),
      );

      return {
        id:
          typeof step?.id === "string" && step.id.length > 0
            ? step.id
            : `reality-check-step-${index}`,
        planId: "",
        activityName:
          step?.activityName ?? step?.activity_name ?? `Step ${index + 1}`,
        activityType: "routine",
        startTime,
        endTime,
        isFixed: false,
        sequenceOrder: index,
        status: "pending",
        createdAt: now,
        updatedAt: now,
      };
    };

    const mapAlternative = (alt: any, index: number): RealityCheckAlternative => {
      return {
        id:
          typeof alt?.id === "string" && alt.id.length > 0
            ? alt.id
            : `alternative-${index}`,
        label: alt?.label ?? `Option ${index + 1}`,
        description: alt?.description ?? "",
        steps: Array.isArray(alt?.steps)
          ? alt.steps.map((step: any, stepIndex: number) =>
              mapStep(step, stepIndex),
            )
          : [],
        estimatedDuration: toNumber(
          alt?.estimatedDuration ?? alt?.estimated_duration,
          0,
        ),
      };
    };

    const possibleStepsRaw = Array.isArray(raw?.possibleSteps)
      ? raw.possibleSteps
      : Array.isArray(raw?.possible_steps)
        ? raw.possible_steps
        : [];
    const skippedStepsRaw = Array.isArray(raw?.skippedSteps)
      ? raw.skippedSteps
      : Array.isArray(raw?.skipped_steps)
        ? raw.skipped_steps
        : [];
    const alternativesRaw = Array.isArray(raw?.alternatives)
      ? raw.alternatives
      : [];

    const runway = toNumber(raw?.runway, 0);
    const requiredDuration = toNumber(
      raw?.requiredDuration ?? raw?.required_duration,
      0,
    );
    const canMakeAnchor =
      raw?.canMakeAnchor === true || raw?.can_make_anchor === true;

    return {
      possibleSteps: possibleStepsRaw.map((step: any, index: number) =>
        mapStep(step, index),
      ),
      skippedSteps: skippedStepsRaw.map((step: any, index: number) =>
        mapStep(step, index),
      ),
      canMakeAnchor,
      alternatives: alternativesRaw.map((alt: any, index: number) =>
        mapAlternative(alt, index),
      ),
      runway,
      requiredDuration,
    };
  }

  // Reality check handler (Req 1.2, 1.3, 1.4, 7.1)
  async function handleRealityCheck(anchorId: string) {
    try {
      setError(null);
      const response = await fetch("/api/daily-plan/reality-check", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ anchor_id: anchorId }),
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Reality check failed");
      }

      const result = await response.json();
      const normalizedResult = normalizeRealityCheckResult(result);
      setRealityCheckResult(normalizedResult);
      setRealityCheckAnchorId(anchorId);
      setShowRealityCheck(true);

      // Record reality check request (Req 14.3)
      if (isV2Enabled && analyticsEnabled) {
        recordTelemetryEvent({
          event_type: "reality_check_request",
          runway: normalizedResult.runway || 0,
          required_duration: normalizedResult.requiredDuration || 0,
          anchor_id: anchorId,
        });
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Reality check failed");
    }
  }

  // Handle alternative selection from reality check (Req 7.1)
  async function handleAlternativeSelection(alternativeId: string) {
    if (!realityCheckAnchorId) return;

    try {
      setError(null);

      // Handle different alternative options
      switch (alternativeId) {
        case "keystone_only":
          // Apply protect_keystone triage mode
          await handleTriageDecision({
            mode: "protect_keystone",
            anchor_id: realityCheckAnchorId,
          });
          break;

        case "skip_all":
          // Apply skip_anchor triage mode
          await handleTriageDecision({
            mode: "skip_anchor",
            anchor_id: realityCheckAnchorId,
          });
          break;

        case "show_all":
          // Just dismiss the reality check, show full timeline
          break;

        default:
          console.warn("Unknown alternative:", alternativeId);
      }

      // Dismiss reality check prompt
      setShowRealityCheck(false);
      setRealityCheckResult(null);
      setRealityCheckAnchorId(null);
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Failed to apply alternative",
      );
    }
  }

  // Dismiss reality check prompt
  function handleDismissRealityCheck() {
    setShowRealityCheck(false);
    setRealityCheckResult(null);
    setRealityCheckAnchorId(null);
  }

  // Handle intent selection (Req 11.1, 11.3)
  function handleIntentSelection(
    intent: DisplayIntent,
    startTime?: ChainStartTime,
  ) {
    const previousMode = displayMode;
    setDisplayMode(intent);
    if (startTime) {
      setChainStartTime(startTime);
      setShowTimes(startTime.type !== "when_ready");
    }
    setShowIntentPrompt(false);

    // Save to sessionStorage (Req 18.1)
    const state: DisplayModeState = {
      mode: intent,
      startTime: startTime || chainStartTime,
      showTimes: startTime ? startTime.type !== "when_ready" : showTimes,
      timestamp: new Date(),
    };
    displayModeSerializer.saveToStorage(state);

    // Record analytics (Req 14.3)
    if (isV2Enabled && analyticsEnabled) {
      // Record display mode switch
      if (previousMode !== intent) {
        recordTelemetryEvent({
          event_type: "display_mode_switch",
          from_mode: previousMode,
          to_mode: intent,
        });
      }

      // Record keystone view if keystone_focus selected
      if (intent === "keystone_focus" && keystoneActivity) {
        recordTelemetryEvent({
          event_type: "keystone_view",
          keystone_type: keystoneActivity,
          display_mode: intent,
        });
      }

      // Record anchor view if anchor-related mode selected
      if (
        (intent === "anchor_only" || intent === "full_chain") &&
        anchorBlocks.length > 0
      ) {
        const nextAnchor = displayModeService.getNextAnchor(
          memoizedTimeBlocks,
          new Date(),
        );
        if (nextAnchor && nextAnchor.activityId) {
          const now = new Date();
          recordTelemetryEvent({
            event_type: "anchor_view",
            anchor_id: nextAnchor.activityId,
            anchor_time: new Date(nextAnchor.startTime).toISOString(),
            viewed_before_anchor: now < new Date(nextAnchor.startTime),
            time_until_anchor: Math.floor(
              (new Date(nextAnchor.startTime).getTime() - now.getTime()) /
                60000,
            ),
          });
        }
      }
    }

    // If reality check selected, trigger it
    if (intent === "reality_check") {
      const nextAnchor = displayModeService.getNextAnchor(
        memoizedTimeBlocks,
        new Date(),
      );
      if (nextAnchor && nextAnchor.activityId) {
        handleRealityCheck(nextAnchor.activityId);
      }
    }
  }

  // Handle display mode change (Req 11.5)
  function handleDisplayModeChange(mode: DisplayIntent) {
    const previousMode = displayMode;
    setDisplayMode(mode);

    // Save to sessionStorage (Req 18.1, 18.2)
    const state: DisplayModeState = {
      mode,
      startTime: chainStartTime,
      showTimes,
      timestamp: new Date(),
    };
    displayModeSerializer.saveToStorage(state);

    // Record display mode switch (Req 14.3)
    if (isV2Enabled && analyticsEnabled && previousMode !== mode) {
      recordTelemetryEvent({
        event_type: "display_mode_switch",
        from_mode: previousMode,
        to_mode: mode,
      });
    }
  }

  // Handle keystone shortcut (Req 17.2, 17.5)
  function handleKeystoneShortcut() {
    const previousMode = displayMode;
    setDisplayMode("keystone_focus");
    setShowIntentPrompt(false);

    // Save to sessionStorage
    const state: DisplayModeState = {
      mode: "keystone_focus",
      startTime: chainStartTime,
      showTimes,
      timestamp: new Date(),
    };
    displayModeSerializer.saveToStorage(state);

    // Record keystone view and display mode switch (Req 14.3)
    if (isV2Enabled && analyticsEnabled) {
      if (keystoneActivity) {
        recordTelemetryEvent({
          event_type: "keystone_view",
          keystone_type: keystoneActivity,
          display_mode: "keystone_focus",
        });
      }
      if (previousMode !== "keystone_focus") {
        recordTelemetryEvent({
          event_type: "display_mode_switch",
          from_mode: previousMode,
          to_mode: "keystone_focus",
        });
      }
    }
  }

  // Handle free activation chain start
  function handleFreeActivationStart(startTime: ChainStartTime) {
    setChainStartTime(startTime);
    setShowTimes(startTime.type !== "when_ready");
    setDisplayMode("full_chain");
    setShowIntentPrompt(false);

    // Save to sessionStorage
    const state: DisplayModeState = {
      mode: "full_chain",
      startTime,
      showTimes: startTime.type !== "when_ready",
      timestamp: new Date(),
    };
    displayModeSerializer.saveToStorage(state);
  }

  // Handle keystone only (free activation)
  function handleKeystoneOnly() {
    const previousMode = displayMode;
    setDisplayMode("keystone_focus");
    setShowIntentPrompt(false);

    // Save to sessionStorage
    const state: DisplayModeState = {
      mode: "keystone_focus",
      startTime: { type: "now" },
      showTimes: true,
      timestamp: new Date(),
    };
    displayModeSerializer.saveToStorage(state);

    // Record analytics (Req 14.3)
    if (isV2Enabled && analyticsEnabled) {
      if (keystoneActivity) {
        recordTelemetryEvent({
          event_type: "keystone_view",
          keystone_type: keystoneActivity,
          display_mode: "keystone_focus",
        });
      }
      if (previousMode !== "keystone_focus") {
        recordTelemetryEvent({
          event_type: "display_mode_switch",
          from_mode: previousMode,
          to_mode: "keystone_focus",
        });
      }
    }
  }

  // Handle anchor expansion (Req 12.3, 12.4)
  function handleAnchorExpand(anchorId: string) {
    setExpandedAnchorId(anchorId);
  }

  if (loading) {
    return (
      <div
        className="flex items-center justify-center min-h-[400px]"
        role="status"
        aria-live="polite"
      >
        <div className="text-center">
          <div
            className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent-primary"
            aria-hidden="true"
          ></div>
          <p className="mt-4 text-sm text-text-muted">
            {isAutoRecalculating
              ? "Recalculating your plan..."
              : "Loading mirror view..."}
          </p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div
        className="flex items-center justify-center min-h-[400px]"
        role="alert"
        aria-live="assertive"
      >
        <div className="text-center max-w-md">
          <div className="mb-4 text-warning">
            <svg
              className="w-12 h-12 mx-auto"
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
              />
            </svg>
          </div>
          <h3 className="text-lg font-semibold text-text-primary mb-2">
            {error}
          </h3>
          <p className="text-sm text-text-muted mb-4">
            {error.includes("No plan")
              ? "Generate a daily plan first to use the mirror view."
              : error.includes("timed out")
                ? "The operation took too long. Please try again."
                : "There was a problem loading your plan."}
          </p>
          <div className="flex gap-3 justify-center">
            <button
              onClick={() => {
                setError(null);
                loadMirrorData();
              }}
              className="px-4 py-2 text-sm font-medium rounded-lg border border-border text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-background"
              aria-label="Retry loading mirror data"
            >
              Retry
            </button>
            {error.includes("No plan") && (
              <a
                href="/daily-plan"
                className="px-4 py-2 text-sm font-medium rounded-lg bg-accent-primary text-white hover:bg-accent-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-background"
                aria-label="Navigate to plan generation"
              >
                Generate Plan
              </a>
            )}
            {error.includes("Recalculation") && (
              <button
                onClick={() => {
                  setError(null);
                  handleRecalculate();
                }}
                className="px-4 py-2 text-sm font-medium rounded-lg bg-accent-primary text-white hover:bg-accent-primary/90 transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-background"
                aria-label="Retry recalculation"
              >
                Try Recalculate Again
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center">
          <p className="text-text-muted">No data available</p>
        </div>
      </div>
    );
  }

  return (
    <div className="mirror-ui min-h-screen bg-background">
      {/* Header */}
      <MirrorHeader
        editMode={editMode}
        onToggleEditMode={() => setEditMode(!editMode)}
        onRecalculate={handleRecalculate}
        isRecalculating={loading}
        tokenBalance={tokenBalance}
        displayMode={isV2Enabled ? displayMode : undefined}
        onDisplayModeChange={isV2Enabled ? handleDisplayModeChange : undefined}
        keystoneActivity={isV2Enabled ? keystoneActivity : undefined}
        onKeystoneShortcut={isV2Enabled ? handleKeystoneShortcut : undefined}
      />

      <main
        className="max-w-4xl mx-auto px-4 py-6"
        role="main"
        aria-label="Mirror view content"
      >
        {(!isOnline || queuedMutationCount > 0) && (
          <div className="mb-4 rounded-lg border border-border-primary bg-surface-primary px-3 py-2 text-xs sm:text-sm text-text-muted">
            {!isOnline
              ? "Network offline. Actions will queue and sync when connection returns."
              : `Connection unstable. ${queuedMutationCount} action${queuedMutationCount === 1 ? "" : "s"} queued for retry.`}
          </div>
        )}

        <div className="mb-4 flex justify-end">
          <InstallButton />
        </div>

        {/* Intent Signal Banner */}
        <IntentSignalBanner
          userId={userId}
          onGeneratePlan={() => {
            window.location.href = "/daily-plan";
          }}
        />

        {/* V2: Intent Prompt (Req 11.1, 11.2, 11.3) */}
        {isV2Enabled && showIntentPrompt && anchorBlocks.length > 0 && (
          <IntentPrompt
            anchors={anchorBlocks}
            keystoneActivity={keystoneActivity}
            currentTime={new Date()}
            onSelectIntent={handleIntentSelection}
            onDismiss={() => setShowIntentPrompt(false)}
          />
        )}

        {/* V2: Free Activation Prompt (Req 10.1, 10.2, 10.3) */}
        {isV2Enabled && showIntentPrompt && anchorBlocks.length === 0 && (
          <FreeActivationPrompt
            keystoneActivity={keystoneActivity}
            onStartChain={handleFreeActivationStart}
            onKeystoneOnly={handleKeystoneOnly}
            onDismiss={() => setShowIntentPrompt(false)}
          />
        )}

        {/* Triage Prompt - V2: Only show if manually triggered (Req 1.1, 1.5) */}
        {isV2Enabled
          ? showTriageManually &&
            memoizedTriageState.active &&
            memoizedRunway && (
              <Suspense fallback={<PromptLoadingFallback />}>
                <TriagePrompt
                  triageState={memoizedTriageState}
                  runway={memoizedRunway.runway || 0}
                  requiredDuration={memoizedRunway.required_duration || 0}
                  onDecision={handleTriageDecision}
                />
              </Suspense>
            )
          : // V1: Auto-show triage (legacy behavior)
            memoizedTriageState.active &&
            memoizedRunway && (
              <Suspense fallback={<PromptLoadingFallback />}>
                <TriagePrompt
                  triageState={memoizedTriageState}
                  runway={memoizedRunway.runway || 0}
                  requiredDuration={memoizedRunway.required_duration || 0}
                  onDecision={handleTriageDecision}
                />
              </Suspense>
            )}

        {/* State Declaration Prompt */}
        {isFeatureEnabled("STATE_DECLARATION_ENABLED") &&
          data.show_state_prompt && (
            <StateDeclarationPrompt
              timeBlocks={memoizedTimeBlocks}
              onDeclare={handleStateDeclaration}
              onDismiss={() => setData({ ...data, show_state_prompt: false })}
            />
          )}

        {/* Reality Check Prompt - V2 (Req 7.1, 7.3, 7.4) */}
        {isV2Enabled && showRealityCheck && realityCheckResult && (
          <div className="mb-6">
            <RealityCheckPrompt
              result={realityCheckResult}
              onSelectAlternative={handleAlternativeSelection}
              onDismiss={handleDismissRealityCheck}
            />
          </div>
        )}

        {/* Felt Helpful Prompt - V2 (Req 20.1, 20.2, 20.3, 20.4, 20.5) */}
        {isV2Enabled && showFeltHelpful && !feltHelpfulDismissed && (
          <FeltHelpfulPrompt
            onSubmit={handleFeltHelpfulSubmit}
            onDismiss={handleFeltHelpfulDismiss}
          />
        )}

        {/* Timeline - V2: Use filtered blocks and display mode props */}
        <Timeline
          timeBlocks={isV2Enabled ? filteredTimeBlocks : memoizedTimeBlocks}
          editMode={
            isFeatureEnabled("INLINE_EDITING_ENABLED") ? editMode : false
          }
          onBlockComplete={handleBlockComplete}
          onBlockSkip={handleBlockSkip}
          onBlockEdit={handleBlockEdit}
          onRefresh={loadMirrorData}
          onBlockDelete={handleBlockDelete}
          onRealityCheck={handleRealityCheck}
          showTimes={isV2Enabled ? showTimes : true}
          showCompletionControls={
            isV2Enabled ? showCompletionControls : showCompletionControls
          }
          showRecoveryBlocks={isV2Enabled ? showRecoveryBlocks : true}
          displayMode={
            isV2Enabled && displayMode !== "reality_check"
              ? displayMode
              : "full_chain"
          }
          onAnchorExpand={isV2Enabled ? handleAnchorExpand : undefined}
          expandedAnchorId={isV2Enabled ? expandedAnchorId : undefined}
          projectedCurrentTime={isV2Enabled ? projectedCurrentTime : undefined}
          projectionNote={isV2Enabled ? projectionNote : undefined}
        />
      </main>
    </div>
  );
}
