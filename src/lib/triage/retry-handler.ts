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

interface SerializedRequestInit {
  method?: string;
  headers?: Record<string, string>;
  body?: string;
  credentials?: RequestCredentials;
  mode?: RequestMode;
  cache?: RequestCache;
  redirect?: RequestRedirect;
  referrerPolicy?: ReferrerPolicy;
}

interface QueuedMutation {
  id: string;
  url: string;
  init: SerializedRequestInit;
  created_at: string;
  retry_count: number;
}

export interface ResilientMutationOptions extends RetryOptions {
  queueOnTransient?: boolean;
}

const MUTATION_QUEUE_STORAGE_KEY = "mirror_mutation_queue_v1";
const MAX_QUEUE_RETRIES = 5;
let queueInitialized = false;
let queueFlushInProgress = false;
let memoryMutationQueue: QueuedMutation[] = [];

/**
 * Default retry predicate - retries on network errors and 5xx server errors
 */
function defaultShouldRetry(error: Error): boolean {
  // Retry on network errors
  if (error.message.includes("fetch") || error.message.includes("network")) {
    return true;
  }

  // Retry on 5xx server errors
  if (
    error.message.includes("500") ||
    error.message.includes("502") ||
    error.message.includes("503")
  ) {
    return true;
  }

  // Don't retry on client errors (4xx)
  if (
    error.message.includes("400") ||
    error.message.includes("401") ||
    error.message.includes("403") ||
    error.message.includes("404")
  ) {
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
    error: lastError || new Error("Unknown error"),
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
        const errorText = await response.text().catch(() => "Unknown error");
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
        if (
          message.includes("failed to fetch") ||
          message.includes("network")
        ) {
          return true;
        }

        // Retry on 5xx errors
        if (
          message.includes("500") ||
          message.includes("502") ||
          message.includes("503") ||
          message.includes("504")
        ) {
          return true;
        }

        // Retry on 408 (timeout)
        if (message.includes("408")) {
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
    throw result.error || new Error("Fetch failed after retries");
  }

  return result.data;
}

function canUseBrowserStorage(): boolean {
  return typeof window !== "undefined" && typeof localStorage !== "undefined";
}

function normalizeHeaders(
  headers: HeadersInit | undefined,
): Record<string, string> | undefined {
  if (!headers) return undefined;
  const normalized: Record<string, string> = {};

  if (headers instanceof Headers) {
    headers.forEach((value, key) => {
      normalized[key] = value;
    });
  } else if (Array.isArray(headers)) {
    headers.forEach(([key, value]) => {
      normalized[key] = String(value);
    });
  } else {
    Object.entries(headers).forEach(([key, value]) => {
      if (value !== undefined) {
        normalized[key] = String(value);
      }
    });
  }

  return Object.keys(normalized).length > 0 ? normalized : undefined;
}

function serializeRequestInit(init?: RequestInit): SerializedRequestInit {
  return {
    method: init?.method,
    headers: normalizeHeaders(init?.headers),
    body: typeof init?.body === "string" ? init.body : undefined,
    credentials: init?.credentials,
    mode: init?.mode,
    cache: init?.cache,
    redirect: init?.redirect,
    referrerPolicy: init?.referrerPolicy,
  };
}

function readMutationQueue(): QueuedMutation[] {
  if (!canUseBrowserStorage()) return [...memoryMutationQueue];
  try {
    const raw = localStorage.getItem(MUTATION_QUEUE_STORAGE_KEY);
    if (!raw) return [...memoryMutationQueue];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      memoryMutationQueue = [...parsed];
      return parsed;
    }
    return [...memoryMutationQueue];
  } catch {
    return [...memoryMutationQueue];
  }
}

function dispatchQueueSize(size: number): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("offline-queue-size", {
      detail: { size },
    }),
  );
}

function writeMutationQueue(queue: QueuedMutation[]): void {
  if (!canUseBrowserStorage()) {
    memoryMutationQueue = [...queue];
    dispatchQueueSize(memoryMutationQueue.length);
    return;
  }
  try {
    localStorage.setItem(MUTATION_QUEUE_STORAGE_KEY, JSON.stringify(queue));
  } catch {
    // Ignore storage write failures; we'll still expose in-memory behavior.
    memoryMutationQueue = [...queue];
  } finally {
    dispatchQueueSize(queue.length);
  }
}

