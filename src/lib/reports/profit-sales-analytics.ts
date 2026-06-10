import type { AccountingExpense, AccountingIncome } from "@/lib/accounting-store";
import { orderCogs } from "@/lib/reports/accounting-depth-analytics";
import type { DateRange } from "@/lib/reports/report-types";
import {
  isOperatingAccountingRef,
  isWithinRange,
  parseDateLabel,
  parseOrderDate,
} from "@/lib/reports/report-utils";
import type { Order } from "@/lib/orders-store";

export type ProfitSalesRow = {
  label: string;
  amount: number;
  count: number | null;
  details: string;
  sign: "+" | "-" | "=";
  source: "accounting" | "orders";
};

export type ProfitSalesReport = {
  /** Accounting → Income page entries (operating) */
  accountingIncome: number;
  /** Accounting → Expense page entries (operating) */
  accountingExpense: number;
  /** Accounting P&L: Income − Expense */
  netProfit: number;
  netMargin: number;
  /** Order-based sales estimate (pending weighted) */
  orderSales: number;
  /** Order-based: orderSales − product cost */
  orderGrossProfit: number;
  orderGrossMargin: number;
  confirmationRate: number;
  orderStats: {
    total: number;
    delivered: number;
    pending: number;
    returned: number;
  };
  expenseTotal: number;
  adsExpense: number;
  otherExpense: number;
  productCost: number;
  deliveryCost: number;
  allocation: {
    netProfit: number;
    productCost: number;
    deliveryCost: number;
    adsExpense: number;
    otherExpense: number;
  };
  accountingRows: ProfitSalesRow[];
  orderRows: ProfitSalesRow[];
  dailyChart: {
    date: string;
    income: number;
    expense: number;
    netProfit: number;
    orderSales: number;
    orderGrossProfit: number;
  }[];
};

const EXCLUDED = new Set(["cancelled", "lost"]);

function isAdExpense(row: AccountingExpense): boolean {
  return (
    row.category === "ad" ||
    row.title.toLowerCase().includes("meta") ||
    row.title.toLowerCase().includes("facebook") ||
    row.title.toLowerCase().includes("instagram")
  );
}

function orderWeight(status: Order["status"], confirmationRate: number): number {
  if (EXCLUDED.has(status)) return 0;
  if (status === "delivered" || status === "partial") return 1;
  if (status === "returned") return 0;
  return confirmationRate;
}

function confirmationRateFromOrders(orders: Order[]): number {
  const delivered = orders.filter((o) => o.status === "delivered" || o.status === "partial").length;
  const returned = orders.filter((o) => o.status === "returned").length;
  const settled = delivered + returned;
  if (settled > 0) return (delivered / settled) * 100;
  return 80;
}

