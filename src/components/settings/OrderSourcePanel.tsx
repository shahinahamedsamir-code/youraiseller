"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { Tag, Plus, Trash2, Sparkles, Check } from "lucide-react";
import {
  loadOrderSources,
  addCustomOrderSource,
  removeOrderSource,
  setOrderSourceEnabled,
  type OrderSourceItem,
} from "@/lib/order-source-store";
import { OrderSourceIcon } from "@/components/orders/OrderSourceIcon";

function Toggle({ on, onClick }: { on: boolean; onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={on}
      className={clsx(
        "relative h-6 w-11 shrink-0 rounded-full transition",
        on ? "bg-emerald-500" : "bg-slate-300"
      )}
    >
      <span
        className={clsx(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition",
          on ? "left-[22px]" : "left-0.5"
        )}
      />
    </button>
  );
}

export function OrderSourcePanel() {
  const [items, setItems] = useState<OrderSourceItem[]>([]);
  const [newLabel, setNewLabel] = useState("");
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setItems(loadOrderSources());
  }, []);

  const flash = (msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2200);
  };

  const handleAdd = () => {
    const name = newLabel.trim();
    if (!name) return;
    const before = items.length;
    const next = addCustomOrderSource(name);
    setItems(next);
    setNewLabel("");
    flash(next.length > before ? `“${name}” added` : `“${name}” already exists`);
  };

  const handleToggle = (it: OrderSourceItem) => {
    setItems(setOrderSourceEnabled(it.id, !it.enabled));
  };

  const handleRemove = (it: OrderSourceItem) => {
    setItems(removeOrderSource(it.id));
    flash(`“${it.label}” deleted`);
  };

  const activeCount = items.filter((i) => i.enabled).length;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-indigo-100 bg-gradient-to-br from-indigo-600 via-violet-600 to-fuchsia-600 p-6 text-white shadow-lg shadow-indigo-200">
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/30 backdrop-blur">
              <Tag className="h-7 w-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-2xl font-extrabold tracking-tight">
                  Order Sources
                </h1>
                <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-bold ring-1 ring-white/30">
                  <Sparkles className="h-3 w-3" />
                  {activeCount} active
                </span>
              </div>
              <p className="mt-1 text-sm text-white/80">
                Control which channels appear when creating an order. Turn any off,
                or add your own.
              </p>
            </div>
          </div>
        </div>
      </div>

      {/* Add new */}
      <div className="yai-panel overflow-hidden">
        <div className="border-b border-indigo-100/80 bg-gradient-to-r from-indigo-50/60 via-white to-violet-50/40 px-5 py-4">
          <h3 className="font-extrabold text-slate-900">Add a custom source</h3>
          <p className="text-xs text-slate-500">
            e.g. “WhatsApp Group”, “Influencer”, “Reseller”
          </p>
        </div>
        <div className="flex flex-col gap-3 p-5 sm:flex-row">
          <input
            value={newLabel}
            onChange={(e) => setNewLabel(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") handleAdd();
            }}
            placeholder="New source name..."
            className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-indigo-300 focus:ring-2 focus:ring-indigo-100"
          />
          <button
            type="button"
            onClick={handleAdd}
            disabled={!newLabel.trim()}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-200 transition hover:shadow-lg disabled:cursor-not-allowed disabled:opacity-50"
          >
            <Plus className="h-4 w-4" />
            Add Source
          </button>
        </div>
      </div>

      {/* List */}
      <div className="yai-panel overflow-hidden">
        <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="font-extrabold text-slate-900">All sources</h3>
            <p className="text-xs text-slate-500">
              Built-in channels can be disabled; custom ones can be deleted.
            </p>
          </div>
          <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-600">
            {items.length} total
          </span>
        </div>
        <ul className="divide-y divide-slate-100">
          {items.map((it) => (
            <li
              key={it.id}
              className={clsx(
                "flex items-center gap-3 px-5 py-3.5 transition",
                !it.enabled && "bg-slate-50/60"
              )}
            >
              <OrderSourceIcon source={it.base} size="md" />
              <div className="min-w-0 flex-1">
                <p
                  className={clsx(
                    "flex items-center gap-2 truncate font-bold",
                    it.enabled ? "text-slate-800" : "text-slate-400"
                  )}
                >
                  {it.label}
                  {it.builtin ? (
                    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                      Built-in
                    </span>
                  ) : (
                    <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-indigo-600">
                      Custom
                    </span>
                  )}
                </p>
                <p className="text-xs text-slate-400">
                  {it.enabled ? (
                    <span className="inline-flex items-center gap-1 text-emerald-600">
                      <Check className="h-3 w-3" /> Visible in New Order
                    </span>
                  ) : (
                    "Hidden"
                  )}
                </p>
              </div>
              <Toggle on={it.enabled} onClick={() => handleToggle(it)} />
              <button
                type="button"
                onClick={() => handleRemove(it)}
                disabled={it.builtin}
                title={it.builtin ? "Built-in sources can't be deleted" : "Delete"}
                className={clsx(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border transition",
                  it.builtin
                    ? "cursor-not-allowed border-slate-100 text-slate-300"
                    : "border-rose-100 text-rose-500 hover:bg-rose-50"
                )}
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </li>
          ))}
        </ul>
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
