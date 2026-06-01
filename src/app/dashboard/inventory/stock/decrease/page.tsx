"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { loadMovements, type StockMovement } from "@/lib/inventory-store";
import { Plus } from "lucide-react";

export default function DecreaseStockListPage() {
  const [rows, setRows] = useState<StockMovement[]>([]);

  const refresh = useCallback(() => {
    setRows(loadMovements("decrease"));
  }, []);

  useEffect(() => {
    refresh();
    const onData = () => refresh();
    window.addEventListener("youraiseller-data-updated", onData);
    return () => window.removeEventListener("youraiseller-data-updated", onData);
  }, [refresh]);

  return (
    <div>
      <PageHeader
        title="Decrease Stock List"
        description="History of stock reductions"
        actions={
          <Link
            href="/dashboard/inventory/stock/decrease/new"
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-red-600 px-4 py-2 text-sm font-semibold text-white shadow-md shadow-rose-500/20 hover:brightness-105"
          >
            <Plus className="h-4 w-4" /> New Decrease
          </Link>
        }
      />
      <MovementTable rows={rows} />
    </div>
  );
}

function MovementTable({ rows }: { rows: StockMovement[] }) {
  return (
    <div className="yai-panel overflow-hidden">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-slate-100 bg-slate-50/80 text-left text-xs font-bold uppercase text-slate-500">
            <th className="px-4 py-3">Date</th>
            <th className="px-4 py-3">Product</th>
            <th className="px-4 py-3">SKU</th>
            <th className="px-4 py-3">Qty</th>
            <th className="px-4 py-3">Reason</th>
            <th className="px-4 py-3">Note</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((r) => (
            <tr key={r.id} className="border-b border-slate-50 hover:bg-rose-50/20">
              <td className="px-4 py-3 text-slate-500">{r.createdAt}</td>
              <td className="px-4 py-3 font-semibold text-slate-800">{r.productName}</td>
              <td className="px-4 py-3 font-mono text-xs text-slate-500">{r.productCode}</td>
              <td className="px-4 py-3 font-bold text-rose-600">-{r.qty}</td>
              <td className="px-4 py-3">{r.reason}</td>
              <td className="px-4 py-3 text-slate-500">{r.note || "—"}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {rows.length === 0 && (
        <p className="p-10 text-center text-sm text-slate-500">
          No decrease records yet.{" "}
          <Link
            href="/dashboard/inventory/stock/decrease/new"
            className="font-semibold text-rose-600 hover:underline"
          >
            Create your first decrease
          </Link>
        </p>
      )}
    </div>
  );
}