export function buildProfitSalesReport(
  orders: Order[],
  expenses: AccountingExpense[],
  income: AccountingIncome[],
  range: DateRange,
  from: string,
  to: string
): ProfitSalesReport {
  const inRange = orders.filter((o) => isWithinRange(parseOrderDate(o), range, from, to));
  const active = inRange.filter((o) => !EXCLUDED.has(o.status));
  const confirmationRate = confirmationRateFromOrders(active);

  let orderSales = 0;
  let productCost = 0;
  let deliveryCost = 0;
  let salesOrderCount = 0;

  const dailyOrderMap = new Map<
    string,
    { orderSales: number; productCost: number; deliveryCost: number }
  >();
  const dailyAccMap = new Map<string, { income: number; expense: number }>();

  for (const order of active) {
    const w = orderWeight(order.status, confirmationRate / 100);
    if (w <= 0) continue;

    const sales = order.total * w;
    const cogs = orderCogs(order) * w;
    const shipping = order.shippingCharge * w;

    orderSales += sales;
    productCost += cogs;
    deliveryCost += shipping;
    salesOrderCount += 1;

    const date = parseOrderDate(order);
    const key = date
      ? `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`
      : "Unknown";
    const row = dailyOrderMap.get(key) ?? { orderSales: 0, productCost: 0, deliveryCost: 0 };
    row.orderSales += sales;
    row.productCost += cogs;
    row.deliveryCost += shipping;
    dailyOrderMap.set(key, row);
  }

  const periodExpenses = expenses.filter(
    (row) =>
      isOperatingAccountingRef(row.reference) &&
      isWithinRange(parseDateLabel(row.date), range, from, to)
  );
  const periodIncome = income.filter(
    (row) =>
      isOperatingAccountingRef(row.reference) &&
      isWithinRange(parseDateLabel(row.date), range, from, to)
  );

  const accountingIncome = periodIncome.reduce((sum, row) => sum + row.amount, 0);
  const accountingExpense = periodExpenses.reduce((sum, row) => sum + row.amount, 0);
  const netProfit = accountingIncome - accountingExpense;
  const netMargin = accountingIncome > 0 ? (netProfit / accountingIncome) * 100 : 0;

  const adsExpense = periodExpenses.filter(isAdExpense).reduce((sum, row) => sum + row.amount, 0);
  const otherExpense = accountingExpense - adsExpense;

  const orderGrossProfit = orderSales - productCost;
  const orderGrossMargin = orderSales > 0 ? (orderGrossProfit / orderSales) * 100 : 0;

  const delivered = active.filter((o) => o.status === "delivered" || o.status === "partial").length;
  const returned = active.filter((o) => o.status === "returned").length;
  const pending = active.length - delivered - returned;
  const rateLabel = confirmationRate.toFixed(1);

  for (const row of periodIncome) {
    const d = parseDateLabel(row.date);
    const key = d
      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
      : "Unknown";
    const acc = dailyAccMap.get(key) ?? { income: 0, expense: 0 };
    acc.income += row.amount;
    dailyAccMap.set(key, acc);
  }
  for (const row of periodExpenses) {
    const d = parseDateLabel(row.date);
    const key = d
      ? `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`
      : "Unknown";
    const acc = dailyAccMap.get(key) ?? { income: 0, expense: 0 };
    acc.expense += row.amount;
    dailyAccMap.set(key, acc);
  }

  const allDates = new Set([...dailyOrderMap.keys(), ...dailyAccMap.keys()]);
  const dailyChart = [...allDates]
    .map((date) => {
      const acc = dailyAccMap.get(date) ?? { income: 0, expense: 0 };
      const ord = dailyOrderMap.get(date) ?? { orderSales: 0, productCost: 0, deliveryCost: 0 };
      return {
        date,
        income: acc.income,
        expense: acc.expense,
        netProfit: acc.income - acc.expense,
        orderSales: ord.orderSales,
        orderGrossProfit: ord.orderSales - ord.productCost,
      };
    })
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-14);

  const accountingRows: ProfitSalesRow[] = [
    {
      label: "Total Income",
      amount: accountingIncome,
      count: periodIncome.length,
      details: "Accounting → Income (recorded entries in date range)",
      sign: "+",
      source: "accounting",
    },
    {
      label: "Total Expense",
      amount: accountingExpense,
      count: periodExpenses.length,
      details: "Accounting → Expense (operating expenses, excludes loans/assets)",
      sign: "-",
      source: "accounting",
    },
    {
      label: "Net Profit / Loss",
      amount: netProfit,
      count: null,
      details: "Income − Expense — same as Accounting books",
      sign: "=",
      source: "accounting",
    },
  ];

  const orderRows: ProfitSalesRow[] = [
    {
      label: "Order Sales (Est.)",
      amount: orderSales,
      count: salesOrderCount,
      details: `From orders · pending weighted at ${rateLabel}% delivery rate`,
      sign: "+",
      source: "orders",
    },
    {
      label: "Product Cost",
      amount: productCost,
      count: salesOrderCount,
      details: "Inventory cost price on order items",
      sign: "-",
      source: "orders",
    },
    {
      label: "Gross Profit (Orders)",
      amount: orderGrossProfit,
      count: null,
      details: `Order sales − product cost (${orderGrossMargin.toFixed(1)}% margin)`,
      sign: "=",
      source: "orders",
    },
    {
      label: "Delivery Cost",
      amount: deliveryCost,
      count: salesOrderCount,
      details: "Shipping charge on orders (operational estimate)",
      sign: "-",
      source: "orders",
    },
  ];

  return {
    accountingIncome,
    accountingExpense,
    netProfit,
    netMargin,
    orderSales,
    orderGrossProfit,
    orderGrossMargin,
    confirmationRate,
    orderStats: { total: active.length, delivered, pending, returned },
    expenseTotal: accountingExpense,
    adsExpense,
    otherExpense,
    productCost,
    deliveryCost,
    allocation: {
      netProfit,
      productCost,
      deliveryCost,
      adsExpense,
      otherExpense,
    },
    accountingRows,
    orderRows,
    dailyChart,
  };
}

export function allocationPercent(value: number, base: number): number {
  if (base <= 0) return 0;
  return (value / base) * 100;
}
