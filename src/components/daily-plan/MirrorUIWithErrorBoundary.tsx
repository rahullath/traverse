import React from 'react';
import { ErrorBoundary } from './ErrorBoundary';
import MirrorUI, { type MirrorUIProps } from './MirrorUI';

/**
 * MirrorUI wrapped with ErrorBoundary for production error handling
 * This component catches and handles any React errors in the Mirror UI tree
 */
export default function MirrorUIWithErrorBoundary(props: MirrorUIProps) {
  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    // Log to console in development
    console.error('MirrorUI Error:', error, errorInfo);

    // In production, you would send this to a monitoring service
    // Example: logErrorToMonitoring({ error, errorInfo, userId: props.userId });
  };

  return (
    <ErrorBoundary onError={handleError}>
      <MirrorUI {...props} />
    </ErrorBoundary>
  );
}
