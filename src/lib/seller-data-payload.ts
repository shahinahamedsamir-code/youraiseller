/** Compress seller-data JSON payloads above this size (bytes). */
export const SELLER_DATA_GZIP_THRESHOLD = 48 * 1024;

/** Hosts (e.g. Vercel) reject request bodies above ~4.5 MB — stay under this. */
export const SELLER_DATA_MAX_PUSH_BYTES = 3.5 * 1024 * 1024;

const MAX_ACTIVITY_LOG_ENTRIES = 20;

type SlimOrder = Record<string, unknown> & {
  activityLog?: unknown[];
  wooSnapshot?: Record<string, unknown>;
};

/** Trim bloated order fields before sync to stay under host body limits. */
export function slimOrdersBlob(data: unknown): unknown {
  if (!data || typeof data !== "object") return data;
  const orders = (data as { orders?: unknown }).orders;
  if (!Array.isArray(orders)) return data;

  let changed = false;
  const slimmed = orders.map((raw) => {
    if (!raw || typeof raw !== "object") return raw;
    const order = raw as SlimOrder;
    let next: SlimOrder | null = null;

    const log = order.activityLog;
    if (Array.isArray(log) && log.length > MAX_ACTIVITY_LOG_ENTRIES) {
      next = { ...order, activityLog: log.slice(-MAX_ACTIVITY_LOG_ENTRIES) };
      changed = true;
    }

    const snap = (next ?? order).wooSnapshot;
    if (snap && typeof snap === "object") {
      const { customerUserAgent, customerIp, ...rest } = snap;
      if (customerUserAgent || customerIp) {
        const base = next ?? order;
        next = { ...base, wooSnapshot: rest };
        changed = true;
      }
    }

    return next ?? raw;
  });

  return changed ? { ...(data as object), orders: slimmed } : data;
}

export function sellerDataPayloadBytes(data: unknown): number {
  return new TextEncoder().encode(JSON.stringify(data)).length;
}

export function isSellerDataPushTooLarge(data: unknown): boolean {
  return sellerDataPayloadBytes(data) > SELLER_DATA_MAX_PUSH_BYTES;
}
