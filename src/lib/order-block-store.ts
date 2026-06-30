import { sellerStorageKey } from "./seller-storage";

export type BlockType = "phone" | "ip" | "email";

export type BlockEntry = {
  id: string;
  type: BlockType;
  value: string;
  reason: string;
  createdAt: string;
};

function storageKey(): string | null {
  return sellerStorageKey("order-block-list");
}

export function loadBlockList(): BlockEntry[] {
  if (typeof window === "undefined") return [];
  const key = storageKey();
  if (!key) return [];
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as BlockEntry[]) : [];
  } catch {
    return [];
  }
}

function save(list: BlockEntry[]) {
  if (typeof window === "undefined") return;
  const key = storageKey();
  if (!key) return;
  localStorage.setItem(key, JSON.stringify(list));
  window.dispatchEvent(new Event("youraiseller-data-updated"));
}

/** Compare-friendly form so "+8801..." / "01..." / spaces all match. */
export function normalizeBlockValue(type: BlockType, value: string): string {
  const v = value.trim();
  if (type === "phone") return v.replace(/[^0-9]/g, "").replace(/^88/, "");
  if (type === "email") return v.toLowerCase();
  return v;
}

export function addBlock(input: {
  type: BlockType;
  value: string;
  reason: string;
}): BlockEntry | null {
  const value = input.value.trim();
  if (!value) return null;
  const list = loadBlockList();
  const norm = normalizeBlockValue(input.type, value);
  if (
    list.some(
      (b) => b.type === input.type && normalizeBlockValue(b.type, b.value) === norm
    )
  ) {
    return null; // already blocked
  }
  const maxNum = list.reduce((m, b) => {
    const n = parseInt(String(b.id).replace(/\D/g, ""), 10);
    return Number.isNaN(n) ? m : Math.max(m, n);
  }, 9);
  const entry: BlockEntry = {
    id: `BL-${maxNum + 1}`,
    type: input.type,
    value,
    reason: input.reason.trim(),
    createdAt: new Date().toISOString(),
  };
  save([entry, ...list]);
  return entry;
}

export function removeBlock(id: string) {
  save(loadBlockList().filter((b) => b.id !== id));
}

/** Returns the matching block entry if any of the given values is blocked. */
export function findBlock(values: {
  phone?: string;
  ip?: string;
  email?: string;
}): BlockEntry | null {
  const list = loadBlockList();
  for (const b of list) {
    if (
      b.type === "phone" &&
      values.phone &&
      normalizeBlockValue("phone", b.value) === normalizeBlockValue("phone", values.phone)
    ) {
      return b;
    }
    if (b.type === "ip" && values.ip && b.value.trim() === values.ip.trim()) {
      return b;
    }
    if (
      b.type === "email" &&
      values.email &&
      normalizeBlockValue("email", b.value) === normalizeBlockValue("email", values.email)
    ) {
      return b;
    }
  }
  return null;
}
