"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import {
  BarChart3,
  BookOpen,
  Calendar,
  Download,
  Filter,
  Loader2,
  Phone,
  RefreshCw,
  Search,
} from "lucide-react";
import { ChartClientOnly } from "@/components/dashboard/ChartClientOnly";
import { AutoCallStatusBadge } from "@/components/integration/auto-call/AutoCallStatusBadge";
import {
  autoCallLogOutcome,
  formatAutoCallDuration,
  formatAutoCallPhoneDisplay,
} from "@/lib/auto-call-log-display";
import {
  AUTO_CALL_ORDER_TYPE_OPTIONS,
  AUTO_CALL_OUTCOME_FILTER_OPTIONS,
  AUTO_CALL_REPORT_PERIOD_OPTIONS,
  AUTO_CALL_SOURCE_FILTER_OPTIONS,
  buildAutoCallOrderTypeMix,
  buildAutoCallOutcomeBreakdown,
  buildAutoCallSourceMix,
  buildConfirmedOrderReport,
  computeAutoCallReportStats,
  downloadAutoCallReportCsv,
  filterAutoCallReportLogs,
  formatAutoCallReportTime,
  getAutoCallReportDateRange,
  paginateAutoCallLogs,
  resolveAutoCallReportSource,
  type AutoCallOutcomeBucket,
  type AutoCallReportFilters,
  type AutoCallReportPeriod,
  type AutoCallReportOrderTypeFilter,
  type AutoCallReportSourceFilter,
} from "@/lib/auto-call-report-analytics";
import {
  loadAutoCallLogs,
  loadAutoCallRules,
  loadAutoCallSettings,
  pollAutoCallStatuses,
  refreshAutoCallAccount,
} from "@/lib/auto-call-store";
import { loadOrders, type Order } from "@/lib/orders-store";
import { resolveWebDisplayStatus } from "@/lib/order-edit";
import {
  acBtnPrimary,
  acBtnSecondary,
  acCard,
  acHint,
  acInput,
  acLabel,
  acSectionSub,
  acSectionTitle,
} from "@/lib/auto-call-ui";

const DEFAULT_FILTERS: AutoCallReportFilters = {
  period: "30d",
  search: "",
  source: "all",
  orderType: "all",
  outcomes: [],
  page: 0,
  pageSize: 20,
};

const PAGE_SIZE_OPTIONS = [10, 20, 50, 100];

function KpiCard({
  label,
  value,
  sub,
  tone = "default",
}: {
  label: string;
  value: number | string;
  sub: string;
  tone?: "default" | "success" | "warn" | "danger" | "info";
}) {
  const tones = {
    default: "border-slate-200 bg-white",
    success: "border-emerald-100 bg-emerald-50/40",
    warn: "border-amber-100 bg-amber-50/40",
    danger: "border-rose-100 bg-rose-50/40",
    info: "border-violet-100 bg-violet-50/40",
  };

  return (
    <div className={clsx("rounded-2xl border p-4 shadow-sm", tones[tone])}>
      <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">{label}</p>
      <p className="mt-1 text-3xl font-extrabold tabular-nums text-slate-900">{value}</p>
      <p className="mt-1 text-xs leading-relaxed text-slate-500">{sub}</p>
    </div>
  );
}

function MixBar({
  label,
  count,
  percent,
  colorClass,
}: {
  label: string;
  count: number;
  percent: number;
  colorClass: string;
}) {
  return (
    <div>
      <div className="mb-1.5 flex items-center justify-between gap-2 text-sm">
        <span className="font-semibold text-slate-700">{label}</span>
        <span className="font-extrabold tabular-nums text-slate-900">{count}</span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-slate-100">
        <div
          className={clsx("h-full rounded-full transition-all", colorClass)}
          style={{ width: `${Math.max(percent, count > 0 ? 4 : 0)}%` }}
        />
      </div>
      <p className="mt-1 text-[11px] text-slate-400">{percent.toFixed(1)}% of visible activity</p>
    </div>
  );
}

