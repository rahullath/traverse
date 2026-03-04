// Departure Waypoint Component
// Shows "Leave by [time]" prominently before chain steps
// Philosophy: Neutral waypoint, not a deadline with judgment

import React from 'react';
import type { TimeBlock } from '@/types/daily-plan';

export interface DepartureWaypointProps {
  departureTime: Date;
  currentTime: Date;
  anchor: TimeBlock;
}

export function DepartureWaypoint({
  departureTime,
  currentTime,
  anchor,
}: DepartureWaypointProps) {
  const minutesUntil = Math.floor(
    (departureTime.getTime() - currentTime.getTime()) / 60000
  );
  
  // Determine visual state (neutral until very close)
  const state = getWaypointState(minutesUntil);
  
  return (
    <div className={`
      mb-4 p-4 rounded-lg border-2 transition-colors
      ${state === 'plenty_of_time' && 'border-border bg-surface-primary'}
      ${state === 'getting_close' && 'border-accent-primary/50 bg-accent-primary/5'}
      ${state === 'very_close' && 'border-accent-primary bg-accent-primary/10'}
    `}>
      <div className="flex items-center gap-3">
        <div className="text-2xl" aria-hidden="true">
          🚪
        </div>
        <div className="flex-1">
          <div className="text-sm font-medium text-text-tertiary">
            Leave by
          </div>
          <div className="text-xl font-semibold text-text-primary">
            {formatTime(departureTime)}
          </div>
          {minutesUntil > 0 && (
            <div className="text-sm text-text-secondary mt-1">
              {formatTimeUntil(minutesUntil)}
            </div>
          )}
          {minutesUntil <= 0 && (
            <div className="text-sm text-text-secondary mt-1">
              Departure time passed
            </div>
          )}
        </div>
        <div className="text-right">
          <div className="text-xs text-text-tertiary">
            For
          </div>
          <div className="text-sm font-medium text-text-primary">
            {anchor.activityName}
          </div>
        </div>
      </div>
    </div>
  );
}

function getWaypointState(minutesUntil: number): 'plenty_of_time' | 'getting_close' | 'very_close' {
  if (minutesUntil > 30) return 'plenty_of_time';
  if (minutesUntil > 10) return 'getting_close';
  return 'very_close';
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function formatTimeUntil(minutes: number): string {
  if (minutes < 60) {
    return `in ${minutes} min`;
  }
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (mins === 0) {
    return `in ${hours}h`;
  }
  
  return `in ${hours}h ${mins}m`;
}
