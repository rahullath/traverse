// src/hooks/useMirrorSessionTracking.ts
// Hook for tracking Mirror UI session duration and interactions

import { useEffect, useRef } from 'react';
import { useAuth } from '@/lib/auth/context';

export function useMirrorSessionTracking() {
  const { user } = useAuth();
  const sessionStartRef = useRef<number | null>(null);
  const interactionCountRef = useRef(0);

  useEffect(() => {
    if (!user) return;

    // Track session start
    sessionStartRef.current = Date.now();
    
    // Send session start event
    fetch('/api/monitoring/session', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        event: 'mirror_session_start',
        userId: user.id,
      }),
    }).catch(console.error);

    // Track session end on unmount
    return () => {
      if (sessionStartRef.current) {
        const durationMs = Date.now() - sessionStartRef.current;
        
        fetch('/api/monitoring/session', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            event: 'mirror_session_end',
            userId: user.id,
            durationMs,
            interactionCount: interactionCountRef.current,
          }),
        }).catch(console.error);
      }
    };
  }, [user]);

  const trackInteraction = (interactionType: string) => {
    interactionCountRef.current++;
    
    if (user) {
      fetch('/api/monitoring/interaction', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          event: 'mirror_interaction',
          userId: user.id,
          interactionType,
        }),
      }).catch(console.error);
    }
  };

  return { trackInteraction };
}
