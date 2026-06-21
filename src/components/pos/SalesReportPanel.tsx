"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import {
  ArrowDownRight,
  ArrowUpRight,
  BadgePercent,
  BarChart3,
  Calendar,
  CreditCard,
  DollarSign,
  Package,
  ReceiptText,
  ShoppingBag,
  TrendingUp,
  Users,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from "recharts";
import clsx from "clsx";
import {
  loadCompletedSales,
  type CompletedSaleData,
} from "./CompleteSaleReceipt";
import { loadProducts, type Product } from "@/lib/inventory-store";
import { ChartClientOnly } from "@/components/dashboard/ChartClientOnly";

function money(n: number): string {
  return `BDT ${Math.max(0, n).toLocaleString("en-BD")}`;
}

type DateRange = "today" | "7d" | "30d" | "all";

const DATE_LABELS: Record<DateRange, string> = {
  today: "Today",
  "7d": "Last 7 Days",
  "30d": "Last 30 Days",
  all: "All Time",
};

function parseDate(dateStr: string): Date | null {
  const d = new Date(dateStr);
  if (!isNaN(d.getTime())) return d;
  const parts = dateStr.match(/(\d{1,2})\s+(\w+)\s+(\d{4})/);
  if (parts) {
    const parsed = new Date(`${parts[2]} ${parts[1]}, ${parts[3]}`);
    if (!isNaN(parsed.getTime())) return parsed;
  }
  return null;
}

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function formatShortDate(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function filterByRange(sales: CompletedSaleData[], range: DateRange): CompletedSaleData[] {
  if (range === "all") return sales;
  const now = startOfDay(new Date());
  const daysBack = range === "today" ? 0 : range === "7d" ? 6 : 29;
  const cutoff = new Date(now.getTime() - daysBack * 86400000);

  return sales.filter((s) => {
    const d = parseDate(s.date);
    return d && startOfDay(d) >= cutoff;
  });
}

type DailyBucket = {
  label: string;
  date: Date;
  revenue: number;
  profit: number;
  sales: number;
  items: number;
};

function buildDailyData(
  sales: CompletedSaleData[],
  costMap: Map<string, number>,
  range: DateRange
): DailyBucket[] {
  const bucketMap = new Map<string, DailyBucket>();

  for (const sale of sales) {
    const d = parseDate(sale.date);
    if (!d) continue;
    const key = startOfDay(d).toISOString();
    let bucket = bucketMap.get(key);
    if (!bucket) {
      bucket = {
        label: formatShortDate(d),
        date: startOfDay(d),
        revenue: 0,
        profit: 0,
        sales: 0,
        items: 0,
      };
      bucketMap.set(key, bucket);
    }
    bucket.revenue += sale.total;
    bucket.sales += 1;
    bucket.items += sale.items.reduce((s, i) => s + i.qty, 0);

    let saleCost = 0;
    for (const item of sale.items) {
      const cost = costMap.get(item.code) ?? 0;
      saleCost += cost * item.qty;
    }
    bucket.profit += sale.total - saleCost;
  }

  const arr = Array.from(bucketMap.values()).sort(
    (a, b) => a.date.getTime() - b.date.getTime()
  );

  if (range === "today") return arr.slice(-1);
  if (range === "7d") return arr.slice(-7);
  if (range === "30d") return arr.slice(-30);
  return arr;
}

type TopProduct = {
  name: string;
  code: string;
  qty: number;
  revenue: number;
};

function buildTopProducts(sales: CompletedSaleData[], limit = 5): TopProduct[] {
  const map = new Map<string, TopProduct>();
  for (const sale of sales) {
    for (const item of sale.items) {
      const existing = map.get(item.code);
      if (existing) {
        existing.qty += item.qty;
        existing.revenue += item.lineTotal;
      } else {
        map.set(item.code, {
          name: item.name,
          code: item.code,
          qty: item.qty,
          revenue: item.lineTotal,
        });
      }
    }
  }
  return Array.from(map.values())
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, limit);
}

type PaymentBreakdown = { name: string; value: number };

function buildPaymentBreakdown(sales: CompletedSaleData[]): PaymentBreakdown[] {
  const map = new Map<string, number>();
  for (const sale of sales) {
    const acc = sale.paymentAccount || "Unknown";
    map.set(acc, (map.get(acc) ?? 0) + sale.total);
  }
  return Array.from(map.entries())
    .map(([name, value]) => ({ name, value }))
    .sort((a, b) => b.value - a.value);
}

const PIE_COLORS = ["#6366f1", "#06b6d4", "#10b981", "#f59e0b", "#ef4444", "#8b5cf6"];

