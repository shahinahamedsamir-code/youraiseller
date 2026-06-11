"use client";

import clsx from "clsx";
import { ArrowUpRight, Minus, Equal, TrendingDown, TrendingUp, Wallet } from "lucide-react";
import { formatBdt } from "@/lib/accounting-store";
import type { DateRange } from "@/lib/reports/report-types";

type PlData = {
  revenue: number;
  cogs: number;
  grossProfit: number;
  grossMargin: number;
  income: number;
  expense: number;
  operatingExpense: number;
  netProfit: number;
  margin: number;
  orderCount: number;
  incomeRows: { label: string; amount: number }[];
  cogsRows: { label: string; amount: number }[];
  operatingRows: { label: string; amount: number }[];
};

type CashFlow = {
  inflow: number;
  outflow: number;
  netCash: number;
};

type Props = {
  pl: PlData;
  cashFlow: CashFlow;
  accRange: DateRange;
  accFrom: string;
  accTo: string;
  onAccRangeChange: (v: DateRange) => void;
  onAccFromChange: (v: string) => void;
  onAccToChange: (v: string) => void;
};

function PlStep({
  label,
  hint,
  amount,
  tone = "text-slate-900",
  icon,
  bold,
}: {
  label: string;
  hint?: string;
  amount: number;
  tone?: string;
  icon?: "minus" | "equal";
  bold?: boolean;
}) {
  return (
    <div
      className={clsx(
        "flex items-center justify-between gap-4 rounded-xl px-4 py-3",
        bold ? "bg-indigo-50 ring-1 ring-indigo-100" : "bg-slate-50"
      )}
    >
      <div className="flex min-w-0 items-center gap-3">
        {icon === "minus" && (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-rose-100 text-rose-600">
            <Minus className="h-4 w-4" />
          </span>
        )}
        {icon === "equal" && (
          <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-indigo-100 text-indigo-600">
            <Equal className="h-4 w-4" />
          </span>
        )}
        <div className="min-w-0">
          <p className={clsx("font-semibold text-slate-800", bold && "text-indigo-900")}>
            {label}
          </p>
          {hint && <p className="text-xs text-slate-500">{hint}</p>}
        </div>
      </div>
      <p className={clsx("shrink-0 text-right font-bold tabular-nums", tone, bold && "text-lg")}>
        {formatBdt(amount)}
      </p>
    </div>
  );
}

function HeroCard({
  label,
  sublabel,
  amount,
  positive,
  icon: Icon,
  accent,
}: {
  label: string;
  sublabel: string;
  amount: number;
  positive: boolean;
  icon: typeof TrendingUp;
  accent: "emerald" | "indigo" | "rose";
}) {
  const accents = {
    emerald: {
      bg: "from-emerald-500 to-teal-600",
      ring: "ring-emerald-200",
      icon: "bg-white/20 text-white",
    },
    indigo: {
      bg: "from-indigo-500 to-violet-600",
      ring: "ring-indigo-200",
      icon: "bg-white/20 text-white",
    },
    rose: {
      bg: "from-rose-500 to-pink-600",
      ring: "ring-rose-200",
      icon: "bg-white/20 text-white",
    },
  };
  const a = accents[accent];

  return (
    <div
      className={clsx(
        "rounded-2xl bg-gradient-to-br p-5 text-white shadow-md ring-1",
        a.bg,
        a.ring
      )}
    >
      <div className="mb-3 flex items-start justify-between gap-2">
        <div>
          <p className="text-sm font-medium text-white/90">{label}</p>
          <p className="text-xs text-white/70">{sublabel}</p>
        </div>
        <span className={clsx("flex h-9 w-9 items-center justify-center rounded-xl", a.icon)}>
          <Icon className="h-5 w-5" />
        </span>
      </div>
      <p className="text-3xl font-bold tabular-nums tracking-tight">
        {formatBdt(amount)}
      </p>
      <p className="mt-2 text-xs text-white/80">
        {positive ? "Profit in this period" : "Loss in this period"}
      </p>
    </div>
  );
}

