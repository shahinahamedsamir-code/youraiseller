"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { loadMovements, type StockMovement } from "@/lib/inventory-store";
import { Plus } from "lucide-react";

export default function IncreaseStockListPage() {
  const [rows, setRows] = useState<StockMovement[]>([]);
  useEffect(() => setRows(loadMovements("increase")), []);

  return (
    <div>
      <PageHeader
        title="Increase Stock List"
        actions={
          <Link
            href="/dashboard/inventory/stock/increase/new"
            className="flex items-center gap-2 rounded-xl bg-teal-500 px-4 py-2 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" /> New
          </Link>
        }
      />
      <div className="glass-card overflow-hidden rounded-2xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Qty</th>
              <th className="px-4 py-3">Reason</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-50">
                <td className="px-4 py-3 text-slate-500">{r.createdAt}</td>
                <td className="px-4 py-3 font-medium">{r.productName}</td>
                <td className="px-4 py-3 font-semibold text-teal-600">+{r.qty}</td>
                <td className="px-4 py-3">{r.reason}</td>
              </tr>
            ))}
          </tbody>
        </table>
        {rows.length === 0 && (
          <p className="p-6 text-center text-sm text-slate-500">No records yet.</p>
        )}
      </div>
    </div>
  );
}
