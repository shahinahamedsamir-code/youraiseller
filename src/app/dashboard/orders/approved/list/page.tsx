"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { OrderTable } from "@/components/orders/OrderTable";
import { getOrderStats, loadOrders } from "@/lib/orders-store";
import {
  ORDER_SOURCE_OPTIONS,
  countOrdersBySource,
  getOrderSourceLabel,
  type OrderSource,
} from "@/lib/order-source";
import { OrderSourceIcon } from "@/components/orders/OrderSourceIcon";
import { Plus, ClipboardList } from "lucide-react";

export default function OrderListPage() {
  const [tick, setTick] = useState(0);
  const stats = getOrderStats();

  useEffect(() => {
    const onData = () => setTick((t) => t + 1);
    window.addEventListener("youraiseller-data-updated", onData);
    return () => window.removeEventListener("youraiseller-data-updated", onData);
  }, []);

  const topSources = useMemo(() => {
    void tick;
    const counts = countOrdersBySource(loadOrders());
    return ORDER_SOURCE_OPTIONS.map((o) => ({
      ...o,
      count: counts[o.value] ?? 0,
    }))
      .filter((x) => x.count > 0)
      .sort((a, b) => b.count - a.count)
      .slice(0, 5);
  }, [tick]);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-slate-900">
            <ClipboardList className="h-7 w-7 text-indigo-500" />
            Order List
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            {stats.pending} pending · {stats.rts} RTS · {stats.delivered} delivered
            · ৳{stats.revenue.toLocaleString()} revenue
          </p>
          {topSources.length > 0 && (
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs font-bold text-slate-600">Top sources</span>
              {topSources.map((s) => (
                <span
                  key={s.value}
                  className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white py-1 pl-1 pr-2.5 text-xs font-semibold text-slate-700 shadow-sm"
                >
                  <OrderSourceIcon source={s.value as OrderSource} size="sm" />
                  {getOrderSourceLabel(s.value)} ({s.count})
                </span>
              ))}
            </div>
          )}
        </div>
        <Link
          href="/dashboard/orders/approved/new"
          className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-200 hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" /> New Order
        </Link>
      </div>
      <OrderTable mode="approved" showStatusTabs />
    </div>
  );
}