export function AutoCallReportPanel() {
  const [filters, setFilters] = useState<AutoCallReportFilters>(DEFAULT_FILTERS);
  const [logs, setLogs] = useState(() => loadAutoCallLogs());
  const [orders, setOrders] = useState<Order[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [showHelp, setShowHelp] = useState(false);

  const settings = loadAutoCallSettings();
  const rules = loadAutoCallRules();

  const reload = useCallback(() => {
    setLogs(loadAutoCallLogs());
    setOrders(loadOrders());
  }, []);

  useEffect(() => {
    reload();
    window.addEventListener("youraiseller-autocall-updated", reload);
    window.addEventListener("youraiseller-data-updated", reload);
    return () => {
      window.removeEventListener("youraiseller-autocall-updated", reload);
      window.removeEventListener("youraiseller-data-updated", reload);
    };
  }, [reload]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await pollAutoCallStatuses();
    await refreshAutoCallAccount();
    reload();
    setRefreshing(false);
  };

  const patchFilters = (patch: Partial<AutoCallReportFilters>) => {
    setFilters((prev) => ({
      ...prev,
      ...patch,
      page:
        patch.page !== undefined
          ? patch.page
          : "period" in patch ||
              "search" in patch ||
              "source" in patch ||
              "orderType" in patch ||
              "outcomes" in patch ||
              "pageSize" in patch
            ? 0
            : prev.page,
    }));
  };

  const filteredLogs = useMemo(
    () => filterAutoCallReportLogs(logs, filters, orders, settings, rules),
    [logs, filters, orders, settings, rules]
  );

  const stats = useMemo(
    () => computeAutoCallReportStats(filteredLogs, settings, rules),
    [filteredLogs, settings, rules]
  );

  const outcomeBreakdown = useMemo(
    () => buildAutoCallOutcomeBreakdown(filteredLogs, settings, rules),
    [filteredLogs, settings, rules]
  );

  const sourceMix = useMemo(() => buildAutoCallSourceMix(filteredLogs), [filteredLogs]);
  const orderTypeMix = useMemo(
    () => buildAutoCallOrderTypeMix(filteredLogs, orders),
    [filteredLogs, orders]
  );
  const confirmedReport = useMemo(
    () => buildConfirmedOrderReport(filteredLogs, orders),
    [filteredLogs, orders]
  );

  const dateRange = useMemo(
    () => getAutoCallReportDateRange(filters.period),
    [filters.period]
  );

  const pageRows = useMemo(
    () => paginateAutoCallLogs(filteredLogs, filters.page, filters.pageSize),
    [filteredLogs, filters.page, filters.pageSize]
  );

  const totalPages = Math.max(1, Math.ceil(filteredLogs.length / filters.pageSize));
  const orderIndex = useMemo(() => new Map(orders.map((o) => [o.id, o])), [orders]);

  const toggleOutcome = (id: AutoCallOutcomeBucket) => {
    setFilters((prev) => {
      const exists = prev.outcomes.includes(id);
      return {
        ...prev,
        page: 0,
        outcomes: exists
          ? prev.outcomes.filter((o) => o !== id)
          : [...prev.outcomes, id],
      };
    });
  };

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-indigo-50/40 p-5">
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet-200/30 blur-2xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
              <BarChart3 className="h-5 w-5" />
            </div>
            <div>
              <p className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-2.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-700 ring-1 ring-violet-100">
                <Phone className="h-3 w-3" />
                Reports / Auto Call Center
              </p>
              <h2 className={`${acSectionTitle} mt-2`}>Auto Call Center Report</h2>
              <p className={acSectionSub}>
                Date wise, month wise, year wise, and lifetime auto-call activity in one place.
                See total calls, Pressed 1 and 2, rejected, failed, live in progress, retry queue,
                and detailed order-level activity.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <div className="rounded-xl border border-violet-100 bg-white/90 px-3 py-2 text-xs font-semibold text-slate-600">
              <Calendar className="mr-1.5 inline h-3.5 w-3.5 text-violet-500" />
              {dateRange.label}
            </div>
            <button
              type="button"
              onClick={() => setShowHelp((v) => !v)}
              className={acBtnSecondary}
            >
              <BookOpen className="h-4 w-4" />
              How it Works
            </button>
            <button
              type="button"
              onClick={() => patchFilters(DEFAULT_FILTERS)}
              className={acBtnSecondary}
            >
              <RefreshCw className="h-4 w-4" />
              Reset
            </button>
            <button
              type="button"
              onClick={() =>
                downloadAutoCallReportCsv(filteredLogs, orders, settings, rules)
              }
              className={acBtnPrimary}
            >
              <Download className="h-4 w-4" />
              Export CSV
            </button>
          </div>
        </div>

        {showHelp ? (
          <div className="relative mt-4 rounded-xl border border-violet-100 bg-white/80 px-4 py-3 text-sm text-slate-600">
            <strong className="text-slate-800">Pressed 1</strong> means the customer confirmed on
            the call. <strong className="text-slate-800">Rejected</strong> is when the call was cut.
            <strong className="text-slate-800"> No Answer</strong> is no pick-up.
            <strong className="text-slate-800"> Try again</strong> shows orders waiting for the
            next retry attempt. Filters apply to all cards and the table below.
          </div>
        ) : null}
      </section>

      <section className={acCard}>
        <div className="mb-4 flex items-center gap-2 text-sm font-extrabold text-slate-900">
          <Filter className="h-4 w-4 text-violet-600" />
          Report Filters
        </div>

        <div className="grid gap-3 lg:grid-cols-4">
          <label className="lg:col-span-1">
            <span className={acLabel}>Date filter</span>
            <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200 bg-slate-50/80 p-1">
              {AUTO_CALL_REPORT_PERIOD_OPTIONS.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => patchFilters({ period: opt.id, page: 0 })}
                  className={clsx(
                    "rounded-lg px-2.5 py-1.5 text-xs font-bold transition",
                    filters.period === opt.id
                      ? "bg-white text-violet-700 shadow-sm ring-1 ring-violet-100"
                      : "text-slate-500 hover:text-slate-700"
                  )}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </label>

          <label className="lg:col-span-2">
            <span className={acLabel}>Search</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={filters.search}
                onChange={(e) => patchFilters({ search: e.target.value, page: 0 })}
                placeholder="Phone, order ID, or rule name"
                className={`${acInput} pl-9`}
              />
            </div>
          </label>

          <label>
            <span className={acLabel}>Page size</span>
            <select
              value={filters.pageSize}
              onChange={(e) =>
                patchFilters({ pageSize: Number(e.target.value), page: 0 })
              }
              className={acInput}
            >
              {PAGE_SIZE_OPTIONS.map((size) => (
                <option key={size} value={size}>
                  {size} rows
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className={acLabel}>Sources</span>
            <select
              value={filters.source}
              onChange={(e) =>
                patchFilters({
                  source: e.target.value as AutoCallReportSourceFilter,
                  page: 0,
                })
              }
              className={acInput}
            >
              {AUTO_CALL_SOURCE_FILTER_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label>
            <span className={acLabel}>Order type</span>
            <select
              value={filters.orderType}
              onChange={(e) =>
                patchFilters({
                  orderType: e.target.value as AutoCallReportOrderTypeFilter,
                  page: 0,
                })
              }
              className={acInput}
            >
              {AUTO_CALL_ORDER_TYPE_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </label>

          <label className="lg:col-span-2">
            <span className={acLabel}>States / outcomes</span>
            <div className="flex min-h-[42px] flex-wrap gap-1.5 rounded-xl border border-slate-200 bg-white px-2 py-2">
              {AUTO_CALL_OUTCOME_FILTER_OPTIONS.map((opt) => {
                const active = filters.outcomes.includes(opt.id);
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => toggleOutcome(opt.id)}
                    className={clsx(
                      "rounded-full px-2.5 py-1 text-[11px] font-bold transition",
                      active
                        ? "bg-violet-600 text-white"
                        : "bg-slate-100 text-slate-600 hover:bg-violet-50 hover:text-violet-700"
                    )}
                  >
                    {opt.label}
                  </button>
                );
              })}
            </div>
            <p className={`${acHint} mt-1`}>
              Leave empty to show all outcomes. Click to filter by one or more states.
            </p>
          </label>

          <div className="flex items-end lg:col-span-1">
            <button
              type="button"
              disabled={refreshing}
              onClick={() => void handleRefresh()}
              className={`${acBtnSecondary} w-full`}
            >
              {refreshing ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              Refresh data
            </button>
          </div>
        </div>
      </section>

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        <KpiCard
          label="Total Calls"
          value={stats.totalCalls}
          sub="Completed auto-call attempts in the selected filter"
        />
        <KpiCard
          label="Success"
          value={stats.success}
          sub={`${stats.successRate.toFixed(1)}% Pressed 1 confirmation rate`}
          tone="success"
        />
        <KpiCard
          label="Not Confirmed"
          value={stats.notConfirmed}
          sub="Calls that did not end with Pressed 1"
          tone="warn"
        />
        <KpiCard
          label="Live Queue"
          value={stats.liveQueue}
          sub="In progress, retry queue, and queued items"
          tone="info"
        />
        <KpiCard
          label="In Progress"
          value={stats.inProgress}
          sub="Currently waiting for customer response"
        />
        <KpiCard
          label="Try Again"
          value={stats.tryAgain}
          sub="Retry is scheduled for another attempt"
        />
        <KpiCard
          label="Pressed 2"
          value={stats.pressed2}
          sub="Customers pressed key 2 on the call"
          tone="danger"
        />
        <KpiCard
          label="Failed"
          value={stats.failed}
          sub={`${stats.rejected} rejected and ${stats.busy} busy`}
          tone="danger"
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <section className={acCard}>
          <h3 className="mb-4 text-sm font-extrabold text-slate-900">
            Outcome And State Breakdown
          </h3>
          <div className="space-y-3">
            {outcomeBreakdown.length === 0 ? (
              <p className="py-8 text-center text-sm text-slate-400">No call data for this filter</p>
            ) : (
              outcomeBreakdown.map((row) => {
                const max = outcomeBreakdown[0]?.count || 1;
                return (
                  <div key={row.id}>
                    <div className="mb-1 flex items-center justify-between gap-2">
                      <span
                        className="inline-flex rounded-full px-2 py-0.5 text-[11px] font-bold text-white"
                        style={{ backgroundColor: row.color }}
                      >
                        {row.label}
                      </span>
                      <span className="font-extrabold tabular-nums text-slate-900">
                        {row.count}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full"
                        style={{
                          width: `${(row.count / max) * 100}%`,
                          backgroundColor: row.color,
                        }}
                      />
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </section>

        <section className={acCard}>
          <h3 className="mb-4 text-sm font-extrabold text-slate-900">Source Mix</h3>
          <div className="space-y-4">
            {sourceMix.map((row, i) => (
              <div
                key={row.id}
                className="rounded-xl border border-slate-100 bg-slate-50/50 px-3 py-3"
              >
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  {row.label}
                </p>
                <p className="mt-1 text-2xl font-extrabold tabular-nums text-slate-900">
                  {row.count}
                </p>
                <p className="text-xs text-slate-500">{row.percent.toFixed(1)}% of activity</p>
              </div>
            ))}
          </div>
        </section>

        <section className={acCard}>
          <h3 className="mb-4 text-sm font-extrabold text-slate-900">Order Type Mix</h3>
          <div className="space-y-5">
            <MixBar
              label="Web Orders"
              count={orderTypeMix[0]?.count ?? 0}
              percent={orderTypeMix[0]?.percent ?? 0}
              colorClass="bg-emerald-500"
            />
            <MixBar
              label="Approved Orders"
              count={orderTypeMix[1]?.count ?? 0}
              percent={orderTypeMix[1]?.percent ?? 0}
              colorClass="bg-violet-500"
            />
          </div>
        </section>
      </div>

      <div className="grid gap-4 xl:grid-cols-3">
        <section className={`${acCard} xl:col-span-2`}>
          <h3 className="text-sm font-extrabold text-slate-900">
            Confirmed Order Status Chart
          </h3>
          <p className={`${acHint} mb-4`}>
            Orders confirmed by Pressed 1 and where they are now in your approved pipeline.
          </p>
          {confirmedReport.statusRows.length === 0 ? (
            <p className="flex h-[280px] items-center justify-center text-sm text-slate-400">
              No Pressed 1 confirmed orders in this filter
            </p>
          ) : (
            <ChartClientOnly height={280}>
              <div className="h-[280px] w-full min-w-0">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={confirmedReport.statusRows}
                    layout="vertical"
                    margin={{ top: 4, right: 12, left: 8, bottom: 4 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="#e2e8f0" />
                    <XAxis type="number" tick={{ fontSize: 11 }} allowDecimals={false} />
                    <YAxis
                      type="category"
                      dataKey="label"
                      width={110}
                      tick={{ fontSize: 11 }}
                    />
                    <Tooltip />
                    <Bar dataKey="count" radius={[0, 6, 6, 0]}>
                      {confirmedReport.statusRows.map((row) => (
                        <Cell
                          key={row.status}
                          fill={
                            row.status === "delivered"
                              ? "#10b981"
                              : row.status === "cancelled" || row.status === "returned"
                                ? "#f43f5e"
                                : row.status === "shipped" || row.status === "rts"
                                  ? "#f59e0b"
                                  : "#8b5cf6"
                          }
                        />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartClientOnly>
          )}

          <div className="mt-4 grid gap-3 sm:grid-cols-3">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/50 px-3 py-3">
              <p className="text-[11px] font-bold uppercase text-emerald-700">Completion Rate</p>
              <p className="text-xl font-extrabold text-emerald-800">
                {confirmedReport.completionRate.toFixed(1)}%
              </p>
              <p className="text-xs text-emerald-700/80">
                {confirmedReport.delivered} delivered of {confirmedReport.confirmedCount}
              </p>
            </div>
            <div className="rounded-xl border border-amber-100 bg-amber-50/50 px-3 py-3">
              <p className="text-[11px] font-bold uppercase text-amber-700">Return Rate</p>
              <p className="text-xl font-extrabold text-amber-800">
                {confirmedReport.returnRate.toFixed(1)}%
              </p>
              <p className="text-xs text-amber-700/80">Return-related orders after confirm</p>
            </div>
            <div className="rounded-xl border border-rose-100 bg-rose-50/50 px-3 py-3">
              <p className="text-[11px] font-bold uppercase text-rose-700">Cancel Rate</p>
              <p className="text-xl font-extrabold text-rose-800">
                {confirmedReport.cancelRate.toFixed(1)}%
              </p>
              <p className="text-xs text-rose-700/80">Cancelled after Pressed 1</p>
            </div>
          </div>
        </section>

        <section className={acCard}>
          <h3 className="mb-4 text-sm font-extrabold text-slate-900">
            Confirmed Order Snapshot
          </h3>
          <div className="space-y-3">
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
              <p className="text-[11px] font-bold uppercase text-emerald-700">
                Confirmed approved orders
              </p>
              <p className="text-3xl font-extrabold text-emerald-800">
                {confirmedReport.confirmedCount}
              </p>
            </div>
            <div className="rounded-xl border border-sky-100 bg-sky-50/40 p-4">
              <p className="text-[11px] font-bold uppercase text-sky-700">Active pipeline</p>
              <p className="text-3xl font-extrabold text-sky-800">
                {confirmedReport.activePipeline}
              </p>
              <p className="text-xs text-sky-700/80">Pending, RTS, and delivering</p>
            </div>
            <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4">
              <p className="text-[11px] font-bold uppercase text-emerald-700">Delivered</p>
              <p className="text-3xl font-extrabold text-emerald-800">
                {confirmedReport.delivered}
              </p>
            </div>
            <div className="rounded-xl border border-rose-100 bg-rose-50/40 p-4">
              <p className="text-[11px] font-bold uppercase text-rose-700">
                Returned / Cancelled
              </p>
              <p className="text-3xl font-extrabold text-rose-800">
                {confirmedReport.returnedOrCancelled}
              </p>
            </div>
          </div>

          {confirmedReport.statusRows.length > 0 ? (
            <div className="mt-4 space-y-2 border-t border-slate-100 pt-4">
              {confirmedReport.statusRows.map((row) => (
                <div key={row.status} className="flex items-center justify-between text-sm">
                  <span className="flex items-center gap-2 text-slate-600">
                    <span
                      className={clsx(
                        "h-2 w-2 rounded-full",
                        row.status === "delivered"
                          ? "bg-emerald-500"
                          : row.status === "cancelled"
                            ? "bg-rose-500"
                            : "bg-violet-400"
                      )}
                    />
                    {row.label}
                  </span>
                  <span className="font-bold tabular-nums text-slate-900">{row.count}</span>
                </div>
              ))}
            </div>
          ) : null}
        </section>
      </div>

      <section className={acCard}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <div>
            <h3 className="text-sm font-extrabold text-slate-900">Detailed Auto Call Activity</h3>
            <p className={acHint}>
              Combined call history rows for the selected filters.
            </p>
          </div>
          <span className="rounded-full bg-violet-50 px-3 py-1 text-xs font-bold text-violet-700 ring-1 ring-violet-100">
            {filteredLogs.length} rows
          </span>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-3">Time</th>
                <th className="px-3 py-3">Approved Order Status</th>
                <th className="px-3 py-3">Web Order Status</th>
                <th className="px-3 py-3">Source</th>
                <th className="px-3 py-3">Order Type</th>
                <th className="px-3 py-3">Phone</th>
                <th className="px-3 py-3">Attempt</th>
                <th className="px-3 py-3">Outcome</th>
                <th className="px-3 py-3">Duration / Retry</th>
                <th className="px-3 py-3">Error</th>
              </tr>
            </thead>
            <tbody>
              {pageRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-500">
                    No auto call activity for the selected filters.
                  </td>
                </tr>
              ) : (
                pageRows.map((log) => {
                  const order = orderIndex.get(log.orderId);
                  const outcome = autoCallLogOutcome(log);
                  const webStatus = order ? resolveWebDisplayStatus(order) : "—";
                  return (
                    <tr key={log.id} className="border-t border-slate-100 hover:bg-slate-50/40">
                      <td className="px-3 py-3 text-xs text-slate-600">
                        {formatAutoCallReportTime(log.sentAt)}
                      </td>
                      <td className="px-3 py-3 capitalize text-slate-700">
                        {order && !order.inWebQueue ? order.status.replace(/_/g, " ") : "—"}
                      </td>
                      <td className="px-3 py-3 capitalize text-slate-700">
                        {order?.inWebQueue !== false ? webStatus : "—"}
                      </td>
                      <td className="px-3 py-3 font-semibold text-slate-700">
                        {resolveAutoCallReportSource(log)}
                      </td>
                      <td className="px-3 py-3 text-slate-600">
                        {order?.inWebQueue !== false || log.orderId.startsWith("WO-")
                          ? "Web Order"
                          : "Approved Order"}
                      </td>
                      <td className="px-3 py-3 font-semibold tabular-nums text-slate-800">
                        {formatAutoCallPhoneDisplay(log.phone)}
                      </td>
                      <td className="px-3 py-3 tabular-nums text-slate-700">
                        {log.attempt ?? 1}
                      </td>
                      <td className="px-3 py-3">
                        <AutoCallStatusBadge
                          label={outcome.label}
                          className={outcome.className}
                          icon={outcome.icon}
                          pulsing={outcome.pulsing}
                        />
                      </td>
                      <td className="px-3 py-3 tabular-nums text-slate-600">
                        {formatAutoCallDuration(log.durationSec)}
                      </td>
                      <td className="max-w-[180px] truncate px-3 py-3 text-xs text-rose-600">
                        {log.error ?? "—"}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>

        {filteredLogs.length > filters.pageSize ? (
          <div className="mt-4 flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-500">
              Page {filters.page + 1} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={filters.page <= 0}
                onClick={() => patchFilters({ page: filters.page - 1 })}
                className={acBtnSecondary}
              >
                Previous
              </button>
              <button
                type="button"
                disabled={filters.page + 1 >= totalPages}
                onClick={() => patchFilters({ page: filters.page + 1 })}
                className={acBtnSecondary}
              >
                Next
              </button>
            </div>
          </div>
        ) : null}
      </section>
    </div>
  );
}
