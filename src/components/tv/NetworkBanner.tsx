import React from 'react';

interface NetworkBannerProps {
  variant: 'offline' | 'queued' | 'install';
  queuedCount?: number;
  onInstall?: () => void;
  onDismiss?: () => void;
}

export function NetworkBanner({ variant, queuedCount, onInstall }: NetworkBannerProps) {
  if (variant === 'offline') {
    return (
      <div className="tv-banner tv-banner--offline">
        <span className="tv-banner__dot" />
        <div className="tv-banner__text">
          <span className="tv-banner__title">Offline</span>
          <span className="tv-banner__sub">Showing the last synced chain. Completions and edits are queued, not lost.</span>
        </div>
      </div>
    );
  }
  if (variant === 'queued') {
    return (
      <div className="tv-banner tv-banner--queued">
        <span className="tv-banner__dot" />
        <div className="tv-banner__text">
          <span className="tv-banner__title">Reconnecting — {queuedCount ?? 0} action{queuedCount === 1 ? '' : 's'} queued</span>
          <span className="tv-banner__sub">Complete/skip/edit keep working offline and retry automatically.</span>
        </div>
      </div>
    );
  }
  return (
    <div className="tv-banner tv-banner--install">
      <span className="tv-banner__dot" />
      <div className="tv-banner__text">
        <span className="tv-banner__title">Install traverse</span>
        <span className="tv-banner__sub">Works offline, opens instantly, no app store.</span>
      </div>
      <button className="tv-banner__action" onClick={onInstall}>Install</button>
    </div>
  );
}
