"use client";

import clsx from "clsx";
import Link from "next/link";
import {
  Calculator,
  ChevronDown,
  ChevronRight,
  DollarSign,
  ExternalLink,
  FileText,
  PieChart as PieChartIcon,
  TrendingDown,
  TrendingUp,
  Wallet,
} from "lucide-react";
import { useState, type ReactNode } from "react";
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
import type { AccountBalanceRow } from "@/lib/reports/accounting-depth-analytics";
import { asNumber, formatCompactBdt } from "@/lib/reports/report-utils";

type SalesView = "summary" | "details" | "chart" | "balance";

type Props = {
  report: ProfitSalesReport;
  view: SalesView;
  onViewChange: (view: SalesView) => void;
  operatingExpenseByCategory: { name: string; amount: number }[];
  accountBalances: AccountBalanceRow[];
  activeAccountTotal: number;
  cashBalance: number;
};

function SummaryMetricCard({
  icon,
  iconTone,
  label,
  value,
  valueTone,
  footer,
  footerTone = "text-slate-500",
}: {
  icon: React.ReactNode;
  iconTone: string;
  label: string;
  value: string;
  valueTone: string;
  footer: ReactNode;
  footerTone?: string;
}) {
  return (
    <div className="flex flex-col rounded-xl border border-slate-200 bg-white p-3 shadow-sm">
      <div className="flex items-center justify-between gap-2">
        <p className="text-xs font-medium text-slate-500">{label}</p>
        <span className={clsx("rounded-md p-1", iconTone)}>{icon}</span>
      </div>
      <p className={clsx("mt-1.5 text-xl font-bold tabular-nums", valueTone)}>{value}</p>
      <p className={clsx("mt-1 text-[11px] leading-snug", footerTone)}>{footer}</p>
    </div>
  );
}

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
  operatingExpanded,
  onToggleOperating,
  operatingExpenseByCategory,
}: {
  title: string;
  rows: ProfitSalesRow[];
  headerClass: string;
  operatingExpanded: boolean;
  onToggleOperating: () => void;
  operatingExpenseByCategory: { name: string; amount: number }[];
}) {
  return (
    <>
      <tr>
        <td colSpan={4} className={clsx("px-4 py-2 text-xs font-bold uppercase", headerClass)}>
          {title}
        </td>
      </tr>
      {rows.map((row) => {
        const isOperatingRow = row.label === "Operating Expenses";
        return (
          <>
            <tr
              key={row.label}
              className={clsx(
                "border-b border-slate-50",
                row.label === "Total Operating Expenses" && "bg-amber-50",
                row.sign === "=" && "bg-teal-50/50",
                row.label === "Net Profit / Loss" && "bg-emerald-50 border-y-2 border-emerald-200"
              )}
            >
              <td className="px-4 py-3 font-medium text-slate-800">
                <span className="inline-flex items-center gap-2">
                  {isOperatingRow && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        onToggleOperating();
                      }}
                      aria-label={operatingExpanded ? "Collapse operating expenses" : "Expand operating expenses"}
                      className="inline-flex items-center text-slate-600 hover:text-indigo-700"
                    >
                      {operatingExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </button>
                  )}
                  {row.label}
                </span>
              </td>
              <td className="px-4 py-3">
                <MoneyCell amount={row.amount} sign={row.sign} />
              </td>
              <td className="px-4 py-3 text-slate-600">{row.count ?? "—"}</td>
              <td className="px-4 py-3 text-xs text-slate-500">{row.details}</td>
            </tr>

            {isOperatingRow && operatingExpanded && (
              <tr key={`${row.label}-details`} className="border-b border-slate-100 bg-indigo-50/30">
                <td colSpan={4} className="px-4 py-3">
                  <div className="rounded-xl border border-indigo-100 bg-white/70 p-3">
                    <h4 className="mb-2 text-sm font-bold text-indigo-900">Operating Expenses by Category</h4>
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[420px] text-sm">
                        <thead>
                          <tr className="border-b border-indigo-100 text-left text-xs font-bold uppercase text-indigo-700">
                            <th className="px-2 py-2">Category</th>
                            <th className="px-2 py-2 text-right">Amount</th>
                          </tr>
                        </thead>
                        <tbody>
                          {operatingExpenseByCategory.map((item) => (
                            <tr key={item.name} className="border-b border-indigo-100/60">
                              <td className="px-2 py-2 text-slate-800">{item.name}</td>
                              <td className="px-2 py-2 text-right font-bold text-rose-700">
                                {formatBdt(item.amount)}
                              </td>
                            </tr>
                          ))}
                          {operatingExpenseByCategory.length === 0 && (
                            <tr>
                              <td colSpan={2} className="px-2 py-6 text-center text-slate-500">
                                No operating expense categories in this range.
                              </td>
                            </tr>
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </td>
              </tr>
            )}
          </>
        );
      })}
    </>
  );
}