function buildQueueId(): string {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function enqueueMutation(url: string, init?: RequestInit): string {
  const queue = readMutationQueue();
  const id = buildQueueId();
  queue.push({
    id,
    url,
    init: serializeRequestInit(init),
    created_at: new Date().toISOString(),
    retry_count: 0,
  });
  writeMutationQueue(queue);
  return id;
}

function isTransientStatus(status: number): boolean {
  return status === 408 || status === 429 || (status >= 500 && status <= 599);
}

function isTransientError(error: unknown): boolean {
  const message =
    error instanceof Error ? error.message.toLowerCase() : String(error).toLowerCase();
  return (
    message.includes("failed to fetch") ||
    message.includes("network") ||
    message.includes("timeout") ||
    message.includes("timed out") ||
    message.includes("408") ||
    message.includes("429") ||
    message.includes("500") ||
    message.includes("502") ||
    message.includes("503") ||
    message.includes("504")
  );
}

function createQueuedResponse(queueId: string): Response {
  return new Response(
    JSON.stringify({
      queued: true,
      queue_id: queueId,
    }),
    {
      status: 202,
      headers: { "Content-Type": "application/json" },
    },
  );
}

async function replayMutation(mutation: QueuedMutation): Promise<"done" | "retry" | "drop"> {
  const headers = {
    ...(mutation.init.headers || {}),
    "x-idempotency-key":
      mutation.init.headers?.["x-idempotency-key"] || `queued:${mutation.id}`,
  };

  try {
    const response = await fetch(mutation.url, {
      method: mutation.init.method,
      headers,
      body: mutation.init.body,
      credentials: mutation.init.credentials,
      mode: mutation.init.mode,
      cache: mutation.init.cache,
      redirect: mutation.init.redirect,
      referrerPolicy: mutation.init.referrerPolicy,
    });

    if (response.ok || response.status === 404) return "done";
    if (isTransientStatus(response.status)) return "retry";
    return "drop";
  } catch {
    return "retry";
  }
}

export function getQueuedMutationCount(): number {
  return readMutationQueue().length;
}

export function clearQueuedMutations(): void {
  writeMutationQueue([]);
}

export async function flushQueuedMutations(): Promise<void> {
  if (
    typeof window === "undefined" ||
    !navigator.onLine ||
    queueFlushInProgress
  ) {
    return;
  }

  queueFlushInProgress = true;
  try {
    const queue = readMutationQueue();
    if (!queue.length) {
      dispatchQueueSize(0);
      return;
    }

    const nextQueue: QueuedMutation[] = [];
    for (const mutation of queue) {
      const result = await replayMutation(mutation);
      if (result === "done" || result === "drop") {
        continue;
      }

      const retryCount = mutation.retry_count + 1;
      if (retryCount <= MAX_QUEUE_RETRIES) {
        nextQueue.push({
          ...mutation,
          retry_count: retryCount,
        });
      }
    }

    writeMutationQueue(nextQueue);
  } finally {
    queueFlushInProgress = false;
  }
}

export function initMutationQueue(): void {
  if (typeof window === "undefined" || queueInitialized) return;
  queueInitialized = true;

  dispatchQueueSize(getQueuedMutationCount());
  window.addEventListener("online", () => {
    void flushQueuedMutations();
  });
  document.addEventListener("visibilitychange", () => {
    if (!document.hidden && navigator.onLine) {
      void flushQueuedMutations();
    }
  });
}

export async function resilientMutationFetch(
  url: string,
  init?: RequestInit,
  options: ResilientMutationOptions = {},
): Promise<Response> {
  const { queueOnTransient = true, ...retryOptions } = options;
  initMutationQueue();

  if (
    queueOnTransient &&
    typeof navigator !== "undefined" &&
    navigator.onLine === false
  ) {
    const queueId = enqueueMutation(url, init);
    return createQueuedResponse(queueId);
  }

  try {
    return await fetchWithRetry(url, init, retryOptions);
  } catch (error) {
    if (queueOnTransient && isTransientError(error)) {
      const queueId = enqueueMutation(url, init);
      return createQueuedResponse(queueId);
    }
    throw error;
  }
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
      throw result.error || new Error("Operation failed after retries");
    }

    return result.data as TReturn;
  };
}

if (typeof window !== "undefined") {
  initMutationQueue();
}
