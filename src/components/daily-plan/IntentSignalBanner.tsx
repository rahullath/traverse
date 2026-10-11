// src/components/daily-plan/IntentSignalBanner.tsx
import React, { useState, useEffect } from "react";

/**
 * Intent Signal Banner
 *
 * Displays a neutral re-engagement message when user hasn't created
 * a daily plan in 7+ consecutive days.
 *
 * Requirements: 9.1, 9.2, 9.3, 9.4, 9.5
 */

export interface IntentSignalBannerProps {
  /** User ID for checking absence */
  userId: string;
  /** Callback when user wants to generate a plan */
  onGeneratePlan: () => void;
}

export default function IntentSignalBanner({
  userId,
  onGeneratePlan,
}: IntentSignalBannerProps) {
  const [show, setShow] = useState(false);
  const [daysAbsent, setDaysAbsent] = useState(0);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    checkAbsence();
  }, [userId]);

  async function checkAbsence() {
    try {
      setLoading(true);

      // Check session storage for dismissal
      const sessionKey = `intent-signal-dismissed-${userId}`;
      const dismissed = sessionStorage.getItem(sessionKey) === "true";

      if (dismissed) {
        setShow(false);
        setLoading(false);
        return;
      }

      // Query for recent daily plans
      const response = await fetch("/api/daily-plan/check-absence");

      if (!response.ok) {
        console.error("Failed to check absence");
        setShow(false);
        setLoading(false);
        return;
      }

      const data = await response.json();

      // Show banner if 7+ days absent
      if (data.days_absent >= 7) {
        setShow(true);
        setDaysAbsent(data.days_absent);
      } else {
        setShow(false);
      }
    } catch (error) {
      console.error("Error checking absence:", error);
      setShow(false);
    } finally {
      setLoading(false);
    }
  }

  function handleDismiss() {
    // Store dismissal in session storage (not persistent)
    const sessionKey = `intent-signal-dismissed-${userId}`;
    sessionStorage.setItem(sessionKey, "true");
    setShow(false);
  }

  function handleGeneratePlan() {
    handleDismiss();
    onGeneratePlan();
  }

  // Don't render anything while loading or if not showing
  if (loading || !show) {
    return null;
  }

  return (
    <div className="bg-surface border border-border rounded-lg p-4 mb-6 shadow-sm">
      <div className="flex items-start gap-4">
        {/* Icon */}
        <div className="flex-shrink-0 mt-0.5">
          <svg
            className="w-5 h-5 text-accent-primary"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
            />
          </svg>
        </div>

        {/* Content */}
        <div className="flex-1 min-w-0">
          <h3 className="text-sm font-medium text-text-primary mb-1">
            Welcome back
          </h3>
          <p className="text-sm text-text-secondary mb-3">
            It's been a while since your last plan. Would you like to create one
            for today?
          </p>

          {/* Actions */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={handleGeneratePlan}
              className="px-3 py-1.5 text-sm font-medium rounded-md bg-accent-primary text-white hover:bg-accent-primary/90 transition-colors"
            >
              Yes, generate plan
            </button>
            <button
              onClick={handleDismiss}
              className="px-3 py-1.5 text-sm font-medium rounded-md border border-border text-text-secondary hover:text-text-primary hover:bg-surface-hover transition-colors"
            >
              No, not today
            </button>
          </div>
        </div>

        {/* Close button */}
        <button
          onClick={handleDismiss}
          className="flex-shrink-0 text-text-muted hover:text-text-primary transition-colors"
          aria-label="Dismiss"
        >
          <svg
            className="w-5 h-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  );
}
