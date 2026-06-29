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

type RegistryEntry = { sellerId: string; apiKey: string; updatedAt: string };

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
  sellerId: string
): void {
  const id = businessId.trim();
  if (!id) return;
  const registry = readJson<Record<string, RegistryEntry>>(registryPath(), {});
  registry[id] = { sellerId, apiKey: apiKey.trim(), updatedAt: new Date().toISOString() };
  writeJson(registryPath(), registry);
}

export function resolveSellerByBusinessId(
  businessId: string
): RegistryEntry | null {
  const registry = readJson<Record<string, RegistryEntry>>(registryPath(), {});
  return registry[businessId.trim()] ?? null;
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
