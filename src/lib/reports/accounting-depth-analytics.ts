import {
  ACCOUNT_TYPE_LABELS,
  getAccountBalance,
  invoiceCollectedTotal,
  invoiceDueBalance,
  LIABILITY_TYPE_LABELS,
  liabilityOutstanding,
  loadAccountingData,
  type AccountingInvoice,
  type AccountingLiability,
} from "@/lib/accounting-store";
import { getProduct } from "@/lib/inventory-store";
import { orderGrossTotal, type Order } from "@/lib/orders-store";
import type { DateRange } from "./report-types";
import { isWithinRange, parseDateLabel, parseOrderDate } from "./report-utils";

const NON_COUNTABLE_STATUSES = new Set(["cancelled", "returned", "lost"]);

function isCountableOrder(order: Order): boolean {
  return !NON_COUNTABLE_STATUSES.has(order.status);
}

export function orderCogs(order: Order): number {
  return order.items.reduce((sum, line) => {
    const product = getProduct(line.productId);
    const unitCost = product?.costPrice ?? line.price * 0.65;
    return sum + unitCost * line.qty;
  }, 0);
}

export function buildPeriodGrossProfit(
  orders: Order[],
  range: DateRange,
  from: string,
  to: string
) {
  let revenue = 0;
  let cogs = 0;
  let orderCount = 0;

  for (const order of orders) {
    if (!isWithinRange(parseOrderDate(order), range, from, to)) continue;
    if (!isCountableOrder(order)) continue;
    orderCount += 1;
    revenue += orderGrossTotal(order);
    cogs += orderCogs(order);
  }

  const grossProfit = revenue - cogs;
  return {
    revenue,
    cogs,
    grossProfit,
    grossMargin: revenue > 0 ? (grossProfit / revenue) * 100 : 0,
    orderCount,
  };
}

export type AccountBalanceRow = {
  id: string;
  name: string;
  typeLabel: string;
  active: boolean;
  balance: number;
};

export function buildAccountBalanceRows(): AccountBalanceRow[] {
  const data = loadAccountingData();
  return data.accounts
    .map((account) => ({
      id: account.id,
      name: account.name,
      typeLabel: ACCOUNT_TYPE_LABELS[account.type] ?? account.type,
      active: account.active,
      balance: getAccountBalance(account.id),
    }))
    .sort((a, b) => b.balance - a.balance);
}

export type LiabilityAgingBucket = "current" | "1-30" | "31-60" | "61-90" | "90+";

export type LiabilityAgingRow = {
  id: string;
  name: string;
  typeLabel: string;
  outstanding: number;
  dueDate?: string;
  daysFromDue: number;
  bucket: LiabilityAgingBucket;
};

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function liabilityDueDate(liability: AccountingLiability): Date | null {
  return parseDateLabel(liability.dueDate ?? liability.createdDate);
}

export function bucketLiabilityAging(daysFromDue: number): LiabilityAgingBucket {
  if (daysFromDue <= 0) return "current";
  if (daysFromDue <= 30) return "1-30";
  if (daysFromDue <= 60) return "31-60";
  if (daysFromDue <= 90) return "61-90";
  return "90+";
}

export const LIABILITY_AGING_LABELS: Record<LiabilityAgingBucket, string> = {
  current: "Current",
  "1-30": "1–30 days",
  "31-60": "31–60 days",
  "61-90": "61–90 days",
  "90+": "90+ days",
};

export function buildLiabilityAgingRows(now = new Date()): LiabilityAgingRow[] {
  const data = loadAccountingData();
  return data.liabilities
    .filter((l) => l.status === "active")
    .map((liability) => {
      const outstanding = liabilityOutstanding(liability);
      const due = liabilityDueDate(liability);
      const daysFromDue = due
        ? Math.floor(
            (startOfDay(now).getTime() - startOfDay(due).getTime()) / 86400000
          )
        : 0;
      return {
        id: liability.id,
        name: liability.name,
        typeLabel: LIABILITY_TYPE_LABELS[liability.type] ?? liability.type,
        outstanding,
        dueDate: liability.dueDate ?? liability.createdDate,
        daysFromDue,
        bucket: bucketLiabilityAging(daysFromDue),
      };
    })
    .filter((row) => row.outstanding > 0)
    .sort((a, b) => b.daysFromDue - a.daysFromDue);
}

export function summarizeLiabilityAging(rows: LiabilityAgingRow[]) {
  const buckets: Record<LiabilityAgingBucket, number> = {
    current: 0,
    "1-30": 0,
    "31-60": 0,
    "61-90": 0,
    "90+": 0,
  };
  for (const row of rows) buckets[row.bucket] += row.outstanding;
  return {
    buckets,
    chart: (Object.keys(LIABILITY_AGING_LABELS) as LiabilityAgingBucket[]).map(
      (key) => ({
        name: LIABILITY_AGING_LABELS[key],
        amount: buckets[key],
      })
    ),
    totalOutstanding: rows.reduce((sum, row) => sum + row.outstanding, 0),
    count: rows.length,
  };
}

export type InvoiceCollectionRow = {
  id: string;
  invoiceNumber: string;
  date: string;
  customerName: string;
  invoiced: number;
  collected: number;
  due: number;
  status: string;
};

export function buildInvoiceCollectionReport(
  invoices: AccountingInvoice[],
  range: DateRange,
  from: string,
  to: string
) {
  const inPeriod = invoices.filter((inv) =>
    isWithinRange(parseDateLabel(inv.date), range, from, to)
  );
  const invoiced = inPeriod.reduce((sum, inv) => sum + inv.amount, 0);
  const collected = inPeriod.reduce(
    (sum, inv) => sum + invoiceCollectedTotal(inv),
    0
  );
  const due = inPeriod.reduce((sum, inv) => sum + invoiceDueBalance(inv), 0);

  const rows: InvoiceCollectionRow[] = inPeriod
    .map((inv) => ({
      id: inv.id,
      invoiceNumber: inv.invoiceNumber,
      date: inv.date,
      customerName: inv.customerName,
      invoiced: inv.amount,
      collected: invoiceCollectedTotal(inv),
      due: invoiceDueBalance(inv),
      status: inv.status,
    }))
    .sort((a, b) => b.due - a.due);

  return {
    invoiced,
    collected,
    due,
    collectionRate: invoiced > 0 ? (collected / invoiced) * 100 : 0,
    rows,
    count: inPeriod.length,
  };
}
