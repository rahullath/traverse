/**
 * Normalise and vet a user-supplied iCal feed URL before the server fetches it.
 * Accepts http(s) and webcal(s) links (webcal is what Apple/Google "subscribe"
 * links use). Rejects localhost and private/link-local IP literals so the
 * server can't be pointed at internal services.
 */
export function normalizeICalUrl(raw: string): { ok: true; url: string } | { ok: false; reason: string } {
  let input = (raw || "").trim();
  if (!input) return { ok: false, reason: "Paste the calendar's iCal / ICS link." };
  input = input.replace(/^webcals?:\/\//i, "https://");

  let parsed: URL;
  try {
    parsed = new URL(input);
  } catch {
    return { ok: false, reason: "That doesn't look like a link." };
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") {
    return { ok: false, reason: "Use an https:// or webcal:// calendar link." };
  }

  const host = parsed.hostname.toLowerCase().replace(/^\[|\]$/g, "");
  const privateHost =
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.endsWith(".internal") ||
    host === "0.0.0.0" ||
    /^127\./.test(host) ||
    /^10\./.test(host) ||
    /^192\.168\./.test(host) ||
    /^172\.(1[6-9]|2\d|3[01])\./.test(host) ||
    /^169\.254\./.test(host) ||
    host === "::1" ||
    /^f[cd][0-9a-f]{2}:/.test(host) ||
    /^fe80:/.test(host);
  if (privateHost) return { ok: false, reason: "That link points at a private network address." };

  return { ok: true, url: parsed.toString() };
}
