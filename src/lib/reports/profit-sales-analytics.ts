import type { AccountingExpense, AccountingIncome } from "@/lib/accounting-store";
import { formatBdt } from "@/lib/accounting-store";
import { orderCogs } from "@/lib/reports/accounting-depth-analytics";
import type { DateRange } from "@/lib/reports/report-types";
import {
  isOperatingAccountingRef,
  isWithinRange,
  parseDateLabel,
  parseOrderDate,
} from "@/lib/reports/report-utils";
import type { Order } from "@/lib/orders-store";
import {
  isApprovedDeliveryAndReturnChargeExpense,
  isOrderDeliveryChargeExpense,
  isReturnDeliveryChargeExpense,
} from "@/lib/order-delivery-expense";

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
  returnDeliveryExpense: number;
  returnDeliveryCount: number;
  deliveryChargeExpense: number;
  deliveryChargeCount: number;
  accountingOrderCount: number;
  accountingInvoiceCount: number;
  accountingOrderHistory: {
    id: string;
    orderId: string;
    date: string;
    type: "income" | "expense";
    label: string;
    amount: number;
  }[];
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
const toTaka = (value: number): number => Math.round(value);

function isAdExpense(row: AccountingExpense): boolean {
  return (
    row.category === "ad" ||
    row.title.toLowerCase().includes("meta") ||
    row.title.toLowerCase().includes("facebook") ||
    row.title.toLowerCase().includes("instagram")
  );
}

function normalizeOrderId(value?: string | null): string | null {
  if (!value) return null;
  const trimmed = value.trim().toUpperCase();
  if (!trimmed) return null;
  const m = trimmed.match(/^(WO|WEB)[\s/_-]*([A-Z0-9]+)$/);
  if (!m) return null;
  return `${m[1]}-${m[2]}`;
}

