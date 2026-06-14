import type { CourierCheckResult } from "./hoorin-courier";

const CACHE_TTL_MS = 10 * 60 * 1000;
const MAX_CONCURRENT = 2;
const MIN_GAP_MS = 350;

type CacheEntry = {
  data: CourierCheckResult;
  at: number;
};

const cache = new Map<string, CacheEntry>();
const inflight = new Map<string, Promise<CourierCheckResult | null>>();
let active = 0;
const waiters: Array<() => void> = [];
let lastStartedAt = 0;

function readCache(phone: string): CourierCheckResult | null {
  const hit = cache.get(phone);
  if (!hit) return null;
  if (Date.now() - hit.at > CACHE_TTL_MS) {
    cache.delete(phone);
    return null;
  }
  return hit.data;
}

async function acquireSlot(): Promise<void> {
  while (active >= MAX_CONCURRENT) {
    await new Promise<void>((resolve) => {
      waiters.push(resolve);
    });
  }
  const wait = Math.max(0, MIN_GAP_MS - (Date.now() - lastStartedAt));
  if (wait > 0) {
    await new Promise((resolve) => window.setTimeout(resolve, wait));
  }
  active += 1;
  lastStartedAt = Date.now();
}

function releaseSlot() {
  active = Math.max(0, active - 1);
  const next = waiters.shift();
  if (next) next();
}

export async function fetchCourierCheck(
  phone: string
): Promise<CourierCheckResult | null> {
  const cached = readCache(phone);
  if (cached) return cached;

  const pending = inflight.get(phone);
  if (pending) return pending;

  const promise = (async () => {
    await acquireSlot();
    try {
      const fresh = readCache(phone);
      if (fresh) return fresh;

      const res = await fetch(
        `/api/courier-check?phone=${encodeURIComponent(phone)}`,
        { cache: "no-store" }
      );
      const json = await res.json();
      if (!res.ok) return null;
      const data: CourierCheckResult = {
        overall: json.overall,
        couriers: json.couriers ?? [],
      };
      cache.set(phone, { data, at: Date.now() });
      return data;
    } catch {
      return null;
    } finally {
      releaseSlot();
      inflight.delete(phone);
    }
  })();

  inflight.set(phone, promise);
  return promise;
}

export function peekCourierCheck(phone: string): CourierCheckResult | null {
  return readCache(phone);
}
