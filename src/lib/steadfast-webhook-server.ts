import fs from "fs";
import path from "path";

export type SteadfastWebhookRegistryEntry = {
  sellerId: string;
  methodId: string;
  updatedAt: string;
};

export type SteadfastWebhookQueueItem = {
  id: string;
  receivedAt: string;
  payload: SteadfastWebhookPayload;
};

export type SteadfastWebhookPayload = {
  notification_type?: string;
  consignment_id?: number | string;
  invoice?: string;
  tracking_code?: string;
  cod_amount?: number | string;
  status?: string;
  delivery_status?: string;
  delivery_charge?: number | string;
  tracking_message?: string;
  updated_at?: string;
};

const DATA_DIR = path.join(process.cwd(), ".data", "steadfast-webhooks");

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
  ensureDir();
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

export function registerSteadfastWebhookToken(
  token: string,
  sellerId: string,
  methodId: string
): void {
  const registry = readJson<Record<string, SteadfastWebhookRegistryEntry>>(
    registryPath(),
    {}
  );
  registry[token.trim()] = {
    sellerId,
    methodId,
    updatedAt: new Date().toISOString(),
  };
  writeJson(registryPath(), registry);
}

export function resolveSellerByWebhookToken(
  token: string
): SteadfastWebhookRegistryEntry | null {
  const registry = readJson<Record<string, SteadfastWebhookRegistryEntry>>(
    registryPath(),
    {}
  );
  return registry[token.trim()] ?? null;
}

export function enqueueSteadfastWebhook(
  sellerId: string,
  payload: SteadfastWebhookPayload
): SteadfastWebhookQueueItem {
  const file = queuePath(sellerId);
  const queue = readJson<SteadfastWebhookQueueItem[]>(file, []);
  const item: SteadfastWebhookQueueItem = {
    id: `wh-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    receivedAt: new Date().toISOString(),
    payload,
  };
  queue.push(item);
  if (queue.length > 500) queue.splice(0, queue.length - 500);
  writeJson(file, queue);
  return item;
}

/** Returns and clears pending events for this seller (client pull). */
export function pullSteadfastWebhookQueue(
  sellerId: string
): SteadfastWebhookQueueItem[] {
  const file = queuePath(sellerId);
  const queue = readJson<SteadfastWebhookQueueItem[]>(file, []);
  writeJson(file, []);
  return queue;
}

export function extractBearerToken(authHeader: string | null): string | null {
  if (!authHeader) return null;
  const m = authHeader.match(/^Bearer\s+(.+)$/i);
  return m?.[1]?.trim() ?? null;
}

export function deliveryStatusFromWebhookPayload(
  payload: SteadfastWebhookPayload
): string {
  return (
    payload.status ??
    payload.delivery_status ??
    ""
  ).trim();
}
