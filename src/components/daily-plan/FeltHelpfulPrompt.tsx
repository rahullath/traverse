// src/components/daily-plan/FeltHelpfulPrompt.tsx
// "Did this help today?" feedback prompt
// Requirements: 20.1, 20.2, 20.3, 20.4, 20.5

import React, { useState } from "react";

export interface FeltHelpfulPromptProps {
  onSubmit: (response: "yes" | "somewhat" | "not_really") => void;
  onDismiss: () => void;
}

export function FeltHelpfulPrompt({
  onSubmit,
  onDismiss,
}: FeltHelpfulPromptProps) {
  const [submitting, setSubmitting] = useState(false);

  async function handleResponse(response: "yes" | "somewhat" | "not_really") {
    setSubmitting(true);
    try {
      await onSubmit(response);
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="mb-6 p-6 bg-surface-primary border border-border rounded-lg"
      role="dialog"
      aria-labelledby="felt-helpful-heading"
    >
      <h3
        id="felt-helpful-heading"
        className="text-lg font-semibold text-text-primary mb-4"
      >
        Did this help today?
      </h3>

      <p className="text-sm text-text-secondary mb-6">
        Your feedback helps us improve the Mirror experience.
      </p>

      <div className="flex flex-col sm:flex-row gap-3 mb-4">
        <button
          onClick={() => handleResponse("yes")}
          disabled={submitting}
          className="flex-1 px-4 py-3 text-sm font-medium rounded-lg bg-success/10 text-success border border-success/20 hover:bg-success/20 transition-colors focus:outline-none focus:ring-2 focus:ring-success focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Yes, this helped today"
        >
          Yes
        </button>

        <button
          onClick={() => handleResponse("somewhat")}
          disabled={submitting}
          className="flex-1 px-4 py-3 text-sm font-medium rounded-lg bg-surface-secondary text-text-primary border border-border hover:bg-surface-hover transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Somewhat helpful today"
        >
          Somewhat
        </button>

        <button
          onClick={() => handleResponse("not_really")}
          disabled={submitting}
          className="flex-1 px-4 py-3 text-sm font-medium rounded-lg bg-surface-secondary text-text-primary border border-border hover:bg-surface-hover transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed"
          aria-label="Not really helpful today"
        >
          Not really
        </button>
      </div>

      <button
        onClick={onDismiss}
        disabled={submitting}
        className="w-full px-4 py-2 text-sm font-medium rounded-lg text-text-muted hover:text-text-secondary hover:bg-surface-hover transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-background disabled:opacity-50 disabled:cursor-not-allowed"
        aria-label="Skip feedback"
      >
        Skip
      </button>
    </div>
  );
}
