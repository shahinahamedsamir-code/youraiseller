import fs from "fs";
import path from "path";

/** A queued WooCommerce order delivered by a webhook, awaiting client import. */
export type WooWebhookQueueItem = {
  id: string;
  receivedAt: string;
  payload: unknown;
};

const DATA_DIR = path.join(process.cwd(), ".data", "woocommerce-webhooks");

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

/** Map a per-store delivery token → the seller whose queue it feeds. */
export function registerWooWebhookToken(token: string, sellerId: string): void {
  const registry = readJson<Record<string, { sellerId: string; updatedAt: string }>>(
    registryPath(),
    {}
  );
  registry[token.trim()] = { sellerId, updatedAt: new Date().toISOString() };
  writeJson(registryPath(), registry);
}

export function resolveSellerByWooToken(token: string): string | null {
  const registry = readJson<Record<string, { sellerId: string }>>(registryPath(), {});
  const entry = registry[token.trim()];
  return entry?.sellerId ?? null;
}

export function enqueueWooWebhookOrder(sellerId: string, payload: unknown): void {
  const file = queuePath(sellerId);
  const queue = readJson<WooWebhookQueueItem[]>(file, []);
  queue.push({
    id: `woo-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    receivedAt: new Date().toISOString(),
    payload,
  });
  if (queue.length > 500) queue.splice(0, queue.length - 500);
  writeJson(file, queue);
}

/** Read and clear a seller's queued webhook orders. */
export function pullWooWebhookQueue(sellerId: string): WooWebhookQueueItem[] {
  const file = queuePath(sellerId);
  const queue = readJson<WooWebhookQueueItem[]>(file, []);
  writeJson(file, []);
  return queue;
}
