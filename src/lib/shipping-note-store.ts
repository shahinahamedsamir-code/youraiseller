import { sellerStorageKey } from "./seller-storage";
import { pushSellerData } from "./seller-sync";

/** A reusable shipping-note template selectable when creating an order. */
export type ShippingNoteTemplate = {
  id: string;
  /** Short name shown in the dropdown. */
  label: string;
  /** The note text inserted into the order. */
  text: string;
};

export const SHIPPING_NOTES_UPDATED = "youraiseller-shipping-notes-updated";

function storageKey(): string | null {
  return sellerStorageKey("shippingnotes");
}

export function defaultShippingNotes(): ShippingNoteTemplate[] {
  return [
    {
      id: "sn-fragile",
      label: "Fragile",
      text: "Handle with care — fragile item, please do not throw.",
    },
    {
      id: "sn-call-before",
      label: "Call before delivery",
      text: "Please call the customer before delivery.",
    },
    {
      id: "sn-cod-exact",
      label: "Collect exact COD",
      text: "Collect the exact cash-on-delivery amount only.",
    },
  ];
}

function normalize(raw: unknown): ShippingNoteTemplate[] {
  if (!Array.isArray(raw)) return [];
  const out: ShippingNoteTemplate[] = [];
  const seen = new Set<string>();
  for (const r of raw as Partial<ShippingNoteTemplate>[]) {
    if (!r || typeof r !== "object") continue;
    const id = String(r.id ?? "").trim();
    const label = String(r.label ?? "").trim();
    const text = String(r.text ?? "").trim();
    if (!id || !label || !text || seen.has(id)) continue;
    seen.add(id);
    out.push({ id, label, text });
  }
  return out;
}

export function loadShippingNotes(): ShippingNoteTemplate[] {
  if (typeof window === "undefined") return [];
  const key = storageKey();
  if (!key) return [];
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      const seeded = defaultShippingNotes();
      localStorage.setItem(key, JSON.stringify(seeded));
      return seeded;
    }
    return normalize(JSON.parse(raw));
  } catch {
    return [];
  }
}

export function saveShippingNotes(
  items: ShippingNoteTemplate[]
): ShippingNoteTemplate[] {
  if (typeof window === "undefined") return items;
  const key = storageKey();
  if (!key) return items;
  const normalized = normalize(items);
  localStorage.setItem(key, JSON.stringify(normalized));
  pushSellerData("shippingnotes", normalized);
  window.dispatchEvent(new Event(SHIPPING_NOTES_UPDATED));
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

export function addShippingNote(
  label: string,
  text: string
): ShippingNoteTemplate[] {
  const name = label.trim();
  const body = text.trim();
  if (!name || !body) return loadShippingNotes();
  const items = loadShippingNotes();
  const base = `sn-${slugify(name) || Math.random().toString(36).slice(2, 7)}`;
  let id = base;
  let n = 2;
  while (items.some((s) => s.id === id)) id = `${base}-${n++}`;
  return saveShippingNotes([...items, { id, label: name, text: body }]);
}

export function updateShippingNote(
  id: string,
  patch: Partial<Pick<ShippingNoteTemplate, "label" | "text">>
): ShippingNoteTemplate[] {
  const items = loadShippingNotes();
  return saveShippingNotes(
    items.map((s) =>
      s.id === id
        ? {
            ...s,
            label: patch.label?.trim() || s.label,
            text: patch.text?.trim() || s.text,
          }
        : s
    )
  );
}

export function removeShippingNote(id: string): ShippingNoteTemplate[] {
  const items = loadShippingNotes();
  return saveShippingNotes(items.filter((s) => s.id !== id));
}
