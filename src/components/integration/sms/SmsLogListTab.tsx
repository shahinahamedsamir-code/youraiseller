"use client";

import { useMemo, useState } from "react";
import clsx from "clsx";
import { Eye, Filter, Loader2, Search, Trash2 } from "lucide-react";
import { SmsLogPeriodFilter } from "@/components/integration/sms/SmsLogPeriodFilter";
import {
  previewMessage,
  SmsLogPreviewModal,
} from "@/components/integration/sms/SmsLogPreviewModal";
import {
  filterLogsByPeriod,
  filterLogsBySearch,
  splitLogTime,
  type SmsLogPeriod,
} from "@/lib/sms-log-analytics";
import { deleteSmsLog } from "@/lib/sms-store";
import { formatSmsBdt, smsLogTaka, type SmsLogRow } from "@/lib/sms-types";

const STATUS_STYLE = {
  delivered: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  failed: "bg-rose-100 text-rose-800 ring-rose-200",
  pending: "bg-amber-100 text-amber-800 ring-amber-200",
} as const;

const STATUS_LABEL = {
  delivered: "Sent",
  failed: "Failed",
  pending: "Pending",
} as const;

type Props = {
  logs: SmsLogRow[];
  smsPriceTaka: number;
  loading: boolean;
  onAccountUpdate: (next: import("@/lib/sms-types").SmsAccount) => void;
};

export function SmsLogListTab({
  logs,
  smsPriceTaka,
  loading,
  onAccountUpdate,
}: Props) {
  const [period, setPeriod] = useState<SmsLogPeriod>("30d");
  const [messageSearch, setMessageSearch] = useState("");
  const [phoneSearch, setPhoneSearch] = useState("");
  const [previewRow, setPreviewRow] = useState<SmsLogRow | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const filtered = useMemo(() => {
    let rows = filterLogsByPeriod(logs, period);
    rows = filterLogsBySearch(rows, messageSearch, phoneSearch);
    return rows;
  }, [logs, period, messageSearch, phoneSearch]);

  const handleDelete = async (row: SmsLogRow) => {
    if (!window.confirm("Delete this SMS log entry?")) return;
    setDeletingId(row.id);
    const res = await deleteSmsLog(row.id);
    setDeletingId(null);
    if (!res.ok) {
      window.alert(res.error ?? "Delete failed");
      return;
    }
    if (res.account) onAccountUpdate(res.account);
    if (previewRow?.id === row.id) setPreviewRow(null);
  };

  return (
    <>
      <div className="space-y-5">
        <div>
          <h3 className="text-base font-extrabold text-slate-900">SMS Logs</h3>
          <p className="text-sm text-slate-500">View detailed SMS sending history</p>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
          <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
            <div className="flex items-start gap-2">
              <Filter className="mt-0.5 h-5 w-5 text-teal-600" />
              <div>
                <p className="font-bold text-slate-900">Filters</p>
                <p className="text-xs text-slate-500">
                  Filter SMS logs by date range and search criteria
                </p>
              </div>
            </div>
            <SmsLogPeriodFilter value={period} onChange={setPeriod} compact />
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-500">
                Search Message
              </span>
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <input
                  value={messageSearch}
                  onChange={(e) => setMessageSearch(e.target.value)}
                  placeholder="Search in message content..."
                  className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-teal-400"
                />
              </div>
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-semibold text-slate-500">
                Mobile Number
              </span>
              <input
                value={phoneSearch}
                onChange={(e) => setPhoneSearch(e.target.value)}
                placeholder="Filter by mobile number..."
                className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-teal-400"
              />
            </label>
          </div>
        </div>

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/80 text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  <th className="px-5 py-3">Date &amp; Time</th>
                  <th className="px-3 py-3">Mobile Number</th>
                  <th className="min-w-[240px] px-3 py-3">Message</th>
                  <th className="px-3 py-3 text-center">SMS Count</th>
                  <th className="px-3 py-3">Rate</th>
                  <th className="px-3 py-3">Total Cost</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-5 py-3 text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {loading ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center text-slate-400">
                      Loading…
                    </td>
                  </tr>
                ) : filtered.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-10 text-center text-slate-400">
                      No SMS logs found
                    </td>
                  </tr>
                ) : (
                  filtered.map((row) => {
                    const { date, time } = splitLogTime(row.sentAt);
                    const { rate, total } = smsLogTaka(row, smsPriceTaka);

                    return (
                      <tr
                        key={row.id}
                        className="border-b border-slate-100 transition hover:bg-teal-50/30"
                      >
                        <td className="whitespace-nowrap px-5 py-3">
                          <p className="text-xs font-semibold text-slate-700">{date}</p>
                          <p className="font-mono text-[11px] text-slate-400">{time}</p>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 font-mono text-xs font-bold text-slate-800">
                          {row.phone}
                        </td>
                        <td className="max-w-sm px-3 py-3">
                          <p className="text-sm text-slate-700">
                            {previewMessage(row.message)}
                          </p>
                          <p className="mt-0.5 text-[10px] font-semibold text-slate-400">
                            {row.type}
                          </p>
                          <button
                            type="button"
                            onClick={() => setPreviewRow(row)}
                            className="mt-1.5 inline-flex items-center gap-1 text-xs font-bold text-teal-700 hover:text-teal-800"
                          >
                            <Eye className="h-3.5 w-3.5" />
                            View full
                          </button>
                        </td>
                        <td className="px-3 py-3 text-center">
                          <span className="inline-flex h-7 min-w-[1.75rem] items-center justify-center rounded-full bg-slate-100 px-2 text-xs font-bold text-slate-700">
                            {row.cost > 0 ? row.cost : "—"}
                          </span>
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-xs font-semibold text-slate-600">
                          {formatSmsBdt(rate)}
                        </td>
                        <td className="whitespace-nowrap px-3 py-3 text-xs font-bold text-emerald-700">
                          {row.cost > 0 ? formatSmsBdt(total) : "—"}
                        </td>
                        <td className="px-3 py-3">
                          <span
                            className={clsx(
                              "inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ring-1",
                              STATUS_STYLE[row.status]
                            )}
                          >
                            {STATUS_LABEL[row.status]}
                          </span>
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button
                            type="button"
                            disabled={deletingId === row.id}
                            onClick={() => handleDelete(row)}
                            className="inline-flex h-8 w-8 items-center justify-center rounded-lg border border-rose-200 text-rose-600 transition hover:bg-rose-50 disabled:opacity-50"
                            aria-label="Delete log"
                          >
                            {deletingId === row.id ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              <Trash2 className="h-4 w-4" />
                            )}
                          </button>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <SmsLogPreviewModal
        open={Boolean(previewRow)}
        row={previewRow}
        smsPriceTaka={smsPriceTaka}
        onClose={() => setPreviewRow(null)}
      />
    </>
  );
}
