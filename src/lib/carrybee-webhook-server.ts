import fs from "fs";
import path from "path";
import type { CarrybeeWebhookPayload } from "./carrybee-webhook-types";

export type { CarrybeeWebhookPayload } from "./carrybee-webhook-types";
export { carrybeeStatusFromWebhook } from "./carrybee-webhook-types";

export type CarrybeeWebhookQueueItem = {
  id: string;
  receivedAt: string;
  payload: CarrybeeWebhookPayload;
};

const DATA_DIR = path.join(process.cwd(), ".data", "carrybee-webhooks");

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

export function registerCarrybeeWebhook(
  signature: string,
  sellerId: string,
  methodId: string
): void {
  const registry = readJson<
    Record<string, { sellerId: string; methodId: string; updatedAt: string }>
  >(registryPath(), {});
  registry[signature.trim()] = {
    sellerId,
    methodId,
    updatedAt: new Date().toISOString(),
  };
  writeJson(registryPath(), registry);
}

export function resolveSellerByCarrybeeSignature(
  signature: string
): { sellerId: string; methodId: string } | null {
  const registry = readJson<
    Record<string, { sellerId: string; methodId: string }>
  >(registryPath(), {});
  const entry = registry[signature.trim()];
  return entry ? { sellerId: entry.sellerId, methodId: entry.methodId } : null;
}

export function enqueueCarrybeeWebhook(
  sellerId: string,
  payload: CarrybeeWebhookPayload
): void {
  const file = queuePath(sellerId);
  const queue = readJson<CarrybeeWebhookQueueItem[]>(file, []);
  queue.push({
    id: `cb-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    receivedAt: new Date().toISOString(),
    payload,
  });
  if (queue.length > 500) queue.splice(0, queue.length - 500);
  writeJson(file, queue);
}

export function pullCarrybeeWebhookQueue(
  sellerId: string
): CarrybeeWebhookQueueItem[] {
  const file = queuePath(sellerId);
  const queue = readJson<CarrybeeWebhookQueueItem[]>(file, []);
  writeJson(file, []);
  return queue;
}
