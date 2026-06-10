"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import {
  Crown,
  RefreshCw,
  Repeat,
  ShoppingBag,
  UserPlus,
  Users,
  Wallet,
  X,
} from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { SearchField } from "@/components/ui/SearchField";
import { CustomerOrderHistoryModal } from "@/components/orders/CustomerOrderHistoryModal";
import {
  addCustomer,
  loadCustomers,
  syncCustomersFromOrderList,
  type SellerCustomer,
} from "@/lib/customers-store";
import { loadOrders, type Order } from "@/lib/orders-store";
import { normalizePhone } from "@/lib/web-customer-stats";
import { formatBdt } from "@/lib/accounting-store";

type SortKey = "spent" | "orders" | "name";
type FilterKey = "all" | "repeat" | "top";

function customerInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "?";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] ?? ""}${parts[1][0] ?? ""}`.toUpperCase();
}

function ordersForCustomer(orders: Order[], phone: string): Order[] {
  const key = normalizePhone(phone);
  return orders.filter((o) => normalizePhone(o.phone) === key);
}

export function CustomersPanel() {
  const [customers, setCustomers] = useState<SellerCustomer[]>([]);
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [sort, setSort] = useState<SortKey>("spent");
  const [filter, setFilter] = useState<FilterKey>("all");
  const [selected, setSelected] = useState<SellerCustomer | null>(null);
  const [addOpen, setAddOpen] = useState(false);
  const [addName, setAddName] = useState("");
  const [addPhone, setAddPhone] = useState("");
  const [addEmail, setAddEmail] = useState("");
  const [addAddress, setAddAddress] = useState("");
  const [addDistrict, setAddDistrict] = useState("");
  const [addError, setAddError] = useState("");
  const [syncing, setSyncing] = useState(false);

  const refresh = useCallback(() => {
    let list = loadCustomers();
    const orderList = loadOrders();
    if (list.length === 0 && orderList.length > 0) {
      list = syncCustomersFromOrderList(orderList);
    }
    setCustomers(list);
    setOrders(orderList);
  }, []);

  useEffect(() => {
    refresh();
    window.addEventListener("youraiseller-data-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("youraiseller-data-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refresh]);

  const stats = useMemo(() => {
    const totalOrders = customers.reduce((s, c) => s + c.orders, 0);
    const totalSpent = customers.reduce((s, c) => s + c.spent, 0);
    const repeat = customers.filter((c) => c.orders >= 2).length;
    return {
      count: customers.length,
      totalOrders,
      totalSpent,
      repeat,
      avgSpent: customers.length ? totalSpent / customers.length : 0,
    };
  }, [customers]);

  const topSpentThreshold = useMemo(() => {
    if (customers.length < 3) return 0;
    const sorted = [...customers].sort((a, b) => b.spent - a.spent);
    const idx = Math.max(0, Math.floor(sorted.length * 0.2) - 1);
    return sorted[idx]?.spent ?? 0;
  }, [customers]);

  const q = search.trim().toLowerCase();
  const filtered = useMemo(() => {
    let list = customers;
    if (q) {
      list = list.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          c.id.toLowerCase().includes(q) ||
          (c.address?.toLowerCase().includes(q) ?? false) ||
          (c.district?.toLowerCase().includes(q) ?? false)
      );
    }
    if (filter === "repeat") list = list.filter((c) => c.orders >= 2);
    if (filter === "top") list = list.filter((c) => c.spent >= topSpentThreshold && c.spent > 0);

    return [...list].sort((a, b) => {
      if (sort === "name") return a.name.localeCompare(b.name);
      if (sort === "orders") return b.orders - a.orders || b.spent - a.spent;
      return b.spent - a.spent || b.orders - a.orders;
    });
  }, [customers, q, filter, sort, topSpentThreshold]);

  const handleSync = () => {
    setSyncing(true);
    try {
      syncCustomersFromOrderList(loadOrders());
      refresh();
    } finally {
      setSyncing(false);
    }
  };

  const handleAdd = () => {
    setAddError("");
    try {
      addCustomer({
        name: addName,
        phone: addPhone,
        email: addEmail || undefined,
        address: addAddress || undefined,
        district: addDistrict || undefined,
      });
      setAddOpen(false);
      setAddName("");
      setAddPhone("");
      setAddEmail("");
      setAddAddress("");
      setAddDistrict("");
      refresh();
    } catch (e) {
      setAddError(e instanceof Error ? e.message : "Could not add customer.");
    }
  };

  const selectedOrders = selected ? ordersForCustomer(orders, selected.phone) : [];

  const filters: { id: FilterKey; label: string; icon?: typeof Users }[] = [
    { id: "all", label: "All" },
    { id: "repeat", label: "Repeat", icon: Repeat },
    { id: "top", label: "Top Spenders", icon: Crown },
  ];

  return (
    <div className="max-w-full overflow-x-hidden">
      <PageHeader
        title="Customers"
        description="Track who buys from you, how often, and how much they spend"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 disabled:opacity-60"
            >
              <RefreshCw className={clsx("h-4 w-4", syncing && "animate-spin")} />
              Sync from orders
            </button>
            <button
              type="button"
              onClick={() => setAddOpen(true)}
              className="flex items-center gap-2 rounded-xl bg-teal-500 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-teal-600"
            >
              <UserPlus className="h-4 w-4" /> Add Customer
            </button>
          </div>
        }
      />

      <div className="mb-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="glass-card rounded-2xl p-4">
          <Users className="mb-2 h-5 w-5 text-teal-600" />
          <p className="text-sm text-slate-500">Total Customers</p>
          <p className="text-2xl font-bold text-slate-900">{stats.count}</p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <ShoppingBag className="mb-2 h-5 w-5 text-indigo-600" />
          <p className="text-sm text-slate-500">Total Orders</p>
          <p className="text-2xl font-bold text-indigo-700">{stats.totalOrders}</p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <Wallet className="mb-2 h-5 w-5 text-emerald-600" />
          <p className="text-sm text-slate-500">Total Spent</p>
          <p className="text-2xl font-bold text-emerald-700">{formatBdt(stats.totalSpent)}</p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <Repeat className="mb-2 h-5 w-5 text-amber-600" />
          <p className="text-sm text-slate-500">Repeat Customers</p>
          <p className="text-2xl font-bold text-amber-700">{stats.repeat}</p>
          <p className="mt-1 text-xs text-slate-500">2+ orders</p>
        </div>
      </div>

      <div className="mb-4 flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
        <div className="max-w-xl flex-1">
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Search by name, phone, address, or customer ID…"
          />
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {filters.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setFilter(f.id)}
              className={clsx(
                "inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition",
                filter === f.id
                  ? "bg-teal-500 text-white"
                  : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
              )}
            >
              {f.icon && <f.icon className="h-3.5 w-3.5" />}
              {f.label}
            </button>
          ))}
          <select
            value={sort}
            onChange={(e) => setSort(e.target.value as SortKey)}
            className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700"
          >
            <option value="spent">Sort: Highest spent</option>
            <option value="orders">Sort: Most orders</option>
            <option value="name">Sort: Name A–Z</option>
          </select>
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        {filtered.length === 0 ? (
          <p className="px-6 py-14 text-center text-sm text-slate-500">
            {q || filter !== "all"
              ? "No customers match your search or filter."
              : "No customers yet. They appear automatically when you create orders."}
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full min-w-[900px] text-sm">
              <thead>
                <tr className="bg-gradient-to-r from-teal-600 to-teal-500 text-left text-xs font-bold uppercase tracking-wide text-white">
                  <th className="px-4 py-3.5">Customer</th>
                  <th className="px-4 py-3.5">Phone</th>
                  <th className="px-4 py-3.5">Address</th>
                  <th className="px-4 py-3.5">Orders</th>
                  <th className="px-4 py-3.5">Total Spent</th>
                  <th className="px-4 py-3.5">Avg / Order</th>
                  <th className="px-4 py-3.5">Type</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((c) => {
                  const avg = c.orders > 0 ? c.spent / c.orders : 0;
                  const isRepeat = c.orders >= 2;
                  const isTop = c.spent >= topSpentThreshold && c.spent > 0;
                  return (
                    <tr
                      key={c.phone}
                      onClick={() => setSelected(c)}
                      className="cursor-pointer border-t border-slate-100 transition hover:bg-teal-50/40"
                    >
                      <td className="px-4 py-3.5">
                        <div className="flex items-center gap-3">
                          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-teal-100 text-sm font-bold text-teal-700">
                            {customerInitials(c.name)}
                          </span>
                          <div className="min-w-0">
                            <p className="truncate font-semibold text-slate-900">{c.name}</p>
                            <p className="text-xs font-medium text-teal-700">{c.id}</p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3.5 font-mono text-xs text-slate-700">{c.phone}</td>
                      <td className="max-w-[220px] px-4 py-3.5 text-slate-600">
                        {c.address ? (
                          <div className="min-w-0">
                            <p className="line-clamp-2 text-xs leading-snug">{c.address}</p>
                            {c.district && (
                              <p className="mt-0.5 text-[10px] font-semibold uppercase tracking-wide text-slate-400">
                                {c.district}
                              </p>
                            )}
                          </div>
                        ) : (
                          <span className="text-xs text-slate-400">—</span>
                        )}
                      </td>
                      <td className="px-4 py-3.5 font-semibold text-slate-800">{c.orders}</td>
                      <td className="px-4 py-3.5 font-bold text-emerald-700">
                        {formatBdt(c.spent)}
                      </td>
                      <td className="px-4 py-3.5 text-slate-600">{formatBdt(avg)}</td>
                      <td className="px-4 py-3.5">
                        <div className="flex flex-wrap gap-1">
                          {isTop && (
                            <span className="rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-800">
                              Top
                            </span>
                          )}
                          {isRepeat ? (
                            <span className="rounded-full bg-indigo-100 px-2 py-0.5 text-[10px] font-bold uppercase text-indigo-700">
                              Repeat
                            </span>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-bold uppercase text-slate-600">
                              New
                            </span>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <p className="mt-3 text-xs text-slate-500">
        Showing {filtered.length} of {customers.length} customers · Avg spent{" "}
        {formatBdt(stats.avgSpent)} per customer
      </p>

      <CustomerOrderHistoryModal
        open={selected != null}
        onClose={() => setSelected(null)}
        title={selected?.name ?? "Customer"}
        subtitle={
          selected
            ? [
                selected.phone,
                selected.address
                  ? `${selected.address}${selected.district ? `, ${selected.district}` : ""}`
                  : null,
                `${selected.orders} orders`,
              ]
                .filter(Boolean)
                .join(" · ")
            : ""
        }
        orders={selectedOrders}
      />

      {addOpen && (
        <div
          className="fixed inset-0 z-[70] flex items-center justify-center bg-slate-950/40 p-4"
          onClick={() => setAddOpen(false)}
        >
          <div
            className="w-full max-w-md rounded-2xl bg-white p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-4 flex items-center justify-between gap-3">
              <h3 className="text-lg font-bold text-slate-900">Add Customer</h3>
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"
                aria-label="Close"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="space-y-3">
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                  Name
                </label>
                <input
                  value={addName}
                  onChange={(e) => setAddName(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Customer name"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                  Phone
                </label>
                <input
                  value={addPhone}
                  onChange={(e) => setAddPhone(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm font-mono"
                  placeholder="01XXXXXXXXX"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                  Email (optional)
                </label>
                <input
                  type="email"
                  value={addEmail}
                  onChange={(e) => setAddEmail(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  placeholder="email@example.com"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                  Address
                </label>
                <textarea
                  value={addAddress}
                  onChange={(e) => setAddAddress(e.target.value)}
                  rows={2}
                  className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  placeholder="Full delivery address"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                  District (optional)
                </label>
                <input
                  value={addDistrict}
                  onChange={(e) => setAddDistrict(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                  placeholder="e.g. Dhaka, Chattogram"
                />
              </div>
              {addError && <p className="text-sm text-rose-600">{addError}</p>}
            </div>
            <div className="mt-5 flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setAddOpen(false)}
                className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAdd}
                className="rounded-xl bg-teal-500 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-600"
              >
                Save Customer
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
