"use client";

import { useMemo } from "react";
import {
  Area,
  AreaChart,
  CartesianGrid,
  Legend,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart3,
  MessageSquare,
  TrendingUp,
} from "lucide-react";
import { ChartClientOnly } from "@/components/dashboard/ChartClientOnly";
import { SmsLogPeriodFilter } from "@/components/integration/sms/SmsLogPeriodFilter";
import {
  buildSmsHourlyChart,
  computeSmsLogStats,
  filterLogsByPeriod,
  type SmsLogPeriod,
} from "@/lib/sms-log-analytics";
import { formatSmsBdt } from "@/lib/sms-types";
import type { SmsLogRow } from "@/lib/sms-types";

type Props = {
  logs: SmsLogRow[];
  smsPriceTaka: number;
  period: SmsLogPeriod;
  onPeriodChange: (p: SmsLogPeriod) => void;
};

export function SmsLogReportsTab({
  logs,
  smsPriceTaka,
  period,
  onPeriodChange,
}: Props) {
  const periodLogs = useMemo(
    () => filterLogsByPeriod(logs, period),
    [logs, period]
  );
  const stats = useMemo(
    () => computeSmsLogStats(periodLogs, smsPriceTaka),
    [periodLogs, smsPriceTaka]
  );
  const allStats = useMemo(
    () => computeSmsLogStats(logs, smsPriceTaka),
    [logs, smsPriceTaka]
  );
  const chartData = useMemo(
    () => buildSmsHourlyChart(periodLogs, smsPriceTaka),
    [periodLogs, smsPriceTaka]
  );
  const hasChart = chartData.some((p) => p.sms > 0);

  const cards = [
    {
      label: "Total Log Entries",
      value: stats.totalEntries,
      sub: "Selected period",
    },
    {
      label: "Total SMS Count",
      value: stats.totalSms,
      sub: "SMS sent in period",
    },
    {
      label: "Today's SMS",
      value: allStats.todaySms,
      sub: `${allStats.todayEntries} entries today`,
    },
    {
      label: "This Month",
      value: allStats.monthSms,
      sub: `${allStats.monthEntries} entries this month`,
    },
  ];

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="text-base font-extrabold text-slate-900">SMS Reports</h3>
          <p className="text-sm text-slate-500">
            View SMS usage statistics and analytics
          </p>
        </div>
        <SmsLogPeriodFilter value={period} onChange={onPeriodChange} />
      </div>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm"
          >
            <p className="text-xs font-semibold text-slate-500">{c.label}</p>
            <p className="mt-1 text-2xl font-extrabold tabular-nums text-slate-900">
              {c.value}
            </p>
            <p className="mt-0.5 text-[11px] text-slate-400">{c.sub}</p>
          </div>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-2">
            <TrendingUp className="mt-0.5 h-5 w-5 text-teal-600" />
            <div>
              <h4 className="font-extrabold text-slate-900">SMS Usage Trends</h4>
              <p className="text-xs text-slate-500">
                Data grouped by hour · {stats.totalSms} total SMS sent
              </p>
            </div>
          </div>
        </div>

        {!hasChart ? (
          <p className="flex h-[260px] items-center justify-center text-sm text-slate-400">
            No SMS data for this period
          </p>
        ) : (
          <ChartClientOnly height={260}>
            <div className="h-[260px] w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="hour" tick={{ fontSize: 10 }} interval={2} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip />
                  <Legend />
                  <Area
                    type="monotone"
                    dataKey="sms"
                    name="SMS Count"
                    stroke="#14b8a6"
                    fill="#14b8a6"
                    fillOpacity={0.25}
                  />
                  <Area
                    type="monotone"
                    dataKey="cost"
                    name="Cost (BDT)"
                    stroke="#f97316"
                    fill="#f97316"
                    fillOpacity={0.15}
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </ChartClientOnly>
        )}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="h-5 w-5 text-teal-600" />
            <h4 className="font-extrabold text-slate-900">Cost Analysis</h4>
          </div>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <dt className="text-slate-500">Total Cost (Selected Period)</dt>
              <dd className="font-bold text-slate-900">
                {formatSmsBdt(stats.totalCost)}
              </dd>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <dt className="text-slate-500">Average Cost Per SMS</dt>
              <dd className="font-bold text-slate-900">
                {formatSmsBdt(stats.avgCostPerSms)}
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Today&apos;s Cost</dt>
              <dd className="font-bold text-emerald-700">
                {formatSmsBdt(allStats.todayCost)}
              </dd>
            </div>
          </dl>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="mb-4 flex items-center gap-2">
            <MessageSquare className="h-5 w-5 text-teal-600" />
            <h4 className="font-extrabold text-slate-900">Usage Summary</h4>
          </div>
          <dl className="space-y-3 text-sm">
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <dt className="text-slate-500">Average SMS per Log</dt>
              <dd className="font-bold text-slate-900">{stats.avgSmsPerLog}</dd>
            </div>
            <div className="flex justify-between border-b border-slate-100 pb-2">
              <dt className="text-slate-500">Monthly Average</dt>
              <dd className="font-bold text-slate-900">
                {allStats.monthSms} SMS
              </dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-slate-500">Daily Average (This Month)</dt>
              <dd className="font-bold text-slate-900">
                {allStats.monthEntries > 0
                  ? Math.round(allStats.monthSms / new Date().getDate())
                  : 0}{" "}
                SMS
              </dd>
            </div>
          </dl>
        </div>
      </div>
    </div>
  );
}
