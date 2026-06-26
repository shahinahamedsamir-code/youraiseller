"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import {
  ArchiveRestore,
  CalendarClock,
  Eye,
  FileJson,
  Filter,
  Search,
  ShieldAlert,
  Trash2,
  UserRound,
  X,
} from "lucide-react";
import {
  loadDeletionLogs,
  markDeletionLogRestored,
  permanentlyDeleteLog,
  type DeletionLogEntry,
  type DeletionLogModule,
} from "@/lib/deletion-logs-store";

const MODULES: ("all" | DeletionLogModule)[] = [
  "all",
  "orders",
  "products",
  "customers",
  "accounting",
  "delivery",
  "settings",
  "users",
  "other",
];

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusOf(entry: DeletionLogEntry): {
  label: string;
  className: string;
} {
  if (entry.permanentlyDeletedAt) {
    return {
      label: "Permanent",
      className: "bg-slate-100 text-slate-700 ring-slate-200",
    };
  }
  if (entry.restoredAt) {
    return {
      label: "Restored",
      className: "bg-emerald-50 text-emerald-700 ring-emerald-200",
    };
  }
  return {
    label: "Deleted",
    className: "bg-rose-50 text-rose-700 ring-rose-200",
  };
}

export default function DeletionLogsPage() {
  const [logs, setLogs] = useState<DeletionLogEntry[]>([]);
  const [query, setQuery] = useState("");
  const [module, setModule] = useState<"all" | DeletionLogModule>("all");
  const [selected, setSelected] = useState<DeletionLogEntry | null>(null);

  const refresh = () => setLogs(loadDeletionLogs());

  useEffect(() => {
    refresh();
    window.addEventListener("youraiseller-data-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("youraiseller-data-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return logs.filter((entry) => {
      if (module !== "all" && entry.module !== module) return false;
      if (!q) return true;
      return [
        entry.itemName,
        entry.itemId,
        entry.itemType,
        entry.deletedBy,
        entry.role,
        entry.reason,
        entry.module,
      ]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(q));
    });
  }, [logs, module, query]);

  const restorableCount = logs.filter(
    (entry) => entry.restorable && !entry.restoredAt && !entry.permanentlyDeletedAt
  ).length;

  const restoreSelected = () => {
    if (!selected) return;
    const updated = markDeletionLogRestored(selected.id);
    refresh();
    if (updated) setSelected(updated);
  };

  const permanentDeleteSelected = () => {
    if (!selected) return;
    if (!confirm(`Permanently clear snapshot for "${selected.itemName}"?`)) return;
    permanentlyDeleteLog(selected.id);
    refresh();
    setSelected(null);
  };

  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-2xl border border-rose-100 bg-white shadow-sm">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-rose-600 text-white shadow-md shadow-rose-200">
              <Trash2 className="h-6 w-6" />
            </span>
            <div>
              <p className="mb-1 flex items-center gap-1.5 text-xs font-extrabold uppercase text-rose-500">
                <ShieldAlert className="h-3.5 w-3.5" />
                Security and audit
              </p>
              <h1 className="text-2xl font-extrabold text-slate-950">
                Deletion Logs
              </h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                Review deleted records, inspect saved snapshots, and restore
                recoverable data when needed.
              </p>
            </div>
          </div>
          <div className="grid grid-cols-3 gap-2 text-center">
            <div className="rounded-xl border border-slate-200 px-4 py-3">
              <p className="text-xl font-extrabold text-slate-900">{logs.length}</p>
              <p className="text-[11px] font-bold uppercase text-slate-400">Total</p>
            </div>
            <div className="rounded-xl border border-rose-100 bg-rose-50 px-4 py-3">
              <p className="text-xl font-extrabold text-rose-700">{filtered.length}</p>
              <p className="text-[11px] font-bold uppercase text-rose-400">Shown</p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50 px-4 py-3">
              <p className="text-xl font-extrabold text-emerald-700">{restorableCount}</p>
              <p className="text-[11px] font-bold uppercase text-emerald-500">Restore</p>
            </div>
          </div>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
            <div className="relative min-w-[220px] flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search deleted item, ID, user, reason..."
                className="h-11 w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm outline-none transition focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
              />
            </div>
            <label className="flex h-11 items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-600">
              <Filter className="h-4 w-4 text-slate-400" />
              <select
                value={module}
                onChange={(e) => setModule(e.target.value as "all" | DeletionLogModule)}
                className="bg-transparent text-sm font-bold outline-none"
              >
                {MODULES.map((m) => (
                  <option key={m} value={m}>
                    {m === "all" ? "All modules" : m[0].toUpperCase() + m.slice(1)}
                  </option>
                ))}
              </select>
            </label>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[900px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-white text-left text-xs font-extrabold uppercase text-slate-500">
                <th className="px-5 py-3.5">Time</th>
                <th className="px-4 py-3.5">Module</th>
                <th className="px-4 py-3.5">Deleted Item</th>
                <th className="px-4 py-3.5">Deleted By</th>
                <th className="px-4 py-3.5">Reason</th>
                <th className="px-4 py-3.5">Status</th>
                <th className="px-4 py-3.5 text-right">Action</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((entry) => {
                const status = statusOf(entry);
                return (
                  <tr key={entry.id} className="border-b border-slate-100 transition hover:bg-rose-50/30">
                    <td className="px-5 py-4">
                      <div className="flex items-center gap-2 text-slate-600">
                        <CalendarClock className="h-4 w-4 text-slate-400" />
                        <span className="font-medium">{formatDate(entry.createdAt)}</span>
                      </div>
                    </td>
                    <td className="px-4 py-4">
                      <span className="rounded-full bg-slate-100 px-2.5 py-1 text-[11px] font-extrabold uppercase text-slate-700">
                        {entry.module}
                      </span>
                    </td>
                    <td className="px-4 py-4">
                      <p className="font-extrabold text-slate-900">{entry.itemName}</p>
                      <p className="text-xs text-slate-400">
                        {entry.itemType} | {entry.itemId}
                      </p>
                    </td>
                    <td className="px-4 py-4">
                      <div className="flex items-center gap-2">
                        <UserRound className="h-4 w-4 text-slate-400" />
                        <div>
                          <p className="font-bold text-slate-700">{entry.deletedBy}</p>
                          {entry.role && <p className="text-xs text-slate-400">{entry.role}</p>}
                        </div>
                      </div>
                    </td>
                    <td className="max-w-[220px] px-4 py-4 text-slate-600">
                      <p className="truncate">{entry.reason || "No reason added"}</p>
                    </td>
                    <td className="px-4 py-4">
                      <span className={clsx("rounded-full px-2.5 py-1 text-[11px] font-extrabold ring-1", status.className)}>
                        {status.label}
                      </span>
                    </td>
                    <td className="px-4 py-4 text-right">
                      <button
                        type="button"
                        onClick={() => setSelected(entry)}
                        className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 transition hover:border-rose-200 hover:text-rose-700"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        {filtered.length === 0 && (
          <div className="px-6 py-16 text-center">
            <div className="mx-auto mb-3 flex h-12 w-12 items-center justify-center rounded-2xl bg-rose-50 text-rose-500">
              <Trash2 className="h-6 w-6" />
            </div>
            <p className="font-extrabold text-slate-800">No deletion logs found</p>
            <p className="mt-1 text-sm text-slate-500">
              Deleted records will appear here after modules start writing audit entries.
            </p>
          </div>
        )}
      </div>

      {selected && (
        <div
          className="fixed inset-0 z-[80] flex justify-end bg-slate-950/40"
          onClick={() => setSelected(null)}
        >
          <aside
            className="h-full w-full max-w-xl overflow-y-auto bg-white p-5 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-5 flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-extrabold uppercase text-rose-500">Deleted item</p>
                <h2 className="mt-1 text-xl font-extrabold text-slate-950">
                  {selected.itemName}
                </h2>
                <p className="text-sm text-slate-500">
                  {selected.itemType} | {selected.itemId}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setSelected(null)}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
                aria-label="Close"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-bold uppercase text-slate-400">Deleted by</p>
                <p className="mt-1 font-extrabold text-slate-800">{selected.deletedBy}</p>
                <p className="text-xs text-slate-500">{selected.role || "Role not recorded"}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 p-4">
                <p className="text-xs font-bold uppercase text-slate-400">Deleted at</p>
                <p className="mt-1 font-extrabold text-slate-800">{formatDate(selected.createdAt)}</p>
              </div>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 p-4">
              <p className="text-xs font-bold uppercase text-slate-400">Reason</p>
              <p className="mt-1 text-sm text-slate-700">{selected.reason || "No reason added."}</p>
            </div>

            <div className="mt-4 rounded-2xl border border-slate-200 p-4">
              <div className="mb-3 flex items-center gap-2">
                <FileJson className="h-4 w-4 text-slate-400" />
                <p className="text-xs font-bold uppercase text-slate-400">Before delete snapshot</p>
              </div>
              <pre className="max-h-72 overflow-auto rounded-xl bg-slate-950 p-4 text-xs text-slate-100">
                {JSON.stringify(selected.snapshot ?? { message: "No snapshot saved" }, null, 2)}
              </pre>
            </div>

            <div className="mt-5 flex flex-wrap justify-end gap-2 border-t border-slate-100 pt-4">
              <button
                type="button"
                onClick={restoreSelected}
                disabled={!selected.restorable || !!selected.restoredAt || !!selected.permanentlyDeletedAt}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-emerald-200 bg-emerald-50 px-4 text-sm font-extrabold text-emerald-700 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <ArchiveRestore className="h-4 w-4" />
                Restore
              </button>
              <button
                type="button"
                onClick={permanentDeleteSelected}
                disabled={!!selected.permanentlyDeletedAt}
                className="inline-flex h-10 items-center gap-2 rounded-xl border border-rose-200 bg-rose-50 px-4 text-sm font-extrabold text-rose-700 disabled:cursor-not-allowed disabled:opacity-45"
              >
                <Trash2 className="h-4 w-4" />
                Permanent delete
              </button>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

