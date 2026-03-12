import React, { useState, useEffect, useRef } from "react";
import type { TriageState, TriageDecision } from "@/types/triage";

/**
 * TriagePrompt Component
 *
 * Displays triage prompt when runway < required duration
 * Uses bottom sheet pattern for mobile with slide-up animation
 * Requirements: 2.1, 2.2, 2.3, 2.4, 2.5, 10.1, 10.2, 10.3, 10.4, 10.5, 13.1, 13.2, 13.3, 13.4, 13.5
 */

export interface TriagePromptProps {
  triageState: TriageState;
  runway: number;
  requiredDuration: number;
  onDecision: (decision: TriageDecision) => void;
}

export function TriagePrompt({
  triageState,
  runway,
  requiredDuration,
  onDecision,
}: TriagePromptProps) {
  const [isVisible, setIsVisible] = useState(false);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const firstButtonRef = useRef<HTMLButtonElement>(null);

  // Animate in on mount
  useEffect(() => {
    requestAnimationFrame(() => {
      setIsVisible(true);
    });
  }, []);

  // Focus management
  useEffect(() => {
    if (isVisible && firstButtonRef.current) {
      firstButtonRef.current.focus();
    }
  }, [isVisible]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      // Triage is critical, so we don't allow Escape to dismiss
      // User must make a decision
      if (e.key === "Escape") {
        e.preventDefault();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // Touch gesture handling for swipe-down to dismiss
  function handleTouchStart(e: React.TouchEvent) {
    setTouchStartY(e.touches[0].clientY);
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (touchStartY === null) return;

    const touchEndY = e.touches[0].clientY;
    const deltaY = touchEndY - touchStartY;

    // If swiping down more than 50px, start moving sheet
    if (deltaY > 50 && sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${deltaY}px)`;
    }
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartY === null) return;

    const touchEndY = e.changedTouches[0].clientY;
    const deltaY = touchEndY - touchStartY;

    // If swiped down more than 100px, dismiss (but triage is critical, so we don't auto-dismiss)
    // Just reset position
    if (sheetRef.current) {
      sheetRef.current.style.transform = "translateY(0)";
    }

    setTouchStartY(null);
  }

  if (!triageState.active || !triageState.anchor) {
    return null;
  }

  const handleOptionClick = (
    mode: "protect_keystone" | "skip_anchor" | "recalculate",
  ) => {
    onDecision({
      mode,
      anchor_id: triageState.anchor!.activityId || "",
    });
  };

  const keystoneName =
    triageState.keystone_activity?.activityName || "essential activity";

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-live="polite"
      aria-label="Triage mode activated - insufficient time for planned activities"
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black transition-opacity duration-300 ${
          isVisible ? "opacity-50" : "opacity-0"
        }`}
        aria-hidden="true"
      />

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className={`relative w-full max-w-2xl bg-surface rounded-t-2xl shadow-2xl border-t-2 border-warning transition-transform duration-300 ${
          isVisible ? "translate-y-0" : "translate-y-full"
        }`}
        style={{
          paddingBottom: "env(safe-area-inset-bottom)",
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {/* Drag Handle */}
        <div className="flex justify-center pt-3 pb-2">
          <div
            className="w-12 h-1 bg-warning rounded-full"
            aria-hidden="true"
          />
        </div>

        {/* Content */}
        <div className="px-6 py-4">
          {/* Warning Icon and Header */}
          <div className="mb-4 flex items-start gap-3">
            <div className="flex-shrink-0">
              <svg
                className="h-6 w-6 text-warning"
                fill="none"
                viewBox="0 0 24 24"
                stroke="currentColor"
                aria-hidden="true"
                role="img"
                aria-label="Warning"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z"
                />
              </svg>
            </div>
            <div className="flex-1">
              <h3
                id="triage-title"
                className="text-lg font-semibold text-text-primary"
              >
                Insufficient Time
              </h3>
              <p className="mt-1 text-sm text-text-secondary">
                You have {runway} minutes until your anchor, but need{" "}
                {requiredDuration} minutes to complete all steps.
              </p>
              <p className="mt-2 text-sm font-medium text-text-primary">
                Keystone activity:{" "}
                <span className="text-accent-primary">{keystoneName}</span>
              </p>
            </div>
          </div>

          {/* Triage Options */}
          <div
            className="space-y-2"
            role="group"
            aria-labelledby="triage-title"
          >
            {triageState.options.map((option, index) => (
              <button
                key={option.id}
                ref={index === 0 ? firstButtonRef : undefined}
                onClick={() => handleOptionClick(option.id)}
                className="w-full rounded-lg border-2 border-border bg-background px-4 py-3 text-left transition-colors hover:bg-surface hover:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-surface"
                style={{ minHeight: "44px", minWidth: "44px" }}
                aria-label={`${option.label}: ${option.description}`}
              >
                <div className="font-medium text-text-primary">
                  {option.label}
                </div>
                <div className="mt-1 text-sm text-text-secondary">
                  {option.description}
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Safe area padding */}
        <div
          style={{ paddingBottom: "calc(1rem + env(safe-area-inset-bottom))" }}
        />
      </div>
    </div>
  );
}
