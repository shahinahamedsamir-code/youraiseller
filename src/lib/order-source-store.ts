import { sellerStorageKey } from "./seller-storage";
import { pushSellerData } from "./seller-sync";
import { ORDER_SOURCE_OPTIONS, type OrderSource } from "./order-source";

/**
 * A configurable order-source entry. Built-in sources can be enabled/disabled
 * but not deleted; user-added (custom) sources can be deleted freely.
 */
export type OrderSourceItem = {
  /** Stable id — built-in uses the OrderSource value, custom uses `custom-<slug>`. */
  id: string;
  label: string;
  /** Icon / colour base — a known OrderSource. Custom sources use "custom". */
  base: OrderSource;
  builtin: boolean;
  enabled: boolean;
};

export const ORDER_SOURCES_UPDATED = "youraiseller-order-sources-updated";

function storageKey(): string | null {
  return sellerStorageKey("ordersources");
}

/** Built-in defaults, seeded from the static option list. */
export function defaultOrderSources(): OrderSourceItem[] {
  return ORDER_SOURCE_OPTIONS.map((o) => ({
    id: o.value,
    label: o.label,
    base: o.value,
    builtin: true,
    enabled: true,
  }));
}

function normalize(raw: unknown): OrderSourceItem[] {
  const defaults = defaultOrderSources();
  if (!Array.isArray(raw)) return defaults;

  const cleaned: OrderSourceItem[] = [];
  const seen = new Set<string>();
  for (const r of raw as Partial<OrderSourceItem>[]) {
    if (!r || typeof r !== "object") continue;
    const id = String(r.id ?? "").trim();
    const label = String(r.label ?? "").trim();
    if (!id || !label || seen.has(id)) continue;
    seen.add(id);
    const knownBase = ORDER_SOURCE_OPTIONS.some((o) => o.value === r.base);
    cleaned.push({
      id,
      label,
      base: (knownBase ? r.base : "custom") as OrderSource,
      builtin: Boolean(r.builtin),
      enabled: r.enabled !== false,
    });
  }

  // Make sure newly shipped built-ins always appear (appended, disabled-safe).
  for (const d of defaults) {
    if (!seen.has(d.id)) cleaned.push(d);
  }
  return cleaned.length ? cleaned : defaults;
}

export function loadOrderSources(): OrderSourceItem[] {
  if (typeof window === "undefined") return defaultOrderSources();
  const key = storageKey();
  if (!key) return defaultOrderSources();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      const seeded = defaultOrderSources();
      localStorage.setItem(key, JSON.stringify(seeded));
      return seeded;
    }
    return normalize(JSON.parse(raw));
  } catch {
    return defaultOrderSources();
  }
}

/** Only the sources that should appear in pickers (enabled). */
export function loadEnabledOrderSources(): OrderSourceItem[] {
  return loadOrderSources().filter((s) => s.enabled);
}

export function saveOrderSources(items: OrderSourceItem[]): OrderSourceItem[] {
  if (typeof window === "undefined") return items;
  const key = storageKey();
  if (!key) return items;
  const normalized = normalize(items);
  localStorage.setItem(key, JSON.stringify(normalized));
  pushSellerData("ordersources", normalized);
  window.dispatchEvent(new Event(ORDER_SOURCES_UPDATED));
  window.dispatchEvent(new Event("youraiseller-data-updated"));
  return normalized;
}

function slugify(label: string): string {
  return label
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
}

/** Append a custom source. Returns the updated list (or the same list if duplicate/empty). */
export function addCustomOrderSource(label: string): OrderSourceItem[] {
  const name = label.trim();
  if (!name) return loadOrderSources();
  const items = loadOrderSources();
  const exists = items.some(
    (s) => s.label.trim().toLowerCase() === name.toLowerCase()
  );
  if (exists) return items;
  const base = `custom-${slugify(name) || Math.random().toString(36).slice(2, 7)}`;
  let id = base;
  let n = 2;
  while (items.some((s) => s.id === id)) id = `${base}-${n++}`;
  const next: OrderSourceItem[] = [
    ...items,
    { id, label: name, base: "custom", builtin: false, enabled: true },
  ];
  return saveOrderSources(next);
}

export function removeOrderSource(id: string): OrderSourceItem[] {
  const items = loadOrderSources();
  const target = items.find((s) => s.id === id);
  if (!target || target.builtin) return items; // built-ins can only be disabled
  return saveOrderSources(items.filter((s) => s.id !== id));
}

export function setOrderSourceEnabled(id: string, enabled: boolean): OrderSourceItem[] {
  const items = loadOrderSources();
  return saveOrderSources(
    items.map((s) => (s.id === id ? { ...s, enabled } : s))
  );
}

export function renameOrderSource(id: string, label: string): OrderSourceItem[] {
  const name = label.trim();
  if (!name) return loadOrderSources();
  const items = loadOrderSources();
  return saveOrderSources(
    items.map((s) => (s.id === id ? { ...s, label: name } : s))
  );
}
