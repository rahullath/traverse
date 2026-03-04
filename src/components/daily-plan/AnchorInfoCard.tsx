// Neutral information display for anchors
// Replaces judgment-based "Complete by" deadline banners
// Philosophy: Show times as calm facts, not deadlines with countdowns

import React from 'react';
import type { TimeBlock } from '@/types/daily-plan';

export interface AnchorInfoCardProps {
  anchor: TimeBlock;
  currentTime: Date;
}

export function AnchorInfoCard({ anchor, currentTime }: AnchorInfoCardProps) {
  const anchorStart = anchor.startTime;
  const minutesUntil = Math.floor(
    (anchorStart.getTime() - currentTime.getTime()) / 60000
  );
  
  // Format time remaining as neutral information
  const timeInfo = formatTimeRemaining(minutesUntil);
  
  // Get anchor type for icon
  const anchorType = anchor.metadata?.original_anchor_type || 'other';
  const icon = getAnchorIcon(anchorType);
  
  return (
    <div className="mb-4 p-4 bg-surface-primary border border-border-primary rounded-lg">
      <div className="flex items-start gap-3">
        <div className="text-2xl" aria-hidden="true">
          {icon}
        </div>
        <div className="flex-1">
          <h3 className="text-lg font-medium text-text-primary">
            {anchor.activityName}
          </h3>
          <div className="mt-1 text-sm text-text-secondary">
            {formatTime(anchorStart)} {timeInfo && `• ${timeInfo}`}
          </div>
          {anchor.location && (
            <div className="mt-1 text-sm text-text-tertiary">
              📍 {anchor.location}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function formatTimeRemaining(minutes: number): string | null {
  if (minutes < 0) {
    // Anchor has passed - show neutrally
    const hoursAgo = Math.floor(Math.abs(minutes) / 60);
    const minsAgo = Math.abs(minutes) % 60;
    
    if (hoursAgo > 0) {
      return `${hoursAgo}h ${minsAgo}m ago`;
    }
    return `${minsAgo}m ago`;
  }
  
  if (minutes < 60) {
    return `in ${minutes}m`;
  }
  
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  
  if (mins === 0) {
    return `in ${hours}h`;
  }
  
  return `in ${hours}h ${mins}m`;
}

function formatTime(date: Date): string {
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

function getAnchorIcon(type: string): string {
  switch (type) {
    case 'class':
    case 'seminar':
      return '🎓';
    case 'appointment':
      return '📅';
    case 'workshop':
      return '🛠️';
    default:
      return '🎯';
  }
}
