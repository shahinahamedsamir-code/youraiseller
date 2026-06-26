import { emitDataUpdated } from "./data-events";
import { sellerStorageKey } from "./seller-storage";

export type DeletionLogModule =
  | "orders"
  | "products"
  | "customers"
  | "accounting"
  | "delivery"
  | "settings"
  | "users"
  | "other";

export type DeletionLogEntry = {
  id: string;
  module: DeletionLogModule;
  itemType: string;
  itemId: string;
  itemName: string;
  deletedBy: string;
  role?: string;
  reason?: string;
  snapshot?: unknown;
  restorable: boolean;
  restoredAt?: string;
  permanentlyDeletedAt?: string;
  createdAt: string;
};

export type CreateDeletionLogInput = Omit<
  DeletionLogEntry,
  "id" | "createdAt" | "restoredAt" | "permanentlyDeletedAt"
>;

function storageKey(): string | null {
  return sellerStorageKey("deletion-logs");
}

function loadRaw(): DeletionLogEntry[] {
  if (typeof window === "undefined") return [];
  const key = storageKey();
  if (!key) return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return [];
    return JSON.parse(raw) as DeletionLogEntry[];
  } catch {
    return [];
  }
}

function saveRaw(list: DeletionLogEntry[]) {
  if (typeof window === "undefined") return;
  const key = storageKey();
  if (!key) return;
  localStorage.setItem(key, JSON.stringify(list));
  emitDataUpdated();
}

export function loadDeletionLogs(): DeletionLogEntry[] {
  return loadRaw().sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}

export function addDeletionLog(input: CreateDeletionLogInput): DeletionLogEntry {
  const entry: DeletionLogEntry = {
    ...input,
    id: `del-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
    createdAt: new Date().toISOString(),
  };
  saveRaw([entry, ...loadRaw()]);
  return entry;
}

export function markDeletionLogRestored(id: string): DeletionLogEntry | null {
  const list = loadRaw();
  const idx = list.findIndex((entry) => entry.id === id);
  if (idx === -1) return null;
  list[idx] = {
    ...list[idx],
    restoredAt: new Date().toISOString(),
  };
  saveRaw(list);
  return list[idx];
}

export function permanentlyDeleteLog(id: string): boolean {
  const list = loadRaw();
  const idx = list.findIndex((entry) => entry.id === id);
  if (idx === -1) return false;
  list[idx] = {
    ...list[idx],
    permanentlyDeletedAt: new Date().toISOString(),
    snapshot: undefined,
    restorable: false,
  };
  saveRaw(list);
  return true;
}