function orderIdFromAccountingRef(reference?: string): string | null {
  if (!reference) return null;
  const trimmed = reference.trim();
  const directPart = trimmed.split("#")[0]?.trim() ?? "";
  const direct = normalizeOrderId(directPart);
  if (direct) return direct;
  const hashPart = trimmed.slice(trimmed.lastIndexOf("#") + 1).trim();
  const fromHashPart = normalizeOrderId(hashPart);
  if (fromHashPart) return fromHashPart;
  const m = trimmed.match(/(?:^|[^A-Z0-9])(WO|WEB)[\s/_-]*([A-Z0-9]+)/i);
  if (m) return `${m[1].toUpperCase()}-${m[2].toUpperCase()}`;
  return null;
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
  invoiceCount: number,
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
    (row) => isWithinRange(parseDateLabel(row.date), range, from, to)
  );
  const periodIncome = income.filter(
    (row) =>
      isOperatingAccountingRef(row.reference) &&
      isWithinRange(parseDateLabel(row.date), range, from, to)
  );

  const accountingIncomeRaw = periodIncome.reduce((sum, row) => sum + row.amount, 0);
  const accountingExpenseRaw = periodExpenses.reduce((sum, row) => sum + row.amount, 0);

  const adsExpenseRaw = periodExpenses.filter(isAdExpense).reduce((sum, row) => sum + row.amount, 0);
  const cogsByOrderIncomeRatios = new Map<string, number>();
  const orderById = new Map(
    inRange
      .map((o) => [normalizeOrderId(o.id), o] as const)
      .filter((row): row is [string, Order] => Boolean(row[0]))
  );
  for (const row of periodIncome) {
    const refOrderId =
      orderIdFromAccountingRef(row.reference) ||
      orderIdFromAccountingRef(row.title) ||
      orderIdFromAccountingRef(row.note);
    if (!refOrderId) continue;
    const order = orderById.get(normalizeOrderId(refOrderId) ?? "");
    if (!order) continue;
    if (order.total <= 0) continue;
    const ratio = Math.max(0, row.amount / order.total);
    const prev = cogsByOrderIncomeRatios.get(order.id) ?? 0;
    cogsByOrderIncomeRatios.set(order.id, Math.min(1, prev + ratio));
  }
  const cogsFromOrderIncome = [...cogsByOrderIncomeRatios.entries()].reduce((sum, [orderId, ratio]) => {
    const order = orderById.get(normalizeOrderId(orderId) ?? "");
    if (!order) return sum;
    return sum + orderCogs(order) * ratio;
  }, 0);
  const cogsFromPeriodOrders =
    orderSales > 0 && accountingIncomeRaw > 0
      ? productCost * Math.min(1, Math.max(0, accountingIncomeRaw / orderSales))
      : 0;
  const cogsExpenseRaw =
    cogsFromOrderIncome > 0 ? cogsFromOrderIncome : cogsFromPeriodOrders;
  const cogsCount =
    cogsFromOrderIncome > 0 ? cogsByOrderIncomeRatios.size : salesOrderCount;
  const chargeExpenseRows = periodExpenses.filter(isApprovedDeliveryAndReturnChargeExpense);
  const deliveryAndReturnChargeRaw = chargeExpenseRows.reduce((sum, row) => sum + row.amount, 0);
  const deliveryAndReturnCount = chargeExpenseRows.length;
  const deliveryChargeExpenseRaw = chargeExpenseRows
    .filter((row) => isOrderDeliveryChargeExpense(row))
    .reduce((sum, row) => sum + row.amount, 0);
  const deliveryChargeCount = chargeExpenseRows.filter((row) =>
    isOrderDeliveryChargeExpense(row)
  ).length;
  const returnDeliveryExpenseRaw = chargeExpenseRows
    .filter((row) => isReturnDeliveryChargeExpense(row))
    .reduce((sum, row) => sum + row.amount, 0);
  const returnDeliveryCount = chargeExpenseRows.filter((row) =>
    isReturnDeliveryChargeExpense(row)
  ).length;
  const operatingExpenseRows = periodExpenses.filter(
    (row) => !isApprovedDeliveryAndReturnChargeExpense(row)
  );
  const operatingExpenseRaw = operatingExpenseRows.reduce((sum, row) => sum + row.amount, 0);
  const accountingIncome = toTaka(accountingIncomeRaw);
  const accountingExpense = toTaka(accountingExpenseRaw);
  const adsExpense = toTaka(adsExpenseRaw);
  const cogsExpense = toTaka(cogsExpenseRaw);
  const deliveryChargeExpense = toTaka(deliveryChargeExpenseRaw);
  const returnDeliveryExpense = toTaka(deliveryAndReturnChargeRaw);
  const operatingExpense = toTaka(operatingExpenseRaw);
  const totalOperatingExpenseRaw = operatingExpenseRaw + deliveryAndReturnChargeRaw;
  const totalExpense = toTaka(totalOperatingExpenseRaw);
  const grossProfit = toTaka(accountingIncome - cogsExpense);
  const netProfit = toTaka(grossProfit - totalExpense);
  const netMargin = accountingIncome > 0 ? (netProfit / accountingIncome) * 100 : 0;
  const otherExpense = toTaka(accountingExpense - adsExpense);
  const accountingOrderHistory = [
    ...periodIncome
      .map((row) => {
        const orderId = orderIdFromAccountingRef(row.reference);
        if (!orderId) return null;
        return {
          id: `inc-${row.id}`,
          orderId,
          date: row.date,
          type: "income" as const,
          label: row.title,
          amount: row.amount,
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row)),
    ...periodExpenses
      .map((row) => {
        const orderId = orderIdFromAccountingRef(row.reference);
        if (!orderId) return null;
        return {
          id: `exp-${row.id}`,
          orderId,
          date: row.date,
          type: "expense" as const,
          label: row.title,
          amount: row.amount,
        };
      })
      .filter((row): row is NonNullable<typeof row> => Boolean(row)),
  ].sort(
    (a, b) => (parseDateLabel(b.date)?.getTime() ?? 0) - (parseDateLabel(a.date)?.getTime() ?? 0)
  );
  const accountingOrderCount = new Set(accountingOrderHistory.map((row) => row.orderId)).size;

  orderSales = toTaka(orderSales);
  productCost = toTaka(productCost);
  deliveryCost = toTaka(deliveryCost);
  const orderGrossProfit = toTaka(orderSales - productCost);
  const orderNetProfit = toTaka(orderGrossProfit - deliveryCost);
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
      label: "Cost of Goods Sold",
      amount: cogsExpense,
      count: cogsCount,
      details:
        cogsFromOrderIncome > 0
          ? "Product buying price (costPrice) on order-linked income"
          : "Product buying price (costPrice) on period orders",
      sign: "-",
      source: "accounting",
    },
    {
      label: "Gross Profit",
      amount: grossProfit,
      count: null,
      details: "Income − Cost of Goods Sold",
      sign: "=",
      source: "accounting",
    },
    {
      label: "Operating Expenses",
      amount: operatingExpense,
      count: operatingExpenseRows.length,
      details: "Expense tab entries only (courier/charge excluded)",
      sign: "-",
      source: "accounting",
    },
    {
      label: "Delivery & Return Charge",
      amount: returnDeliveryExpense,
      count: deliveryAndReturnCount,
      details: "Approved order delivery & return charges (Transaction → Delivery Charge)",
      sign: "-",
      source: "accounting",
    },
    {
      label: "Total Operating Expenses",
      amount: totalExpense,
      count: operatingExpenseRows.length + deliveryAndReturnCount,
      details: "Operating Expenses + Delivery & Return Charge",
      sign: "-",
      source: "accounting",
    },
    {
      label: "Net Profit / Loss",
      amount: netProfit,
      count: null,
      details: "Gross Profit − Total Operating Expenses",
      sign: "=",
      source: "accounting",
    },
  ];

  const orderRows: ProfitSalesRow[] = [
    {
      label: "Total Income (Orders)",
      amount: orderSales,
      count: salesOrderCount,
      details: `From orders · pending weighted at ${rateLabel}% delivery rate`,
      sign: "+",
      source: "orders",
    },
    {
      label: "Cost of Goods Sold (Orders)",
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
      label: "Operating Expenses (Orders)",
      amount: deliveryCost,
      count: salesOrderCount,
      details: "Shipping charge on orders (operational estimate)",
      sign: "-",
      source: "orders",
    },
    {
      label: "Total Operating Expenses (Orders)",
      amount: deliveryCost,
      count: salesOrderCount,
      details: "Delivery and operational costs on orders",
      sign: "-",
      source: "orders",
    },
    {
      label: "Net Profit (Orders Est.)",
      amount: orderNetProfit,
      count: null,
      details: "Gross Profit − Total Operating Expenses",
      sign: "=",
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
    returnDeliveryExpense,
    returnDeliveryCount,
    deliveryChargeExpense,
    deliveryChargeCount,
    accountingOrderCount,
    accountingInvoiceCount: Math.max(0, invoiceCount),
    accountingOrderHistory,
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
