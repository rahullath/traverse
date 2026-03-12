// Chain Start Selector Component
// Requirements: 8.2, 8.4, 8.5

import React, { useState, useEffect } from "react";

export type ChainStartMode =
  | "now"
  | "in_10"
  | "in_30"
  | "custom"
  | "when_ready";

export type ChainStartTime =
  | { type: "now" }
  | { type: "in_minutes"; minutes: number }
  | { type: "at_time"; time: Date }
  | { type: "when_ready" };

interface ChainStartSelectorProps {
  onSelectStart: (startTime: ChainStartTime) => void;
  defaultMode?: ChainStartMode;
}

const SESSION_STORAGE_KEY = "mirror_chain_start_mode";

/**
 * Chain start time selector
 *
 * Allows users to choose when to begin their chain with flexible options.
 *
 * Requirements: 8.2, 8.4, 8.5
 */
export function ChainStartSelector({
  onSelectStart,
  defaultMode,
}: ChainStartSelectorProps) {
  // Load last selected mode from sessionStorage (Req 8.5)
  const [selectedMode, setSelectedMode] = useState<ChainStartMode>(() => {
    if (defaultMode) return defaultMode;

    try {
      const stored = sessionStorage.getItem(SESSION_STORAGE_KEY);
      if (stored && isValidMode(stored)) {
        return stored as ChainStartMode;
      }
    } catch (e) {
      // sessionStorage not available
    }

    return "now";
  });

  const [customTime, setCustomTime] = useState<string>("");

  // Save selected mode to sessionStorage (Req 8.5)
  useEffect(() => {
    try {
      sessionStorage.setItem(SESSION_STORAGE_KEY, selectedMode);
    } catch (e) {
      // sessionStorage not available
    }
  }, [selectedMode]);

  const handleModeChange = (mode: ChainStartMode) => {
    setSelectedMode(mode);
  };

  const handleContinue = () => {
    let startTime: ChainStartTime;

    // Convert selected mode to ChainStartTime (Req 8.4)
    switch (selectedMode) {
      case "now":
        startTime = { type: "now" };
        break;
      case "in_10":
        startTime = { type: "in_minutes", minutes: 10 };
        break;
      case "in_30":
        startTime = { type: "in_minutes", minutes: 30 };
        break;
      case "custom":
        if (customTime) {
          const [hours, minutes] = customTime.split(":").map(Number);
          const time = new Date();
          time.setHours(hours, minutes, 0, 0);
          startTime = { type: "at_time", time };
        } else {
          startTime = { type: "now" };
        }
        break;
      case "when_ready":
        startTime = { type: "when_ready" };
        break;
      default:
        startTime = { type: "now" };
    }

    onSelectStart(startTime);
  };

  return (
    <div
      className="rounded-lg border border-border bg-surface-primary p-4 shadow-sm"
      role="region"
      aria-label="Chain start time selector"
    >
      <h3 className="mb-4 text-lg font-medium text-text-primary">
        Start chain:
      </h3>

      {/* Five options (Req 8.2) */}
      <div className="space-y-2">
        <label className="flex cursor-pointer items-center gap-3 rounded border border-border bg-surface-secondary p-3 transition-colors hover:border-accent-primary">
          <input
            type="radio"
            name="chain-start"
            value="now"
            checked={selectedMode === "now"}
            onChange={() => handleModeChange("now")}
            className="h-4 w-4 border-border text-accent-primary focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-background"
          />
          <span className="text-text-primary">Now</span>
        </label>

        <label className="flex cursor-pointer items-center gap-3 rounded border border-border bg-surface-secondary p-3 transition-colors hover:border-accent-primary">
          <input
            type="radio"
            name="chain-start"
            value="in_10"
            checked={selectedMode === "in_10"}
            onChange={() => handleModeChange("in_10")}
            className="h-4 w-4 border-border text-accent-primary focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-background"
          />
          <span className="text-text-primary">In 10 minutes</span>
        </label>

        <label className="flex cursor-pointer items-center gap-3 rounded border border-border bg-surface-secondary p-3 transition-colors hover:border-accent-primary">
          <input
            type="radio"
            name="chain-start"
            value="in_30"
            checked={selectedMode === "in_30"}
            onChange={() => handleModeChange("in_30")}
            className="h-4 w-4 border-border text-accent-primary focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-background"
          />
          <span className="text-text-primary">In 30 minutes</span>
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded border border-border bg-surface-secondary p-3 transition-colors hover:border-accent-primary">
          <input
            type="radio"
            name="chain-start"
            value="custom"
            checked={selectedMode === "custom"}
            onChange={() => handleModeChange("custom")}
            className="mt-1 h-4 w-4 border-border text-accent-primary focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-background"
          />
          <div className="flex-1">
            <span className="text-text-primary">Custom time</span>
            {selectedMode === "custom" && (
              <input
                type="time"
                value={customTime}
                onChange={(e) => setCustomTime(e.target.value)}
                className="mt-2 w-full rounded border border-border bg-background px-3 py-2 text-text-primary focus:border-accent-primary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-background"
                aria-label="Custom start time"
              />
            )}
          </div>
        </label>

        <label className="flex cursor-pointer items-start gap-3 rounded border border-border bg-surface-secondary p-3 transition-colors hover:border-accent-primary">
          <input
            type="radio"
            name="chain-start"
            value="when_ready"
            checked={selectedMode === "when_ready"}
            onChange={() => handleModeChange("when_ready")}
            className="mt-1 h-4 w-4 border-border text-accent-primary focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-background"
          />
          <div className="flex-1">
            <span className="text-text-primary">When ready</span>
            <p className="mt-1 text-sm text-text-secondary">
              Just show me the sequence
            </p>
          </div>
        </label>
      </div>

      {/* Continue button */}
      <div className="mt-4 flex justify-end">
        <button
          onClick={handleContinue}
          disabled={selectedMode === "custom" && !customTime}
          className="rounded bg-accent-primary px-4 py-2 font-medium text-white transition-colors hover:bg-accent-secondary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-background disabled:cursor-not-allowed disabled:opacity-50"
          type="button"
        >
          Continue
        </button>
      </div>
    </div>
  );
}

function isValidMode(value: string): boolean {
  return ["now", "in_10", "in_30", "custom", "when_ready"].includes(value);
}
