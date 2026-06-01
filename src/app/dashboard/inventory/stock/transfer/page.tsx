"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { StockMovementForm } from "@/components/inventory/StockMovementForm";
import { loadMovements, type StockMovement } from "@/lib/inventory-store";

export default function TransferStockPage() {
  const [rows, setRows] = useState<StockMovement[]>([]);
  const refresh = () => setRows(loadMovements("transfer"));

  useEffect(() => refresh(), []);

  return (
    <div className="space-y-8">
      <PageHeader title="Transfer Stock" description="Move stock between locations" />
      <StockMovementForm mode="transfer" onDone={refresh} />
      <div className="glass-card overflow-hidden rounded-2xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
              <th className="px-4 py-3">Date</th>
              <th className="px-4 py-3">Product</th>
              <th className="px-4 py-3">Qty</th>
              <th className="px-4 py-3">From → To</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id} className="border-t border-slate-50">
                <td className="px-4 py-3 text-slate-500">{r.createdAt}</td>
                <td className="px-4 py-3 font-medium">{r.productName}</td>
                <td className="px-4 py-3">{r.qty}</td>
                <td className="px-4 py-3 text-slate-600">
                  {r.fromLocation} → {r.toLocation}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
