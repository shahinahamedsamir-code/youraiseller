"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { TablePagination, paginateSlice, DEFAULT_ROWS_PER_PAGE } from "@/components/ui/TablePagination";
import {
  loadDeliveryMethods,
  updateDeliveryMethod,
  deleteDeliveryMethod,
  DELIVERY_TYPE_LABELS,
  type DeliveryMethod,
  type DeliveryMethodType,
} from "@/lib/delivery-methods-store";
import {
  Boxes,
  CheckCircle2,
  CircleSlash,
  Eye,
  EyeOff,
  Pencil,
  PlugZap,
  Search,
  ShieldCheck,
  Trash2,
  Truck,
} from "lucide-react";
import clsx from "clsx";

const typeStyles: Record<DeliveryMethodType, string> = {
  steadfast: "bg-emerald-50 text-emerald-700 ring-emerald-200",
  pathao: "bg-sky-50 text-sky-700 ring-sky-200",
  carrybee: "bg-amber-50 text-amber-800 ring-amber-200",
  redx: "bg-red-50 text-red-700 ring-red-200",
  paperfly: "bg-blue-50 text-blue-700 ring-blue-200",
  ecourier: "bg-cyan-50 text-cyan-700 ring-cyan-200",
  others: "bg-slate-100 text-slate-700 ring-slate-200",
};

function isApiMethod(m: DeliveryMethod) {
  return ["steadfast", "pathao", "carrybee", "redx", "paperfly"].includes(m.type);
}

