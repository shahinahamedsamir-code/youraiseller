/**
 * Lightweight in-memory sliding-window rate limiter.
 *
 * Suitable for a single Node process (Hostinger/standalone). For multi-instance
 * deployments this should be backed by Redis, but it still meaningfully slows
 * brute-force attempts against one node.
 */

type Hits = number[];

const store = new Map<string, Hits>();

function prune(hits: Hits, windowMs: number, now: number): Hits {
  const cutoff = now - windowMs;
  return hits.filter((t) => t > cutoff);
}

/** Returns true if `key` already has >= `max` hits inside the window. */
export function isRateLimited(key: string, max: number, windowMs: number): boolean {
  const now = Date.now();
  const hits = prune(store.get(key) ?? [], windowMs, now);
  store.set(key, hits);
  return hits.length >= max;
}

/** Record one hit against `key`. Call on each failed/limited attempt. */
export function recordHit(key: string, windowMs: number): void {
  const now = Date.now();
  const hits = prune(store.get(key) ?? [], windowMs, now);
  hits.push(now);
  store.set(key, hits);
}

/** Clear a key (e.g. after a successful login). */
export function clearRateLimit(key: string): void {
  store.delete(key);
}

/** Milliseconds until `key` drops below `max` hits, for Retry-After hints. */
export function retryAfterMs(key: string, max: number, windowMs: number): number {
  const now = Date.now();
  const hits = prune(store.get(key) ?? [], windowMs, now);
  if (hits.length < max) return 0;
  const oldest = hits[hits.length - max];
  return Math.max(0, oldest + windowMs - now);
}

/** Best-effort client IP from common proxy headers (Hostinger/Cloudflare/etc). */
export function getClientIp(req: Request): string {
  const h = req.headers;
  const fwd = h.get("x-forwarded-for");
  if (fwd) {
    const first = fwd.split(",")[0]?.trim();
    if (first) return first;
  }
  return (
    h.get("cf-connecting-ip") ||
    h.get("x-real-ip") ||
    h.get("x-client-ip") ||
    "unknown"
  );
}

export const RATE_WINDOWS = {
  fifteenMin: 15 * 60 * 1000,
  oneHour: 60 * 60 * 1000,
} as const;
