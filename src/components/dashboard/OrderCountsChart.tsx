"use client";

import { useEffect, useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import {
  buildOrderCountsRecent,
  getOverviewDatePresetLabel,
  type OverviewDatePreset,
} from "@/lib/dashboard-stats";
import { ChartClientOnly } from "./ChartClientOnly";
import { DashboardDateDropdown } from "./DashboardDateDropdown";

export function OrderCountsChart() {
  const [datePreset, setDatePreset] = useState<OverviewDatePreset>("7d");
  const [orderCounts, setOrderCounts] = useState(() =>
    buildOrderCountsRecent({ datePreset: "7d" })
  );

  useEffect(() => {
    const refresh = () =>
      setOrderCounts(buildOrderCountsRecent({ datePreset }));
    refresh();
    window.addEventListener("youraiseller-data-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("youraiseller-data-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [datePreset]);

  const created = orderCounts.reduce((s, d) => s + d.created, 0);
  const courier = orderCounts.reduce((s, d) => s + d.courier, 0);
  const dayCount = orderCounts.length;
  const dateLabel = getOverviewDatePresetLabel(datePreset);
  const hasData = created > 0 || courier > 0;

  return (
    <div className="yai-panel h-full p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-extrabold text-slate-900">Daily Velocity</h3>
          <p className="text-xs text-slate-500">
            Created vs courier · {dateLabel}
            {dayCount > 0 && (
              <span className="text-slate-400">
                {" "}
                · {dayCount} day{dayCount === 1 ? "" : "s"}
              </span>
            )}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <span>
            <strong className="text-indigo-600">Created:</strong> {created}
          </span>
          <span>
            <strong className="text-rose-500">Courier:</strong> {courier}
          </span>
          <DashboardDateDropdown value={datePreset} onChange={setDatePreset} />
        </div>
      </div>
      {!hasData ? (
        <p className="flex h-[280px] items-center justify-center text-sm text-slate-500">
          No orders for {dateLabel}.
        </p>
      ) : (
        <ChartClientOnly>
          <div className="h-[280px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={orderCounts}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="day" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                <Tooltip />
                <Legend />
                <Bar dataKey="created" name="Created" fill="#5b4dff" radius={[6, 6, 0, 0]} />
                <Bar dataKey="courier" name="Courier" fill="#ff5c7a" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </ChartClientOnly>
      )}
    </div>
  );
}
