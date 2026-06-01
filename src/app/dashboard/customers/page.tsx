"use client";

import { useEffect, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { loadCustomers, syncCustomersFromOrderList, type SellerCustomer } from "@/lib/customers-store";
import { loadOrders } from "@/lib/orders-store";
import { UserPlus } from "lucide-react";
import { SearchField } from "@/components/ui/SearchField";

export default function CustomersPage() {
  const [customers, setCustomers] = useState<SellerCustomer[]>([]);
  const [search, setSearch] = useState("");

  useEffect(() => {
    const refresh = () => {
      let list = loadCustomers();
      if (list.length === 0 && loadOrders().length > 0) {
        list = syncCustomersFromOrderList(loadOrders());
      }
      setCustomers(list);
    };
    refresh();
    window.addEventListener("youraiseller-data-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("youraiseller-data-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  const q = search.trim().toLowerCase();
  const filtered = q
    ? customers.filter(
        (c) =>
          c.name.toLowerCase().includes(q) ||
          c.phone.includes(q) ||
          c.id.toLowerCase().includes(q)
      )
    : customers;

  return (
    <div className="max-w-full overflow-x-hidden">
      <PageHeader
        title="Customer"
        description="Your store customers — separate from other accounts"
        actions={
          <button
            type="button"
            className="flex items-center gap-2 rounded-xl bg-teal-500 px-4 py-2 text-sm font-semibold text-white"
          >
            <UserPlus className="h-4 w-4" /> Add Customer
          </button>
        }
      />
      <div className="mb-4 max-w-xl">
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder="Search by name, phone, or customer ID…"
        />
      </div>
      <div className="glass-card overflow-x-auto rounded-2xl">
        {filtered.length === 0 ? (
          <p className="px-6 py-14 text-center text-sm text-slate-500">
            {q
              ? "No customers match your search."
              : "No customers yet. They appear automatically when you create orders."}
          </p>
        ) : (
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-slate-50 text-left text-xs font-semibold uppercase text-slate-500">
                <th className="px-4 py-3">ID</th>
                <th className="px-4 py-3">Name</th>
                <th className="px-4 py-3">Phone</th>
                <th className="px-4 py-3">Orders</th>
                <th className="px-4 py-3">Total Spent</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((c) => (
                <tr key={c.phone} className="border-t border-slate-50 hover:bg-teal-50/20">
                  <td className="px-4 py-3 font-semibold text-teal-700">{c.id}</td>
                  <td className="px-4 py-3 font-medium">{c.name}</td>
                  <td className="px-4 py-3 font-mono text-xs">{c.phone}</td>
                  <td className="px-4 py-3">{c.orders}</td>
                  <td className="px-4 py-3 font-semibold">
                    ৳{c.spent.toLocaleString("en-BD")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}
