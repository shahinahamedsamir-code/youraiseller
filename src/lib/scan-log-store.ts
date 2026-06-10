import type { OrderStatus } from "./orders-store";
import { sellerStorageKey } from "./seller-storage";

export type ScanLogTab = "shipping" | "return" | "rts";

export type ScanLogEntry = {
  id: string;
  orderId: string;
  type: "success" | "failed" | "duplicate";
  message: string;
  scannedAt: string;
  scanTab: ScanLogTab;
  targetStatus: OrderStatus;
  actor?: string;
};

const MAX_LOGS = 500;

function storageKey(): string | null {
  return sellerStorageKey("scan-logs");
}

export function loadScanLogs(): ScanLogEntry[] {
  if (typeof window === "undefined") return [];
  const key = storageKey();
  if (!key) return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as ScanLogEntry[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

export function appendScanLog(entry: Omit<ScanLogEntry, "id" | "scannedAt"> & {
  scannedAt?: string;
}): ScanLogEntry {
  const row: ScanLogEntry = {
    ...entry,
    id: `scan-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    scannedAt: entry.scannedAt ?? new Date().toISOString(),
  };
  if (typeof window === "undefined") return row;
  const key = storageKey();
  if (!key) return row;
  const next = [row, ...loadScanLogs()].slice(0, MAX_LOGS);
  localStorage.setItem(key, JSON.stringify(next));
  window.dispatchEvent(new Event("youraiseller-data-updated"));
  return row;
}

export function summarizeScanLogs(
  logs: ScanLogEntry[]
): {
  total: number;
  success: number;
  failed: number;
  duplicate: number;
  byTab: { shipping: number; return: number; rts: number };
} {
  const byTab = { shipping: 0, return: 0, rts: 0 };
  let success = 0;
  let failed = 0;
  let duplicate = 0;
  for (const log of logs) {
    byTab[log.scanTab] += 1;
    if (log.type === "success") success += 1;
    else if (log.type === "duplicate") duplicate += 1;
    else failed += 1;
  }
  return { total: logs.length, success, failed, duplicate, byTab };
}
