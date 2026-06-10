"use client";

import clsx from "clsx";
import Link from "next/link";
import {
  BarChart3,
  Calculator,
  DollarSign,
  ExternalLink,
  PieChart as PieChartIcon,
  TrendingDown,
  TrendingUp,
} from "lucide-react";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Legend,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatBdt } from "@/lib/accounting-store";
import { ChartClientOnly } from "@/components/dashboard/ChartClientOnly";
import {
  allocationPercent,
  type ProfitSalesReport,
  type ProfitSalesRow,
} from "@/lib/reports/profit-sales-analytics";
import { asNumber, formatCompactBdt } from "@/lib/reports/report-utils";

type SalesView = "summary" | "details" | "chart";

type Props = {
  report: ProfitSalesReport;
  view: SalesView;
  onViewChange: (view: SalesView) => void;
  orderDelta?: number | null;
};

function MoneyCell({ amount, sign }: { amount: number; sign: "+" | "-" | "=" }) {
  const prefix = sign === "=" ? "" : `${sign} `;
  const tone =
    sign === "+" ? "text-emerald-700" : sign === "-" ? "text-rose-700" : "text-teal-700";
  return (
    <span className={clsx("font-bold tabular-nums", tone)}>
      {prefix}
      {formatBdt(amount)}
    </span>
  );
}

function TableSection({
  title,
  rows,
  headerClass,
}: {
  title: string;
  rows: ProfitSalesRow[];
  headerClass: string;
}) {
  return (
    <>
      <tr>
        <td colSpan={4} className={clsx("px-4 py-2 text-xs font-bold uppercase", headerClass)}>
          {title}
        </td>
      </tr>
      {rows.map((row) => (
        <tr
          key={row.label}
          className={clsx(
            "border-b border-slate-50",
            row.sign === "=" && "bg-teal-50/50"
          )}
        >
          <td className="px-4 py-3 font-medium text-slate-800">{row.label}</td>
          <td className="px-4 py-3">
            <MoneyCell amount={row.amount} sign={row.sign} />
          </td>
          <td className="px-4 py-3 text-slate-600">{row.count ?? "—"}</td>
          <td className="px-4 py-3 text-xs text-slate-500">{row.details}</td>
        </tr>
      ))}
    </>
  );
}

