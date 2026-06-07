"use client";

import { useEffect, useState } from "react";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts";
import { buildHourlyOrdersChart } from "@/lib/dashboard-stats";
import { ChartClientOnly } from "./ChartClientOnly";

export function HourlyOrdersChart() {
  const [hourlyOrders, setHourlyOrders] = useState(buildHourlyOrdersChart);
  const hasData = hourlyOrders.some((h) => h.today > 0 || h.yesterday > 0);

  useEffect(() => {
    const refresh = () => setHourlyOrders(buildHourlyOrdersChart());
    refresh();
    window.addEventListener("youraiseller-data-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("youraiseller-data-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, []);

  return (
    <div className="yai-panel p-5">
      <h3 className="font-extrabold text-slate-900">Hourly Pulse</h3>
      <p className="mb-4 text-xs text-slate-500">Today vs Yesterday</p>
      {!hasData ? (
        <p className="flex h-[280px] items-center justify-center text-sm text-slate-500">
          No orders yet today or yesterday.
        </p>
      ) : (
        <ChartClientOnly>
          <div className="h-[280px] w-full min-w-0">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={hourlyOrders}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={3} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip />
                <Legend />
                <Area
                  type="monotone"
                  dataKey="today"
                  name="Today"
                  stroke="#5b4dff"
                  fill="#5b4dff"
                  fillOpacity={0.2}
                />
                <Area
                  type="monotone"
                  dataKey="yesterday"
                  name="Yesterday"
                  stroke="#94a3b8"
                  fill="#94a3b8"
                  fillOpacity={0.15}
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </ChartClientOnly>
      )}
    </div>
  );
}
