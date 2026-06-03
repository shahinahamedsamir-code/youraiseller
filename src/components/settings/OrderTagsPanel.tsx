"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { Tag, Plus, Trash2, Sparkles } from "lucide-react";
import {
  loadOrderTags,
  addOrderTag,
  removeOrderTag,
  ORDER_TAG_COLORS,
  orderTagChipClass,
  type OrderTag,
  type OrderTagColor,
} from "@/lib/order-tags-store";

const COLOR_LABELS: Record<OrderTagColor, string> = {
  slate: "Grey",
  rose: "Red",
  amber: "Amber",
  emerald: "Green",
  sky: "Blue",
  violet: "Purple",
  fuchsia: "Pink",
};

export function OrderTagsPanel() {
  const [items, setItems] = useState<OrderTag[]>([]);
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState<OrderTagColor>("slate");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setItems(loadOrderTags());
  }, []);

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  };

  const handleAdd = () => {
    const name = newLabel.trim();
    if (!name) return;
    const before = items.length;
    const next = addOrderTag(name, newColor);
    setItems(next);
    setNewLabel("");
    flash(next.length > before ? `"${name}" added` : `"${name}" already exists`);
  };

  const handleRemove = (t: OrderTag) => {
    setItems(removeOrderTag(t.id));
    flash(`"${t.label}" deleted`);
  };

  return (
    <div className="space-y-6">
      <div className="relative overflow-hidden rounded-3xl border border-teal-100 bg-gradient-to-br from-teal-600 via-cyan-600 to-sky-600 p-6 text-white shadow-lg shadow-teal-200">
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/30 backdrop-blur">
            <Tag className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight">Order Tags</h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-bold ring-1 ring-white/30">
                <Sparkles className="h-3 w-3" />
                {items.length} tags
              </span>
            </div>
            <p className="mt-1 text-sm text-white/80">
              Create tags here — staff pick them on New Order under Extra Options.
            </p>
          </div>
        </div>
      </div>

      <div className="yai-panel overflow-hidden">
        <div className="border-b border-teal-100/80 bg-gradient-to-r from-teal-50/60 via-white to-cyan-50/40 px-5 py-4">
          <h3 className="font-extrabold text-slate-900">Add a tag</h3>
          <p className="text-xs text-slate-500">
            e.g. &quot;Engraving&quot;, &quot;Due Payment&quot;, &quot;Scammer&quot;
          </p>
        </div>
        <div className="space-y-3 p-5">
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
            }}
            placeholder="Tag name..."
            className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-teal-300 focus:ring-2 focus:ring-teal-100"
          />
          <div>
            <p className="mb-2 text-xs font-bold uppercase tracking-wide text-slate-500">
              Colour
            </p>
            <div className="flex flex-wrap gap-2">
              {ORDER_TAG_COLORS.map((c) => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setNewColor(c)}
                  title={COLOR_LABELS[c]}
                  className={clsx(
                    "rounded-full px-3 py-1 text-xs font-semibold ring-1 transition",
                    orderTagChipClass(c),
                    newColor === c && "ring-2 ring-offset-1 ring-teal-500"
                  )}
                >
                  {COLOR_LABELS[c]}
                </button>
              ))}
            </div>
          </div>
          <button
            type="button"
            onClick={handleAdd}
            disabled={!newLabel.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-teal-200 transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Add Tag
          </button>
        </div>
      </div>

      <div className="yai-panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="font-extrabold text-slate-900">All tags</h3>
            <p className="text-xs text-slate-500">
              Delete a tag to remove it from the New Order picker.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
            {items.length}
          </span>
        </div>
        {items.length === 0 ? (
          <div className="px-5 py-12 text-center text-sm text-slate-400">
            No tags yet — add one above.
          </div>
        ) : (
          <ul className="divide-y divide-slate-100">
            {items.map((t) => (
              <li
                key={t.id}
                className="flex items-center gap-3 px-5 py-3.5"
              >
                <span
                  className={clsx(
                    "inline-flex rounded-full px-3 py-1 text-xs font-semibold ring-1",
                    orderTagChipClass(t.color)
                  )}
                >
                  {t.label}
                </span>
                <span className="flex-1 text-xs text-slate-400">
                  {COLOR_LABELS[t.color]}
                </span>
                <button
                  type="button"
                  onClick={() => handleRemove(t)}
                  title="Delete tag"
                  className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-rose-100 text-rose-500 transition hover:bg-rose-50"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
