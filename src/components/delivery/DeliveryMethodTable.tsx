"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  loadDeliveryMethods,
  updateDeliveryMethod,
  deleteDeliveryMethod,
  DELIVERY_TYPE_LABELS,
  type DeliveryMethod,
  type DeliveryMethodType,
} from "@/lib/delivery-methods-store";
import { Search, Pencil, Trash2, Eye, EyeOff } from "lucide-react";
import clsx from "clsx";

export function DeliveryMethodTable() {
  const [methods, setMethods] = useState<DeliveryMethod[]>([]);
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive">(
    "all"
  );
  const [typeFilter, setTypeFilter] = useState<"all" | DeliveryMethodType>("all");

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

  const toggleActive = (m: DeliveryMethod) => {
    updateDeliveryMethod(m.id, { active: !m.active });
    refresh();
  };

  const togglePreferred = (m: DeliveryMethod) => {
    updateDeliveryMethod(m.id, { preferred: !m.preferred });
    refresh();
  };

  return (
    <div className="yai-panel overflow-hidden">
      <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 bg-slate-50/80 px-4 py-3">
        <div className="relative min-w-[200px] flex-1">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex w-9 items-center justify-center text-slate-400">
            <Search className="h-4 w-4 shrink-0" />
          </span>
          <input
            placeholder="Search delivery methods..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) =>
            setStatusFilter(e.target.value as "all" | "active" | "inactive")
          }
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold"
        >
          <option value="all">All Status</option>
          <option value="active">Active</option>
          <option value="inactive">Inactive</option>
        </select>
        <select
          value={typeFilter}
          onChange={(e) =>
            setTypeFilter(e.target.value as "all" | DeliveryMethodType)
          }
          className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold"
        >
          <option value="all">All Types</option>
          {(Object.keys(DELIVERY_TYPE_LABELS) as DeliveryMethodType[]).map(
            (t) => (
              <option key={t} value={t}>
                {DELIVERY_TYPE_LABELS[t]}
              </option>
            )
          )}
        </select>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-sm">
          <thead>
            <tr className="border-b border-slate-100 bg-white text-left text-xs font-bold uppercase text-slate-500">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Connected Businesses</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-center">Default</th>
              <th className="px-4 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {filtered.map((m) => (
              <tr
                key={m.id}
                className="border-b border-slate-50 hover:bg-indigo-50/30"
              >
                <td className="px-4 py-3 font-bold text-slate-800">{m.name}</td>
                <td className="px-4 py-3">
                  <span
                    className={clsx(
                      "rounded-md px-2 py-0.5 text-xs font-bold",
                      m.type === "steadfast"
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-sky-100 text-sky-800"
                    )}
                  >
                    {DELIVERY_TYPE_LABELS[m.type]}
                  </span>
                </td>
                <td className="px-4 py-3 text-slate-600">{m.connectedBusiness}</td>
                <td className="px-4 py-3">
                  <button
                    type="button"
                    onClick={() => toggleActive(m)}
                    className={clsx(
                      "rounded-full px-2.5 py-0.5 text-xs font-bold",
                      m.active
                        ? "bg-emerald-100 text-emerald-800"
                        : "bg-rose-100 text-rose-800"
                    )}
                  >
                    {m.active ? "Active" : "Inactive"}
                  </button>
                </td>
                <td className="px-4 py-3 text-center">
                  <button
                    type="button"
                    onClick={() => togglePreferred(m)}
                    className="text-slate-400 hover:text-indigo-600"
                    title={m.preferred ? "Default courier for new orders" : "Set as default"}
                  >
                    {m.preferred ? (
                      <Eye className="mx-auto h-4 w-4 text-indigo-600" />
                    ) : (
                      <EyeOff className="mx-auto h-4 w-4" />
                    )}
                  </button>
                </td>
                <td className="px-4 py-3">
                  <div className="flex justify-end gap-2">
                    <Link
                      href={`/dashboard/delivery/new?edit=${m.id}`}
                      className="flex items-center gap-1 rounded-lg border border-slate-200 px-2 py-1 text-xs font-semibold text-slate-600 hover:border-indigo-300"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </Link>
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm(`Delete "${m.name}"?`)) {
                          deleteDeliveryMethod(m.id);
                          refresh();
                        }
                      }}
                      className="rounded-lg border border-slate-200 p-1.5 text-slate-500 hover:text-rose-600"
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
