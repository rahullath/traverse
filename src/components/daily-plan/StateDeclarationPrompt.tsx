import { useState, useEffect, useRef } from "react";
import type { UserState } from "@/types/triage";
import type { TimeBlock } from "@/types/daily-plan";

export interface StateDeclarationPromptProps {
  timeBlocks: TimeBlock[];
  onDeclare: (state: UserState, stepId?: string) => void;
  onDismiss: () => void;
}

interface StateOption {
  id: UserState;
  label: string;
  description: string;
}

const STATE_OPTIONS: StateOption[] = [
  {
    id: "starting_day",
    label: "Starting my day",
    description: "Show full activation chain from now",
  },
  {
    id: "ready_for_anchor",
    label: "Ready for anchor",
    description: "Hide prep steps, show departure and anchor",
  },
  {
    id: "mid_chain",
    label: "Mid-chain",
    description: "Select which step you're on",
  },
  {
    id: "at_anchor",
    label: "At anchor",
    description: "Mark prep and travel as complete",
  },
  {
    id: "missed_it",
    label: "Missed it",
    description: "Mark anchor as skipped",
  },
  {
    id: "just_checking",
    label: "Just checking",
    description: "View plan without changes",
  },
];

export function StateDeclarationPrompt({
  timeBlocks,
  onDeclare,
  onDismiss,
}: StateDeclarationPromptProps) {
  const [selectedState, setSelectedState] = useState<UserState | null>(null);
  const [selectedStepId, setSelectedStepId] = useState<string | null>(null);
  const [isVisible, setIsVisible] = useState(false);
  const [touchStartY, setTouchStartY] = useState<number | null>(null);
  const sheetRef = useRef<HTMLDivElement>(null);
  const firstFocusableRef = useRef<HTMLButtonElement>(null);

  // Animate in on mount
  useEffect(() => {
    requestAnimationFrame(() => {
      setIsVisible(true);
    });
  }, []);

  // Focus management
  useEffect(() => {
    if (isVisible && firstFocusableRef.current) {
      firstFocusableRef.current.focus();
    }
  }, [isVisible]);

  // Keyboard navigation
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        handleDismiss();
      } else if (
        e.key === "Enter" &&
        selectedState &&
        selectedState !== "mid_chain"
      ) {
        e.preventDefault();
        handleContinue();
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [selectedState, selectedStepId]);

  // Touch gesture handling for swipe-down to dismiss
  function handleTouchStart(e: React.TouchEvent) {
    setTouchStartY(e.touches[0].clientY);
  }

  function handleTouchMove(e: React.TouchEvent) {
    if (touchStartY === null) return;

    const touchEndY = e.touches[0].clientY;
    const deltaY = touchEndY - touchStartY;

    // If swiping down more than 50px, start dismissing
    if (deltaY > 50 && sheetRef.current) {
      sheetRef.current.style.transform = `translateY(${deltaY}px)`;
    }
  }

  function handleTouchEnd(e: React.TouchEvent) {
    if (touchStartY === null) return;

    const touchEndY = e.changedTouches[0].clientY;
    const deltaY = touchEndY - touchStartY;

    // If swiped down more than 100px, dismiss
    if (deltaY > 100) {
      handleDismiss();
    } else if (sheetRef.current) {
      // Reset position
      sheetRef.current.style.transform = "translateY(0)";
    }

    setTouchStartY(null);
  }

  function handleDismiss() {
    setIsVisible(false);
    setTimeout(() => {
      onDismiss();
    }, 300); // Match animation duration
  }

  function handleContinue() {
    if (!selectedState) return;

    if (selectedState === "mid_chain" && !selectedStepId) {
      // Don't submit if mid_chain selected but no step chosen
      return;
    }

    onDeclare(selectedState, selectedStepId || undefined);
  }

  // Get chain steps for mid_chain selector
  const chainSteps = timeBlocks.filter(
    (block) => block.metadata?.role?.type === "chain-step",
  );

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center"
      role="dialog"
      aria-modal="true"
      aria-labelledby="state-prompt-title"
    >
      {/* Backdrop */}
      <div
        className={`absolute inset-0 bg-black transition-opacity duration-300 ${
          isVisible ? "opacity-50" : "opacity-0"
        }`}
        onClick={handleDismiss}
        aria-hidden="true"
      />

      {/* Bottom Sheet */}
      <div
        ref={sheetRef}
        className={`relative w-full max-w-2xl bg-surface rounded-t-2xl shadow-2xl transition-transform duration-300 ${
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
          <div className="w-12 h-1 bg-border rounded-full" aria-hidden="true" />
        </div>

        {/* Header */}
        <div className="px-6 py-4 border-b border-border">
          <div className="flex items-center justify-between">
            <h2
              id="state-prompt-title"
              className="text-xl font-semibold text-text-primary"
            >
              Where are you in your day?
            </h2>
            <button
              ref={firstFocusableRef}
              onClick={handleDismiss}
              className="p-2 text-text-secondary hover:text-text-primary rounded-lg hover:bg-background transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-surface"
              aria-label="Dismiss prompt"
            >
              <svg
                className="w-5 h-5"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
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

        {/* Options */}
        <div className="px-6 py-4 max-h-96 overflow-y-auto">
          <div
            className="space-y-2"
            role="radiogroup"
            aria-labelledby="state-prompt-title"
          >
            {STATE_OPTIONS.map((option) => (
              <div key={option.id}>
                <label
                  className={`flex items-start p-4 rounded-lg border-2 cursor-pointer transition-all focus-within:ring-2 focus-within:ring-accent-primary focus-within:ring-offset-2 focus-within:ring-offset-surface ${
                    selectedState === option.id
                      ? "border-accent-primary bg-accent-primary/10"
                      : "border-border hover:border-accent-primary/50 hover:bg-background"
                  }`}
                >
                  <input
                    type="radio"
                    name="state"
                    value={option.id}
                    checked={selectedState === option.id}
                    onChange={() => {
                      setSelectedState(option.id);
                      if (option.id !== "mid_chain") {
                        setSelectedStepId(null);
                      }
                    }}
                    className="mt-1 w-4 h-4 text-accent-primary focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-surface"
                    aria-describedby={`${option.id}-description`}
                  />
                  <div className="ml-3 flex-1">
                    <div className="text-base font-medium text-text-primary">
                      {option.label}
                    </div>
                    <div
                      id={`${option.id}-description`}
                      className="text-sm text-text-secondary mt-1"
                    >
                      {option.description}
                    </div>
                  </div>
                </label>

                {/* Mid-chain step selector */}
                {option.id === "mid_chain" && selectedState === "mid_chain" && (
                  <div className="ml-7 mt-2 p-4 bg-background rounded-lg border border-border">
                    <label
                      htmlFor="step-selector"
                      className="block text-sm font-medium text-text-primary mb-2"
                    >
                      Which step are you on?
                    </label>
                    <select
                      id="step-selector"
                      value={selectedStepId || ""}
                      onChange={(e) => setSelectedStepId(e.target.value)}
                      className="w-full px-3 py-2 bg-surface border border-border rounded-lg text-text-primary focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-background"
                      aria-label="Select current step"
                    >
                      <option value="">Select a step...</option>
                      {chainSteps.map((step) => (
                        <option
                          key={step.id}
                          value={step.metadata?.step_id || step.id}
                        >
                          {step.activityName}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* Footer */}
        <div
          className="px-6 py-4 border-t border-border"
          style={{
            paddingBottom: "calc(1rem + env(safe-area-inset-bottom))",
          }}
        >
          <button
            onClick={handleContinue}
            disabled={
              !selectedState ||
              (selectedState === "mid_chain" && !selectedStepId)
            }
            className="w-full min-h-[44px] px-6 py-3 bg-accent-primary text-white font-medium rounded-lg hover:bg-accent-primary/90 disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-accent-primary focus:ring-offset-2 focus:ring-offset-surface"
            aria-label="Continue with selected state"
          >
            Continue
          </button>
        </div>
      </div>
    </div>
  );
}