export function AccountingPlOverview({
  pl,
  cashFlow,
  accRange,
  accFrom,
  accTo,
  onAccRangeChange,
  onAccFromChange,
  onAccToChange,
}: Props) {
  const rangeLabel =
    accRange === "all"
      ? "All time"
      : accRange === "today"
        ? "Today"
        : accRange === "week"
          ? "Last 7 days"
          : "This month";

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-200 bg-white p-4 md:p-5">
        <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">Profit & Loss</h3>
            <p className="text-sm text-slate-500">
              See total expense, gross profit, and net profit at a glance
            </p>
          </div>
          <span className="rounded-full bg-indigo-50 px-3 py-1 text-xs font-semibold text-indigo-700">
            {rangeLabel}
            {accFrom ? ` · ${accFrom}` : ""}
            {accTo ? ` → ${accTo}` : ""}
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-3">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase text-slate-500">Period</p>
            <select
              value={accRange}
              onChange={(e) => onAccRangeChange(e.target.value as DateRange)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="all">All time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 days</option>
              <option value="month">This month</option>
            </select>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase text-slate-500">From</p>
            <input
              type="date"
              value={accFrom}
              onChange={(e) => onAccFromChange(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase text-slate-500">To</p>
            <input
              type="date"
              value={accTo}
              onChange={(e) => onAccToChange(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <HeroCard
          label="Net Profit"
          sublabel={`Margin ${pl.margin.toFixed(1)}%`}
          amount={pl.netProfit}
          positive={pl.netProfit >= 0}
          icon={pl.netProfit >= 0 ? TrendingUp : TrendingDown}
          accent="indigo"
        />
        <HeroCard
          label="Gross Profit"
          sublabel={`Margin ${pl.grossMargin.toFixed(1)}% · ${pl.orderCount} orders`}
          amount={pl.grossProfit}
          positive={pl.grossProfit >= 0}
          icon={TrendingUp}
          accent="emerald"
        />
        <HeroCard
          label="Total Expense"
          sublabel="All operating costs in period"
          amount={pl.expense}
          positive={false}
          icon={ArrowUpRight}
          accent="rose"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="rounded-2xl border border-slate-200 bg-white p-5">
          <h4 className="mb-1 font-bold text-slate-800">Profit & Loss Statement</h4>
          <p className="mb-4 text-sm text-slate-500">Accounting-based statement by selected period</p>
          <div className="space-y-2">
            <PlStep label="Income" hint="From accounting income entries" amount={pl.income} />
            {pl.incomeRows.slice(0, 8).map((row) => (
              <PlStep
                key={`inc-${row.label}`}
                label={`• ${row.label}`}
                amount={row.amount}
                tone="text-slate-700"
              />
            ))}
            <PlStep
              label="Cost of Goods Sold"
              hint="COGS tagged expenses"
              amount={pl.cogs}
              tone="text-amber-700"
              icon="minus"
            />
            {pl.cogsRows.slice(0, 8).map((row) => (
              <PlStep
                key={`cogs-${row.label}`}
                label={`• ${row.label}`}
                amount={row.amount}
                tone="text-amber-700"
              />
            ))}
            <PlStep
              label="Gross Profit"
              hint="Income minus COGS"
              amount={pl.grossProfit}
              tone={pl.grossProfit >= 0 ? "text-emerald-700" : "text-rose-700"}
              icon="equal"
              bold
            />
            <PlStep
              label="Operating Expenses"
              hint="Salary, rent, utility, ads, courier, etc."
              amount={pl.operatingExpense}
              tone="text-rose-700"
              icon="minus"
            />
            {pl.operatingRows.slice(0, 10).map((row) => (
              <PlStep
                key={`op-${row.label}`}
                label={`• ${row.label}`}
                amount={row.amount}
                tone="text-rose-700"
              />
            ))}
            <PlStep
              label="Net Profit"
              hint="Gross Profit minus Operating Expenses"
              amount={pl.netProfit}
              tone={pl.netProfit >= 0 ? "text-indigo-700" : "text-rose-700"}
              icon="equal"
              bold
            />
          </div>
        </div>

        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-5">
            <h4 className="mb-3 font-bold text-slate-800">Quick Summary</h4>
            <dl className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <dt className="text-slate-600">You sold (orders)</dt>
                <dd className="font-bold text-slate-900">{formatBdt(pl.income)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <dt className="text-slate-600">Cost of goods sold</dt>
                <dd className="font-bold text-amber-700">− {formatBdt(pl.cogs)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <dt className="font-semibold text-emerald-800">Gross profit</dt>
                <dd className="font-bold text-emerald-700">{formatBdt(pl.grossProfit)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 border-b border-slate-100 pb-3">
                <dt className="text-slate-600">Operating expense</dt>
                <dd className="font-bold text-rose-700">− {formatBdt(pl.operatingExpense)}</dd>
              </div>
              <div className="flex items-center justify-between gap-3 rounded-xl bg-indigo-50 px-3 py-3">
                <dt className="font-bold text-indigo-900">Net profit</dt>
                <dd
                  className={clsx(
                    "text-lg font-bold",
                    pl.netProfit >= 0 ? "text-indigo-700" : "text-rose-700"
                  )}
                >
                  {formatBdt(pl.netProfit)}
                </dd>
              </div>
            </dl>
          </div>

          <div className="rounded-2xl border border-slate-200 bg-slate-50 p-5">
            <div className="mb-2 flex items-center gap-2">
              <Wallet className="h-4 w-4 text-indigo-600" />
              <h4 className="font-bold text-slate-800">Cash movement</h4>
            </div>
            <div className="grid grid-cols-3 gap-2 text-center text-sm">
              <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
                <p className="text-xs text-slate-500">Money in</p>
                <p className="font-bold text-emerald-700">{formatBdt(cashFlow.inflow)}</p>
              </div>
              <div className="rounded-xl bg-white p-3 ring-1 ring-slate-200">
                <p className="text-xs text-slate-500">Money out</p>
                <p className="font-bold text-rose-700">{formatBdt(cashFlow.outflow)}</p>
              </div>
              <div className="rounded-xl bg-white p-3 ring-1 ring-indigo-100">
                <p className="text-xs text-slate-500">Net cash</p>
                <p
                  className={clsx(
                    "font-bold",
                    cashFlow.netCash >= 0 ? "text-indigo-700" : "text-rose-700"
                  )}
                >
                  {formatBdt(cashFlow.netCash)}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
