"use client";

import clsx from "clsx";
import { Filter, Search } from "lucide-react";
import type { SmsLogRow } from "@/lib/sms-types";
import { useSmsAccount } from "@/components/integration/sms/useSmsAccount";

const STATUS_STYLE = {
  delivered: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  failed: "bg-rose-100 text-rose-800 ring-rose-200",
  pending: "bg-amber-100 text-amber-800 ring-amber-200",
} as const;

export function SmsLogPanel() {
  const { account, loading } = useSmsAccount();
  const logs = account.logs;

  return (
    <div className="yai-panel overflow-hidden">
      <div className="border-b border-slate-100 bg-gradient-to-r from-white to-slate-50 px-5 py-4 sm:px-6">
        <h2 className="text-lg font-extrabold text-slate-900">SMS Log</h2>
        <p className="mt-1 text-sm text-slate-500">
          Sent messages, delivery status &amp; cost
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-3 sm:px-6">
        <div className="relative min-w-[200px] flex-1">
          <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          <input
            placeholder="Search phone or message..."
            className="w-full rounded-xl border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-teal-400"
          />
        </div>
        <button
          type="button"
          className="inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-600 hover:border-teal-200 hover:text-teal-700"
        >
          <Filter className="h-4 w-4" />
          Filter
        </button>
      </div>

      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wide text-slate-500">
              <th className="px-5 py-3">Time</th>
              <th className="px-3 py-3">Phone</th>
              <th className="min-w-[220px] px-3 py-3">Message</th>
              <th className="px-3 py-3">Type</th>
              <th className="px-3 py-3">Status</th>
              <th className="px-5 py-3 text-right">Cost</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                  Loading…
                </td>
              </tr>
            ) : logs.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-5 py-8 text-center text-slate-400">
                  No SMS sent yet
                </td>
              </tr>
            ) : (
              logs.map((row: SmsLogRow) => (
                <tr
                  key={row.id}
                  className="border-b border-slate-100 transition hover:bg-teal-50/30"
                >
                  <td className="whitespace-nowrap px-5 py-3 text-xs text-slate-500">
                    {row.sentAt}
                  </td>
                  <td className="whitespace-nowrap px-3 py-3 font-mono text-xs font-bold text-slate-800">
                    {row.phone}
                  </td>
                  <td className="max-w-xs px-3 py-3 text-slate-700">{row.message}</td>
                  <td className="whitespace-nowrap px-3 py-3 text-xs font-semibold text-slate-500">
                    {row.type}
                  </td>
                  <td className="px-3 py-3">
                    <span
                      className={clsx(
                        "inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ring-1",
                        STATUS_STYLE[row.status]
                      )}
                    >
                      {row.status}
                    </span>
                  </td>
                  <td className="whitespace-nowrap px-5 py-3 text-right font-bold tabular-nums text-slate-800">
                    {row.cost > 0 ? row.cost : "—"}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