export function ProfitSalesOverview({
  report,
  view,
  onViewChange,
  operatingExpenseByCategory,
  accountBalances,
  activeAccountTotal,
  cashBalance,
}: Props) {
  const {
    accountingIncome,
    accountingExpense,
    netProfit,
    netMargin,
    adsExpense,
    otherExpense,
    returnDeliveryExpense,
    returnDeliveryCount,
    accountingInvoiceCount,
    accountingOrderCount,
    allocation,
    accountingRows,
  } = report;

  const totalOperatingExpense =
    accountingRows.find((row) => row.label === "Total Operating Expenses")?.amount ?? 0;
  const grossProfit = accountingRows.find((row) => row.label === "Gross Profit")?.amount ?? 0;

  const allocBase = Math.max(accountingIncome, 1);
  const allocItems = [
    { label: "Net Profit", amount: Math.max(0, netProfit), color: "#14b8a6" },
    { label: "Expense", amount: accountingExpense, color: "#ef4444" },
    { label: "Ads", amount: adsExpense, color: "#a855f7" },
    { label: "Other Exp.", amount: otherExpense, color: "#ec4899" },
  ].filter((i) => i.amount > 0 || i.label === "Net Profit");

  const views: { id: SalesView; label: string }[] = [
    { id: "summary", label: "Sales" },
    { id: "chart", label: "Profit Chart" },
    { id: "balance", label: "Account Balance" },
  ];
  const [operatingExpanded, setOperatingExpanded] = useState(false);
  const activeView = view === "details" ? "summary" : view;

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="flex flex-wrap gap-1.5">
          {views.map((v) => (
            <button
              key={v.id}
              type="button"
              onClick={() => onViewChange(v.id)}
              className={clsx(
                "rounded-lg px-3 py-1.5 text-xs font-bold transition",
                activeView === v.id
                  ? "bg-teal-600 text-white"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
        <Link
          href="/dashboard/accounting"
          className="inline-flex items-center gap-1 text-[11px] font-semibold text-teal-700 hover:underline"
        >
          <Calculator className="h-3 w-3" /> Accounting
          <ExternalLink className="h-2.5 w-2.5" />
        </Link>
      </div>

      {activeView === "summary" && (
        <>
          <p className="rounded-lg border border-indigo-100 bg-indigo-50/60 px-3 py-1.5 text-[11px] text-indigo-900">
            Accounting P&amp;L from recorded <strong>Income</strong> &amp; <strong>Expense</strong> entries.
          </p>

          <div className="grid grid-cols-2 gap-2 xl:grid-cols-4">
            <SummaryMetricCard
              icon={<DollarSign className="h-4 w-4 text-indigo-600" />}
              iconTone="bg-indigo-50"
              label="Income (Accounting)"
              value={formatBdt(accountingIncome)}
              valueTone="text-indigo-700"
              footer="Recorded in Income page"
            />
            <SummaryMetricCard
              icon={<PieChartIcon className="h-4 w-4 text-rose-600" />}
              iconTone="bg-rose-50"
              label="Total Operating Expenses"
              value={formatBdt(totalOperatingExpense)}
              valueTone="text-rose-700"
              footer={
                <>
                  Delivery Charge: {formatBdt(returnDeliveryExpense)} ({returnDeliveryCount})
                </>
              }
              footerTone="text-amber-700"
            />
            <SummaryMetricCard
              icon={
                netProfit >= 0 ? (
                  <TrendingUp className="h-4 w-4 text-teal-600" />
                ) : (
                  <TrendingDown className="h-4 w-4 text-rose-600" />
                )
              }
              iconTone={netProfit >= 0 ? "bg-teal-50" : "bg-rose-50"}
              label="Net Profit / Loss"
              value={formatBdt(netProfit)}
              valueTone={netProfit >= 0 ? "text-teal-700" : "text-rose-700"}
              footer={`Gross ${formatBdt(grossProfit)} − Op. Exp. · ${netMargin.toFixed(1)}% margin`}
            />
            <SummaryMetricCard
              icon={<FileText className="h-4 w-4 text-slate-600" />}
              iconTone="bg-slate-100"
              label="Invoices (Accounting)"
              value={String(accountingInvoiceCount)}
              valueTone="text-slate-900"
              footer={`Order-linked refs: ${accountingOrderCount}`}
            />
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
                  operatingExpanded={operatingExpanded}
                  onToggleOperating={() => setOperatingExpanded((v) => !v)}
                  operatingExpenseByCategory={operatingExpenseByCategory}
                />
              </tbody>
            </table>
          </div>

          {report.accountingRows.some((row) => row.label === "Cost of Goods Sold" && row.amount <= 0) && (
            <p className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-900">
              COGS is zero because no accounting expense entries are tagged as COGS/inventory cost in this date range.
            </p>
          )}

        </>
      )}

      {activeView === "chart" && (
        <div className="rounded-2xl border border-slate-200 bg-white p-4">
          <h3 className="mb-3 font-bold text-slate-800">Accounting P&L Trend</h3>
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
                  </LineChart>
                </ResponsiveContainer>
              </div>
            </ChartClientOnly>
          )}
        </div>
      )}

      {activeView === "balance" && (
        <div className="space-y-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-[11px] text-slate-500">Current balances from Accounting accounts.</p>
            <Link
              href="/dashboard/accounting/accounts"
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-indigo-700 hover:underline"
            >
              <Wallet className="h-3 w-3" /> Manage accounts
              <ExternalLink className="h-2.5 w-2.5" />
            </Link>
          </div>
          <div className="grid grid-cols-2 gap-2 xl:grid-cols-3">
            <SummaryMetricCard
              icon={<Wallet className="h-4 w-4 text-indigo-600" />}
              iconTone="bg-indigo-50"
              label="Cash & Accounts"
              value={formatBdt(cashBalance)}
              valueTone="text-indigo-700"
              footer={`${accountBalances.filter((row) => row.active).length} active accounts`}
            />
            <SummaryMetricCard
              icon={<DollarSign className="h-4 w-4 text-emerald-600" />}
              iconTone="bg-emerald-50"
              label="Active Accounts Total"
              value={formatBdt(activeAccountTotal)}
              valueTone="text-emerald-700"
              footer="Sum of active account balances"
            />
          </div>

          {accountBalances.filter((row) => row.active).length > 0 && (
            <div className="rounded-xl border border-slate-200 bg-white p-3">
              <ChartClientOnly height={220}>
                <div className="h-[220px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={accountBalances.filter((row) => row.active).slice(0, 8)}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                      <YAxis tick={{ fontSize: 10 }} tickFormatter={(v) => formatCompactBdt(asNumber(v))} />
                      <Tooltip formatter={(value) => formatBdt(asNumber(value))} />
                      <Bar dataKey="balance" name="Balance" fill="#4f46e5" radius={[4, 4, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartClientOnly>
            </div>
          )}

          <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-left text-xs font-bold uppercase text-slate-500">
                  <th className="px-3 py-2">Account</th>
                  <th className="px-3 py-2">Type</th>
                  <th className="px-3 py-2">Status</th>
                  <th className="px-3 py-2 text-right">Balance</th>
                </tr>
              </thead>
              <tbody>
                {accountBalances.map((row) => (
                  <tr key={row.id} className="border-b border-slate-100">
                    <td className="px-3 py-2 font-semibold text-slate-800">{row.name}</td>
                    <td className="px-3 py-2 text-slate-600">{row.typeLabel}</td>
                    <td className="px-3 py-2">
                      <span
                        className={clsx(
                          "rounded px-1.5 py-0.5 text-[10px] font-bold",
                          row.active ? "bg-emerald-100 text-emerald-700" : "bg-slate-100 text-slate-500"
                        )}
                      >
                        {row.active ? "Active" : "Inactive"}
                      </span>
                    </td>
                    <td
                      className={clsx(
                        "px-3 py-2 text-right font-bold tabular-nums",
                        row.balance >= 0 ? "text-indigo-700" : "text-rose-700"
                      )}
                    >
                      {formatBdt(row.balance)}
                    </td>
                  </tr>
                ))}
                {accountBalances.length === 0 && (
                  <tr>
                    <td colSpan={4} className="px-3 py-8 text-center text-sm text-slate-500">
                      No accounts configured.{" "}
                      <Link href="/dashboard/accounting/accounts" className="font-semibold text-indigo-600 hover:underline">
                        Add accounts
                      </Link>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
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
