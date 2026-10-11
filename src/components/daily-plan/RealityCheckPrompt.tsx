// Reality Check Prompt Component
// Requirements: 7.3, 7.4, 7.5, 16.1, 16.4, 16.5

import React from "react";
import type { RealityCheckResult } from "@/lib/display/reality-check";

interface RealityCheckPromptProps {
  result: RealityCheckResult;
  onSelectAlternative: (alternativeId: string) => void;
  onDismiss: () => void;
}

/**
 * User-initiated reality check prompt
 *
 * Displays what activities are possible given current time,
 * using neutral language without judgment.
 *
 * Requirements: 7.3, 7.4, 7.5, 16.1, 16.4, 16.5
 */
export function RealityCheckPrompt({
  result,
  onSelectAlternative,
  onDismiss,
}: RealityCheckPromptProps) {
  return (
    <div
      className="rounded-lg border border-border bg-surface-primary p-4 shadow-sm"
      role="region"
      aria-label="Reality check results"
    >
      {/* Main result - neutral language (Req 7.3, 7.5) */}
      <div className="mb-4">
        <h3 className="mb-2 text-lg font-medium text-text-primary">
          You have time for:
        </h3>
        {result.possibleSteps.length > 0 ? (
          <ul className="space-y-1 text-text-secondary">
            {result.possibleSteps.map((step) => (
              <li key={step.id} className="flex items-center gap-2">
                <span className="text-accent-primary">•</span>
                <span>
                  {step.activityName} (
                  {Math.floor(
                    (step.endTime.getTime() - step.startTime.getTime()) / 60000,
                  )}{" "}
                  min)
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-text-secondary">
            You have time to head straight to your anchor.
          </p>
        )}
      </div>

      {/* Time summary */}
      <div className="mb-4 rounded bg-surface-secondary p-3 text-sm">
        <div className="flex justify-between text-text-secondary">
          <span>Time available:</span>
          <span className="font-medium text-text-primary">
            {result.runway} min
          </span>
        </div>
        {result.possibleSteps.length > 0 && (
          <div className="mt-1 flex justify-between text-text-secondary">
            <span>Time needed:</span>
            <span className="font-medium text-text-primary">
              {result.possibleSteps.reduce((sum, step) => {
                const duration = Math.floor(
                  (step.endTime.getTime() - step.startTime.getTime()) / 60000,
                );
                return sum + duration;
              }, 0)}{" "}
              min
            </span>
          </div>
        )}
      </div>

      {/* Alternative options (Req 7.4) */}
      {result.alternatives.length > 0 && (
        <div className="mb-4">
          <h4 className="mb-2 text-sm font-medium text-text-secondary">Or:</h4>
          <div className="space-y-2">
            {result.alternatives.map((alt) => (
              <button
                key={alt.id}
                onClick={() => onSelectAlternative(alt.id)}
                className="w-full rounded border border-border bg-surface-secondary px-3 py-2 text-left transition-colors hover:border-accent-primary hover:bg-surface-primary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-background"
                type="button"
              >
                <div className="font-medium text-text-primary">{alt.label}</div>
                <div className="text-sm text-text-secondary">
                  {alt.description}
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* Dismiss button */}
      <div className="flex justify-end">
        <button
          onClick={onDismiss}
          className="rounded px-4 py-2 text-sm font-medium text-text-secondary transition-colors hover:bg-surface-secondary hover:text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-background"
          type="button"
        >
          Dismiss
        </button>
      </div>
    </div>
  );
}
