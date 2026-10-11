// src/hooks/useThrottle.ts
import { useEffect, useRef, useState } from "react";

/**
 * Custom hook for throttling values
 * Requirements: 12.1, 12.2, 13.5
 *
 * @param value - The value to throttle
 * @param delay - Delay in milliseconds (default: 100ms)
 * @returns Throttled value
 */
export function useThrottle<T>(value: T, delay: number = 100): T {
  const [throttledValue, setThrottledValue] = useState<T>(value);
  const lastRan = useRef<number>(Date.now());

  useEffect(() => {
    const handler = setTimeout(
      () => {
        if (Date.now() - lastRan.current >= delay) {
          setThrottledValue(value);
          lastRan.current = Date.now();
        }
      },
      delay - (Date.now() - lastRan.current),
    );

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return throttledValue;
}

/**
 * Custom hook for throttling callback functions
 * Requirements: 12.1, 12.2, 13.5
 *
 * @param callback - The callback function to throttle
 * @param delay - Delay in milliseconds (default: 100ms)
 * @returns Throttled callback function
 */
export function useThrottledCallback<T extends (...args: any[]) => any>(
  callback: T,
  delay: number = 100,
): (...args: Parameters<T>) => void {
  const lastRan = useRef<number>(Date.now());
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  return (...args: Parameters<T>) => {
    const now = Date.now();

    if (now - lastRan.current >= delay) {
      // Execute immediately if enough time has passed
      callback(...args);
      lastRan.current = now;
    } else {
      // Schedule execution for later
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(
        () => {
          callback(...args);
          lastRan.current = Date.now();
        },
        delay - (now - lastRan.current),
      );
    }
  };
}
