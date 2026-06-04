"use client";

import { useMemo, useState } from "react";
import { Download, FileSpreadsheet, Search } from "lucide-react";
import { SmsLogPeriodFilter } from "@/components/integration/sms/SmsLogPeriodFilter";
import {
  buildSmsLogsCsv,
  downloadSmsLogsCsv,
  filterLogsByPeriod,
  filterLogsBySearch,
  formatPeriodLabel,
  type SmsLogPeriod,
} from "@/lib/sms-log-analytics";
import type { SmsLogRow } from "@/lib/sms-types";

type Props = {
  logs: SmsLogRow[];
  smsPriceTaka: number;
};

export function SmsLogExportTab({ logs, smsPriceTaka }: Props) {
  const [period, setPeriod] = useState<SmsLogPeriod>("today");
  const [messageSearch, setMessageSearch] = useState("");
  const [phoneSearch, setPhoneSearch] = useState("");

  const exportRows = useMemo(() => {
    let rows = filterLogsByPeriod(logs, period);
    rows = filterLogsBySearch(rows, messageSearch, phoneSearch);
    return rows;
  }, [logs, period, messageSearch, phoneSearch]);

  const filtersLabel =
    messageSearch.trim() || phoneSearch.trim()
      ? [messageSearch.trim() && `Message: "${messageSearch.trim()}"`, phoneSearch.trim() && `Phone: ${phoneSearch.trim()}`]
          .filter(Boolean)
          .join(" · ")
      : "None";

  const handleExport = () => {
    const csv = buildSmsLogsCsv(exportRows, smsPriceTaka, 1000);
    const stamp = new Date().toISOString().slice(0, 10);
    downloadSmsLogsCsv(csv, `sms-logs-${stamp}.csv`);
  };

  return (
    <div className="space-y-5">
      <div>
        <h3 className="text-base font-extrabold text-slate-900">Export SMS Logs</h3>
        <p className="text-sm text-slate-500">Export SMS logs to CSV format</p>
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <FileSpreadsheet className="mt-0.5 h-5 w-5 text-teal-600" />
            <div>
              <p className="font-bold text-slate-900">Export Options</p>
              <p className="text-xs text-slate-500">Choose date range and filters</p>
            </div>
          </div>
          <SmsLogPeriodFilter value={period} onChange={setPeriod} compact />
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-500">
              Search Message (Optional)
            </span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={messageSearch}
                onChange={(e) => setMessageSearch(e.target.value)}
                placeholder="Filter by message content..."
                className="w-full rounded-xl border border-slate-200 py-2.5 pl-9 pr-3 text-sm outline-none focus:border-teal-400"
              />
            </div>
          </label>
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-500">
              Mobile Number (Optional)
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

      <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-4 text-sm text-slate-600 sm:px-5">
        <p className="font-bold text-slate-800">Export Information</p>
        <ul className="mt-3 list-disc space-y-1.5 pl-5 text-xs leading-relaxed">
          <li>
            CSV columns: Date, Time, Mobile Number, Message, SMS Count, Rate, Total
            Cost, Status, Type
          </li>
          <li>Maximum 1000 records per export</li>
          <li>Selected date range: {formatPeriodLabel(period)}</li>
          <li>Applied filters: {filtersLabel}</li>
          <li>Records to export: {Math.min(exportRows.length, 1000)}</li>
        </ul>
      </div>

      <button
        type="button"
        onClick={handleExport}
        disabled={exportRows.length === 0}
        className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-cyan-500 px-6 py-3.5 text-sm font-extrabold text-white shadow-lg shadow-teal-200/50 transition hover:brightness-105 disabled:opacity-50 sm:w-auto"
      >
        <Download className="h-4 w-4" />
        Export SMS Logs to CSV
      </button>
    </div>
  );
}
