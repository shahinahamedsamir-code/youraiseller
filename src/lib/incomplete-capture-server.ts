import fs from "fs";
import path from "path";

/**
 * Server side of "Incomplete Order Capture".
 *
 * Mirrors the carrybee-webhook pattern: an authenticated seller registers their
 * businessId + apiKey (→ sellerId); the public capture endpoint resolves the
 * businessId, checks the apiKey, and enqueues the partial checkout; the seller's
 * dashboard polls and pulls the queue into the Incomplete tab.
 */

export type IncompleteCaptureItem = {
  /** Stable per-checkout id so repeated typing updates one entry. */
  sessionId: string;
  name: string;
  phone: string;
  address: string;
  email?: string;
  items: { name: string; sku?: string; qty: number; price?: number }[];
  currency?: string;
  pageUrl?: string;
  receivedAt: string;
};

export type BlockListItem = { type: "phone" | "ip" | "email"; value: string };
type RegistryEntry = {
  sellerId: string;
  apiKey: string;
  blockList?: BlockListItem[];
  updatedAt: string;
};

const DATA_DIR = path.join(process.cwd(), ".data", "incomplete-capture");

function ensureDir() {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}

function registryPath() {
  return path.join(DATA_DIR, "registry.json");
}

function queuePath(sellerId: string) {
  const safe = sellerId.replace(/[^a-zA-Z0-9_-]/g, "_");
  return path.join(DATA_DIR, `queue-${safe}.json`);
}

function readJson<T>(file: string, fallback: T): T {
  if (!fs.existsSync(file)) return fallback;
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

function writeJson<T>(file: string, data: T) {
  ensureDir();
  fs.writeFileSync(file, JSON.stringify(data, null, 2), "utf8");
}

/** Called by the authenticated seller (integration page) so the public capture
 *  endpoint can later map businessId → sellerId and verify the apiKey. */
export function registerIncompleteCapture(
  businessId: string,
  apiKey: string,
  sellerId: string,
  blockList?: BlockListItem[]
): void {
  const id = businessId.trim();
  if (!id) return;
  const registry = readJson<Record<string, RegistryEntry>>(registryPath(), {});
  registry[id] = {
    sellerId,
    apiKey: apiKey.trim(),
    blockList: Array.isArray(blockList) ? blockList : registry[id]?.blockList,
    updatedAt: new Date().toISOString(),
  };
  writeJson(registryPath(), registry);
}

export function resolveSellerByBusinessId(
  businessId: string
): RegistryEntry | null {
  const registry = readJson<Record<string, RegistryEntry>>(registryPath(), {});
  return registry[businessId.trim()] ?? null;
}

function normalizeGuardValue(type: string, value: string): string {
  const v = value.trim();
  if (type === "phone") return v.replace(/[^0-9]/g, "").replace(/^88/, "");
  if (type === "email") return v.toLowerCase();
  return v;
}

/** Returns the matching block entry if a checkout value is blocked. */
export function checkOrderGuard(
  businessId: string,
  values: { phone?: string; ip?: string; email?: string }
): BlockListItem | null {
  const entry = resolveSellerByBusinessId(businessId);
  const list = entry?.blockList ?? [];
  for (const b of list) {
    const target =
      b.type === "phone" ? values.phone : b.type === "ip" ? values.ip : values.email;
    if (!target) continue;
    if (normalizeGuardValue(b.type, b.value) === normalizeGuardValue(b.type, target)) {
      return b;
    }
  }
  return null;
}

/** Upsert by sessionId so a customer typing produces ONE incomplete order. */
export function enqueueIncompleteCapture(
  sellerId: string,
  item: IncompleteCaptureItem
): void {
  const file = queuePath(sellerId);
  const queue = readJson<IncompleteCaptureItem[]>(file, []);
  const idx = queue.findIndex((q) => q.sessionId === item.sessionId);
  if (idx >= 0) queue[idx] = item;
  else queue.push(item);
  if (queue.length > 500) queue.splice(0, queue.length - 500);
  writeJson(file, queue);
}

/** Client pulls everything captured so far and clears the queue. */
export function pullIncompleteCaptureQueue(
  sellerId: string
): IncompleteCaptureItem[] {
  const file = queuePath(sellerId);
  const queue = readJson<IncompleteCaptureItem[]>(file, []);
  writeJson(file, []);
  return queue;
}

// --- Instant order push (plugin → app) ------------------------------------

export type PushedOrder = {
  wooOrderId: number;
  wooNumber?: string;
  customerName: string;
  phone: string;
  email?: string;
  address: string;
  district?: string;
  paymentMethod?: string;
  status?: string;
  shippingCharge?: number;
  discount?: number;
  note?: string;
  items: { name: string; sku?: string; qty: number; price?: number }[];
  receivedAt: string;
};

function orderQueuePath(sellerId: string) {
  const safe = sellerId.replace(/[^a-zA-Z0-9_-]/g, "_");
  return path.join(DATA_DIR, `orders-${safe}.json`);
}

/** Upsert by wooOrderId so re-sends never pile up duplicates in the queue. */
export function enqueuePushedOrder(sellerId: string, order: PushedOrder): void {
  const file = orderQueuePath(sellerId);
  const queue = readJson<PushedOrder[]>(file, []);
  const idx = queue.findIndex((o) => o.wooOrderId === order.wooOrderId);
  if (idx >= 0) queue[idx] = order;
  else queue.push(order);
  if (queue.length > 500) queue.splice(0, queue.length - 500);
  writeJson(file, queue);
}

export function pullPushedOrderQueue(sellerId: string): PushedOrder[] {
  const file = orderQueuePath(sellerId);
  const queue = readJson<PushedOrder[]>(file, []);
  writeJson(file, []);
  return queue;
}
