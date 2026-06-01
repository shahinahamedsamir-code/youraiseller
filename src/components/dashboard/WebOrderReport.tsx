"use client";

import { useEffect, useState } from "react";
import { GitBranch } from "lucide-react";
import { DonutChart, DonutCenter } from "./DonutChart";
import { DashboardDateDropdown } from "./DashboardDateDropdown";
import {
  buildWebOrderPipeline,
  type OverviewDatePreset,
} from "@/lib/dashboard-stats";
import clsx from "clsx";

const tabs = [
  { id: "web" as const, label: "Web Orders" },
  { id: "incomplete" as const, label: "Incomplete Orders" },
];

export function WebOrderReport() {
  const [activeTab, setActiveTab] = useState<"web" | "incomplete">("web");
  const [datePreset, setDatePreset] = useState<OverviewDatePreset>("today");
  const [pipeline, setPipeline] = useState(() =>
    buildWebOrderPipeline({ datePreset: "today", view: "web" })
  );

  useEffect(() => {
    const refresh = () =>
      setPipeline(buildWebOrderPipeline({ datePreset, view: activeTab }));
    refresh();
    window.addEventListener("youraiseller-data-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("youraiseller-data-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [datePreset, activeTab]);

  const { segments, total, dateLabel } = pipeline;

  return (
    <div className="group relative flex h-full min-h-[360px] flex-col overflow-hidden rounded-2xl border border-violet-100/80 bg-gradient-to-br from-white via-white to-violet-50/40 p-5 shadow-sm ring-1 ring-violet-100/60 transition hover:shadow-md">
      <div className="pointer-events-none absolute -right-10 -top-10 h-32 w-32 rounded-full bg-violet-200/30 blur-3xl" />

      <div className="relative mb-4 flex flex-wrap items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-200">
            <GitBranch className="h-4 w-4" />
          </div>
          <div>
            <h3 className="text-base font-extrabold text-slate-900">Order Pipeline</h3>
            <p className="text-xs text-slate-500">
              Orders from website · {dateLabel}
            </p>
          </div>
        </div>
        <DashboardDateDropdown value={datePreset} onChange={setDatePreset} />
      </div>

      <div className="relative mb-4 flex gap-1 rounded-xl bg-violet-100/50 p-1">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={clsx(
              "flex-1 rounded-lg px-3 py-2 text-xs font-bold transition",
              activeTab === tab.id
                ? "bg-white text-violet-700 shadow-sm ring-1 ring-violet-100"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {total === 0 ? (
        <p className="relative flex flex-1 flex-col items-center justify-center gap-1 py-10 text-center text-sm text-slate-500">
          <span>
            No website orders for <strong className="text-slate-700">{dateLabel}</strong>.
          </span>
          <span className="text-xs">Sync WooCommerce or add manual web orders.</span>
        </p>
      ) : (
        <>
          <DonutChart
            data={segments.map((d) => ({
              name: d.name,
              value: d.value,
              color: d.color,
            }))}
            innerRadius={52}
            outerRadius={82}
            centerLabel={
              <DonutCenter value={total} hint={dateLabel} valueClassName="text-3xl" />
            }
          />
          <div className="relative mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
            {segments.map((item) => (
              <div
                key={item.name}
                className="flex items-center justify-between gap-2 rounded-xl border border-white/80 bg-white/70 px-3 py-2 text-xs backdrop-blur-sm"
              >
                <div className="flex min-w-0 flex-1 items-center gap-2">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="line-clamp-2 font-semibold leading-snug text-slate-700">
                    {item.name}
                  </span>
                </div>
                <span className="shrink-0 font-bold tabular-nums text-slate-900">
                  {item.value}
                </span>
              </div>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
