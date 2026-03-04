// src/components/daily-plan/MirrorUI.tsx
import React, { useState, useEffect, useMemo, lazy, Suspense } from "react";
import type { MirrorData, TriageDecision, UserState } from "@/types/triage";
import { MirrorHeader } from "./MirrorHeader";
import { StateDeclarationPrompt } from "./StateDeclarationPrompt";
import IntentSignalBanner from "./IntentSignalBanner";
import Timeline from "./Timeline";
import { fetchWithRetry } from "@/lib/triage/retry-handler";
import { isFeatureEnabled } from "@/lib/feature-flags";

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
  const [showTriageManually, setShowTriageManually] = useState(false);

  // Check feature flags
  const isFeatureDisabled = !isFeatureEnabled('TRIAGE_MIRROR_ENABLED');
  const isV2Enabled = isFeatureEnabled('MIRROR_V2_ENABLED');
  const useNeutralDisplay = isFeatureEnabled('MIRROR_V2_NEUTRAL_DISPLAY');
  
  if (isFeatureDisabled) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center max-w-md">
          <p className="text-text-muted">Mirror view is currently disabled.</p>
        </div>
      </div>
    );
  }

  // Load mirror data with optional auto-recalc
  useEffect(() => {
    initializeMirrorView();
    loadTokenBalance();
  }, [userId]);

  // Memoize runway calculation to avoid recalculating on every render
  // Requirements: 1.3, 4.5, 12.1, 12.2, 13.5
  // Must be called before any conditional returns
  const memoizedRunway = useMemo(() => {
    return data?.runway || null;
  }, [data?.runway]);

  // Memoize triage state to avoid recalculating on every render
  const memoizedTriageState = useMemo(() => {
    return data?.triage_state || { active: false, keystone_activity: null, anchor: null, options: [] };
  }, [data?.triage_state]);

  // Memoize time blocks to prevent unnecessary Timeline re-renders
  const memoizedTimeBlocks = useMemo(() => {
    return data?.time_blocks || [];
  }, [data?.time_blocks]);

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

  async function initializeMirrorView() {
    try {
      setLoading(true);
      setError(null);

      // Check if stateless recalc feature is enabled
      const statelessRecalcEnabled = isFeatureEnabled('STATELESS_RECALC_ENABLED');

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
    if (!isFeatureEnabled('STATELESS_RECALC_ENABLED')) {
      setError('Recalculation is currently disabled');
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
    if (!isFeatureEnabled('STATE_DECLARATION_ENABLED')) {
      setError('State declaration is currently disabled');
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

  async function handleBlockComplete(blockId: string) {
    try {
      setError(null);
      // Use retry logic for completion updates (1 retry after 2s)
      const response = await fetchWithRetry(
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

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.message || "Failed to mark block as complete");
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
      // Use retry logic for skip updates (1 retry after 2s)
      const response = await fetchWithRetry(
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
      const response = await fetch(`/api/time-blocks/${blockId}/delete`, {
        method: "DELETE",
      });
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

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[400px]" role="status" aria-live="polite">
        <div className="text-center">
          <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-accent-primary" aria-hidden="true"></div>
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
      <div className="flex items-center justify-center min-h-[400px]" role="alert" aria-live="assertive">
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
      />

      <main className="max-w-4xl mx-auto px-4 py-6" role="main" aria-label="Mirror view content">
        {/* Intent Signal Banner */}
        <IntentSignalBanner
          userId={userId}
          onGeneratePlan={() => {
            window.location.href = "/daily-plan";
          }}
        />

        {/* Triage Prompt - V2: Only show if manually triggered */}
        {isV2Enabled ? (
          showTriageManually && memoizedTriageState.active && memoizedRunway && (
            <Suspense fallback={<PromptLoadingFallback />}>
              <TriagePrompt
                triageState={memoizedTriageState}
                runway={memoizedRunway.runway || 0}
                requiredDuration={memoizedRunway.required_duration || 0}
                onDecision={handleTriageDecision}
              />
            </Suspense>
          )
        ) : (
          // V1: Auto-show triage
          memoizedTriageState.active && memoizedRunway && (
            <Suspense fallback={<PromptLoadingFallback />}>
              <TriagePrompt
                triageState={memoizedTriageState}
                runway={memoizedRunway.runway || 0}
                requiredDuration={memoizedRunway.required_duration || 0}
                onDecision={handleTriageDecision}
              />
            </Suspense>
          )
        )}

        {/* State Declaration Prompt */}
        {isFeatureEnabled('STATE_DECLARATION_ENABLED') && data.show_state_prompt && (
          <StateDeclarationPrompt
            timeBlocks={memoizedTimeBlocks}
            onDeclare={handleStateDeclaration}
            onDismiss={() => setData({ ...data, show_state_prompt: false })}
          />
        )}

        {/* Timeline */}
        <Timeline
          timeBlocks={memoizedTimeBlocks}
          editMode={isFeatureEnabled('INLINE_EDITING_ENABLED') ? editMode : false}
          onBlockComplete={handleBlockComplete}
          onBlockSkip={handleBlockSkip}
          onBlockEdit={handleBlockEdit}
          onRefresh={loadMirrorData}
          onBlockDelete={handleBlockDelete}
        />
      </main>
    </div>
  );
}
