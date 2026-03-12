// src/components/daily-plan/FreeActivationPrompt.tsx
// Free Activation Prompt Component for Mirror V2
// Requirements: 10.1, 10.2, 10.3, 10.4, 10.5

import React, { useState } from "react";
import type { ChainStartTime } from "@/lib/display/serializer";
import { ChainStartSelector } from "./ChainStartSelector";

export interface FreeActivationPromptProps {
  keystoneActivity: string | null;
  onStartChain: (startTime: ChainStartTime) => void;
  onKeystoneOnly: () => void;
  onDismiss: () => void;
}

/**
 * FreeActivationPrompt Component
 *
 * Support activation on days without anchors.
 * Emphasizes keystone as primary daily goal.
 *
 * Requirements: 10.1, 10.2, 10.3, 10.4, 10.5
 */
export function FreeActivationPrompt({
  keystoneActivity,
  onStartChain,
  onKeystoneOnly,
  onDismiss,
}: FreeActivationPromptProps) {
  const [showStartSelector, setShowStartSelector] = useState(false);

  const handleStartChain = (startTime: ChainStartTime) => {
    onStartChain(startTime);
  };

  return (
    <div
      className="mb-6 p-6 bg-surface-primary border-2 border-accent-primary/40 rounded-xl shadow-lg"
      role="dialog"
      aria-labelledby="free-activation-heading"
      aria-describedby="free-activation-description"
    >
      {/* Heading - Requirement 10.2 */}
      <h2
        id="free-activation-heading"
        className="text-2xl font-bold text-text-primary mb-2"
      >
        No anchors today
      </h2>

      <p
        id="free-activation-description"
        className="text-sm text-text-muted mb-6"
      >
        Want to run your activation chain?
      </p>

      {!showStartSelector ? (
        <div className="space-y-3">
          {/* Start Chain Button - Requirement 10.3 */}
          <button
            onClick={() => setShowStartSelector(true)}
            className="w-full p-4 text-left bg-surface-secondary hover:bg-surface-hover border-2 border-border-primary hover:border-accent-primary/60 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-background group"
            aria-label="Start activation chain"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-text-primary group-hover:text-accent-primary transition-colors">
                  Run activation chain
                </h3>
                <p className="text-sm text-text-muted mt-1">
                  Go through your morning routine
                </p>
              </div>
              <svg
                className="w-6 h-6 text-text-muted group-hover:text-accent-primary transition-colors"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M9 5l7 7-7 7"
                />
              </svg>
            </div>
          </button>

          {/* Keystone Only Shortcut - Requirement 10.5 */}
          {keystoneActivity && (
            <button
              onClick={onKeystoneOnly}
              className="w-full p-4 text-left bg-accent-primary/10 hover:bg-accent-primary/20 border-2 border-accent-primary/40 hover:border-accent-primary/60 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-background group"
              aria-label={`Just focus on ${keystoneActivity}`}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center">
                  <span className="text-2xl mr-3" aria-hidden="true">
                    🌟
                  </span>
                  <div>
                    <h3 className="text-lg font-semibold text-accent-primary">
                      Just {keystoneActivity}
                    </h3>
                    <p className="text-sm text-text-muted mt-1">
                      Focus on the one thing that unlocks your day
                    </p>
                  </div>
                </div>
                <svg
                  className="w-6 h-6 text-accent-primary"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  aria-hidden="true"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M9 5l7 7-7 7"
                  />
                </svg>
              </div>
            </button>
          )}

          {/* Dismiss Button */}
          <button
            onClick={onDismiss}
            className="mt-2 w-full px-4 py-2 text-sm font-medium text-text-muted hover:text-text-primary border border-border-primary hover:border-border-hover rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-background"
            aria-label="Dismiss free activation prompt"
          >
            Not right now
          </button>
        </div>
      ) : (
        <div>
          {/* Chain Start Selector - Requirement 10.3 */}
          <ChainStartSelector onSelectStart={handleStartChain} />
          <button
            onClick={() => setShowStartSelector(false)}
            className="mt-3 w-full px-4 py-2 text-sm font-medium text-text-muted hover:text-text-primary border border-border-primary hover:border-border-hover rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-background"
            aria-label="Cancel chain start selection"
          >
            Cancel
          </button>
        </div>
      )}
    </div>
  );
}
