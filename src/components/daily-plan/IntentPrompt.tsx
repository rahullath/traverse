// src/components/daily-plan/IntentPrompt.tsx
// Intent Prompt Component for Mirror V2
// Requirements: 11.1, 11.2, 11.3

import React from "react";
import type { TimeBlock } from "@/types/daily-plan";
import type { DisplayIntent } from "@/lib/display/display-mode-service";
import type { ChainStartTime } from "@/lib/display/serializer";

export interface IntentPromptProps {
  anchors: TimeBlock[];
  keystoneActivity: string | null;
  currentTime: Date;
  onSelectIntent: (intent: DisplayIntent, startTime?: ChainStartTime) => void;
  onDismiss: () => void;
}

/**
 * IntentPrompt Component
 *
 * Replaces StateDeclarationPrompt with user-need-focused interface.
 * Asks "What do you need?" instead of "Where are you?"
 *
 * Requirements: 11.1, 11.2, 11.3
 */
export function IntentPrompt({
  anchors,
  keystoneActivity,
  currentTime,
  onSelectIntent,
  onDismiss,
}: IntentPromptProps) {
  const hasAnchors = anchors.length > 0;
  const nextAnchor = hasAnchors
    ? anchors
        .filter((a) => new Date(a.startTime) > currentTime)
        .sort(
          (a, b) =>
            new Date(a.startTime).getTime() - new Date(b.startTime).getTime(),
        )[0]
    : null;

  // Format time for display
  const formatTime = (date: Date): string => {
    return new Date(date).toLocaleTimeString("en-US", {
      hour: "numeric",
      minute: "2-digit",
      hour12: true,
    });
  };

  // Calculate time until anchor
  const getTimeUntilAnchor = (anchor: TimeBlock): string => {
    const diff = new Date(anchor.startTime).getTime() - currentTime.getTime();
    const hours = Math.floor(diff / (1000 * 60 * 60));
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));

    if (hours > 0) {
      return `in ${hours}h ${minutes}m`;
    }
    return `in ${minutes}m`;
  };

  return (
    <div
      className="mb-6 p-6 bg-surface-primary border-2 border-accent-primary/40 rounded-xl shadow-lg"
      role="dialog"
      aria-labelledby="intent-prompt-heading"
      aria-describedby="intent-prompt-description"
    >
      {/* Heading - Requirement 11.2 */}
      <h2
        id="intent-prompt-heading"
        className="text-2xl font-bold text-text-primary mb-2"
      >
        What do you need?
      </h2>

      {/* Anchor Information */}
      {nextAnchor && (
        <p
          id="intent-prompt-description"
          className="text-sm text-text-muted mb-6"
        >
          You have{" "}
          {anchors.length === 1 ? "an anchor" : `${anchors.length} anchors`}{" "}
          today. Next:{" "}
          <span className="font-semibold text-text-primary">
            {nextAnchor.activityName}
          </span>{" "}
          at{" "}
          <span className="font-semibold text-text-primary">
            {formatTime(nextAnchor.startTime)}
          </span>{" "}
          <span className="text-accent-primary">
            ({getTimeUntilAnchor(nextAnchor)})
          </span>
        </p>
      )}

      {!nextAnchor && hasAnchors && (
        <p
          id="intent-prompt-description"
          className="text-sm text-text-muted mb-6"
        >
          All anchors for today have passed.
        </p>
      )}

      {/* Intent Options - Requirement 11.3 */}
      <div className="space-y-3">
        {/* Full Morning Chain */}
        <button
          onClick={() => onSelectIntent("full_chain")}
          className="w-full p-4 text-left bg-surface-secondary hover:bg-surface-hover border-2 border-border-primary hover:border-accent-primary/60 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-background group"
          aria-label="Show full morning chain"
        >
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-lg font-semibold text-text-primary group-hover:text-accent-primary transition-colors">
                Full morning chain
              </h3>
              <p className="text-sm text-text-muted mt-1">
                See everything in your plan
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

        {/* Just Keystone + Anchor */}
        {keystoneActivity && hasAnchors && (
          <button
            onClick={() => onSelectIntent("keystone_focus")}
            className="w-full p-4 text-left bg-surface-secondary hover:bg-surface-hover border-2 border-border-primary hover:border-accent-primary/60 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-background group"
            aria-label="Show just keystone and anchor"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-text-primary group-hover:text-accent-primary transition-colors">
                  Just keystone + anchor
                </h3>
                <p className="text-sm text-text-muted mt-1">
                  Focus on {keystoneActivity} and your commitment
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
        )}

        {/* Check If I Can Make It */}
        {nextAnchor && (
          <button
            onClick={() => onSelectIntent("reality_check")}
            className="w-full p-4 text-left bg-surface-secondary hover:bg-surface-hover border-2 border-border-primary hover:border-accent-primary/60 rounded-lg transition-all focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-background group"
            aria-label="Check if you can make it to your anchor"
          >
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold text-text-primary group-hover:text-accent-primary transition-colors">
                  Check if I can make it
                </h3>
                <p className="text-sm text-text-muted mt-1">
                  See what's possible given current time
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
        )}
      </div>

      {/* Dismiss Button */}
      <button
        onClick={onDismiss}
        className="mt-4 w-full px-4 py-2 text-sm font-medium text-text-muted hover:text-text-primary border border-border-primary hover:border-border-hover rounded-lg transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-background"
        aria-label="Dismiss intent prompt"
      >
        Dismiss
      </button>
    </div>
  );
}
