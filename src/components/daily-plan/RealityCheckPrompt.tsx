// Reality check: User-initiated "Can I make it?" assessment
// Philosophy: Neutral options, no warnings, no judgment
// Shows what's possible, not what you "should" do

import React from 'react';
import type { TimeBlock } from '@/types/daily-plan';

export interface RealityCheckResult {
  canMakeIt: boolean;
  possibleSteps: TimeBlock[];
  skippableSteps: TimeBlock[];
  departureTime: Date | null;
  minutesAvailable: number;
}

export interface RealityCheckPromptProps {
  result: RealityCheckResult;
  anchor: TimeBlock;
  onSelectOption: (option: 'full' | 'minimal' | 'skip') => void;
  onDismiss: () => void;
}

export function RealityCheckPrompt({
  result,
  anchor,
  onSelectOption,
  onDismiss,
}: RealityCheckPromptProps) {
  const { canMakeIt, possibleSteps, departureTime, minutesAvailable } = result;
  
  return (
    <div className="mb-6 p-4 bg-surface-primary border border-border-primary rounded-lg">
      <div className="flex items-start justify-between mb-4">
        <h3 className="text-lg font-medium text-text-primary">
          Reality Check
        </h3>
        <button
          onClick={onDismiss}
          className="p-1 text-text-secondary hover:text-text-primary rounded transition-colors"
          aria-label="Dismiss"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>

      <div className="mb-4">
        <p className="text-sm text-text-secondary">
          {anchor.activityName} at {formatTime(anchor.startTime)}
        </p>
        <p className="text-sm text-text-tertiary mt-1">
          You have {minutesAvailable} minutes available
        </p>
      </div>

      {canMakeIt ? (
        <div className="space-y-3">
          <div className="p-3 bg-background rounded-lg">
            <p className="text-sm font-medium text-text-primary mb-2">
              You have time for:
            </p>
            <ul className="space-y-1">
              {possibleSteps.map((step) => (
                <li key={step.id} className="text-sm text-text-secondary flex items-center gap-2">
                  <span className="text-success">✓</span>
                  {step.activityName} ({getDuration(step)} min)
                </li>
              ))}
            </ul>
            {departureTime && (
              <p className="text-sm text-text-tertiary mt-2">
                Leave by {formatTime(departureTime)}
              </p>
            )}
          </div>

          <button
            onClick={() => onSelectOption('full')}
            className="w-full px-4 py-3 bg-accent-primary text-white rounded-lg hover:bg-accent-primary/90 transition-colors text-sm font-medium"
          >
            Show me the full chain
          </button>
        </div>
      ) : (
        <div className="space-y-3">
          <div className="p-3 bg-background rounded-lg">
            <p className="text-sm text-text-secondary mb-3">
              Not enough time for the full chain. You could:
            </p>
            
            {possibleSteps.length > 0 && (
              <div className="mb-3">
                <p className="text-xs font-medium text-text-tertiary mb-1">
                  Quick version:
                </p>
                <ul className="space-y-1">
                  {possibleSteps.map((step) => (
                    <li key={step.id} className="text-sm text-text-secondary flex items-center gap-2">
                      <span>•</span>
                      {step.activityName} ({getDuration(step)} min)
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>

          <div className="grid grid-cols-2 gap-2">
            {possibleSteps.length > 0 && (
              <button
                onClick={() => onSelectOption('minimal')}
                className="px-4 py-3 bg-surface-secondary border border-border text-text-primary rounded-lg hover:bg-surface-hover transition-colors text-sm font-medium"
              >
                Quick version
              </button>
            )}
            <button
              onClick={() => onSelectOption('skip')}
              className="px-4 py-3 bg-surface-secondary border border-border text-text-primary rounded-lg hover:bg-surface-hover transition-colors text-sm font-medium"
            >
              Skip this anchor
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function getDuration(block: TimeBlock): number {
  return Math.floor(
    (block.endTime.getTime() - block.startTime.getTime()) / 60000
  );
}
