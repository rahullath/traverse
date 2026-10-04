(() => {
  if (typeof window === "undefined") return;

  const OFFLINE_QUEUE_KEY = "meshos-offline-queue-v1";
  const OFFLINE_MUTATION_ENDPOINTS = [
    "/api/habits",
    "/api/time-blocks",
    "/api/daily-plan",
    "/api/auth/preferences",
    "/api/auth/profile",
    "/api/location-travel-profiles",
    "/api/calendar/sources",
  ];

  const nativeFetch = window.fetch.bind(window);

  function shouldQueue(url, method) {
    if (!["POST", "PUT", "PATCH", "DELETE"].includes(method.toUpperCase()))
      return false;
    return OFFLINE_MUTATION_ENDPOINTS.some((prefix) => url.includes(prefix));
  }

  function loadQueue() {
    try {
      const raw = localStorage.getItem(OFFLINE_QUEUE_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }

  function saveQueue(queue) {
    try {
      localStorage.setItem(OFFLINE_QUEUE_KEY, JSON.stringify(queue));
      window.dispatchEvent(
        new CustomEvent("offline-queue-size", {
          detail: { size: queue.length },
        }),
      );
    } catch {
      // noop
    }
  }

  function headerValue(headers, name) {
    if (!headers) return null;
    if (typeof headers.get === "function") return headers.get(name);
    const key = Object.keys(headers).find(
      (k) => k.toLowerCase() === name.toLowerCase(),
    );
    return key ? headers[key] : null;
  }

  function plainHeaders(headers) {
    if (!headers) return { "Content-Type": "application/json" };
    if (typeof headers.forEach === "function" && !Array.isArray(headers)) {
      const out = {};
      headers.forEach((v, k) => (out[k] = v));
      return out;
    }
    return headers;
  }

  function queueRequest(url, init = {}) {
    const queue = loadQueue();
    const idempotencyKey = headerValue(init.headers, "Idempotency-Key");
    // Same action retried by the caller while offline: keep one copy only.
    if (idempotencyKey && queue.some((q) => q.idempotencyKey === idempotencyKey)) {
      saveQueue(queue);
      return;
    }
    queue.push({
      idempotencyKey,
      id: `${Date.now()}-${Math.random().toString(16).slice(2)}`,
      url,
      method: init.method || "POST",
      headers: plainHeaders(init.headers),
      body: typeof init.body === "string" ? init.body : null,
      queuedAt: new Date().toISOString(),
    });
    saveQueue(queue);
  }

  let flushing = false;
  let retryDelayMs = 5000;
  const MAX_RETRY_DELAY_MS = 5 * 60 * 1000;

  async function flushQueue() {
    if (flushing) return;
    const queue = loadQueue();
    if (!queue.length || !navigator.onLine) return;
    flushing = true;

    const remaining = [];
    let dropped = 0;
    try {
      for (const item of queue) {
        try {
          const response = await nativeFetch(item.url, {
            method: item.method,
            headers: item.headers,
            body: item.body,
          });
          // 4xx (except 408/429) will never succeed on replay — drop it
          // rather than retrying forever.
          if (
            !response.ok &&
            (response.status >= 500 ||
              response.status === 408 ||
              response.status === 429)
          ) {
            remaining.push(item);
          } else if (!response.ok) {
            dropped++;
          }
        } catch {
          remaining.push(item);
        }
      }
    } finally {
      flushing = false;
    }

    if (dropped > 0) {
      window.dispatchEvent(
        new CustomEvent("offline-queue-dropped", { detail: { dropped } }),
      );
    }

    // Keep anything queued while this flush was running.
    const seen = new Set(queue.map((q) => q.id));
    const addedDuringFlush = loadQueue().filter((q) => !seen.has(q.id));
    saveQueue(remaining.concat(addedDuringFlush));
    if (queue.length !== remaining.length) {
      window.dispatchEvent(
        new CustomEvent("offline-queue-flushed", {
          detail: {
            sent: queue.length - remaining.length,
            remaining: remaining.length,
          },
        }),
      );
    }
  }

  window.fetch = async (input, init = {}) => {
    const requestUrl = typeof input === "string" ? input : input.url;
    const method = (
      init.method ||
      (typeof input !== "string" ? input.method : "GET") ||
      "GET"
    ).toUpperCase();

    try {
      return await nativeFetch(input, init);
    } catch (error) {
      if (shouldQueue(requestUrl, method)) {
        queueRequest(requestUrl, { ...init, method });
        return new Response(
          JSON.stringify({
            success: true,
            queued: true,
            message: "Saved offline. Will sync when connection returns.",
          }),
          {
            status: 202,
            headers: { "Content-Type": "application/json" },
          },
        );
      }
      throw error;
    }
  };

  window.addEventListener("online", () => {
    flushQueue().catch(() => undefined);
  });

  // Register service worker for caching/offline page support.
  if ("serviceWorker" in navigator) {
    window.addEventListener("load", async () => {
      try {
        await navigator.serviceWorker.register("/sw.js");
      } catch {
        // noop
      }
    });
  }

  // Retry pending actions with exponential backoff while anything is queued
  // (covers flaky connections where the "online" event never fires).
  function scheduleRetry() {
    setTimeout(async () => {
      const before = loadQueue().length;
      if (before) await flushQueue().catch(() => undefined);
      const after = loadQueue().length;
      retryDelayMs =
        after && after >= before
          ? Math.min(retryDelayMs * 2, MAX_RETRY_DELAY_MS)
          : 5000;
      scheduleRetry();
    }, retryDelayMs);
  }
  scheduleRetry();

  // Announce the persisted queue size once the page has mounted listeners.
  window.addEventListener("load", () => {
    window.dispatchEvent(
      new CustomEvent("offline-queue-size", {
        detail: { size: loadQueue().length },
      }),
    );
  });

  // Try queue flush once on startup.
  flushQueue().catch(() => undefined);
})();