export function SalesReportPanel() {
  const [allSales, setAllSales] = useState<CompletedSaleData[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [range, setRange] = useState<DateRange>("7d");

  useEffect(() => {
    const refresh = () => {
      setAllSales(loadCompletedSales());
      setProducts(loadProducts());
    };
    refresh();
    window.addEventListener("youraiseller-data-updated", refresh);
    return () => window.removeEventListener("youraiseller-data-updated", refresh);
  }, []);

  const costMap = useMemo(() => {
    const map = new Map<string, number>();
    for (const p of products) {
      map.set(p.code, p.costPrice);
    }
    return map;
  }, [products]);

  const sales = useMemo(() => filterByRange(allSales, range), [allSales, range]);

  const summary = useMemo(() => {
    const totalRevenue = sales.reduce((s, r) => s + r.total, 0);
    const totalDiscount = sales.reduce((s, r) => s + r.discount, 0);
    const totalPaid = sales.reduce((s, r) => s + r.paid, 0);
    const totalDue = sales.reduce((s, r) => s + r.due, 0);
    const totalItems = sales.reduce(
      (s, r) => s + r.items.reduce((q, i) => q + i.qty, 0),
      0
    );
    let totalCost = 0;
    for (const sale of sales) {
      for (const item of sale.items) {
        totalCost += (costMap.get(item.code) ?? 0) * item.qty;
      }
    }
    const totalProfit = totalRevenue - totalCost;
    const profitMargin = totalRevenue > 0 ? (totalProfit / totalRevenue) * 100 : 0;
    const avgSaleValue = sales.length > 0 ? totalRevenue / sales.length : 0;

    const customerSet = new Set<string>();
    for (const sale of sales) {
      if (sale.customerName) customerSet.add(sale.customerName);
    }

    return {
      totalRevenue,
      totalDiscount,
      totalPaid,
      totalDue,
      totalItems,
      totalCost,
      totalProfit,
      profitMargin,
      avgSaleValue,
      salesCount: sales.length,
      uniqueCustomers: customerSet.size,
    };
  }, [sales, costMap]);

  const dailyData = useMemo(
    () => buildDailyData(sales, costMap, range),
    [sales, costMap, range]
  );
  const topProducts = useMemo(() => buildTopProducts(sales), [sales]);
  const paymentBreakdown = useMemo(() => buildPaymentBreakdown(sales), [sales]);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-slate-900">
            <BarChart3 className="h-7 w-7 text-indigo-600" />
            Sales Report
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            POS sales analytics — revenue, profit, trends and top products.
          </p>
        </div>
        <div className="flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white p-1">
          {(Object.keys(DATE_LABELS) as DateRange[]).map((key) => (
            <button
              key={key}
              type="button"
              onClick={() => setRange(key)}
              className={clsx(
                "rounded-lg px-3.5 py-2 text-xs font-black transition",
                range === key
                  ? "bg-indigo-600 text-white"
                  : "text-slate-600 hover:bg-slate-50"
              )}
            >
              {DATE_LABELS[key]}
            </button>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <SummaryCard
          label="Total Revenue"
          value={money(summary.totalRevenue)}
          icon={DollarSign}
          tone="bg-indigo-50 text-indigo-600"
        />
        <SummaryCard
          label="Total Profit"
          value={money(summary.totalProfit)}
          sub={`${summary.profitMargin.toFixed(1)}% margin`}
          icon={TrendingUp}
          tone="bg-emerald-50 text-emerald-600"
        />
        <SummaryCard
          label="Total Sales"
          value={String(summary.salesCount)}
          sub={`${summary.totalItems} items sold`}
          icon={ShoppingBag}
          tone="bg-cyan-50 text-cyan-600"
        />
        <SummaryCard
          label="Avg Sale Value"
          value={money(summary.avgSaleValue)}
          icon={ReceiptText}
          tone="bg-amber-50 text-amber-600"
        />
      </div>

      {/* Secondary stats */}
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        <MiniStat label="Collected" value={money(summary.totalPaid)} icon={CreditCard} />
        <MiniStat label="Due Balance" value={money(summary.totalDue)} icon={ArrowDownRight} tone={summary.totalDue > 0 ? "text-rose-600" : undefined} />
        <MiniStat label="Discount Given" value={money(summary.totalDiscount)} icon={BadgePercent} />
        <MiniStat label="Customers" value={String(summary.uniqueCustomers)} icon={Users} />
      </div>

      {/* Revenue & Profit chart */}
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <div className="mb-4 flex items-center justify-between">
          <div>
            <h2 className="text-base font-extrabold text-slate-900">Revenue & Profit</h2>
            <p className="text-xs text-slate-500">Daily breakdown for {DATE_LABELS[range].toLowerCase()}</p>
          </div>
          <div className="flex items-center gap-4 text-xs font-bold">
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-indigo-500" /> Revenue
            </span>
            <span className="flex items-center gap-1.5">
              <span className="h-3 w-3 rounded-sm bg-emerald-500" /> Profit
            </span>
          </div>
        </div>
        <ChartClientOnly height={300}>
          {dailyData.length === 0 ? (
            <div className="flex h-[300px] items-center justify-center text-sm text-slate-400">
              No sales data for this period.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={dailyData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #e2e8f0",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                  formatter={(value: number, name: string) => [
                    money(value),
                    name === "revenue" ? "Revenue" : "Profit",
                  ]}
                />
                <Bar dataKey="revenue" fill="#6366f1" radius={[6, 6, 0, 0]} />
                <Bar dataKey="profit" fill="#10b981" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartClientOnly>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Top products */}
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-1 text-base font-extrabold text-slate-900">Top Products</h2>
          <p className="mb-4 text-xs text-slate-500">Best selling by revenue</p>
          {topProducts.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-slate-400">
              No product data yet.
            </div>
          ) : (
            <div className="space-y-2.5">
              {topProducts.map((p, i) => {
                const maxRevenue = topProducts[0].revenue;
                const pct = maxRevenue > 0 ? (p.revenue / maxRevenue) * 100 : 0;
                return (
                  <div key={p.code}>
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-xs font-black text-indigo-600">
                          {i + 1}
                        </span>
                        <div className="min-w-0">
                          <p className="truncate text-sm font-bold text-slate-900">{p.name}</p>
                          <p className="font-mono text-[10px] text-slate-400">{p.code}</p>
                        </div>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-sm font-black text-slate-900">{money(p.revenue)}</p>
                        <p className="text-[10px] font-semibold text-slate-400">{p.qty} sold</p>
                      </div>
                    </div>
                    <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-indigo-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Payment breakdown */}
        <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
          <h2 className="mb-1 text-base font-extrabold text-slate-900">Payment Methods</h2>
          <p className="mb-4 text-xs text-slate-500">Revenue by payment account</p>
          {paymentBreakdown.length === 0 ? (
            <div className="flex h-40 items-center justify-center text-sm text-slate-400">
              No payment data yet.
            </div>
          ) : (
            <ChartClientOnly height={260}>
              <ResponsiveContainer width="100%" height={260}>
                <PieChart>
                  <Pie
                    data={paymentBreakdown}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={55}
                    outerRadius={90}
                    paddingAngle={3}
                    strokeWidth={0}
                  >
                    {paymentBreakdown.map((_, i) => (
                      <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Legend
                    verticalAlign="bottom"
                    iconType="circle"
                    iconSize={8}
                    formatter={(value: string) => (
                      <span className="text-xs font-bold text-slate-700">{value}</span>
                    )}
                  />
                  <Tooltip
                    contentStyle={{
                      borderRadius: 12,
                      border: "1px solid #e2e8f0",
                      fontSize: 12,
                      fontWeight: 700,
                    }}
                    formatter={(value: number) => [money(value), "Amount"]}
                  />
                </PieChart>
              </ResponsiveContainer>
            </ChartClientOnly>
          )}
        </div>
      </div>

      {/* Sales count chart */}
      <div className="rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-200">
        <h2 className="mb-1 text-base font-extrabold text-slate-900">Sales & Items Trend</h2>
        <p className="mb-4 text-xs text-slate-500">Number of sales and items sold per day</p>
        <ChartClientOnly height={250}>
          {dailyData.length === 0 ? (
            <div className="flex h-[250px] items-center justify-center text-sm text-slate-400">
              No sales data for this period.
            </div>
          ) : (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={dailyData} barGap={4}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <YAxis tick={{ fontSize: 11, fill: "#94a3b8" }} />
                <Tooltip
                  contentStyle={{
                    borderRadius: 12,
                    border: "1px solid #e2e8f0",
                    fontSize: 12,
                    fontWeight: 700,
                  }}
                />
                <Bar dataKey="sales" name="Sales" fill="#06b6d4" radius={[6, 6, 0, 0]} />
                <Bar dataKey="items" name="Items" fill="#f59e0b" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </ChartClientOnly>
      </div>
    </div>
  );
}

function SummaryCard({
  label,
  value,
  sub,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  sub?: string;
  icon: ComponentType<{ className?: string }>;
  tone: string;
}) {
  const [bg, fg] = tone.split(" ");
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center gap-3">
        <span className={clsx("flex h-11 w-11 items-center justify-center rounded-xl", bg)}>
          <Icon className={clsx("h-5 w-5", fg)} />
        </span>
        <div className="min-w-0">
          <p className="text-xs font-bold uppercase text-slate-400">{label}</p>
          <p className="text-lg font-black text-slate-900">{value}</p>
          {sub ? <p className="text-[11px] font-semibold text-slate-500">{sub}</p> : null}
        </div>
      </div>
    </div>
  );
}

function MiniStat({
  label,
  value,
  icon: Icon,
  tone,
}: {
  label: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
  tone?: string;
}) {
  return (
    <div className="flex items-center gap-3 rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
      <Icon className={clsx("h-4 w-4 shrink-0", tone ?? "text-slate-400")} />
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase text-slate-400">{label}</p>
        <p className={clsx("text-sm font-black", tone ?? "text-slate-900")}>{value}</p>
      </div>
    </div>
  );
}
