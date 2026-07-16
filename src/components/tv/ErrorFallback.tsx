import React from 'react';
import { Button } from './Button';

interface ErrorFallbackProps {
  label?: string;
  message: string;
  onRetry?: () => void;
  retryLabel?: string;
  onSecondary?: () => void;
  secondaryLabel?: string;
}

export function ErrorFallback({
  label = 'something went wrong',
  message,
  onRetry,
  retryLabel = 'Retry',
  onSecondary,
  secondaryLabel,
}: ErrorFallbackProps) {
  return (
    <div className="tv-error">
      <div className="tv-label">{label}</div>
      <p className="tv-prose" style={{ margin: 0 }}>{message}</p>
      <div className="tv-actions">
        {onRetry && (
          <Button variant="primary" hint="retry" onClick={onRetry}>{retryLabel}</Button>
        )}
        {onSecondary && secondaryLabel && (
          <Button variant="ghost" onClick={onSecondary}>{secondaryLabel}</Button>
        )}
      </div>
    </div>
  );
}
