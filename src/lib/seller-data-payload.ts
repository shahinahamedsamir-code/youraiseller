/** Compress seller-data JSON payloads above this size (bytes). */
export const SELLER_DATA_GZIP_THRESHOLD = 48 * 1024;

const MAX_ACTIVITY_LOG_ENTRIES = 80;

/** Trim bloated per-order activity logs before sync to stay under host limits. */
export function slimOrdersBlob(data: unknown): unknown {
  if (!data || typeof data !== "object") return data;
  const orders = (data as { orders?: unknown }).orders;
  if (!Array.isArray(orders)) return data;

  let changed = false;
  const slimmed = orders.map((raw) => {
    if (!raw || typeof raw !== "object") return raw;
    const order = raw as { activityLog?: unknown[] };
    const log = order.activityLog;
    if (!Array.isArray(log) || log.length <= MAX_ACTIVITY_LOG_ENTRIES) return raw;
    changed = true;
    return { ...order, activityLog: log.slice(-MAX_ACTIVITY_LOG_ENTRIES) };
  });

  return changed ? { ...(data as object), orders: slimmed } : data;
}
