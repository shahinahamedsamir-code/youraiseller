"use client";

import { useEffect, useState } from "react";
import { BarChart3, PieChart, Table2 } from "lucide-react";
import { DonutChart, DonutCenter } from "./DonutChart";
import { DashboardDateDropdown } from "./DashboardDateDropdown";
import {
  buildOrdersBySource,
  buildOrdersBySourceTable,
  type OverviewDatePreset,
} from "@/lib/dashboard-stats";
import clsx from "clsx";
import { ORDER_SOURCES_UPDATED } from "@/lib/order-source-store";

export function OrdersBySource() {
  const [view, setView] = useState<"chart" | "table">("chart");
  const [datePreset, setDatePreset] = useState<OverviewDatePreset>("today");
  const [ordersBySource, setOrdersBySource] = useState(
    () => buildOrdersBySource({ datePreset: "today" }).rows
  );
  const [ordersBySourceTable, setOrdersBySourceTable] = useState(() =>
    buildOrdersBySourceTable(buildOrdersBySource({ datePreset: "today" }).rows)
  );
  const [dateLabel, setDateLabel] = useState("Today");

  useEffect(() => {
    const refresh = () => {
      const result = buildOrdersBySource({ datePreset });
      setOrdersBySource(result.rows);
      setOrdersBySourceTable(buildOrdersBySourceTable(result.rows));
      setDateLabel(result.dateLabel);
    };
    refresh();
    window.addEventListener("youraiseller-data-updated", refresh);
    window.addEventListener("storage", refresh);
    window.addEventListener(ORDER_SOURCES_UPDATED, refresh);
    return () => {
      window.removeEventListener("youraiseller-data-updated", refresh);
      window.removeEventListener("storage", refresh);
      window.removeEventListener(ORDER_SOURCES_UPDATED, refresh);
    };
  }, [datePreset]);

  const chartData = ordersBySource.map((s) => ({
    name: s.name,
    value: s.orders,
    color: s.color,
  }));

  const totalOrders = ordersBySource.reduce((s, d) => s + d.orders, 0);
  const totalValue = ordersBySource.reduce((s, d) => s + d.amount, 0);

  return (
    <div className="group relative flex h-full min-h-[360px] flex-col overflow-hidden rounded-2xl border border-cyan-100/80 bg-gradient-to-br from-white via-white to-cyan-50/40 p-5 shadow-sm ring-1 ring-cyan-100/60 transition hover:shadow-md">
      <div className="pointer-events-none absolute -left-8 -top-8 h-28 w-28 rounded-full bg-cyan-200/30 blur-3xl" />

      <div className="relative mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 text-white shadow-lg shadow-cyan-200">
            <PieChart className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Order Source Channel</h3>
            <p className="text-xs text-slate-500">Orders by channel · {dateLabel}</p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <DashboardDateDropdown
            value={datePreset}
            onChange={setDatePreset}
            accent="cyan"
          />
          <div className="flex rounded-xl bg-slate-100/80 p-0.5 ring-1 ring-slate-200/60">
            {(
              [
                { id: "chart" as const, icon: BarChart3, label: "Chart" },
                { id: "table" as const, icon: Table2, label: "Table" },
              ] as const
            ).map(({ id, icon: Icon, label }) => (
              <button
                key={id}
                type="button"
                onClick={() => setView(id)}
                className={clsx(
                  "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition",
                  view === id
                    ? "bg-gradient-to-r from-cyan-600 to-teal-600 text-white shadow-sm"
                    : "text-slate-500 hover:text-slate-800"
                )}
              >
                <Icon className="h-3.5 w-3.5" />
                {label}
              </button>
            ))}
          </div>
        </div>
      </div>

      {totalOrders === 0 ? (
        <p className="relative flex flex-1 flex-col items-center justify-center gap-1 py-10 text-center text-sm text-slate-500">
          <span>
            No orders for <strong className="text-slate-700">{dateLabel}</strong>.
          </span>
          <span className="text-xs">Create orders to see source breakdown.</span>
        </p>
      ) : view === "chart" ? (
        <>
          <DonutChart
            data={chartData}
            innerRadius={52}
            outerRadius={82}
            centerLabel={
              <DonutCenter
                label="Orders"
                value={totalOrders}
                hint={dateLabel}
                valueClassName="text-3xl"
              />
            }
          />
          <p className="relative -mt-1 mb-2 text-center text-xs text-slate-500">
            Total value{" "}
            <span className="font-bold text-teal-600">
              ৳{totalValue.toLocaleString("en-BD")}
            </span>
          </p>
          <div className="relative space-y-2">
            {ordersBySource.map((s) => (
              <div
                key={s.name}
                className="flex flex-col gap-1 rounded-xl border border-white/80 bg-white/70 px-3 py-2.5 text-xs backdrop-blur-sm sm:flex-row sm:items-center sm:justify-between sm:gap-3 sm:text-sm"
              >
                <div className="flex min-w-0 items-center gap-2.5">
                  <span
                    className="h-3 w-3 shrink-0 rounded-full ring-2 ring-white"
                    style={{ backgroundColor: s.color }}
                  />
                  <span className="font-semibold text-slate-800">{s.name}</span>
                </div>
                <div className="flex shrink-0 items-center gap-2 pl-5 sm:pl-0">
                  <span className="font-bold tabular-nums text-slate-900">{s.orders}</span>
                  <span className="text-slate-400">orders</span>
                  <span className="text-slate-300">·</span>
                  <span className="font-bold tabular-nums text-teal-600">
                    ৳{s.amount.toLocaleString("en-BD")}
                  </span>
                </div>
              </div>
            ))}
          </div>
        </>
      ) : (
        <div className="relative overflow-hidden rounded-xl border border-slate-100 bg-white/80">
          <table className="w-full text-sm">
            <thead>
              <tr className="bg-gradient-to-r from-slate-50 to-cyan-50/50 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Orders</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Share</th>
              </tr>
            </thead>
            <tbody>
              {ordersBySourceTable.map((row, i) => (
                <tr
                  key={row.source}
                  className={clsx(
                    "border-t border-slate-100 transition hover:bg-cyan-50/40",
                    i % 2 === 1 && "bg-slate-50/40"
                  )}
                >
                  <td className="px-4 py-3 font-semibold text-slate-800">
                    {row.source}
                  </td>
                  <td className="px-4 py-3">{row.orders}</td>
                  <td className="px-4 py-3 font-semibold text-teal-600">{row.amount}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-cyan-100 px-2 py-0.5 text-xs font-bold text-cyan-800">
                      {row.share}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
