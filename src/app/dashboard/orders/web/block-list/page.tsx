"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { mockBlocked } from "@/lib/mock-web-orders";
import { Plus, ShieldBan, Trash2 } from "lucide-react";

export default function OrderBlockListPage() {
  return (
    <div>
      <PageHeader
        title="Order Block List"
        description="Blocked phone numbers, IPs, and customers with fraud history"
        actions={
          <button
            type="button"
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-pink-600 px-4 py-2 text-sm font-semibold text-white shadow-md"
          >
            <Plus className="h-4 w-4" />
            Add Block
          </button>
        }
      />

      <div className="mb-4 flex gap-2">
        {["All", "Phone", "IP", "Email"].map((f, i) => (
          <button
            key={f}
            type="button"
            className={`rounded-full px-4 py-1.5 text-xs font-semibold ${
              i === 0 ? "bg-rose-500 text-white" : "bg-white text-slate-600 ring-1 ring-slate-200"
            }`}
          >
            {f}
          </button>
        ))}
      </div>

      <div className="glass-card overflow-hidden rounded-2xl">
        <table className="w-full text-sm">
          <thead>
            <tr className="bg-slate-50/80 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
              <th className="px-4 py-3">ID</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Value</th>
              <th className="px-4 py-3">Reason</th>
              <th className="px-4 py-3">Blocked Date</th>
              <th className="px-4 py-3">Action</th>
            </tr>
          </thead>
          <tbody>
            {mockBlocked.map((row) => (
              <tr key={row.id} className="border-t border-slate-50 hover:bg-rose-50/20">
                <td className="px-4 py-3 font-semibold text-rose-700">{row.id}</td>
                <td className="px-4 py-3">
                  <span className="inline-flex items-center gap-1 rounded-md bg-slate-100 px-2 py-0.5 text-xs font-bold">
                    <ShieldBan className="h-3 w-3" />
                    {row.type}
                  </span>
                </td>
                <td className="px-4 py-3 font-mono text-slate-800">{row.value}</td>
                <td className="px-4 py-3 text-slate-600">{row.reason}</td>
                <td className="px-4 py-3 text-xs text-slate-500">{row.date}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    className="rounded-lg p-1.5 text-rose-500 hover:bg-rose-50"
                    aria-label="Remove block"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