export function ProfitSalesOverview({ report, view, onViewChange, orderDelta }: Props) {
  const {
    accountingIncome,
    accountingExpense,
    netProfit,
    netMargin,
    orderSales,
    orderGrossProfit,
    orderGrossMargin,
    orderStats,
    adsExpense,
    otherExpense,
    allocation,
  } = report;

  const allocBase = Math.max(accountingIncome, 1);
  const allocItems = [
    { label: "Net Profit", amount: Math.max(0, netProfit), color: "#14b8a6" },
    { label: "Expense", amount: accountingExpense, color: "#ef4444" },
    { label: "Ads", amount: adsExpense, color: "#a855f7" },
    { label: "Other Exp.", amount: otherExpense, color: "#ec4899" },
  ].filter((i) => i.amount > 0 || i.label === "Net Profit");

  const views: { id: SalesView; label: string }[] = [
    { id: "summary", label: "Summary" },
    { id: "details", label: "Sales Details" },
    { id: "chart", label: "Profit Chart" },
  ];

  const deliveredPct = orderStats.total
    ? (orderStats.delivered / orderStats.total) * 100
    : 0;
  const pendingPct = orderStats.total ? (orderStats.pending / orderStats.total) * 100 : 0;
  const returnedPct = orderStats.total ? (orderStats.returned / orderStats.total) * 100 : 0;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
        <div className="flex flex-wrap gap-2">
          {views.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => onViewChange(v.id)}
              className={clsx(
                "rounded-xl px-4 py-2 text-sm font-bold transition",
                view === v.id
                  ? "bg-teal-600 text-white shadow"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
        <Link
          href="/dashboard/accounting"
          className="inline-flex items-center gap-1 text-xs font-semibold text-teal-700 hover:underline"
        >
          <Calculator className="h-3.5 w-3.5" /> Accounting Income & Expense
          <ExternalLink className="h-3 w-3" />
        </Link>
      </div>

      {view === "summary" && (
        <>
          <p className="rounded-xl border border-indigo-100 bg-indigo-50/60 px-4 py-2.5 text-xs text-indigo-900">
            <strong>Profit & Loss</strong> comes from <strong>Accounting → Income</strong> and{" "}
            <strong>Expense</strong> entries. Order sales below is an operational estimate only.
          </p>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-5">
            <div className="glass-card rounded-2xl p-4 ring-1 ring-indigo-100">
              <DollarSign className="mb-2 h-5 w-5 text-indigo-600" />
              <p className="text-sm text-slate-500">Income (Accounting)</p>
              <p className="text-2xl font-bold text-indigo-700">{formatBdt(accountingIncome)}</p>
              <p className="mt-1 text-xs text-slate-500">Recorded in Income page</p>
            </div>
            <div className="glass-card rounded-2xl p-4">
              <PieChartIcon className="mb-2 h-5 w-5 text-rose-600" />
              <p className="text-sm text-slate-500">Expense (Accounting)</p>
              <p className="text-2xl font-bold text-rose-700">{formatBdt(accountingExpense)}</p>
              <p className="mt-1 text-xs text-slate-500">
                {formatBdt(adsExpense)} ads + {formatBdt(otherExpense)} other
              </p>
            </div>
            <div className="glass-card rounded-2xl p-4 ring-1 ring-teal-100">
              {netProfit >= 0 ? (
                <TrendingUp className="mb-2 h-5 w-5 text-teal-600" />
              ) : (
                <TrendingDown className="mb-2 h-5 w-5 text-rose-600" />
              )}
              <p className="text-sm text-slate-500">Net Profit / Loss</p>
              <p
                className={clsx(
                  "text-2xl font-bold",
                  netProfit >= 0 ? "text-teal-700" : "text-rose-700"
                )}
              >
                {formatBdt(netProfit)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Income − Expense · {netMargin.toFixed(1)}% margin
              </p>
            </div>
            <div className="glass-card rounded-2xl p-4 ring-1 ring-emerald-100">
              <TrendingUp className="mb-2 h-5 w-5 text-emerald-600" />
              <p className="text-sm text-slate-500">Gross Profit (Orders)</p>
              <p
                className={clsx(
                  "text-2xl font-bold",
                  orderGrossProfit >= 0 ? "text-emerald-700" : "text-rose-700"
                )}
              >
                {formatBdt(orderGrossProfit)}
              </p>
              <p className="mt-1 text-xs text-slate-500">
                Order sales − COGS · {orderGrossMargin.toFixed(1)}%
              </p>
            </div>
            <div className="glass-card rounded-2xl p-4">
              <BarChart3 className="mb-2 h-5 w-5 text-slate-600" />
              <p className="text-sm text-slate-500">Order Sales (Est.)</p>
              <p className="text-2xl font-bold text-slate-900">{formatBdt(orderSales)}</p>
              {orderDelta != null && orderDelta !== 0 && (
                <p className="mt-1 text-xs font-semibold text-emerald-700">
                  {orderDelta > 0 ? "↑" : "↓"} {Math.abs(orderDelta)} orders vs prior
                </p>
              )}
              <p className="mt-1 text-[11px] text-slate-500">
                {orderStats.delivered} delivered · {orderStats.pending} pending
              </p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <h3 className="mb-4 font-bold text-slate-800">P&L Allocation (Accounting)</h3>
            <div className="mb-3 grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
              {allocItems.map((item) => (
                <div key={item.label} className="flex items-center gap-2 text-sm">
                  <span
                    className="h-2.5 w-2.5 shrink-0 rounded-full"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="text-slate-600">{item.label}</span>
                  <span className="ml-auto font-bold text-slate-800">{formatBdt(item.amount)}</span>
                  <span className="text-xs text-slate-400">
                    ({allocationPercent(item.amount, allocBase).toFixed(1)}%)
                  </span>
                </div>
              ))}
            </div>
            <div className="flex h-4 overflow-hidden rounded-full bg-slate-100">
              {allocItems.map((item) => {
                const pct = allocBase > 0 ? (item.amount / allocBase) * 100 : 0;
                if (pct <= 0) return null;
                return (
                  <div
                    key={item.label}
                    style={{ width: `${pct}%`, backgroundColor: item.color }}
                    title={`${item.label} ${pct.toFixed(1)}%`}
                  />
                );
              })}
            </div>
          </div>

          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
                  <th className="px-4 py-3">Description</th>
                  <th className="px-4 py-3">Amount</th>
                  <th className="px-4 py-3">Count</th>
                  <th className="px-4 py-3">Source</th>
                </tr>
              </thead>
              <tbody>
                <TableSection
                  title="Profit & Loss (Accounting)"
                  rows={report.accountingRows}
                  headerClass="bg-indigo-50 text-indigo-800"
                />
                <TableSection
                  title="Order Estimate (not in books until recorded)"
                  rows={report.orderRows}
                  headerClass="bg-slate-100 text-slate-700"
                />
              </tbody>
            </table>
          </div>
        </>
      )}

      {view === "chart" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 font-bold text-slate-800">Accounting P&L vs Order Sales</h3>
          {report.dailyChart.length === 0 ? (
            <p className="text-sm text-slate-500">No data in selected date range.</p>
          ) : (
            <ChartClientOnly height={320}>
              <div className="h-[320px] w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart data={report.dailyChart}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                    <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                    <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCompactBdt(asNumber(v))} />
                    <Tooltip formatter={(v) => formatBdt(asNumber(v))} />
                    <Legend />
                    <Line type="monotone" dataKey="income" name="Income (Acct)" stroke="#4f46e5" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="expense" name="Expense (Acct)" stroke="#ef4444" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="netProfit" name="Net P&L" stroke="#14b8a6" strokeWidth={2} dot={false} />
                    <Line type="monotone" dataKey="orderSales" name="Order Sales" stroke="#94a3b8" strokeWidth={2} strokeDasharray="4 4" dot={false} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartClientOnly>
          )}
        </div>
      )}
    </div>
  );
}

/** Bar chart block for Sales Details view (existing sales charts wrapper). */
export function ProfitSalesDetailsCharts({
  dailyTrend,
  statusBreakdown,
  pieColors,
}: {
  dailyTrend: { date: string; amount: number }[];
  statusBreakdown: { key: string; label: string; count: number }[];
  pieColors: string[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 font-bold text-slate-800">Daily Sales Trend (Last 10 points)</h3>
        {dailyTrend.length === 0 ? (
          <p className="text-sm text-slate-500">No sales data in selected filter.</p>
        ) : (
          <ChartClientOnly height={280}>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={dailyTrend}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} />
                  <YAxis tick={{ fontSize: 11 }} />
                  <Tooltip
                    formatter={(value) =>
                      `${formatBdt(asNumber(value))} (${formatCompactBdt(asNumber(value))})`
                    }
                  />
                  <Bar dataKey="amount" name="Sales" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartClientOnly>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-white p-4">
        <h3 className="mb-3 font-bold text-slate-800">Status Breakdown</h3>
        {statusBreakdown.length === 0 ? (
          <p className="text-sm text-slate-500">No status data in selected filter.</p>
        ) : (
          <ChartClientOnly height={280}>
            <div className="h-[280px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={statusBreakdown} layout="vertical" margin={{ left: 8 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                  <XAxis type="number" allowDecimals={false} tick={{ fontSize: 11 }} />
                  <YAxis type="category" dataKey="label" width={88} tick={{ fontSize: 10 }} />
                  <Tooltip />
                  <Bar dataKey="count" name="Orders" radius={[0, 6, 6, 0]}>
                    {statusBreakdown.map((entry, idx) => (
                      <Cell key={entry.key} fill={pieColors[idx % pieColors.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
          </ChartClientOnly>
        )}
      </div>
    </div>
  );
}
