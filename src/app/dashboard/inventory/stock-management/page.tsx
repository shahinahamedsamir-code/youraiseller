"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { PageHeader } from "@/components/ui/PageHeader";
import { StockMovementForm } from "@/components/inventory/StockMovementForm";
import { SmartRestockPanel } from "@/components/inventory/SmartRestockPanel";
import { loadMovements, type StockMovement } from "@/lib/inventory-store";
import { List, Plus } from "lucide-react";

type StockTab = "decrease" | "increase" | "transfer" | "restock";

const TAB_LABELS: Record<StockTab, string> = {
  decrease: "Decrease Stock",
  increase: "Increase Stock",
  transfer: "Transfer Stock",
  restock: "Smart Restock",
};

const TAB_LIST_LABELS: Record<Exclude<StockTab, "restock">, string> = {
  decrease: "Decrease List",
  increase: "Increase List",
  transfer: "Transfer List",
};

export default function StockManagementPage() {
  const [tab, setTab] = useState<StockTab>("decrease");
  const [tick, setTick] = useState(0);
  const [view, setView] = useState<"form" | "list">("form");

  const refresh = useCallback(() => setTick((v) => v + 1), []);

  useEffect(() => {
    setView("form");
  }, [tab]);

  useEffect(() => {
    const onData = () => refresh();
    window.addEventListener("youraiseller-data-updated", onData);
    return () => window.removeEventListener("youraiseller-data-updated", onData);
  }, [refresh]);

  const rows = useMemo(() => {
    void tick;
    if (tab === "restock") return [];
    return loadMovements(tab);
  }, [tab, tick]);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Stock Management"
        description="Decrease, increase, transfer, and smart restock in one place"
      />

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white">
        <div className="flex min-w-max gap-1 p-2">
          {(Object.keys(TAB_LABELS) as StockTab[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setTab(key)}
              className={clsx(
                "rounded-xl px-4 py-2 text-sm font-bold transition",
                tab === key
                  ? "bg-indigo-600 text-white shadow"
                  : "text-slate-600 hover:bg-slate-100"
              )}
            >
              {TAB_LABELS[key]}
            </button>
          ))}
        </div>
      </div>

      {tab === "restock" ? (
        <SmartRestockPanel />
      ) : (
        <div className="space-y-5">
          <div className="flex flex-wrap items-center justify-end gap-2 rounded-xl border border-slate-200 bg-white p-2">
            <button
              type="button"
              onClick={() => setView("form")}
              className={clsx(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold",
                view === "form"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-700 hover:bg-slate-100"
              )}
            >
              <Plus className="h-4 w-4" /> Form View
            </button>
            <button
              type="button"
              onClick={() => setView("list")}
              className={clsx(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold",
                view === "list"
                  ? "bg-indigo-600 text-white"
                  : "text-slate-700 hover:bg-slate-100"
              )}
            >
              <List className="h-4 w-4" /> {TAB_LIST_LABELS[tab]}
            </button>
          </div>

          {view === "form" ? (
            <StockMovementForm mode={tab} onDone={refresh} />
          ) : (
            <MovementTable rows={rows} type={tab} />
          )}
        </div>
      )}
    </div>
  );
}

function MovementTable({
  rows,
  type,
}: {
  rows: StockMovement[];
  type: "decrease" | "increase" | "transfer";
}) {
  return (
    <div className="yai-panel overflow-hidden">
      <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <h3 className="text-sm font-bold text-slate-900">{TAB_LABELS[type]} List</h3>
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-500">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">SKU</th>
              <th className="px-4 py-3">Qty</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Details</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-b border-slate-50 hover:bg-slate-50/60">
                <td className="px-4 py-3 text-slate-500">{r.createdAt}</td>
                <td className="px-4 py-3 font-semibold text-slate-800">{r.productName}</td>
                <td className="px-4 py-3 font-mono text-xs text-slate-500">{r.productCode}</td>
                <td
                  className={clsx(
                    "px-4 py-3 font-bold",
                    type === "decrease"
                      ? "text-rose-600"
                      : type === "increase"
                        ? "text-emerald-600"
                        : "text-indigo-700"
                  )}
                >
                  {type === "decrease" ? "-" : type === "increase" ? "+" : ""}
                  {r.qty}
                </td>
                <td className="px-4 py-3">{r.reason}</td>
                <td className="px-4 py-3 text-slate-500">
                  {type === "transfer"
                    ? `${r.fromLocation ?? "—"} → ${r.toLocation ?? "—"}`
                    : r.note || "—"}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {rows.length === 0 && (
        <p className="px-4 py-10 text-center text-sm text-slate-500">
          No records yet for this section.
        </p>
      )}
    </div>
  );
}
