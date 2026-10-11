/**
 * Client-side mutation helper for the Today/Plan screens.
 *
 * Network failures are caught by the global fetch wrapper in
 * public/sw-register.js, which queues the request offline and answers 202
 * `{ queued: true }`. This helper adds an Idempotency-Key (so the queue
 * keeps one copy per action) and turns every other outcome into an explicit
 * result instead of a silently swallowed promise.
 */

export type MutationResult<T = unknown> =
  | { ok: true; queued: boolean; data: T | null }
  | { ok: false; status: number; message: string };

function newKey(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

export async function mutate<T = unknown>(
  url: string,
  method: "POST" | "PUT" | "PATCH" | "DELETE",
  body?: unknown,
  idempotencyKey: string = newKey(),
): Promise<MutationResult<T>> {
  let res: Response;
  try {
    res = await fetch(url, {
      method,
      headers: {
        "Content-Type": "application/json",
        "Idempotency-Key": idempotencyKey,
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    });
  } catch {
    // Only reached for endpoints the offline queue doesn't cover.
    return { ok: false, status: 0, message: "No connection — try again in a moment." };
  }

  let data: any = null;
  try {
    data = await res.json();
  } catch {
    data = null;
  }

  if (res.ok) {
    return { ok: true, queued: res.status === 202 && !!data?.queued, data };
  }

  if (res.status === 401) {
    return { ok: false, status: 401, message: "You've been signed out. Sign in again to save this." };
  }

  return {
    ok: false,
    status: res.status,
    message: (data && (data.message || data.error)) || "The server couldn't save that.",
  };
}
