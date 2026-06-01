"use client";

import { useEffect, useState } from "react";
import {
  buildTopProducts,
  getOverviewDatePresetLabel,
  type OverviewDatePreset,
} from "@/lib/dashboard-stats";
import { DashboardDateDropdown } from "./DashboardDateDropdown";

export function TopProductsList() {
  const [datePreset, setDatePreset] = useState<OverviewDatePreset>("7d");
  const [topProducts, setTopProducts] = useState(() =>
    buildTopProducts(5, { datePreset: "7d" })
  );

  useEffect(() => {
    const refresh = () => setTopProducts(buildTopProducts(5, { datePreset }));
    refresh();
    window.addEventListener("youraiseller-data-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("youraiseller-data-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [datePreset]);

  const dateLabel = getOverviewDatePresetLabel(datePreset);

  return (
    <div className="yai-panel h-full p-5">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-extrabold text-slate-900">Top Movers</h3>
          <p className="text-xs text-slate-500">
            {topProducts.length > 0
              ? `Top ${topProducts.length} by volume · ${dateLabel}`
              : `From your orders · ${dateLabel}`}
          </p>
        </div>
        <DashboardDateDropdown value={datePreset} onChange={setDatePreset} />
      </div>
      {topProducts.length === 0 ? (
        <p className="py-10 text-center text-sm text-slate-500">
          No product sales for {dateLabel}.
        </p>
      ) : (
        <div className="space-y-3">
          {topProducts.map((p, i) => (
            <div key={p.name}>
              <div className="mb-1 flex justify-between gap-2 text-sm">
                <span className="min-w-0 font-medium text-slate-700">
                  {i + 1}. {p.name}
                </span>
                <span className="shrink-0 font-bold tabular-nums text-indigo-600">
                  {p.sales}
                </span>
              </div>
              <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-indigo-500 to-rose-400"
                  style={{ width: `${p.pct}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
