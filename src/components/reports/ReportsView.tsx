"use client";

import { useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Download, ExternalLink } from "lucide-react";
import clsx from "clsx";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatBdt } from "@/lib/accounting-store";
import { ORDER_LIST_TABS, ORDER_STATUS_LABELS } from "@/lib/order-status-tabs";
import { ChartClientOnly } from "@/components/dashboard/ChartClientOnly";
import { AccountingPlOverview } from "@/components/reports/AccountingPlOverview";
import { OrderReportStatsPanel } from "@/components/reports/OrderReportStatsPanel";
import {
  ProfitSalesDetailsCharts,
  ProfitSalesOverview,
} from "@/components/reports/ProfitSalesOverview";
import { LIABILITY_AGING_LABELS } from "@/lib/reports/accounting-depth-analytics";
import { PIE_COLORS, reportGroupForTab, type DateRange } from "@/lib/reports/report-types";
import { asNumber, formatCompactBdt, formatDelta, pctChange } from "@/lib/reports/report-utils";
import type { OrderStatus } from "@/lib/orders-store";
import type { ReportsViewProps } from "@/hooks/useReportsData";

export function ReportsView(props: ReportsViewProps) {
  const {
    accFrom,
    accRange,
    accTo,
    accountingCashFlow,
    accountingChartData,
    accountingDepthReport,
    accountingExpenseByCategory,
    accountingOptionRows,
    accountingPl,
    accountingQuickLinks,
    accountingRecentRows,
    accountingSummary,
    canCompare,
    compareMode,
    courierDeepReport,
    courierRows,
    customerReport,
    dailyTrend,
    deliveredCount,
    drillStatus,
    drilledOrders,
    exportCurrent,
    exportCurrentPdf,
    filteredOrders,
    from,
    grossSales,
    integrationsReport,
    inventoryReport,
    ledgerModalOpen,
    ledgerModalRows,
    ledgerModalTitle,
    marketingReport,
    openAccountingLedgerModal,
    operationsReport,
    operatingExpenseByCategory,
    approvedOrderReport,
    periodCompare,
    profitSalesReport,
    preorderReport,
    range,
    returnRate,
    scanReport,
    selectTab,
    setAccFrom,
    setAccRange,
    setAccTo,
    setCompareMode,
    setDrillStatus,
    setFrom,
    setLedgerModalOpen,
    setRange,
    setStatus,
    setTo,
    showOrderStatusFilter,
    showOrderSummaryCards,
    staffRows,
    status,
    statusBreakdown,
    tab,
    tabCompareNotes,
    teamProductivityRows,
    to,
    webReport,
    webSourceOrders,
  } = props;

  const activeGroup = reportGroupForTab(tab);
  const subTabs = activeGroup.tabs;
  const [salesView, setSalesView] = useState<"summary" | "details" | "chart" | "balance">("summary");

  return (
    <div className="space-y-3">
      <PageHeader
        title={activeGroup.label}
        description={activeGroup.description}
        actions={
          <div className="flex items-center gap-1.5">
            <button
              type="button"
              onClick={exportCurrent}
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-medium text-slate-700"
            >
              <Download className="h-3.5 w-3.5" /> CSV
            </button>
            <button
              type="button"
              onClick={exportCurrentPdf}
              className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-2.5 py-1.5 text-xs font-semibold text-indigo-700"
            >
              <Download className="h-3.5 w-3.5" /> PDF
            </button>
          </div>
        }
      />

      <div className="rounded-xl border border-slate-200 bg-white px-3 py-2">
        {subTabs.length > 1 && (
          <div className="mb-2 flex flex-wrap items-center gap-1.5 border-b border-slate-100 pb-2">
            {subTabs.map((item) => (
              <button
                key={item.id}
                type="button"
                onClick={() => selectTab(item.id)}
                className={clsx(
                  "rounded-lg px-3 py-1.5 text-xs font-bold transition",
                  tab === item.id
                    ? "bg-teal-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                )}
              >
                {item.label}
              </button>
            ))}
          </div>
        )}

        {tab !== "accounting" && (
          <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
            <label className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-slate-500">Range</span>
              <select
                value={range}
                onChange={(e) => setRange(e.target.value as DateRange)}
                className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
              >
                <option value="all">All time</option>
                <option value="today">Today</option>
                <option value="week">Last 7 days</option>
                <option value="month">This month</option>
              </select>
            </label>
            {showOrderStatusFilter && (
              <label className="flex items-center gap-1.5">
                <span className="text-xs font-medium text-slate-500">Status</span>
                <select
                  value={status}
                  onChange={(e) => setStatus(e.target.value as "all" | OrderStatus)}
                  className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
                >
                  <option value="all">All status</option>
                  {ORDER_LIST_TABS.map((s) => (
                    <option key={s.key} value={s.key}>
                      {s.label}
                    </option>
                  ))}
                </select>
              </label>
            )}
            <label className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-slate-500">From</span>
              <input
                type="date"
                value={from}
                onChange={(e) => setFrom(e.target.value)}
                className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
              />
            </label>
            <label className="flex items-center gap-1.5">
              <span className="text-xs font-medium text-slate-500">To</span>
              <input
                type="date"
                value={to}
                onChange={(e) => setTo(e.target.value)}
                className="rounded-lg border border-slate-200 px-2 py-1 text-xs"
              />
            </label>
            <label
              className={clsx(
                "ml-auto inline-flex items-center gap-1.5 text-xs font-medium",
                canCompare ? "text-slate-600" : "cursor-not-allowed text-slate-400"
              )}
            >
              <input
                type="checkbox"
                checked={compareMode}
                onChange={(e) => setCompareMode(e.target.checked)}
                disabled={!canCompare}
                className="h-3.5 w-3.5 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
              />
              Compare previous
            </label>
          </div>
        )}
      </div>

      {compareMode && tabCompareNotes && tab !== "sales" && tab !== "accounting" && (
        <div className="rounded-xl border border-indigo-100 bg-indigo-50/80 px-4 py-3 text-sm text-indigo-900">
          <span className="font-semibold">vs previous period:</span>{" "}
          {tab === "customers" && tabCompareNotes.customers}
          {tab === "web" && tabCompareNotes.web}
          {tab === "courier" && tabCompareNotes.courier}
          {tab === "approved_orders" && tabCompareNotes.courier}
          {tab === "preorder" && tabCompareNotes.scans}
          {tab === "integrations" && tabCompareNotes.sms}
          {tab === "marketing" && tabCompareNotes.marketing}
          {tab === "inventory" && tabCompareNotes.inventory}
          {tab === "staff" && periodCompare && (
            <>
              {formatDelta(periodCompare.current.orders, periodCompare.previous.orders)} orders ·{" "}
              {formatCompactBdt(periodCompare.grossSales)} gross sales
            </>
          )}
          {tab === "payment" && periodCompare && (
            <>
              {formatDelta(periodCompare.current.orders, periodCompare.previous.orders)} orders ·{" "}
              {formatCompactBdt(periodCompare.grossSales)} gross sales
            </>
          )}
        </div>
      )}

      {showOrderSummaryCards && tab !== "sales" && tab !== "payment" && (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="glass-card rounded-2xl p-4">
          <p className="text-sm text-slate-500">Orders</p>
          <p className="text-2xl font-bold text-slate-900">{filteredOrders.length}</p>
          {compareMode && periodCompare && (
            <p
              className={clsx(
                "mt-1 text-xs font-semibold",
                periodCompare.orders >= 0 ? "text-emerald-600" : "text-rose-600"
              )}
            >
              {formatDelta(periodCompare.current.orders, periodCompare.previous.orders)} vs previous
            </p>
          )}
        </div>
        <div className="glass-card rounded-2xl p-4">
          <p className="text-sm text-slate-500">Gross Sales</p>
          <p className="text-2xl font-bold text-emerald-700">{formatBdt(grossSales)}</p>
          {compareMode && periodCompare && (
            <p
              className={clsx(
                "mt-1 text-xs font-semibold",
                periodCompare.grossSales >= 0 ? "text-emerald-600" : "text-rose-600"
              )}
            >
              {formatCompactBdt(periodCompare.grossSales)}{" "}
              {pctChange(periodCompare.current.grossSales, periodCompare.previous.grossSales) == null
                ? ""
                : `(${pctChange(periodCompare.current.grossSales, periodCompare.previous.grossSales)!.toFixed(1)}%)`}{" "}
              vs previous
            </p>
          )}
        </div>
        <div className="glass-card rounded-2xl p-4">
          <p className="text-sm text-slate-500">Delivered</p>
          <p className="text-2xl font-bold text-indigo-700">{deliveredCount}</p>
          {compareMode && periodCompare && (
            <p
              className={clsx(
                "mt-1 text-xs font-semibold",
                periodCompare.delivered >= 0 ? "text-emerald-600" : "text-rose-600"
              )}
            >
              {formatDelta(periodCompare.current.delivered, periodCompare.previous.delivered)} vs previous
            </p>
          )}
        </div>
        <div className="glass-card rounded-2xl p-4">
          <p className="text-sm text-slate-500">Return Rate</p>
          <p className="text-2xl font-bold text-rose-700">{returnRate.toFixed(1)}%</p>
          {compareMode && periodCompare && (
            <p
              className={clsx(
                "mt-1 text-xs font-semibold",
                periodCompare.returnRate <= 0 ? "text-emerald-600" : "text-rose-600"
              )}
            >
              {formatDelta(periodCompare.current.returnRate, periodCompare.previous.returnRate, "%")}pp vs previous
            </p>
          )}
        </div>
      </div>
      )}

      {tab === "sales" && (
        <div className="space-y-4">
          <ProfitSalesOverview
            report={profitSalesReport}
            view={salesView}
            onViewChange={setSalesView}
            operatingExpenseByCategory={operatingExpenseByCategory}
            accountBalances={accountingDepthReport.accountBalances}
            activeAccountTotal={accountingDepthReport.activeAccountTotal}
            cashBalance={accountingSummary.cashBalance}
          />

          {salesView === "details" && (
            <>
              <ProfitSalesDetailsCharts
                dailyTrend={dailyTrend}
                statusBreakdown={statusBreakdown}
                pieColors={PIE_COLORS}
              />

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-bold text-slate-800">Sales Drill-down Orders</h3>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => setDrillStatus("all")}
                  className={clsx(
                    "rounded-lg px-3 py-1.5 text-xs font-bold",
                    drillStatus === "all"
                      ? "bg-indigo-600 text-white"
                      : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                  )}
                >
                  All
                </button>
                {ORDER_LIST_TABS.slice(0, 6).map((s) => (
                  <button
                    key={s.key}
                    type="button"
                    onClick={() => setDrillStatus(s.key)}
                    className={clsx(
                      "rounded-lg px-3 py-1.5 text-xs font-bold",
                      drillStatus === s.key
                        ? "bg-indigo-600 text-white"
                        : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                    )}
                  >
                    {s.label}
                  </button>
                ))}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[780px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-500">
                    <th className="px-2 py-2">Order</th>
                    <th className="px-2 py-2">Date</th>
                    <th className="px-2 py-2">Customer</th>
                    <th className="px-2 py-2">Staff</th>
                    <th className="px-2 py-2">Status</th>
                    <th className="px-2 py-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {drilledOrders.map((o) => (
                    <tr key={o.id} className="border-b border-slate-100">
                      <td className="px-2 py-2 font-semibold text-slate-800">{o.id}</td>
                      <td className="px-2 py-2">{o.createdAt}</td>
                      <td className="px-2 py-2">{o.customerName}</td>
                      <td className="px-2 py-2">{o.handledBy ?? "Unassigned"}</td>
                      <td className="px-2 py-2">{ORDER_STATUS_LABELS[o.status]}</td>
                      <td className="px-2 py-2 font-semibold">{formatBdt(o.total)}</td>
                    </tr>
                  ))}
                  {drilledOrders.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-2 py-6 text-center text-slate-500">
                        No orders for this drill-down filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
            </>
          )}
        </div>
      )}

      {tab === "customers" && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="glass-card rounded-2xl p-4">
              <p className="text-sm text-slate-500">Active Customers</p>
              <p className="text-2xl font-bold text-slate-900">{customerReport.activeCustomers}</p>
            </div>
            <div className="glass-card rounded-2xl p-4">
              <p className="text-sm text-slate-500">New Customers</p>
              <p className="text-2xl font-bold text-emerald-700">{customerReport.newCustomers}</p>
            </div>
            <div className="glass-card rounded-2xl p-4">
              <p className="text-sm text-slate-500">Repeat Customers</p>
              <p className="text-2xl font-bold text-indigo-700">{customerReport.repeatCustomers}</p>
            </div>
            <div className="glass-card rounded-2xl p-4">
              <p className="text-sm text-slate-500">Repeat Rate</p>
              <p className="text-2xl font-bold text-amber-700">
                {customerReport.repeatRate.toFixed(1)}%
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 font-bold text-slate-800">Top Customers by Revenue</h3>
              {customerReport.topCustomers.length === 0 ? (
                <p className="text-sm text-slate-500">No customer data in selected range.</p>
              ) : (
                <ChartClientOnly height={320}>
                  <div className="h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={customerReport.topCustomers.slice(0, 8)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCompactBdt(asNumber(v))} />
                        <Tooltip formatter={(value) => formatBdt(asNumber(value))} />
                        <Bar dataKey="spent" name="Spent" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </ChartClientOnly>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 font-bold text-slate-800">Customer Mix</h3>
              <ChartClientOnly height={320}>
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "New", value: customerReport.newCustomers },
                          { name: "Repeat", value: customerReport.repeatCustomers },
                        ].filter((row) => row.value > 0)}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={100}
                        label={(props) => {
                          const name = String(props.name ?? "");
                          const value = asNumber(props.value);
                          return `${name} ${value}`;
                        }}
                      >
                        <Cell fill="#10b981" />
                        <Cell fill="#4f46e5" />
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </ChartClientOnly>
              <p className="mt-2 text-sm text-slate-600">
                Period revenue:{" "}
                <span className="font-bold">{formatBdt(customerReport.periodRevenue)}</span>
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 font-bold text-slate-800">Top Customers Table</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-500">
                    <th className="px-2 py-2">Customer</th>
                    <th className="px-2 py-2">Phone</th>
                    <th className="px-2 py-2">Orders</th>
                    <th className="px-2 py-2">Lifetime</th>
                    <th className="px-2 py-2">Spent</th>
                  </tr>
                </thead>
                <tbody>
                  {customerReport.topCustomers.map((row) => (
                    <tr key={row.phone} className="border-b border-slate-100">
                      <td className="px-2 py-2 font-semibold text-slate-800">{row.name}</td>
                      <td className="px-2 py-2">{row.phone}</td>
                      <td className="px-2 py-2">{row.orders}</td>
                      <td className="px-2 py-2">{row.lifetimeOrders}</td>
                      <td className="px-2 py-2 font-bold text-emerald-700">{formatBdt(row.spent)}</td>
                    </tr>
                  ))}
                  {customerReport.topCustomers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-2 py-6 text-center text-slate-500">
                        No customers in selected range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === "courier" && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="glass-card rounded-2xl p-4">
              <p className="text-sm text-slate-500">API Synced</p>
              <p className="text-2xl font-bold text-indigo-700">{courierDeepReport.synced}</p>
            </div>
            <div className="glass-card rounded-2xl p-4">
              <p className="text-sm text-slate-500">With Tracking</p>
              <p className="text-2xl font-bold text-slate-900">{courierDeepReport.withTracking}</p>
            </div>
            <div className="glass-card rounded-2xl p-4">
              <p className="text-sm text-slate-500">Rider Assigned</p>
              <p className="text-2xl font-bold text-emerald-700">{courierDeepReport.riderAssigned}</p>
            </div>
            <div className="glass-card rounded-2xl p-4">
              <p className="text-sm text-slate-500">Awaiting Rider</p>
              <p className="text-2xl font-bold text-amber-700">{courierDeepReport.riderUnassigned}</p>
            </div>
          </div>

        <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 font-bold text-slate-800">Courier Performance</h3>
            {courierRows.length === 0 ? (
              <p className="text-sm text-slate-500">No courier data for selected filter.</p>
            ) : (
              <ChartClientOnly height={300}>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={courierRows}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="courier" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip />
                      <Bar dataKey="delivered" stackId="a" fill="#10b981" radius={[4, 4, 0, 0]} />
                      <Bar dataKey="returned" stackId="a" fill="#ef4444" />
                      <Bar dataKey="pending" stackId="a" fill="#f59e0b" />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartClientOnly>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 font-bold text-slate-800">Courier Table</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-500">
                    <th className="px-2 py-2">Courier</th>
                    <th className="px-2 py-2">Total</th>
                    <th className="px-2 py-2">Delivered</th>
                    <th className="px-2 py-2">Returned</th>
                    <th className="px-2 py-2">Success %</th>
                  </tr>
                </thead>
                <tbody>
                  {courierRows.map((row) => {
                    const success = row.total ? (row.delivered / row.total) * 100 : 0;
                    return (
                      <tr key={row.courier} className="border-b border-slate-100">
                        <td className="px-2 py-2 font-semibold text-slate-800">{row.courier}</td>
                        <td className="px-2 py-2">{row.total}</td>
                        <td className="px-2 py-2 text-emerald-700">{row.delivered}</td>
                        <td className="px-2 py-2 text-rose-700">{row.returned}</td>
                        <td className="px-2 py-2">{success.toFixed(1)}%</td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        </div>

          <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 font-bold text-slate-800">Courier API Status</h3>
              {courierDeepReport.statusBreakdown.length === 0 ? (
                <p className="text-sm text-slate-500">No courier status data.</p>
              ) : (
                <ChartClientOnly height={300}>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={courierDeepReport.statusBreakdown} layout="vertical">
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                        <YAxis
                          type="category"
                          dataKey="status"
                          width={120}
                          tick={{ fontSize: 10 }}
                        />
                        <Tooltip />
                        <Bar dataKey="count" name="Orders" fill="#06b6d4" radius={[0, 6, 6, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </ChartClientOnly>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 font-bold text-slate-800">Payment Mix by Courier</h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-500">
                      <th className="px-2 py-2">Courier</th>
                      <th className="px-2 py-2">COD</th>
                      <th className="px-2 py-2">Prepaid</th>
                      <th className="px-2 py-2">Other</th>
                      <th className="px-2 py-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courierDeepReport.paymentRows.map((row) => (
                      <tr key={row.courier} className="border-b border-slate-100">
                        <td className="px-2 py-2 font-semibold text-slate-800">{row.courier}</td>
                        <td className="px-2 py-2">{row.cod}</td>
                        <td className="px-2 py-2">{row.prepaid}</td>
                        <td className="px-2 py-2">{row.other}</td>
                        <td className="px-2 py-2 font-bold">{row.total}</td>
                      </tr>
                    ))}
                    {courierDeepReport.paymentRows.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-2 py-6 text-center text-slate-500">
                          No courier payment mix data.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="glass-card rounded-2xl p-4">
              <p className="text-sm text-slate-500">Avg Delivery Time</p>
              <p className="text-2xl font-bold text-indigo-700">
                {courierDeepReport.sla.avgDays.toFixed(1)} days
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {courierDeepReport.sla.measured} measured orders
              </p>
            </div>
            <div className="glass-card rounded-2xl p-4">
              <p className="text-sm text-slate-500">Within 3 Days</p>
              <p className="text-2xl font-bold text-emerald-700">
                {courierDeepReport.sla.within3Days}
              </p>
            </div>
            <div className="glass-card rounded-2xl p-4">
              <p className="text-sm text-slate-500">Within 5 Days</p>
              <p className="text-2xl font-bold text-amber-700">
                {courierDeepReport.sla.within5Days}
              </p>
            </div>
            <div className="glass-card rounded-2xl p-4">
              <p className="text-sm text-slate-500">Couriers Tracked</p>
              <p className="text-2xl font-bold text-slate-900">
                {courierDeepReport.sla.byCourier.length}
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 font-bold text-slate-800">Delivery SLA by Courier</h3>
              <p className="mb-3 text-xs text-slate-500">
                Pickup (RTS / shipped / tracking) → delivered · from order activity log
              </p>
              {courierDeepReport.sla.byCourier.length === 0 ? (
                <p className="text-sm text-slate-500">Not enough delivery timeline data yet.</p>
              ) : (
                <ChartClientOnly height={300}>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={courierDeepReport.sla.byCourier}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="courier" tick={{ fontSize: 10 }} />
                        <YAxis allowDecimals tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="avgDays" name="Avg days" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </ChartClientOnly>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 font-bold text-slate-800">Courier SLA Table</h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[480px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-500">
                      <th className="px-2 py-2">Courier</th>
                      <th className="px-2 py-2">Samples</th>
                      <th className="px-2 py-2">Avg</th>
                      <th className="px-2 py-2">Min</th>
                      <th className="px-2 py-2">Max</th>
                    </tr>
                  </thead>
                  <tbody>
                    {courierDeepReport.sla.byCourier.map((row) => (
                      <tr key={row.courier} className="border-b border-slate-100">
                        <td className="px-2 py-2 font-semibold text-slate-800">{row.courier}</td>
                        <td className="px-2 py-2">{row.samples}</td>
                        <td className="px-2 py-2 font-bold text-indigo-700">
                          {row.avgDays.toFixed(1)}d
                        </td>
                        <td className="px-2 py-2 text-emerald-700">{row.minDays.toFixed(1)}d</td>
                        <td className="px-2 py-2 text-rose-700">{row.maxDays.toFixed(1)}d</td>
                      </tr>
                    ))}
                    {courierDeepReport.sla.byCourier.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-2 py-6 text-center text-slate-500">
                          No SLA data for selected range.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 font-bold text-slate-800">Slowest Deliveries</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-500">
                    <th className="px-2 py-2">Order</th>
                    <th className="px-2 py-2">Courier</th>
                    <th className="px-2 py-2">Pickup</th>
                    <th className="px-2 py-2">Delivered</th>
                    <th className="px-2 py-2">Days</th>
                  </tr>
                </thead>
                <tbody>
                  {courierDeepReport.sla.rows.map((row) => (
                    <tr key={row.orderId} className="border-b border-slate-100">
                      <td className="px-2 py-2 font-semibold text-slate-800">{row.orderId}</td>
                      <td className="px-2 py-2">{row.courier}</td>
                      <td className="px-2 py-2 text-xs text-slate-600">{row.pickupAt}</td>
                      <td className="px-2 py-2 text-xs text-slate-600">{row.deliveredAt}</td>
                      <td className="px-2 py-2 font-bold text-amber-700">{row.days}d</td>
                    </tr>
                  ))}
                  {courierDeepReport.sla.rows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-2 py-6 text-center text-slate-500">
                        No delivery timelines found.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === "payment" && (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-3">
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-sm text-slate-500">Cash In (Accounting)</p>
                  <p className="text-2xl font-bold text-emerald-700">
                    {formatBdt(accountingCashFlow.inflow)}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-sm text-slate-500">Cash Out (Accounting)</p>
                  <p className="text-2xl font-bold text-rose-700">
                    {formatBdt(accountingCashFlow.outflow)}
                  </p>
                </div>
                <div className="rounded-2xl border border-slate-200 bg-white p-4">
                  <p className="text-sm text-slate-500">Net Cash</p>
                  <p
                    className={clsx(
                      "text-2xl font-bold",
                      accountingCashFlow.netCash >= 0 ? "text-indigo-700" : "text-rose-700"
                    )}
                  >
                    {formatBdt(accountingCashFlow.netCash)}
                  </p>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h3 className="mb-3 font-bold text-slate-800">Accounting Payment Flow</h3>
                <ChartClientOnly height={300}>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={[
                          {
                            name: "Accounting",
                            inflow: accountingCashFlow.inflow,
                            outflow: accountingCashFlow.outflow,
                            transfer: accountingCashFlow.transferVolume,
                          },
                        ]}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCompactBdt(asNumber(v))} />
                        <Tooltip formatter={(value) => `${formatBdt(asNumber(value))} (${formatCompactBdt(asNumber(value))})`} />
                        <Bar dataKey="inflow" name="Cash In" fill="#10b981" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="outflow" name="Cash Out" fill="#ef4444" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="transfer" name="Transfers" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </ChartClientOnly>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 font-bold text-slate-800">Payment Share (Accounting)</h3>
              <ChartClientOnly height={380}>
                <div className="h-[380px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Cash In", value: accountingCashFlow.inflow },
                          { name: "Cash Out", value: accountingCashFlow.outflow },
                          { name: "Transfers", value: accountingCashFlow.transferVolume },
                        ]}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={110}
                        label={(props) => {
                          const name = String(props.name ?? "");
                          const percent = asNumber((props as { percent?: number }).percent) * 100;
                          return `${name} ${percent.toFixed(0)}%`;
                        }}
                      >
                        <Cell fill="#10b981" />
                        <Cell fill="#ef4444" />
                        <Cell fill="#4f46e5" />
                      </Pie>
                      <Tooltip
                        formatter={(value) =>
                          `${formatBdt(asNumber(value))} (${formatCompactBdt(asNumber(value))})`
                        }
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </ChartClientOnly>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 font-bold text-slate-800">Recent Accounting Payments</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-500">
                    <th className="px-2 py-2">Date</th>
                    <th className="px-2 py-2">Type</th>
                    <th className="px-2 py-2">Label</th>
                    <th className="px-2 py-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {accountingRecentRows.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100">
                      <td className="px-2 py-2">{row.date}</td>
                      <td className="px-2 py-2">
                        <span
                          className={clsx(
                            "rounded px-2 py-0.5 text-xs font-bold",
                            row.type === "income"
                              ? "bg-emerald-100 text-emerald-700"
                              : row.type === "expense"
                                ? "bg-rose-100 text-rose-700"
                                : "bg-indigo-100 text-indigo-700"
                          )}
                        >
                          {row.type}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-slate-700">{row.label}</td>
                      <td
                        className={clsx(
                          "px-2 py-2 font-bold",
                          row.amount >= 0 ? "text-emerald-700" : "text-rose-700"
                        )}
                      >
                        {row.amount >= 0 ? "+" : "-"}{formatBdt(Math.abs(row.amount))}
                      </td>
                    </tr>
                  ))}
                  {accountingRecentRows.length === 0 && (
                    <tr>
                      <td colSpan={4} className="px-2 py-6 text-center text-slate-500">
                        No accounting payment entries in selected accounting date range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === "staff" && (
        <div className="space-y-4">
        <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 font-bold text-slate-800">Staff Revenue & Delivery</h3>
            {staffRows.length === 0 ? (
              <p className="text-sm text-slate-500">No staff performance data for selected filter.</p>
            ) : (
              <ChartClientOnly height={320}>
                <div className="h-[320px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={staffRows.slice(0, 10)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="staff" tick={{ fontSize: 11 }} />
                      <YAxis yAxisId="left" tick={{ fontSize: 11 }} tickFormatter={(v) => formatCompactBdt(asNumber(v))} />
                      <YAxis yAxisId="right" orientation="right" tick={{ fontSize: 11 }} allowDecimals={false} />
                      <Tooltip />
                      <Bar yAxisId="left" dataKey="revenue" name="Revenue" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                      <Bar yAxisId="right" dataKey="delivered" name="Delivered" fill="#10b981" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartClientOnly>
            )}
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 font-bold text-slate-800">Staff Performance Table</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-500">
                    <th className="px-2 py-2">Staff</th>
                    <th className="px-2 py-2">Orders</th>
                    <th className="px-2 py-2">Delivered</th>
                    <th className="px-2 py-2">Delivery %</th>
                    <th className="px-2 py-2">Return %</th>
                    <th className="px-2 py-2">Revenue</th>
                  </tr>
                </thead>
                <tbody>
                  {staffRows.map((row) => (
                    <tr key={row.staff} className="border-b border-slate-100">
                      <td className="px-2 py-2 font-semibold text-slate-800">{row.staff}</td>
                      <td className="px-2 py-2">{row.total}</td>
                      <td className="px-2 py-2 text-emerald-700">{row.delivered}</td>
                      <td className="px-2 py-2">{row.deliveryRate.toFixed(1)}%</td>
                      <td className="px-2 py-2 text-rose-700">{row.returnRate.toFixed(1)}%</td>
                      <td className="px-2 py-2 font-bold">{formatBdt(row.revenue)}</td>
                    </tr>
                  ))}
                  {staffRows.length === 0 && (
                    <tr>
                      <td colSpan={6} className="px-2 py-6 text-center text-slate-500">
                        No staff data in this range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>

          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4">
            <h3 className="mb-3 font-bold text-slate-800">Team Productivity</h3>
            <p className="mb-4 text-xs text-slate-500">
              Orders + edits + successful scans combined per team member.
            </p>
            <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                {teamProductivityRows.length === 0 ? (
                  <p className="text-sm text-slate-500">No team activity in selected range.</p>
                ) : (
                  <ChartClientOnly height={300}>
                    <div className="h-[300px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={teamProductivityRows.slice(0, 8)}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="staff" tick={{ fontSize: 10 }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Legend />
                          <Bar dataKey="orders" name="Orders" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="edits" name="Edits" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="scans" name="Scans" fill="#10b981" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartClientOnly>
                )}
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px] text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-500">
                        <th className="px-2 py-2">Staff</th>
                        <th className="px-2 py-2">Orders</th>
                        <th className="px-2 py-2">Edits</th>
                        <th className="px-2 py-2">Scans</th>
                        <th className="px-2 py-2">Activity</th>
                        <th className="px-2 py-2">Revenue</th>
                      </tr>
                    </thead>
                    <tbody>
                      {teamProductivityRows.map((row) => (
                        <tr key={row.staff} className="border-b border-slate-100">
                          <td className="px-2 py-2 font-semibold text-slate-800">{row.staff}</td>
                          <td className="px-2 py-2">{row.orders}</td>
                          <td className="px-2 py-2 text-violet-700">{row.edits}</td>
                          <td className="px-2 py-2 text-emerald-700">{row.scans}</td>
                          <td className="px-2 py-2 font-bold">{row.activity}</td>
                          <td className="px-2 py-2">{formatBdt(row.revenue)}</td>
                        </tr>
                      ))}
                      {teamProductivityRows.length === 0 && (
                        <tr>
                          <td colSpan={6} className="px-2 py-6 text-center text-slate-500">
                            No productivity data in this range.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "web" && (
        <div className="space-y-4">
          <OrderReportStatsPanel
            mode="web"
            web={{
              total: webSourceOrders.length,
              inQueue: webReport.inQueue.length,
              released: webReport.released.length,
              conversionRate: webReport.conversionRate,
            }}
          />

          <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 font-bold text-slate-800">Web Order Funnel</h3>
              <ChartClientOnly height={300}>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={webReport.funnel}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="stage" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" name="Orders" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartClientOnly>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 font-bold text-slate-800">Queue Status Mix</h3>
              {webReport.queueByStatus.length === 0 ? (
                <p className="text-sm text-slate-500">No orders currently in web queue.</p>
              ) : (
                <ChartClientOnly height={300}>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={webReport.queueByStatus}
                          dataKey="count"
                          nameKey="label"
                          cx="50%"
                          cy="50%"
                          outerRadius={100}
                          label={(props) => {
                            const name = String(props.name ?? "");
                            const value = asNumber(props.value);
                            return `${name} ${value}`;
                          }}
                        >
                          {webReport.queueByStatus.map((entry, idx) => (
                            <Cell key={entry.status} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </ChartClientOnly>
              )}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 font-bold text-slate-800">Queue Aging</h3>
              <p className="mb-3 text-xs text-slate-500">
                Avg age in queue: {webReport.avgQueueAge.toFixed(1)} days
              </p>
              <ChartClientOnly height={280}>
                <div className="h-[280px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={webReport.agingChart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" name="Orders" fill="#f59e0b" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartClientOnly>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 font-bold text-slate-800">Stuck in Queue</h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-500">
                      <th className="px-2 py-2">Order</th>
                      <th className="px-2 py-2">Customer</th>
                      <th className="px-2 py-2">Status</th>
                      <th className="px-2 py-2">Age</th>
                      <th className="px-2 py-2">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {webReport.agingRows.map((row) => (
                      <tr key={row.orderId} className="border-b border-slate-100">
                        <td className="px-2 py-2 font-semibold text-slate-800">{row.orderId}</td>
                        <td className="px-2 py-2">
                          {row.customer}
                          <div className="text-xs text-slate-500">{row.phone}</div>
                        </td>
                        <td className="px-2 py-2">{row.status}</td>
                        <td className="px-2 py-2 font-bold text-amber-700">{row.ageDays}d</td>
                        <td className="px-2 py-2">{formatBdt(row.total)}</td>
                      </tr>
                    ))}
                    {webReport.agingRows.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-2 py-6 text-center text-slate-500">
                          No web queue orders in selected range.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="font-bold text-slate-800">Manual vs WooCommerce</h3>
                <Link
                  href="/dashboard/integration/woocommerce"
                  className="text-xs font-semibold text-indigo-600 hover:underline"
                >
                  Woo settings
                </Link>
              </div>
              {webReport.sourceMix.length === 0 ? (
                <p className="text-sm text-slate-500">No web orders in range.</p>
              ) : (
                <ChartClientOnly height={280}>
                  <div className="h-[280px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={webReport.sourceMix}
                          dataKey="count"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={95}
                          label={(props) => {
                            const name = String(props.name ?? "");
                            const value = asNumber(props.value);
                            return `${name} (${value})`;
                          }}
                        >
                          {webReport.sourceMix.map((entry, idx) => (
                            <Cell key={entry.key} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => asNumber(value)} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </ChartClientOnly>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 font-bold text-slate-800">Source Mix Table</h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[400px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-500">
                      <th className="px-2 py-2">Source</th>
                      <th className="px-2 py-2">Orders</th>
                      <th className="px-2 py-2">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {webReport.sourceMix.map((row) => (
                      <tr key={row.key} className="border-b border-slate-100">
                        <td className="px-2 py-2 font-semibold text-slate-800">{row.name}</td>
                        <td className="px-2 py-2">{row.count}</td>
                        <td className="px-2 py-2 font-bold">{formatBdt(row.revenue)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-slate-800">Order Block List</h3>
                <p className="text-xs text-slate-500">
                  {webReport.blockList.totalBlocks} blocks ·{" "}
                  {webReport.blockList.phoneBlocks} phone ·{" "}
                  {webReport.blockList.matchedInPeriod} matched in period
                </p>
              </div>
              <Link
                href="/dashboard/orders/web/block-list"
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-700 hover:bg-slate-100"
              >
                Manage blocks <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-500">
                    <th className="px-2 py-2">Type</th>
                    <th className="px-2 py-2">Value</th>
                    <th className="px-2 py-2">Reason</th>
                    <th className="px-2 py-2">Blocked</th>
                    <th className="px-2 py-2">Period Orders</th>
                  </tr>
                </thead>
                <tbody>
                  {webReport.blockList.rows.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100">
                      <td className="px-2 py-2">
                        <span className="rounded bg-rose-100 px-2 py-0.5 text-xs font-bold text-rose-700">
                          {row.type}
                        </span>
                      </td>
                      <td className="px-2 py-2 font-mono text-slate-800">{row.value}</td>
                      <td className="px-2 py-2 text-slate-600">{row.reason}</td>
                      <td className="px-2 py-2 text-xs text-slate-500">{row.date}</td>
                      <td className="px-2 py-2 font-bold text-amber-700">{row.matchedOrders}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === "approved_orders" && (
        <div className="space-y-4">
          <OrderReportStatsPanel mode="approved" report={approvedOrderReport} />

          <div className="rounded-2xl border border-indigo-100 bg-indigo-50/40 p-4">
            <h3 className="mb-1 font-bold text-slate-800">Operations</h3>
            <p className="mb-4 text-xs text-slate-500">
              Pipeline, source mix, daily velocity, and order edit activity.
            </p>

            <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h4 className="mb-3 font-bold text-slate-800">Order Status Pipeline</h4>
                {operationsReport.pipeline.length === 0 ? (
                  <p className="text-sm text-slate-500">No pipeline data in selected filter.</p>
                ) : (
                  <ChartClientOnly height={280}>
                    <div className="h-[280px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={operationsReport.pipeline}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar dataKey="count" name="Orders" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartClientOnly>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h4 className="mb-3 font-bold text-slate-800">Order Source Mix</h4>
                {operationsReport.sourceMix.length === 0 ? (
                  <p className="text-sm text-slate-500">No source data.</p>
                ) : (
                  <ChartClientOnly height={280}>
                    <div className="h-[280px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={operationsReport.sourceMix}
                            dataKey="orders"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={95}
                            label={(props) => {
                              const name = String(props.name ?? "");
                              const value = asNumber(props.value);
                              return `${name} ${value}`;
                            }}
                          >
                            {operationsReport.sourceMix.map((entry, idx) => (
                              <Cell key={entry.name} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartClientOnly>
                )}
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h4 className="mb-3 font-bold text-slate-800">Daily Order Velocity</h4>
                {operationsReport.velocity.length === 0 ? (
                  <p className="text-sm text-slate-500">No velocity data.</p>
                ) : (
                  <ChartClientOnly height={280}>
                    <div className="h-[280px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={operationsReport.velocity}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Legend />
                          <Line
                            type="monotone"
                            dataKey="created"
                            name="Created"
                            stroke="#4f46e5"
                            strokeWidth={2}
                            dot={false}
                          />
                          <Line
                            type="monotone"
                            dataKey="toCourier"
                            name="At Courier"
                            stroke="#10b981"
                            strokeWidth={2}
                            dot={false}
                          />
                        </LineChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartClientOnly>
                )}
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h4 className="mb-3 font-bold text-slate-800">Channel Mix</h4>
                {operationsReport.channelMix.length === 0 ? (
                  <p className="text-sm text-slate-500">No channel data.</p>
                ) : (
                  <ChartClientOnly height={280}>
                    <div className="h-[280px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={operationsReport.channelMix}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar dataKey="orders" name="Orders" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartClientOnly>
                )}
              </div>
            </div>

            <div className="mt-4 grid gap-4 lg:grid-cols-[0.9fr_1.1fr]">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h4 className="mb-3 font-bold text-slate-800">Edit Activity by Staff</h4>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[360px] text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-500">
                        <th className="px-2 py-2">Staff</th>
                        <th className="px-2 py-2">Edits</th>
                        <th className="px-2 py-2">Super Edit</th>
                      </tr>
                    </thead>
                    <tbody>
                      {operationsReport.editRows.map((row) => (
                        <tr key={row.actor} className="border-b border-slate-100">
                          <td className="px-2 py-2 font-semibold text-slate-800">{row.actor}</td>
                          <td className="px-2 py-2">{row.edits}</td>
                          <td className="px-2 py-2 text-indigo-700">{row.superEdits}</td>
                        </tr>
                      ))}
                      {operationsReport.editRows.length === 0 && (
                        <tr>
                          <td colSpan={3} className="px-2 py-6 text-center text-slate-500">
                            No edit activity in selected range.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <h4 className="mb-3 font-bold text-slate-800">Recent Order Changes</h4>
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[520px] text-sm">
                    <thead>
                      <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-500">
                        <th className="px-2 py-2">Order</th>
                        <th className="px-2 py-2">When</th>
                        <th className="px-2 py-2">Action</th>
                        <th className="px-2 py-2">By</th>
                      </tr>
                    </thead>
                    <tbody>
                      {operationsReport.recentEdits.map((row, idx) => (
                        <tr key={`${row.orderId}-${idx}`} className="border-b border-slate-100">
                          <td className="px-2 py-2 font-semibold text-slate-800">{row.orderId}</td>
                          <td className="px-2 py-2 text-xs text-slate-600">{row.at}</td>
                          <td className="px-2 py-2">{row.title}</td>
                          <td className="px-2 py-2">{row.actor}</td>
                        </tr>
                      ))}
                      {operationsReport.recentEdits.length === 0 && (
                        <tr>
                          <td colSpan={4} className="px-2 py-6 text-center text-slate-500">
                            No recent changes logged.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "preorder" && (
        <div className="space-y-4">
          <OrderReportStatsPanel
            mode="preorder"
            preorder={{
              total: preorderReport.total,
              open: preorderReport.open,
              overdue: preorderReport.overdue,
              dueSoon: preorderReport.dueSoon,
              totalValue: preorderReport.totalValue,
            }}
          />

          <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 font-bold text-slate-800">Preorder Reasons</h3>
              {preorderReport.byReason.length === 0 ? (
                <p className="text-sm text-slate-500">No preorder data in selected range.</p>
              ) : (
                <ChartClientOnly height={300}>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={preorderReport.byReason}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="count" name="Orders" fill="#8b5cf6" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </ChartClientOnly>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 font-bold text-slate-800">Scan Activity</h3>
              <p className="mb-2 text-xs text-slate-500">
                Persisted from Scan To Update page (success, failed, duplicate).
              </p>
              <div className="mb-3 grid grid-cols-4 gap-2 text-center text-xs">
                <div className="rounded-lg bg-slate-50 p-2">
                  <p className="text-slate-500">Total</p>
                  <p className="text-lg font-bold">{scanReport.total}</p>
                </div>
                <div className="rounded-lg bg-emerald-50 p-2">
                  <p className="text-emerald-700">Success</p>
                  <p className="text-lg font-bold text-emerald-700">{scanReport.success}</p>
                </div>
                <div className="rounded-lg bg-rose-50 p-2">
                  <p className="text-rose-700">Failed</p>
                  <p className="text-lg font-bold text-rose-700">{scanReport.failed}</p>
                </div>
                <div className="rounded-lg bg-amber-50 p-2">
                  <p className="text-amber-700">Duplicate</p>
                  <p className="text-lg font-bold text-amber-700">{scanReport.duplicate}</p>
                </div>
              </div>
              <ChartClientOnly height={260}>
                <div className="h-[260px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={scanReport.outcomeChart}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                      <Tooltip />
                      <Bar dataKey="count" name="Scans" fill="#10b981" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartClientOnly>
            </div>
          </div>
        </div>
      )}

      {tab === "inventory" && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="glass-card rounded-2xl p-4">
              <p className="text-sm text-slate-500">Products</p>
              <p className="text-2xl font-bold text-slate-900">
                {inventoryReport.health.totalProducts}
              </p>
            </div>
            <div className="glass-card rounded-2xl p-4">
              <p className="text-sm text-slate-500">Low Stock</p>
              <p className="text-2xl font-bold text-amber-700">
                {inventoryReport.health.lowStock}
              </p>
            </div>
            <div className="glass-card rounded-2xl p-4">
              <p className="text-sm text-slate-500">Out of Stock</p>
              <p className="text-2xl font-bold text-rose-700">
                {inventoryReport.health.outOfStock}
              </p>
            </div>
            <div className="glass-card rounded-2xl p-4">
              <p className="text-sm text-slate-500">Net Stock Change</p>
              <p
                className={clsx(
                  "text-2xl font-bold",
                  inventoryReport.summary.netChange >= 0 ? "text-emerald-700" : "text-rose-700"
                )}
              >
                {inventoryReport.summary.netChange >= 0 ? "+" : ""}
                {inventoryReport.summary.netChange}
              </p>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="glass-card rounded-2xl p-4">
              <p className="text-sm text-slate-500">Stock Value (Cost)</p>
              <p className="text-2xl font-bold text-indigo-700">
                {formatBdt(inventoryReport.valuation.costValue)}
              </p>
            </div>
            <div className="glass-card rounded-2xl p-4">
              <p className="text-sm text-slate-500">Stock Value (Retail)</p>
              <p className="text-2xl font-bold text-emerald-700">
                {formatBdt(inventoryReport.valuation.retailValue)}
              </p>
            </div>
            <div className="glass-card rounded-2xl p-4">
              <p className="text-sm text-slate-500">Potential Margin</p>
              <p className="text-2xl font-bold text-amber-700">
                {formatBdt(inventoryReport.valuation.potentialMargin)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {inventoryReport.valuation.marginPct.toFixed(1)}% on retail
              </p>
            </div>
            <div className="glass-card rounded-2xl p-4">
              <p className="text-sm text-slate-500">Dead Stock (Cost)</p>
              <p className="text-2xl font-bold text-rose-700">
                {formatBdt(inventoryReport.valuation.deadStockCost)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {inventoryReport.valuation.deadStockProducts} products ·{" "}
                {inventoryReport.valuation.deadStockUnits} units
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <div>
                <h3 className="font-bold text-slate-800">Item-wise Profit</h3>
                <p className="text-xs text-slate-500">
                  From delivered & partial orders in selected range · returns deducted
                </p>
              </div>
              {inventoryReport.itemProfit.summary.bestItem && (
                <p className="text-xs text-slate-500">
                  Top earner:{" "}
                  <span className="font-semibold text-emerald-700">
                    {inventoryReport.itemProfit.summary.bestItem.name}
                  </span>{" "}
                  ({formatBdt(inventoryReport.itemProfit.summary.bestItem.profit)})
                </p>
              )}
            </div>

            <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Gross Profit</p>
                <p
                  className={clsx(
                    "text-xl font-bold",
                    inventoryReport.itemProfit.summary.grossProfit >= 0
                      ? "text-emerald-700"
                      : "text-rose-700"
                  )}
                >
                  {formatBdt(inventoryReport.itemProfit.summary.grossProfit)}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Item Revenue</p>
                <p className="text-xl font-bold text-indigo-700">
                  {formatBdt(inventoryReport.itemProfit.summary.totalRevenue)}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Avg Margin</p>
                <p className="text-xl font-bold text-amber-700">
                  {inventoryReport.itemProfit.summary.avgMargin.toFixed(1)}%
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Units Sold</p>
                <p className="text-xl font-bold text-slate-800">
                  {inventoryReport.itemProfit.summary.itemsSold}
                </p>
                <p className="mt-0.5 text-[11px] text-slate-500">
                  {inventoryReport.itemProfit.summary.uniqueProducts} products
                  {inventoryReport.itemProfit.summary.lossMakingCount > 0 &&
                    ` · ${inventoryReport.itemProfit.summary.lossMakingCount} loss`}
                </p>
              </div>
            </div>

            <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
              <div className="overflow-x-auto">
                <table className="w-full min-w-[720px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-500">
                      <th className="px-2 py-2">Product</th>
                      <th className="px-2 py-2">Qty</th>
                      <th className="px-2 py-2">Revenue</th>
                      <th className="px-2 py-2">COGS</th>
                      <th className="px-2 py-2">Profit</th>
                      <th className="px-2 py-2">Margin</th>
                      <th className="px-2 py-2">Orders</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryReport.itemProfit.rows.slice(0, 20).map((row) => (
                      <tr key={row.productId} className="border-b border-slate-100">
                        <td className="px-2 py-2">
                          <div className="font-semibold text-slate-800">{row.name}</div>
                          <div className="text-xs text-slate-500">
                            {row.code} · {row.category}
                          </div>
                        </td>
                        <td className="px-2 py-2">
                          {row.qtySold}
                          {row.qtyReturned > 0 && (
                            <span className="ml-1 text-xs text-rose-600">
                              (-{row.qtyReturned})
                            </span>
                          )}
                        </td>
                        <td className="px-2 py-2">{formatBdt(row.revenue)}</td>
                        <td className="px-2 py-2 text-slate-600">{formatBdt(row.cogs)}</td>
                        <td
                          className={clsx(
                            "px-2 py-2 font-bold",
                            row.grossProfit >= 0 ? "text-emerald-700" : "text-rose-700"
                          )}
                        >
                          {formatBdt(row.grossProfit)}
                        </td>
                        <td className="px-2 py-2">{row.marginPct.toFixed(1)}%</td>
                        <td className="px-2 py-2">{row.orderCount}</td>
                      </tr>
                    ))}
                    {inventoryReport.itemProfit.rows.length === 0 && (
                      <tr>
                        <td colSpan={7} className="px-2 py-6 text-center text-slate-500">
                          No delivered sales in this period yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>

              <div>
                <h4 className="mb-2 text-sm font-bold text-slate-700">Top by Gross Profit</h4>
                {inventoryReport.itemProfit.topByProfit.length === 0 ? (
                  <p className="text-sm text-slate-500">No profit data for this range.</p>
                ) : (
                  <ChartClientOnly height={280}>
                    <div className="h-[280px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          data={inventoryReport.itemProfit.topByProfit}
                          layout="vertical"
                          margin={{ left: 8, right: 12 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis
                            type="number"
                            tick={{ fontSize: 10 }}
                            tickFormatter={(v) => formatCompactBdt(asNumber(v))}
                          />
                          <YAxis
                            type="category"
                            dataKey="name"
                            width={96}
                            tick={{ fontSize: 10 }}
                          />
                          <Tooltip formatter={(value) => formatBdt(asNumber(value))} />
                          <Bar
                            dataKey="profit"
                            name="Gross Profit"
                            fill="#10b981"
                            radius={[0, 6, 6, 0]}
                          />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartClientOnly>
                )}

                {inventoryReport.itemProfit.byCategory.length > 0 && (
                  <div className="mt-4 overflow-x-auto">
                    <h4 className="mb-2 text-sm font-bold text-slate-700">Profit by Category</h4>
                    <table className="w-full min-w-[320px] text-sm">
                      <thead>
                        <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-500">
                          <th className="px-2 py-2">Category</th>
                          <th className="px-2 py-2">Qty</th>
                          <th className="px-2 py-2">Profit</th>
                          <th className="px-2 py-2">Margin</th>
                        </tr>
                      </thead>
                      <tbody>
                        {inventoryReport.itemProfit.byCategory.slice(0, 8).map((row) => (
                          <tr key={row.id} className="border-b border-slate-100">
                            <td className="px-2 py-2 font-semibold text-slate-800">{row.name}</td>
                            <td className="px-2 py-2">{row.qtySold}</td>
                            <td className="px-2 py-2 font-bold text-emerald-700">
                              {formatBdt(row.grossProfit)}
                            </td>
                            <td className="px-2 py-2">{row.marginPct.toFixed(1)}%</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 font-bold text-slate-800">Stock Movement Trend</h3>
              {inventoryReport.movementTrend.length === 0 ? (
                <p className="text-sm text-slate-500">No stock movements in selected range.</p>
              ) : (
                <ChartClientOnly height={300}>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={inventoryReport.movementTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                        <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                        <Tooltip />
                        <Bar dataKey="in" name="Stock In" fill="#10b981" radius={[6, 6, 0, 0]} />
                        <Bar dataKey="out" name="Stock Out" fill="#ef4444" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </ChartClientOnly>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 font-bold text-slate-800">Movement Summary</h3>
              <div className="grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Units Sold</p>
                  <p className="text-xl font-bold text-rose-700">
                    {inventoryReport.summary.unitsSold}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Units Purchased</p>
                  <p className="text-xl font-bold text-emerald-700">
                    {inventoryReport.summary.unitsIn}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Returns</p>
                  <p className="text-xl font-bold text-indigo-700">
                    {inventoryReport.summary.returns}
                  </p>
                </div>
                <div className="rounded-xl bg-slate-50 p-3">
                  <p className="text-xs text-slate-500">Movements</p>
                  <p className="text-xl font-bold text-slate-800">
                    {inventoryReport.summary.totalMovements}
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 font-bold text-slate-800">Top Product Performance</h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-500">
                      <th className="px-2 py-2">Product</th>
                      <th className="px-2 py-2">Grade</th>
                      <th className="px-2 py-2">Sold Qty</th>
                      <th className="px-2 py-2">Revenue</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryReport.topProducts.map((row) => (
                      <tr key={row.product.id} className="border-b border-slate-100">
                        <td className="px-2 py-2">
                          <div className="font-semibold text-slate-800">{row.product.name}</div>
                          <div className="text-xs text-slate-500">{row.product.code}</div>
                        </td>
                        <td className="px-2 py-2">
                          <span
                            className={clsx(
                              "rounded px-2 py-0.5 text-xs font-bold",
                              row.grade === "A"
                                ? "bg-emerald-100 text-emerald-700"
                                : row.grade === "B"
                                  ? "bg-amber-100 text-amber-700"
                                  : "bg-slate-100 text-slate-600"
                            )}
                          >
                            {row.grade}
                          </span>
                        </td>
                        <td className="px-2 py-2">{row.soldQty}</td>
                        <td className="px-2 py-2 font-bold">{formatBdt(row.revenue)}</td>
                      </tr>
                    ))}
                    {inventoryReport.topProducts.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-2 py-6 text-center text-slate-500">
                          No product performance data yet.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 font-bold text-slate-800">Low Stock Alerts</h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-500">
                      <th className="px-2 py-2">Product</th>
                      <th className="px-2 py-2">Stock</th>
                      <th className="px-2 py-2">Alert</th>
                      <th className="px-2 py-2">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryReport.lowStock.map((row) => (
                      <tr key={row.product.id} className="border-b border-slate-100">
                        <td className="px-2 py-2 font-semibold text-slate-800">{row.product.name}</td>
                        <td className="px-2 py-2">{row.product.stockQty}</td>
                        <td className="px-2 py-2">{row.product.alertQty}</td>
                        <td className="px-2 py-2 capitalize">{row.status}</td>
                      </tr>
                    ))}
                    {inventoryReport.lowStock.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-2 py-6 text-center text-slate-500">
                          No low stock alerts.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 font-bold text-slate-800">Value by Category</h3>
              {inventoryReport.categories.length === 0 ? (
                <p className="text-sm text-slate-500">No category data yet.</p>
              ) : (
                <ChartClientOnly height={300}>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={inventoryReport.categories.slice(0, 10)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCompactBdt(asNumber(v))} />
                        <Tooltip formatter={(value) => formatBdt(asNumber(value))} />
                        <Bar dataKey="costValue" name="Cost Value" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </ChartClientOnly>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 font-bold text-slate-800">Value by Brand</h3>
              {inventoryReport.brands.length === 0 ? (
                <p className="text-sm text-slate-500">No brand data yet.</p>
              ) : (
                <ChartClientOnly height={300}>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={inventoryReport.brands.slice(0, 10)}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCompactBdt(asNumber(v))} />
                        <Tooltip formatter={(value) => formatBdt(asNumber(value))} />
                        <Bar dataKey="costValue" name="Cost Value" fill="#06b6d4" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </ChartClientOnly>
              )}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 font-bold text-slate-800">Category Breakdown</h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-500">
                      <th className="px-2 py-2">Category</th>
                      <th className="px-2 py-2">Products</th>
                      <th className="px-2 py-2">Units</th>
                      <th className="px-2 py-2">Cost</th>
                      <th className="px-2 py-2">Retail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryReport.categories.slice(0, 12).map((row) => (
                      <tr key={row.id} className="border-b border-slate-100">
                        <td className="px-2 py-2 font-semibold text-slate-800">{row.name}</td>
                        <td className="px-2 py-2">{row.productCount}</td>
                        <td className="px-2 py-2">{row.stockUnits}</td>
                        <td className="px-2 py-2 font-bold">{formatBdt(row.costValue)}</td>
                        <td className="px-2 py-2">{formatBdt(row.retailValue)}</td>
                      </tr>
                    ))}
                    {inventoryReport.categories.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-2 py-6 text-center text-slate-500">
                          No categories found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 font-bold text-slate-800">Dead Stock</h3>
              <p className="mb-3 text-xs text-slate-500">
                In-stock products with no recorded sale (stock decrease) movement.
              </p>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-500">
                      <th className="px-2 py-2">Product</th>
                      <th className="px-2 py-2">Qty</th>
                      <th className="px-2 py-2">Cost Value</th>
                      <th className="px-2 py-2">Retail</th>
                    </tr>
                  </thead>
                  <tbody>
                    {inventoryReport.deadStock.rows.map((row) => (
                      <tr key={row.product.id} className="border-b border-slate-100">
                        <td className="px-2 py-2">
                          <div className="font-semibold text-slate-800">{row.product.name}</div>
                          <div className="text-xs text-slate-500">{row.product.code}</div>
                        </td>
                        <td className="px-2 py-2">{row.stockQty}</td>
                        <td className="px-2 py-2 font-bold text-rose-700">
                          {formatBdt(row.costValue)}
                        </td>
                        <td className="px-2 py-2">{formatBdt(row.retailValue)}</td>
                      </tr>
                    ))}
                    {inventoryReport.deadStock.rows.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-2 py-6 text-center text-slate-500">
                          No dead stock detected.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
      )}

      {tab === "integrations" && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="glass-card rounded-2xl p-4">
              <p className="text-sm text-slate-500">WooCommerce</p>
              <p
                className={clsx(
                  "text-2xl font-bold",
                  integrationsReport.woo.connected ? "text-emerald-700" : "text-slate-500"
                )}
              >
                {integrationsReport.woo.connected ? "Connected" : "Not connected"}
              </p>
            </div>
            <div className="glass-card rounded-2xl p-4">
              <p className="text-sm text-slate-500">SMS Service</p>
              <p
                className={clsx(
                  "text-2xl font-bold",
                  integrationsReport.sms.enabled ? "text-emerald-700" : "text-slate-500"
                )}
              >
                {integrationsReport.sms.enabled ? "On" : "Off"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Balance: {integrationsReport.sms.balance} SMS
              </p>
            </div>
            <div className="glass-card rounded-2xl p-4">
              <p className="text-sm text-slate-500">Auto Call</p>
              <p
                className={clsx(
                  "text-2xl font-bold",
                  integrationsReport.autoCall.enabled ? "text-emerald-700" : "text-slate-500"
                )}
              >
                {integrationsReport.autoCall.enabled ? "On" : "Off"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Balance: {formatBdt(integrationsReport.autoCall.balanceTaka)}
              </p>
            </div>
            <div className="glass-card rounded-2xl p-4">
              <p className="text-sm text-slate-500">Stock Sync</p>
              <p
                className={clsx(
                  "text-2xl font-bold",
                  integrationsReport.woo.stockSyncEnabled ? "text-indigo-700" : "text-slate-500"
                )}
              >
                {integrationsReport.woo.stockSyncEnabled ? "Enabled" : "Disabled"}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                OK {integrationsReport.woo.stockSuccess} · Fail {integrationsReport.woo.stockFailed}
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-bold text-slate-800">SMS Analytics</h3>
              <Link
                href="/dashboard/integration/sms"
                className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-700 hover:underline"
              >
                Open SMS <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="mb-4 grid gap-3 sm:grid-cols-4">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Sent</p>
                <p className="text-xl font-bold">{integrationsReport.sms.total}</p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-3">
                <p className="text-xs text-emerald-700">Delivered</p>
                <p className="text-xl font-bold text-emerald-700">
                  {integrationsReport.sms.delivered}
                </p>
              </div>
              <div className="rounded-xl bg-rose-50 p-3">
                <p className="text-xs text-rose-700">Failed</p>
                <p className="text-xl font-bold text-rose-700">
                  {integrationsReport.sms.failed}
                </p>
              </div>
              <div className="rounded-xl bg-indigo-50 p-3">
                <p className="text-xs text-indigo-700">Cost</p>
                <p className="text-xl font-bold text-indigo-700">
                  {formatBdt(integrationsReport.sms.cost)}
                </p>
              </div>
            </div>
            <p className="mb-3 text-xs text-slate-500">
              Auto SMS rules enabled: {integrationsReport.sms.autoEnabled} /{" "}
              {integrationsReport.sms.autoTotal}
            </p>
            <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
              <div>
                {integrationsReport.sms.dailyTrend.length === 0 ? (
                  <p className="text-sm text-slate-500">No SMS activity in selected range.</p>
                ) : (
                  <ChartClientOnly height={260}>
                    <div className="h-[260px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={integrationsReport.sms.dailyTrend}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar dataKey="count" name="SMS" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartClientOnly>
                )}
              </div>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[420px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-500">
                      <th className="px-2 py-2">Phone</th>
                      <th className="px-2 py-2">Type</th>
                      <th className="px-2 py-2">Status</th>
                      <th className="px-2 py-2">When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {integrationsReport.sms.recent.map((row) => (
                      <tr key={row.id} className="border-b border-slate-100">
                        <td className="px-2 py-2">{row.phone}</td>
                        <td className="px-2 py-2">{row.type}</td>
                        <td className="px-2 py-2 capitalize">{row.status}</td>
                        <td className="px-2 py-2 text-xs text-slate-600">{row.sentAt}</td>
                      </tr>
                    ))}
                    {integrationsReport.sms.recent.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-2 py-6 text-center text-slate-500">
                          No SMS logs in range.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-bold text-slate-800">Auto Call Analytics</h3>
              <Link
                href="/dashboard/integration/auto-call"
                className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-700 hover:underline"
              >
                Open Auto Call <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Total Calls</p>
                <p className="text-xl font-bold">{integrationsReport.autoCall.stats.totalCalls}</p>
              </div>
              <div className="rounded-xl bg-emerald-50 p-3">
                <p className="text-xs text-emerald-700">Pressed 1</p>
                <p className="text-xl font-bold text-emerald-700">
                  {integrationsReport.autoCall.stats.success}
                </p>
              </div>
              <div className="rounded-xl bg-violet-50 p-3">
                <p className="text-xs text-violet-700">Pressed 2</p>
                <p className="text-xl font-bold text-violet-700">
                  {integrationsReport.autoCall.stats.pressed2}
                </p>
              </div>
              <div className="rounded-xl bg-rose-50 p-3">
                <p className="text-xs text-rose-700">Failed</p>
                <p className="text-xl font-bold text-rose-700">
                  {integrationsReport.autoCall.stats.failed}
                </p>
              </div>
              <div className="rounded-xl bg-indigo-50 p-3">
                <p className="text-xs text-indigo-700">Success Rate</p>
                <p className="text-xl font-bold text-indigo-700">
                  {integrationsReport.autoCall.stats.successRate.toFixed(1)}%
                </p>
              </div>
            </div>
            <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
              <div>
                {integrationsReport.autoCall.breakdown.length === 0 ? (
                  <p className="text-sm text-slate-500">No auto call data in selected range.</p>
                ) : (
                  <ChartClientOnly height={280}>
                    <div className="h-[280px] w-full">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={integrationsReport.autoCall.breakdown}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                          <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                          <YAxis allowDecimals={false} tick={{ fontSize: 11 }} />
                          <Tooltip />
                          <Bar dataKey="count" name="Calls" radius={[6, 6, 0, 0]}>
                            {integrationsReport.autoCall.breakdown.map((row) => (
                              <Cell key={row.id} fill={row.color} />
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </ChartClientOnly>
                )}
              </div>
              <div>
                <p className="mb-2 text-sm font-semibold text-slate-700">Call Source Mix</p>
                <div className="space-y-2">
                  {integrationsReport.autoCall.sourceMix.map((row) => (
                    <div
                      key={row.id}
                      className="flex items-center justify-between rounded-lg bg-slate-50 px-3 py-2 text-sm"
                    >
                      <span className="font-medium text-slate-700">{row.label}</span>
                      <span className="font-bold text-slate-900">
                        {row.count} ({row.percent.toFixed(0)}%)
                      </span>
                    </div>
                  ))}
                </div>
                <p className="mt-3 text-xs text-slate-500">
                  Confirmed via Press 1: {integrationsReport.autoCall.confirmed.confirmedCount} ·
                  Delivered: {integrationsReport.autoCall.confirmed.delivered} · Batches:{" "}
                  {integrationsReport.autoCall.runs.length}
                </p>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
              <h3 className="font-bold text-slate-800">WooCommerce & Sync Health</h3>
              <Link
                href="/dashboard/integration/woocommerce"
                className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-700 hover:underline"
              >
                Open WooCommerce <ExternalLink className="h-3.5 w-3.5" />
              </Link>
            </div>
            <div className="mb-4 grid gap-3 sm:grid-cols-3">
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Store</p>
                <p className="truncate text-sm font-bold text-slate-800">
                  {integrationsReport.woo.storeUrl || "—"}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Sync Mode</p>
                <p className="text-sm font-bold text-slate-800">
                  {integrationsReport.woo.syncViaPlugin ? "Plugin webhook" : "REST API"}
                </p>
              </div>
              <div className="rounded-xl bg-slate-50 p-3">
                <p className="text-xs text-slate-500">Last Stock Sync</p>
                <p className="text-sm font-bold text-slate-800">
                  {integrationsReport.woo.lastStockSync ?? "Never"}
                </p>
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[520px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-500">
                    <th className="px-2 py-2">When</th>
                    <th className="px-2 py-2">Level</th>
                    <th className="px-2 py-2">Message</th>
                  </tr>
                </thead>
                <tbody>
                  {integrationsReport.woo.recentLogs.map((row, idx) => (
                    <tr key={`${row.at}-${idx}`} className="border-b border-slate-100">
                      <td className="px-2 py-2 text-xs text-slate-600">{row.at}</td>
                      <td className="px-2 py-2">
                        <span
                          className={clsx(
                            "rounded px-2 py-0.5 text-xs font-bold capitalize",
                            row.level === "success" && "bg-emerald-100 text-emerald-700",
                            row.level === "error" && "bg-rose-100 text-rose-700",
                            row.level === "info" && "bg-slate-100 text-slate-600"
                          )}
                        >
                          {row.level}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-slate-700">{row.message}</td>
                    </tr>
                  ))}
                  {integrationsReport.woo.recentLogs.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-2 py-6 text-center text-slate-500">
                        No WooCommerce logs in selected range.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {tab === "marketing" && (
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="glass-card rounded-2xl p-4">
              <p className="text-sm text-slate-500">Ad Spend</p>
              <p className="text-2xl font-bold text-rose-700">{formatBdt(marketingReport.adSpend)}</p>
            </div>
            <div className="glass-card rounded-2xl p-4">
              <p className="text-sm text-slate-500">Attributed Revenue</p>
              <p className="text-2xl font-bold text-emerald-700">
                {formatBdt(marketingReport.revenue)}
              </p>
            </div>
            <div className="glass-card rounded-2xl p-4">
              <p className="text-sm text-slate-500">ROAS</p>
              <p className="text-2xl font-bold text-indigo-700">
                {marketingReport.roas.toFixed(2)}x
              </p>
            </div>
            <div className="glass-card rounded-2xl p-4">
              <p className="text-sm text-slate-500">Meta Orders</p>
              <p className="text-2xl font-bold text-slate-900">{marketingReport.orders}</p>
              <p className="mt-1 text-xs text-slate-500">
                CPA {formatBdt(marketingReport.costPerOrder)}
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <div className="mb-3 flex items-center justify-between gap-2">
                <h3 className="font-bold text-slate-800">Spend vs Revenue Trend</h3>
                <Link
                  href="/dashboard/meta-ads"
                  className="inline-flex items-center gap-1 text-sm font-semibold text-indigo-700 hover:underline"
                >
                  Meta Ads <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              </div>
              {marketingReport.dailyTrend.length === 0 ? (
                <p className="text-sm text-slate-500">No marketing data in selected range.</p>
              ) : (
                <ChartClientOnly height={300}>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={marketingReport.dailyTrend}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="date" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCompactBdt(asNumber(v))} />
                        <Tooltip formatter={(value) => formatBdt(asNumber(value))} />
                        <Legend />
                        <Line
                          type="monotone"
                          dataKey="spend"
                          name="Ad Spend"
                          stroke="#ef4444"
                          strokeWidth={2}
                          dot={false}
                        />
                        <Line
                          type="monotone"
                          dataKey="revenue"
                          name="Revenue"
                          stroke="#10b981"
                          strokeWidth={2}
                          dot={false}
                        />
                      </LineChart>
                    </ResponsiveContainer>
                  </div>
                </ChartClientOnly>
              )}
              <p className="mt-2 text-xs text-slate-500">
                Ad spend from accounting (category: ad). Revenue from orders tagged Facebook,
                Instagram, Messenger, or TikTok.
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 font-bold text-slate-800">Revenue by Source</h3>
              {marketingReport.bySource.length === 0 ? (
                <p className="text-sm text-slate-500">No attributed orders in range.</p>
              ) : (
                <ChartClientOnly height={300}>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={marketingReport.bySource}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCompactBdt(asNumber(v))} />
                        <Tooltip formatter={(value) => formatBdt(asNumber(value))} />
                        <Bar dataKey="revenue" name="Revenue" fill="#1877F2" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </ChartClientOnly>
              )}
            </div>
          </div>
        </div>
      )}

      {tab === "accounting" && (
        <div className="space-y-4">
          <AccountingPlOverview
            pl={accountingPl}
            cashFlow={accountingCashFlow}
            accRange={accRange}
            accFrom={accFrom}
            accTo={accTo}
            onAccRangeChange={setAccRange}
            onAccFromChange={setAccFrom}
            onAccToChange={setAccTo}
          />

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 font-bold text-slate-800">P&L Chart</h3>
            <ChartClientOnly height={280}>
              <div className="h-[280px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart
                    data={[
                      { name: "Sales", amount: accountingPl.revenue, fill: "#64748b" },
                      { name: "COGS", amount: accountingPl.cogs, fill: "#f59e0b" },
                      { name: "Gross", amount: accountingPl.grossProfit, fill: "#10b981" },
                      { name: "Expense", amount: accountingPl.expense, fill: "#ef4444" },
                      { name: "Net", amount: accountingPl.netProfit, fill: "#4f46e5" },
                    ]}
                  >
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCompactBdt(asNumber(v))} />
                    <Tooltip formatter={(value) => formatBdt(asNumber(value))} />
                    <Bar dataKey="amount" name="Amount" radius={[6, 6, 0, 0]}>
                      {[
                        { fill: "#64748b" },
                        { fill: "#f59e0b" },
                        { fill: "#10b981" },
                        { fill: "#ef4444" },
                        { fill: "#4f46e5" },
                      ].map((entry, idx) => (
                        <Cell key={idx} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </ChartClientOnly>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
              Business Snapshot
            </h3>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="glass-card rounded-2xl p-4">
              <p className="text-sm text-slate-500">All-time Net Profit</p>
              <p
                className={clsx(
                  "text-2xl font-bold",
                  accountingSummary.netProfit >= 0 ? "text-emerald-700" : "text-rose-700"
                )}
              >
                {formatBdt(accountingSummary.netProfit)}
              </p>
            </div>
            <div className="glass-card rounded-2xl p-4">
              <p className="text-sm text-slate-500">Cash & Accounts</p>
              <p className="text-2xl font-bold text-indigo-700">{formatBdt(accountingSummary.cashBalance)}</p>
            </div>
            <div className="glass-card rounded-2xl p-4">
              <p className="text-sm text-slate-500">Total Assets</p>
              <p className="text-2xl font-bold text-amber-700">{formatBdt(accountingSummary.totalAssets)}</p>
            </div>
            <div className="glass-card rounded-2xl p-4">
              <p className="text-sm text-slate-500">Total Liabilities</p>
              <p className="text-2xl font-bold text-rose-700">{formatBdt(accountingSummary.totalLiabilities)}</p>
            </div>
          </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
              Invoices & Collections
            </h3>
          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="glass-card rounded-2xl p-4">
              <p className="text-sm text-slate-500">Period Invoiced</p>
              <p className="text-2xl font-bold text-slate-900">
                {formatBdt(accountingDepthReport.invoiceCollection.invoiced)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                {accountingDepthReport.invoiceCollection.count} invoices
              </p>
            </div>
            <div className="glass-card rounded-2xl p-4">
              <p className="text-sm text-slate-500">Period Collected</p>
              <p className="text-2xl font-bold text-emerald-700">
                {formatBdt(accountingDepthReport.invoiceCollection.collected)}
              </p>
            </div>
            <div className="glass-card rounded-2xl p-4">
              <p className="text-sm text-slate-500">Outstanding Due</p>
              <p className="text-2xl font-bold text-rose-700">
                {formatBdt(accountingDepthReport.invoiceCollection.due)}
              </p>
            </div>
            <div className="glass-card rounded-2xl p-4">
              <p className="text-sm text-slate-500">Collection Rate</p>
              <p className="text-2xl font-bold text-indigo-700">
                {accountingDepthReport.invoiceCollection.collectionRate.toFixed(1)}%
              </p>
            </div>
          </div>
          </div>

          <div>
            <h3 className="mb-3 text-sm font-bold uppercase tracking-wide text-slate-500">
              Accounts & Liabilities
            </h3>
          <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 font-bold text-slate-800">Account Balances</h3>
              {accountingDepthReport.accountBalances.length === 0 ? (
                <p className="text-sm text-slate-500">No accounts configured.</p>
              ) : (
                <ChartClientOnly height={300}>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart
                        data={accountingDepthReport.accountBalances
                          .filter((row) => row.active)
                          .slice(0, 10)}
                      >
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCompactBdt(asNumber(v))} />
                        <Tooltip formatter={(value) => formatBdt(asNumber(value))} />
                        <Bar dataKey="balance" name="Balance" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </ChartClientOnly>
              )}
              <p className="mt-2 text-xs text-slate-500">
                Active accounts total: {formatBdt(accountingDepthReport.activeAccountTotal)}
              </p>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 font-bold text-slate-800">Liability Aging</h3>
              {accountingDepthReport.liabilityAging.count === 0 ? (
                <p className="text-sm text-slate-500">No outstanding liabilities.</p>
              ) : (
                <ChartClientOnly height={300}>
                  <div className="h-[300px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={accountingDepthReport.liabilityAging.chart}>
                        <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                        <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                        <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCompactBdt(asNumber(v))} />
                        <Tooltip formatter={(value) => formatBdt(asNumber(value))} />
                        <Bar dataKey="amount" name="Outstanding" fill="#ef4444" radius={[6, 6, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </ChartClientOnly>
              )}
              <p className="mt-2 text-xs text-slate-500">
                Total outstanding: {formatBdt(accountingDepthReport.liabilityAging.totalOutstanding)} ·{" "}
                {accountingDepthReport.liabilityAging.count} liabilities
              </p>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 font-bold text-slate-800">Account-wise Balance</h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-500">
                      <th className="px-2 py-2">Account</th>
                      <th className="px-2 py-2">Type</th>
                      <th className="px-2 py-2">Status</th>
                      <th className="px-2 py-2">Balance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accountingDepthReport.accountBalances.map((row) => (
                      <tr key={row.id} className="border-b border-slate-100">
                        <td className="px-2 py-2 font-semibold text-slate-800">{row.name}</td>
                        <td className="px-2 py-2 text-slate-600">{row.typeLabel}</td>
                        <td className="px-2 py-2">
                          <span
                            className={clsx(
                              "rounded px-2 py-0.5 text-xs font-bold",
                              row.active
                                ? "bg-emerald-100 text-emerald-700"
                                : "bg-slate-100 text-slate-500"
                            )}
                          >
                            {row.active ? "Active" : "Inactive"}
                          </span>
                        </td>
                        <td
                          className={clsx(
                            "px-2 py-2 font-bold",
                            row.balance >= 0 ? "text-indigo-700" : "text-rose-700"
                          )}
                        >
                          {formatBdt(row.balance)}
                        </td>
                      </tr>
                    ))}
                    {accountingDepthReport.accountBalances.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-2 py-6 text-center text-slate-500">
                          No accounts found.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 font-bold text-slate-800">Invoice vs Collection</h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-500">
                      <th className="px-2 py-2">Invoice</th>
                      <th className="px-2 py-2">Customer</th>
                      <th className="px-2 py-2">Invoiced</th>
                      <th className="px-2 py-2">Collected</th>
                      <th className="px-2 py-2">Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accountingDepthReport.invoiceCollection.rows.slice(0, 12).map((row) => (
                      <tr key={row.id} className="border-b border-slate-100">
                        <td className="px-2 py-2 font-semibold text-slate-800">{row.invoiceNumber}</td>
                        <td className="px-2 py-2 text-slate-700">{row.customerName}</td>
                        <td className="px-2 py-2">{formatBdt(row.invoiced)}</td>
                        <td className="px-2 py-2 text-emerald-700">{formatBdt(row.collected)}</td>
                        <td
                          className={clsx(
                            "px-2 py-2 font-bold",
                            row.due > 0 ? "text-rose-700" : "text-slate-500"
                          )}
                        >
                          {formatBdt(row.due)}
                        </td>
                      </tr>
                    ))}
                    {accountingDepthReport.invoiceCollection.rows.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-2 py-6 text-center text-slate-500">
                          No invoices in selected accounting range.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 font-bold text-slate-800">Liability Aging Detail</h3>
            <div className="overflow-x-auto">
              <table className="w-full min-w-[640px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-500">
                    <th className="px-2 py-2">Creditor</th>
                    <th className="px-2 py-2">Type</th>
                    <th className="px-2 py-2">Due Date</th>
                    <th className="px-2 py-2">Bucket</th>
                    <th className="px-2 py-2">Outstanding</th>
                  </tr>
                </thead>
                <tbody>
                  {accountingDepthReport.liabilityRows.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100">
                      <td className="px-2 py-2 font-semibold text-slate-800">{row.name}</td>
                      <td className="px-2 py-2 text-slate-600">{row.typeLabel}</td>
                      <td className="px-2 py-2">{row.dueDate ?? "—"}</td>
                      <td className="px-2 py-2">
                        <span
                          className={clsx(
                            "rounded px-2 py-0.5 text-xs font-bold",
                            row.bucket === "current"
                              ? "bg-emerald-100 text-emerald-700"
                              : row.bucket === "90+"
                                ? "bg-rose-100 text-rose-700"
                                : "bg-amber-100 text-amber-700"
                          )}
                        >
                          {LIABILITY_AGING_LABELS[row.bucket]}
                        </span>
                      </td>
                      <td className="px-2 py-2 font-bold text-rose-700">
                        {formatBdt(row.outstanding)}
                      </td>
                    </tr>
                  ))}
                  {accountingDepthReport.liabilityRows.length === 0 && (
                    <tr>
                      <td colSpan={5} className="px-2 py-6 text-center text-slate-500">
                        No outstanding liabilities.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 font-bold text-slate-800">Accounting Options Value Chart</h3>
              <ChartClientOnly height={340}>
                <div className="h-[340px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={accountingChartData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCompactBdt(asNumber(v))} />
                      <Tooltip formatter={(value) => `${formatBdt(asNumber(value))} (${formatCompactBdt(asNumber(value))})`} />
                      <Bar dataKey="amount" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartClientOnly>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 font-bold text-slate-800">Accounting Option Reports</h3>
              <div className="space-y-2">
                {accountingOptionRows.map((row) => (
                  <div
                    key={row.option}
                    className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <button
                        type="button"
                        onClick={() => openAccountingLedgerModal(row.option)}
                        className="text-left text-sm font-semibold text-indigo-700 hover:underline"
                      >
                        {row.option}{" "}
                        <span className="ml-1 rounded bg-slate-200 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                          {row.count}
                        </span>
                      </button>
                      <p className="text-sm font-bold text-slate-900">{formatBdt(row.primary)}</p>
                    </div>
                    <p className="mt-1 text-xs text-slate-500">{row.secondary}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[0.95fr_1.05fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 font-bold text-slate-800">Expense Category Mix</h3>
              {accountingExpenseByCategory.length === 0 ? (
                <p className="text-sm text-slate-500">No expense category data available.</p>
              ) : (
                <ChartClientOnly height={320}>
                  <div className="h-[320px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={accountingExpenseByCategory}
                          dataKey="amount"
                          nameKey="name"
                          cx="50%"
                          cy="50%"
                          outerRadius={105}
                          label={(props) => {
                            const name = String(props.name ?? "");
                            const percent = asNumber((props as { percent?: number }).percent) * 100;
                            return `${name} ${percent.toFixed(0)}%`;
                          }}
                        >
                          {accountingExpenseByCategory.map((entry, idx) => (
                            <Cell key={entry.name} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip
                          formatter={(value) =>
                            `${formatBdt(asNumber(value))} (${formatCompactBdt(asNumber(value))})`
                          }
                        />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </ChartClientOnly>
              )}
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 font-bold text-slate-800">Recent Accounting Activity</h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[560px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-500">
                      <th className="px-2 py-2">Date</th>
                      <th className="px-2 py-2">Type</th>
                      <th className="px-2 py-2">Label</th>
                      <th className="px-2 py-2">Amount</th>
                    </tr>
                  </thead>
                  <tbody>
                    {accountingRecentRows.map((row) => (
                      <tr key={`${row.type}-${row.id}`} className="border-b border-slate-100">
                        <td className="px-2 py-2">{row.date}</td>
                        <td className="px-2 py-2">
                          <span
                            className={clsx(
                              "rounded px-2 py-0.5 text-xs font-bold",
                              row.type === "income"
                                ? "bg-emerald-100 text-emerald-700"
                                : row.type === "expense"
                                  ? "bg-rose-100 text-rose-700"
                                  : "bg-indigo-100 text-indigo-700"
                            )}
                          >
                            {row.type}
                          </span>
                        </td>
                        <td className="px-2 py-2 text-slate-700">{row.label}</td>
                        <td
                          className={clsx(
                            "px-2 py-2 font-bold",
                            row.amount >= 0 ? "text-emerald-700" : "text-rose-700"
                          )}
                        >
                          {formatBdt(row.amount)}
                        </td>
                      </tr>
                    ))}
                    {accountingRecentRows.length === 0 && (
                      <tr>
                        <td colSpan={4} className="px-2 py-6 text-center text-slate-500">
                          No recent accounting activity.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="mb-3 font-bold text-slate-800">Quick Actions</h3>
            <div className="flex flex-wrap gap-2">
              {accountingQuickLinks.map((item) => (
                <Link
                  key={item.href}
                  href={item.href}
                  className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-slate-50 px-3 py-1.5 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                >
                  {item.label} <ExternalLink className="h-3.5 w-3.5" />
                </Link>
              ))}
            </div>
          </div>
        </div>
      )}

      {ledgerModalOpen && (
        <div
          className="fixed inset-0 z-[70] bg-slate-950/40 px-4 py-8"
          onClick={() => setLedgerModalOpen(false)}
        >
          <div
            className="mx-auto max-w-4xl rounded-2xl bg-white p-4 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-3">
              <h3 className="text-lg font-bold text-slate-900">{ledgerModalTitle}</h3>
              <button
                type="button"
                onClick={() => setLedgerModalOpen(false)}
                className="rounded-lg border border-slate-200 px-3 py-1 text-sm font-semibold text-slate-600 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
            <div className="max-h-[65vh] overflow-auto">
              <table className="w-full min-w-[680px] text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-500">
                    <th className="px-2 py-2">Date</th>
                    <th className="px-2 py-2">Label</th>
                    <th className="px-2 py-2">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerModalRows.map((row) => (
                    <tr key={row.id} className="border-b border-slate-100">
                      <td className="px-2 py-2">{row.date}</td>
                      <td className="px-2 py-2 text-slate-700">{row.label}</td>
                      <td
                        className={clsx(
                          "px-2 py-2 font-bold",
                          row.amount >= 0 ? "text-emerald-700" : "text-rose-700"
                        )}
                      >
                        {formatBdt(row.amount)}
                      </td>
                    </tr>
                  ))}
                  {ledgerModalRows.length === 0 && (
                    <tr>
                      <td colSpan={3} className="px-2 py-6 text-center text-slate-500">
                        No ledger rows found for selected option and date filter.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
