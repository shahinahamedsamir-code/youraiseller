import { sellerStorageKey } from "./seller-storage";
import { pushSellerData } from "./seller-sync";

/** A selectable custom order tag (e.g. "Scammer", "Due Payment"). */
export type OrderTag = {
  id: string;
  label: string;
  /** Tailwind tint key for the chip colour. */
  color: OrderTagColor;
};

export type OrderTagColor =
  | "slate"
  | "rose"
  | "amber"
  | "emerald"
  | "sky"
  | "violet"
  | "fuchsia";

export const ORDER_TAG_COLORS: OrderTagColor[] = [
  "slate",
  "rose",
  "amber",
  "emerald",
  "sky",
  "violet",
  "fuchsia",
];

export const ORDER_TAGS_UPDATED = "youraiseller-order-tags-updated";

function storageKey(): string | null {
  return sellerStorageKey("ordertags");
}

export function defaultOrderTags(): OrderTag[] {
  return [
    { id: "tag-engraving", label: "Engraving", color: "violet" },
    { id: "tag-due-payment", label: "Due Payment", color: "amber" },
    { id: "tag-phone-off", label: "Phone off", color: "slate" },
    { id: "tag-scammer", label: "Scammer", color: "rose" },
    { id: "tag-call-no-answer", label: "Call No Answer", color: "sky" },
  ];
}

function normalize(raw: unknown): OrderTag[] {
  if (!Array.isArray(raw)) return [];
  const out: OrderTag[] = [];
  const seen = new Set<string>();
  for (const r of raw as Partial<OrderTag>[]) {
    if (!r || typeof r !== "object") continue;
    const id = String(r.id ?? "").trim();
    const label = String(r.label ?? "").trim();
    if (!id || !label || seen.has(id)) continue;
    seen.add(id);
    out.push({
      id,
      label,
      color: ORDER_TAG_COLORS.includes(r.color as OrderTagColor)
        ? (r.color as OrderTagColor)
        : "slate",
    });
  }
  return out;
}

export function loadOrderTags(): OrderTag[] {
  if (typeof window === "undefined") return [];
  const key = storageKey();
  if (!key) return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      const seeded = defaultOrderTags();
      localStorage.setItem(key, JSON.stringify(seeded));
      return seeded;
    }
    return normalize(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function saveOrderTags(items: OrderTag[]): OrderTag[] {
  if (typeof window === "undefined") return items;
  const key = storageKey();
  if (!key) return items;
  const normalized = normalize(items);
  localStorage.setItem(key, JSON.stringify(normalized));
  pushSellerData("ordertags", normalized);
  window.dispatchEvent(new Event(ORDER_TAGS_UPDATED));
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

export function addOrderTag(
  label: string,
  color: OrderTagColor = "slate"
): OrderTag[] {
  const name = label.trim();
  if (!name) return loadOrderTags();
  const items = loadOrderTags();
  if (items.some((t) => t.label.trim().toLowerCase() === name.toLowerCase())) {
    return items;
  }
  const base = `tag-${slugify(name) || Math.random().toString(36).slice(2, 7)}`;
  let id = base;
  let n = 2;
  while (items.some((t) => t.id === id)) id = `${base}-${n++}`;
  return saveOrderTags([...items, { id, label: name, color }]);
}

export function removeOrderTag(id: string): OrderTag[] {
  const items = loadOrderTags();
  return saveOrderTags(items.filter((t) => t.id !== id));
}

export function orderTagChipClass(color: OrderTagColor): string {
  const map: Record<OrderTagColor, string> = {
    slate: "bg-slate-100 text-slate-700 ring-slate-200",
    rose: "bg-rose-100 text-rose-700 ring-rose-200",
    amber: "bg-amber-100 text-amber-800 ring-amber-200",
    emerald: "bg-emerald-100 text-emerald-700 ring-emerald-200",
    sky: "bg-sky-100 text-sky-700 ring-sky-200",
    violet: "bg-violet-100 text-violet-700 ring-violet-200",
    fuchsia: "bg-fuchsia-100 text-fuchsia-700 ring-fuchsia-200",
  };
  return map[color] ?? map.slate;
}