export function DeliveryMethodTable() {
  const [methods, setMethods] = useState<DeliveryMethod[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">(
    "all"
  );
  const [typeFilter, setTypeFilter] = useState<"all" | DeliveryMethodType>("all");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE);

  const refresh = () => setMethods(loadDeliveryMethods());

  useEffect(() => {
    refresh();
  }, []);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return methods.filter((m) => {
      if (statusFilter === "active" && !m.active) return false;
      if (statusFilter === "inactive" && m.active) return false;
      if (typeFilter !== "all" && m.type !== typeFilter) return false;
      if (q && !m.name.toLowerCase().includes(q)) return false;
      return true;
    });
  }, [methods, search, statusFilter, typeFilter]);

  const pagedMethods = paginateSlice(filtered, page, rowsPerPage);
  const activeCount = methods.filter((m) => m.active).length;
  const apiCount = methods.filter(isApiMethod).length;
  const preferredMethod = methods.find((m) => m.preferred);

  const toggleActive = (m: DeliveryMethod) => {
    updateDeliveryMethod(m.id, { active: !m.active });
    refresh();
  };

  const togglePreferred = (m: DeliveryMethod) => {
    updateDeliveryMethod(m.id, { preferred: !m.preferred });
    refresh();
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="grid gap-px bg-slate-100 sm:grid-cols-3">
        <div className="bg-white px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600">
              <Truck className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase text-slate-400">Total methods</p>
              <p className="text-2xl font-extrabold text-slate-900">{methods.length}</p>
            </div>
          </div>
        </div>
        <div className="bg-white px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-50 text-emerald-600">
              <CheckCircle2 className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase text-slate-400">Active</p>
              <p className="text-2xl font-extrabold text-slate-900">{activeCount}</p>
            </div>
          </div>
        </div>
        <div className="bg-white px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-50 text-teal-600">
              <PlugZap className="h-5 w-5" />
            </span>
            <div>
              <p className="text-xs font-bold uppercase text-slate-400">API couriers</p>
              <p className="text-2xl font-extrabold text-slate-900">{apiCount}</p>
            </div>
          </div>
        </div>
      </div>

      <div className="border-b border-slate-100 bg-slate-50/70 px-4 py-4">
        <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
          <div className="relative min-w-[220px] flex-1">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center text-slate-400">
              <Search className="h-4 w-4 shrink-0" />
            </span>
            <input
              placeholder="Search by courier name..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
              className="h-11 w-full rounded-xl border border-slate-200 bg-white py-2 pl-10 pr-3 text-sm outline-none transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {(["all", "active", "inactive"] as const).map((status) => (
              <button
                key={status}
                type="button"
                onClick={() => {
                  setStatusFilter(status);
                  setPage(1);
                }}
                className={clsx(
                  "rounded-full px-3 py-2 text-xs font-extrabold capitalize transition",
                  statusFilter === status
                    ? "bg-indigo-600 text-white shadow-sm"
                    : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
                )}
              >
                {status === "all" ? "All status" : status}
              </button>
            ))}
            <select
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value as "all" | DeliveryMethodType);
                setPage(1);
              }}
              className="h-10 rounded-full border border-slate-200 bg-white px-3 text-xs font-extrabold text-slate-700 outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            >
              <option value="all">All types</option>
              {(Object.keys(DELIVERY_TYPE_LABELS) as DeliveryMethodType[]).map(
                (t) => (
                  <option key={t} value={t}>
                    {DELIVERY_TYPE_LABELS[t]}
                  </option>
                )
              )}
            </select>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap items-center gap-2 text-xs text-slate-500">
          <ShieldCheck className="h-3.5 w-3.5 text-indigo-500" />
          <span>
            Default courier:{" "}
            <strong className="text-slate-800">{preferredMethod?.name ?? "Not selected"}</strong>
          </span>
          <span className="hidden sm:inline">|</span>
          <span>{filtered.length} method{filtered.length === 1 ? "" : "s"} in this view</span>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-white text-left text-xs font-extrabold uppercase text-slate-500">
              <th className="px-5 py-3.5">Method</th>
              <th className="px-4 py-3.5">Type</th>
              <th className="px-4 py-3.5">Business</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3.5 text-center">Default</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {pagedMethods.map((m) => (
              <tr
                key={m.id}
                className="border-b border-slate-100 transition hover:bg-indigo-50/30"
              >
                <td className="px-5 py-4">
                  <div className="flex items-center gap-3">
                    <span className={clsx(
                      "flex h-10 w-10 items-center justify-center rounded-xl ring-1",
                      typeStyles[m.type]
                    )}>
                      {isApiMethod(m) ? <PlugZap className="h-5 w-5" /> : <Boxes className="h-5 w-5" />}
                    </span>
                    <div>
                      <p className="font-extrabold text-slate-900">{m.name}</p>
                      <p className="text-xs font-medium text-slate-400">
                        {isApiMethod(m) ? "API connected method" : "Manual method"}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span
                    className={clsx(
                      "inline-flex rounded-full px-2.5 py-1 text-[11px] font-extrabold ring-1",
                      typeStyles[m.type]
                    )}
                  >
                    {DELIVERY_TYPE_LABELS[m.type]}
                  </span>
                </td>
                <td className="px-4 py-3 font-medium text-slate-600">{m.connectedBusiness}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => toggleActive(m)}
                    className={clsx(
                      "inline-flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-extrabold transition",
                      m.active
                        ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100"
                        : "bg-rose-50 text-rose-700 ring-1 ring-rose-200 hover:bg-rose-100"
                    )}
                  >
                    {m.active ? <CheckCircle2 className="h-3.5 w-3.5" /> : <CircleSlash className="h-3.5 w-3.5" />}
                    {m.active ? "Active" : "Inactive"}
                  </button>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    type="button"
                    onClick={() => togglePreferred(m)}
                    className={clsx(
                      "inline-flex h-9 w-9 items-center justify-center rounded-xl border transition",
                      m.preferred
                        ? "border-indigo-200 bg-indigo-50 text-indigo-600"
                        : "border-slate-200 bg-white text-slate-400 hover:border-indigo-200 hover:text-indigo-600"
                    )}
                    title={m.preferred ? "Default courier for new orders" : "Set as default"}
                  >
                    {m.preferred ? (
                      <Eye className="h-4 w-4" />
                    ) : (
                      <EyeOff className="h-4 w-4" />
                    )}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Link
                      href={`/dashboard/delivery/new?edit=${m.id}`}
                      className="inline-flex h-9 items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 transition hover:border-indigo-300 hover:text-indigo-700"
                    >
                      <Pencil className="h-3.5 w-3.5" />
                      Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Delete "${m.name}"?`)) {
                          deleteDeliveryMethod(m.id);
                          refresh();
                        }
                      }}
                      className="inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-500 transition hover:border-rose-200 hover:bg-rose-50 hover:text-rose-600"
                      aria-label={`Delete ${m.name}`}
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <TablePagination
        totalRows={filtered.length}
        page={page}
        rowsPerPage={rowsPerPage}
        onPageChange={setPage}
        onRowsPerPageChange={(n) => { setRowsPerPage(n); setPage(1); }}
      />

      {filtered.length === 0 && (
        <p className="p-10 text-center text-sm text-slate-500">
          No delivery methods.{" "}
          <Link
            href="/dashboard/delivery/new"
            className="font-semibold text-indigo-600 hover:underline"
          >
            Add your first method
          </Link>
        </p>
      )}
    </div>
  );
}
