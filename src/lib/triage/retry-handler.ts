/**
 * Retry handler utilities for triage-mirror-stateless operations
 * Provides automatic retry logic with exponential backoff for failed operations
 */

export interface RetryOptions {
  maxRetries?: number;
  initialDelay?: number;
  maxDelay?: number;
  backoffMultiplier?: number;
  shouldRetry?: (error: Error) => boolean;
}

export interface RetryResult<T> {
  success: boolean;
  data?: T;
  error?: Error;
  attempts: number;
}

/**
 * Default retry predicate - retries on network errors and 5xx server errors
 */
function defaultShouldRetry(error: Error): boolean {
  // Retry on network errors
  if (error.message.includes('fetch') || error.message.includes('network')) {
    return true;
  }

  // Retry on 5xx server errors
  if (error.message.includes('500') || error.message.includes('502') || error.message.includes('503')) {
    return true;
  }

  // Don't retry on client errors (4xx)
  if (error.message.includes('400') || error.message.includes('401') || error.message.includes('403') || error.message.includes('404')) {
    return false;
  }

  // Default: retry
  return true;
}

/**
 * Execute an async operation with automatic retry logic
 *
 * @param operation - The async operation to execute
 * @param options - Retry configuration options
 * @returns Promise with retry result
 */
export async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions = {},
): Promise<RetryResult<T>> {
  const {
    maxRetries = 1,
    initialDelay = 2000,
    maxDelay = 10000,
    backoffMultiplier = 2,
    shouldRetry = defaultShouldRetry,
  } = options;

  let attempts = 0;
  let lastError: Error | undefined;

  while (attempts <= maxRetries) {
    attempts++;

    try {
      const data = await operation();
      return {
        success: true,
        data,
        attempts,
      };
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      // If this was the last attempt, or we shouldn't retry, fail
      if (attempts > maxRetries || !shouldRetry(lastError)) {
        return {
          success: false,
          error: lastError,
          attempts,
        };
      }

      // Calculate delay with exponential backoff
      const delay = Math.min(
        initialDelay * Math.pow(backoffMultiplier, attempts - 1),
        maxDelay,
      );

      // Wait before retrying
      await new Promise((resolve) => setTimeout(resolve, delay));
    }
  }

  // Should never reach here, but TypeScript needs it
  return {
    success: false,
    error: lastError || new Error('Unknown error'),
    attempts,
  };
}

/**
 * Retry a fetch request with automatic retry logic
 *
 * @param url - The URL to fetch
 * @param init - Fetch init options
 * @param options - Retry configuration options
 * @returns Promise with fetch response
 */
export async function fetchWithRetry(
  url: string,
  init?: RequestInit,
  options: RetryOptions = {},
): Promise<Response> {
  const result = await withRetry(
    async () => {
      const response = await fetch(url, init);

      // Throw on non-ok responses to trigger retry logic
      if (!response.ok) {
        const errorText = await response.text().catch(() => 'Unknown error');
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      return response;
    },
    {
      ...options,
      shouldRetry: (error) => {
        // Custom retry logic for fetch errors
        const message = error.message.toLowerCase();

        // Always retry on network errors
        if (message.includes('failed to fetch') || message.includes('network')) {
          return true;
        }

        // Retry on 5xx errors
        if (message.includes('500') || message.includes('502') || message.includes('503') || message.includes('504')) {
          return true;
        }

        // Retry on 408 (timeout)
        if (message.includes('408')) {
          return true;
        }

        // Don't retry on 4xx client errors (except 408)
        if (message.match(/40[0-79]/)) {
          return false;
        }

        // Use custom predicate if provided
        if (options.shouldRetry) {
          return options.shouldRetry(error);
        }

        // Default: don't retry
        return false;
      },
    },
  );

  if (!result.success || !result.data) {
    throw result.error || new Error('Fetch failed after retries');
  }

  return result.data;
}

/**
 * Create a retry-enabled version of an async function
 *
 * @param fn - The async function to wrap with retry logic
 * @param options - Retry configuration options
 * @returns Wrapped function with retry logic
 */
export function createRetryable<TArgs extends any[], TReturn>(
  fn: (...args: TArgs) => Promise<TReturn>,
  options: RetryOptions = {},
): (...args: TArgs) => Promise<TReturn> {
  return async (...args: TArgs): Promise<TReturn> => {
    const result = await withRetry(() => fn(...args), options);

    if (!result.success) {
      throw result.error || new Error('Operation failed after retries');
    }

    return result.data as TReturn;
  };
}
