"use client";

import { useEffect, useMemo, useState } from "react";
import { PageHeader } from "@/components/ui/PageHeader";
import { Download, ExternalLink } from "lucide-react";
import clsx from "clsx";
import Link from "next/link";
import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Pie,
  PieChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { formatBdt } from "@/lib/accounting-store";
import {
  EXPENSE_CATEGORY_LABELS,
  assetBookValue,
  getAccountingSummary,
  getRecentTransactions,
  invoiceDueBalance,
  isActiveTransfer,
  liabilityOutstanding,
  loadAccountingData,
} from "@/lib/accounting-store";
import { ORDER_LIST_TABS, ORDER_STATUS_LABELS } from "@/lib/order-status-tabs";
import { loadOrders, type Order, type OrderStatus } from "@/lib/orders-store";
import { loadTeamUsers } from "@/lib/team-users-store";
import { ChartClientOnly } from "@/components/dashboard/ChartClientOnly";

type ReportTab = "sales" | "courier" | "payment" | "staff" | "accounting";
type DateRange = "all" | "today" | "week" | "month";

const REPORT_TABS: { id: ReportTab; label: string }[] = [
  { id: "sales", label: "Sales" },
  { id: "courier", label: "Courier" },
  { id: "payment", label: "Payment" },
  { id: "staff", label: "Staff" },
  { id: "accounting", label: "Accounting" },
];
const PIE_COLORS = [
  "#4f46e5",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#14b8a6",
  "#f97316",
];

function parseOrderDate(order: Order): Date | null {
  const raw = order.createdAt?.trim();
  if (!raw) return null;
  const parsed = Date.parse(raw);
  if (!Number.isNaN(parsed)) return new Date(parsed);
  return null;
}

function toInputDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isWithinRange(date: Date | null, range: DateRange, from: string, to: string): boolean {
  if (!date) return range === "all" && !from && !to;
  const now = new Date();
  const startToday = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  if (range === "today") return date >= startToday;
  if (range === "week") {
    const start = new Date(startToday);
    start.setDate(start.getDate() - 6);
    return date >= start;
  }
  if (range === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return date >= start;
  }
  if (from || to) {
    const fromDate = from ? new Date(from) : null;
    const toDate = to ? new Date(to) : null;
    if (fromDate && date < fromDate) return false;
    if (toDate) {
      const end = new Date(toDate);
      end.setHours(23, 59, 59, 999);
      if (date > end) return false;
    }
  }
  return true;
}

function csvValue(v: string | number): string {
  const s = String(v ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

function exportCsv(filename: string, headers: string[], rows: (string | number)[][]) {
  const content = [headers, ...rows]
    .map((row) => row.map((cell) => csvValue(cell)).join(","))
    .join("\n");
  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

function asNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

function formatCompactBdt(value: number): string {
  const abs = Math.abs(value);
  if (abs < 1000) return `৳${Math.round(value).toLocaleString("en-BD")}`;
  const compact = new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
  return `৳${compact}`;
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

function parseDateLabel(value?: string): Date | null {
  if (!value) return null;
  const parsed = Date.parse(value);
  if (!Number.isNaN(parsed)) return new Date(parsed);
  return null;
}

export default function ReportsPage() {
  const [tab, setTab] = useState<ReportTab>("sales");
  const [range, setRange] = useState<DateRange>("month");
  const [status, setStatus] = useState<"all" | OrderStatus>("all");
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [compareMode, setCompareMode] = useState(false);
  const [accRange, setAccRange] = useState<DateRange>("month");
  const [accFrom, setAccFrom] = useState("");
  const [accTo, setAccTo] = useState("");
  const [ledgerModalOpen, setLedgerModalOpen] = useState(false);
  const [ledgerModalTitle, setLedgerModalTitle] = useState("Ledger Details");
  const [ledgerModalRows, setLedgerModalRows] = useState<
    { id: string; date: string; label: string; amount: number }[]
  >([]);

  const allOrders = useMemo(() => loadOrders({ excludeWebQueue: true }), []);
  const accountingData = useMemo(() => loadAccountingData(), []);
  const accountingSummary = useMemo(() => getAccountingSummary(), [accountingData]);

  const accountingIncomeFiltered = useMemo(
    () =>
      accountingData.income.filter((row) =>
        isWithinRange(parseDateLabel(row.date), accRange, accFrom, accTo)
      ),
    [accountingData, accRange, accFrom, accTo]
  );
  const accountingExpenseFiltered = useMemo(
    () =>
      accountingData.expenses.filter((row) =>
        isWithinRange(parseDateLabel(row.date), accRange, accFrom, accTo)
      ),
    [accountingData, accRange, accFrom, accTo]
  );
  const accountingTransferFiltered = useMemo(
    () =>
      (accountingData.transfers ?? []).filter((row) =>
        isWithinRange(parseDateLabel(row.date), accRange, accFrom, accTo)
      ),
    [accountingData, accRange, accFrom, accTo]
  );
  const accountingAssetFiltered = useMemo(
    () =>
      accountingData.assets.filter((row) =>
        isWithinRange(parseDateLabel(row.createdDate ?? row.purchaseDate), accRange, accFrom, accTo)
      ),
    [accountingData, accRange, accFrom, accTo]
  );
  const accountingLiabilityFiltered = useMemo(
    () =>
      accountingData.liabilities.filter((row) =>
        isWithinRange(parseDateLabel(row.createdDate ?? row.dueDate), accRange, accFrom, accTo)
      ),
    [accountingData, accRange, accFrom, accTo]
  );
  const accountingInvoiceFiltered = useMemo(
    () =>
      accountingData.invoices.filter((row) =>
        isWithinRange(parseDateLabel(row.date), accRange, accFrom, accTo)
      ),
    [accountingData, accRange, accFrom, accTo]
  );

  const filteredOrders = useMemo(() => {
    return allOrders.filter((o) => {
      if (status !== "all" && o.status !== status) return false;
      return isWithinRange(parseOrderDate(o), range, from, to);
    });
  }, [allOrders, status, range, from, to]);

  const grossSales = useMemo(
    () =>
      filteredOrders
        .filter((o) => !["cancelled", "returned", "lost"].includes(o.status))
        .reduce((sum, o) => sum + o.total, 0),
    [filteredOrders]
  );

  const deliveredCount = useMemo(
    () => filteredOrders.filter((o) => o.status === "delivered" || o.status === "partial").length,
    [filteredOrders]
  );
  const returnedCount = useMemo(
    () => filteredOrders.filter((o) => o.status === "returned").length,
    [filteredOrders]
  );
  const returnRate = useMemo(() => {
    const base = deliveredCount + returnedCount;
    if (!base) return 0;
    return (returnedCount / base) * 100;
  }, [deliveredCount, returnedCount]);

  const paymentSummary = useMemo(() => {
    return filteredOrders.reduce(
      (acc, o) => {
        const advance = o.advancePaymentCollectedAmount ?? 0;
        const delivery = o.paymentCollectedAmount ?? 0;
        const payDiscount = o.paymentCollectionDiscount ?? 0;
        const due = Math.max(0, o.total - advance - delivery - payDiscount);
        acc.advance += advance;
        acc.delivery += delivery;
        acc.due += due;
        return acc;
      },
      { advance: 0, delivery: 0, due: 0 }
    );
  }, [filteredOrders]);

  const canCompare = useMemo(() => range !== "all" || Boolean(from && to), [range, from, to]);

  useEffect(() => {
    if (!canCompare && compareMode) setCompareMode(false);
  }, [canCompare, compareMode]);

  const courierRows = useMemo(() => {
    const map = new Map<
      string,
      { courier: string; total: number; delivered: number; returned: number; pending: number }
    >();
    for (const o of filteredOrders) {
      const key = o.courier || "Unknown";
      const row = map.get(key) ?? {
        courier: key,
        total: 0,
        delivered: 0,
        returned: 0,
        pending: 0,
      };
      row.total += 1;
      if (o.status === "delivered" || o.status === "partial") row.delivered += 1;
      else if (o.status === "returned") row.returned += 1;
      else if (!["cancelled", "lost"].includes(o.status)) row.pending += 1;
      map.set(key, row);
    }
    return [...map.values()].sort((a, b) => b.total - a.total);
  }, [filteredOrders]);

  const dailyTrend = useMemo(() => {
    const map = new Map<string, number>();
    for (const o of filteredOrders) {
      if (["cancelled", "returned", "lost"].includes(o.status)) continue;
      const date = parseOrderDate(o);
      const key = date ? toInputDate(date) : "Unknown";
      map.set(key, (map.get(key) ?? 0) + o.total);
    }
    return [...map.entries()]
      .map(([date, amount]) => ({ date, amount }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-10);
  }, [filteredOrders]);

  const statusBreakdown = useMemo(
    () =>
      ORDER_LIST_TABS.map((s) => ({
        key: s.key,
        label: s.label,
        count: filteredOrders.filter((o) => o.status === s.key).length,
      })).filter((row) => row.count > 0),
    [filteredOrders]
  );

  const [drillStatus, setDrillStatus] = useState<"all" | OrderStatus>("all");
  const drilledOrders = useMemo(() => {
    const base = drillStatus === "all"
      ? filteredOrders
      : filteredOrders.filter((o) => o.status === drillStatus);
    return [...base]
      .sort((a, b) => (parseOrderDate(b)?.getTime() ?? 0) - (parseOrderDate(a)?.getTime() ?? 0))
      .slice(0, 15);
  }, [filteredOrders, drillStatus]);

  const staffRows = useMemo(() => {
    const teamUsers = loadTeamUsers();
    const usersById = new Map(teamUsers.map((u) => [u.id, u.name.trim()]));
    const usersByName = new Map(teamUsers.map((u) => [u.name.trim().toLowerCase(), u.name.trim()]));

    function resolveStaffLabel(order: Order): string | null {
      if (order.createdByUserId) {
        const byId = usersById.get(order.createdByUserId);
        if (byId) return byId;
      }
      const raw = (order.handledBy ?? "").trim();
      if (!raw) return null;
      return usersByName.get(raw.toLowerCase()) ?? null;
    }

    const map = new Map<
      string,
      { staff: string; total: number; delivered: number; returned: number; revenue: number }
    >();
    for (const user of teamUsers) {
      const key = user.name.trim();
      map.set(key, {
        staff: key,
        total: 0,
        delivered: 0,
        returned: 0,
        revenue: 0,
      });
    }
    for (const o of filteredOrders) {
      const staff = resolveStaffLabel(o);
      if (!staff) continue;
      const row = map.get(staff) ?? {
        staff,
        total: 0,
        delivered: 0,
        returned: 0,
        revenue: 0,
      };
      row.total += 1;
      if (o.status === "delivered" || o.status === "partial") {
        row.delivered += 1;
        row.revenue += o.total;
      } else if (o.status === "returned") {
        row.returned += 1;
      }
      map.set(staff, row);
    }
    return [...map.values()]
      .map((r) => ({
        ...r,
        deliveryRate: r.total ? (r.delivered / r.total) * 100 : 0,
        returnRate: r.total ? (r.returned / r.total) * 100 : 0,
      }))
      .sort((a, b) => b.revenue - a.revenue || b.total - a.total || a.staff.localeCompare(b.staff));
  }, [filteredOrders]);

  const paymentAgingRows = useMemo(() => {
    const now = new Date();
    const bucketBase = {
      "0_7": 0,
      "8_15": 0,
      "16_30": 0,
      "31_plus": 0,
    };
    const recovery: {
      orderId: string;
      customer: string;
      phone: string;
      ageDays: number;
      due: number;
      status: string;
    }[] = [];

    for (const o of filteredOrders) {
      const advance = o.advancePaymentCollectedAmount ?? 0;
      const delivery = o.paymentCollectedAmount ?? 0;
      const payDiscount = o.paymentCollectionDiscount ?? 0;
      const due = Math.max(0, o.total - advance - delivery - payDiscount);
      if (due <= 0) continue;
      const d = parseOrderDate(o);
      if (!d) continue;
      const ageDays = Math.max(0, Math.floor((now.getTime() - d.getTime()) / (24 * 60 * 60 * 1000)));
      if (ageDays <= 7) bucketBase["0_7"] += due;
      else if (ageDays <= 15) bucketBase["8_15"] += due;
      else if (ageDays <= 30) bucketBase["16_30"] += due;
      else bucketBase["31_plus"] += due;

      recovery.push({
        orderId: o.id,
        customer: o.customerName,
        phone: o.phone,
        ageDays,
        due,
        status: ORDER_STATUS_LABELS[o.status],
      });
    }

    const buckets = [
      { key: "0_7", label: "0-7 days", amount: bucketBase["0_7"] },
      { key: "8_15", label: "8-15 days", amount: bucketBase["8_15"] },
      { key: "16_30", label: "16-30 days", amount: bucketBase["16_30"] },
      { key: "31_plus", label: "31+ days", amount: bucketBase["31_plus"] },
    ];

    return {
      buckets,
      recovery: recovery.sort((a, b) => b.ageDays - a.ageDays || b.due - a.due).slice(0, 12),
    };
  }, [filteredOrders]);

  const compareWindow = useMemo(() => {
    if (!compareMode) return null;
    const dated = filteredOrders
      .map((o) => parseOrderDate(o))
      .filter((d): d is Date => Boolean(d))
      .sort((a, b) => a.getTime() - b.getTime());
    if (!dated.length) return null;
    const fromDate = new Date(dated[0]);
    fromDate.setHours(0, 0, 0, 0);
    const toDate = new Date(dated[dated.length - 1]);
    toDate.setHours(23, 59, 59, 999);
    return { from: fromDate, to: toDate };
  }, [compareMode, filteredOrders]);

  const previousOrders = useMemo(() => {
    if (!compareMode || !compareWindow) return [];
    const dayMs = 24 * 60 * 60 * 1000;
    const spanDays = Math.max(
      1,
      Math.round((compareWindow.to.getTime() - compareWindow.from.getTime()) / dayMs) + 1
    );
    const prevTo = new Date(compareWindow.from.getTime() - 1);
    const prevFrom = new Date(prevTo);
    prevFrom.setDate(prevFrom.getDate() - (spanDays - 1));
    prevFrom.setHours(0, 0, 0, 0);

    return allOrders.filter((o) => {
      if (status !== "all" && o.status !== status) return false;
      const d = parseOrderDate(o);
      if (!d) return false;
      return d >= prevFrom && d <= prevTo;
    });
  }, [compareMode, compareWindow, allOrders, status]);

  const previousSummary = useMemo(() => {
    const gross = previousOrders
      .filter((o) => !["cancelled", "returned", "lost"].includes(o.status))
      .reduce((sum, o) => sum + o.total, 0);
    const delivered = previousOrders.filter(
      (o) => o.status === "delivered" || o.status === "partial"
    ).length;
    const returned = previousOrders.filter((o) => o.status === "returned").length;
    const base = delivered + returned;
    const rate = base ? (returned / base) * 100 : 0;
    const payment = previousOrders.reduce(
      (acc, o) => {
        const advance = o.advancePaymentCollectedAmount ?? 0;
        const delivery = o.paymentCollectedAmount ?? 0;
        const payDiscount = o.paymentCollectionDiscount ?? 0;
        const due = Math.max(0, o.total - advance - delivery - payDiscount);
        acc.advance += advance;
        acc.delivery += delivery;
        acc.due += due;
        return acc;
      },
      { advance: 0, delivery: 0, due: 0 }
    );
    return {
      orders: previousOrders.length,
      grossSales: gross,
      delivered,
      returnRate: rate,
      payment,
    };
  }, [previousOrders]);

  const accountingOptionRows = useMemo(() => {
    const accountCount = accountingData.accounts.filter((a) => a.active).length;
    const transferRows = accountingTransferFiltered;
    const transferCount = transferRows.filter((t) => isActiveTransfer(t)).length;
    const transferVolume = transferRows
      .filter((t) => isActiveTransfer(t))
      .reduce((sum, t) => sum + t.amount, 0);
    const transferFees = transferRows
      .filter((t) => isActiveTransfer(t))
      .reduce((sum, t) => sum + (t.fee ?? 0), 0);

    const assetCount = accountingAssetFiltered.filter((a) => a.status !== "cancelled").length;
    const assetValue = accountingAssetFiltered.reduce((sum, a) => sum + assetBookValue(a), 0);
    const realizedAssetSale = accountingAssetFiltered.reduce((sum, a) => sum + (a.soldAmount ?? 0), 0);

    const expenseCount = accountingExpenseFiltered.length;
    const expenseAmount = accountingExpenseFiltered.reduce((sum, e) => sum + e.amount, 0);

    const incomeCount = accountingIncomeFiltered.length;
    const incomeAmount = accountingIncomeFiltered.reduce((sum, i) => sum + i.amount, 0);

    const liabilityCount = accountingLiabilityFiltered.filter((l) => l.status !== "cancelled").length;
    const liabilityOutstandingAmount = accountingLiabilityFiltered.reduce(
      (sum, l) => sum + liabilityOutstanding(l),
      0
    );

    const invoiceCount = accountingInvoiceFiltered.length;
    const invoiceDue = accountingInvoiceFiltered.reduce((sum, inv) => sum + invoiceDueBalance(inv), 0);
    const invoiceCollected = accountingInvoiceFiltered.reduce((sum, inv) => sum + inv.paidAmount, 0);

    const paymentRecorded = accountingInvoiceFiltered.reduce((sum, inv) => {
      return (
        sum +
        (inv.payments ?? []).reduce((ps, p) => {
          return ps + p.amount;
        }, 0)
      );
    }, 0);
    const paymentDue = invoiceDue;

    const transactionCount =
      accountingIncomeFiltered.length + accountingExpenseFiltered.length + transferRows.length;

    return [
      {
        option: "Accounts",
        count: accountCount,
        primary: accountingData.accounts
          .filter((a) => a.active)
          .reduce((sum, a) => sum + a.openingBalance, 0),
        secondary: `Active accounts: ${accountCount} · Opening balance view`,
      },
      {
        option: "Transfer",
        count: transferCount,
        primary: transferVolume,
        secondary: `Fees: ${formatBdt(transferFees)}`,
      },
      {
        option: "Assets",
        count: assetCount,
        primary: assetValue,
        secondary: `Realized sale: ${formatBdt(realizedAssetSale)}`,
      },
      {
        option: "Expense",
        count: expenseCount,
        primary: expenseAmount,
        secondary: `Entries: ${expenseCount}`,
      },
      {
        option: "Income",
        count: incomeCount,
        primary: incomeAmount,
        secondary: `Entries: ${incomeCount}`,
      },
      {
        option: "Liabilities",
        count: liabilityCount,
        primary: liabilityOutstandingAmount,
        secondary: `Open liabilities: ${liabilityCount}`,
      },
      {
        option: "Invoice",
        count: invoiceCount,
        primary: invoiceDue,
        secondary: `Collected: ${formatBdt(invoiceCollected)}`,
      },
      {
        option: "Payment",
        count: invoiceCount,
        primary: paymentRecorded,
        secondary: `Due balance: ${formatBdt(paymentDue)}`,
      },
      {
        option: "Transaction",
        count: transactionCount,
        primary: incomeAmount - expenseAmount,
        secondary: `Income+Expense+Transfer rows: ${transactionCount}`,
      },
    ] as const;
  }, [
    accountingData,
    accountingAssetFiltered,
    accountingExpenseFiltered,
    accountingIncomeFiltered,
    accountingInvoiceFiltered,
    accountingLiabilityFiltered,
    accountingTransferFiltered,
  ]);

  const accountingChartData = useMemo(
    () =>
      accountingOptionRows.map((row) => ({
        name: row.option,
        amount: row.primary,
      })),
    [accountingOptionRows]
  );

  const accountingExpenseByCategory = useMemo(() => {
    const base = new Map<string, number>();
    for (const e of accountingExpenseFiltered) {
      const key = EXPENSE_CATEGORY_LABELS[e.category] ?? e.category;
      base.set(key, (base.get(key) ?? 0) + e.amount);
    }
    return [...base.entries()]
      .map(([name, amount]) => ({ name, amount }))
      .sort((a, b) => b.amount - a.amount);
  }, [accountingExpenseFiltered]);

  const accountingRecentRows = useMemo(() => {
    return getRecentTransactions(200)
      .filter((row) => isWithinRange(parseDateLabel(row.date), accRange, accFrom, accTo))
      .slice(0, 12);
  }, [accountingData, accRange, accFrom, accTo]);

  const accountingQuickLinks = [
    { label: "Chart Of Account", href: "/dashboard/accounting/chart-of-accounts" },
    { label: "Accounts", href: "/dashboard/accounting/accounts" },
    { label: "Transfer", href: "/dashboard/accounting/transfers" },
    { label: "Assets", href: "/dashboard/accounting/assets" },
    { label: "Expenses", href: "/dashboard/accounting/expenses" },
    { label: "Income", href: "/dashboard/accounting/income" },
    { label: "Liabilities", href: "/dashboard/accounting/liabilities" },
    { label: "Invoice", href: "/dashboard/accounting/invoice" },
    { label: "Payment", href: "/dashboard/accounting/payment" },
    { label: "Transaction", href: "/dashboard/accounting/transactions" },
  ] as const;

  const exportCurrent = () => {
    if (tab === "sales") {
      exportCsv(
        "sales-report.csv",
        ["Order ID", "Date", "Customer", "Courier", "Status", "Total"],
        filteredOrders.map((o) => [
          o.id,
          o.createdAt,
          o.customerName,
          o.courier,
          ORDER_STATUS_LABELS[o.status],
          o.total,
        ])
      );
      return;
    }
    if (tab === "courier") {
      exportCsv(
        "courier-report.csv",
        ["Courier", "Total", "Delivered", "Returned", "Pending", "Success %", "Return %"],
        courierRows.map((r) => {
          const success = r.total ? ((r.delivered / r.total) * 100).toFixed(1) : "0.0";
          const ret = r.total ? ((r.returned / r.total) * 100).toFixed(1) : "0.0";
          return [r.courier, r.total, r.delivered, r.returned, r.pending, success, ret];
        })
      );
      return;
    }
    if (tab === "accounting") {
      exportCsv(
        "accounting-option-report.csv",
        ["Option", "Count", "Amount", "Details"],
        accountingOptionRows.map((row) => [row.option, row.count, row.primary, row.secondary])
      );
      return;
    }
    if (tab === "staff") {
      exportCsv(
        "staff-performance-report.csv",
        ["Staff", "Orders", "Delivered", "Delivery %", "Return %", "Revenue"],
        staffRows.map((row) => [
          row.staff,
          row.total,
          row.delivered,
          row.deliveryRate.toFixed(1),
          row.returnRate.toFixed(1),
          row.revenue,
        ])
      );
      return;
    }
    exportCsv(
      "payment-report.csv",
      ["Order ID", "Advance Collected", "Delivery Collected", "Discount", "Due"],
      filteredOrders.map((o) => {
        const advance = o.advancePaymentCollectedAmount ?? 0;
        const delivery = o.paymentCollectedAmount ?? 0;
        const payDiscount = o.paymentCollectionDiscount ?? 0;
        const due = Math.max(0, o.total - advance - delivery - payDiscount);
        return [o.id, advance, delivery, payDiscount, due];
      })
    );
  };

  const exportAccountingPdf = () => {
    if (typeof window === "undefined") return;
    const win = window.open("", "_blank");
    if (!win) return;
    const rows = accountingOptionRows
      .map(
        (row) =>
          `<tr>
            <td style="padding:8px;border:1px solid #e2e8f0;">${row.option}</td>
            <td style="padding:8px;border:1px solid #e2e8f0;text-align:right;">${row.count}</td>
            <td style="padding:8px;border:1px solid #e2e8f0;text-align:right;">${formatBdt(row.primary)}</td>
            <td style="padding:8px;border:1px solid #e2e8f0;">${row.secondary}</td>
          </tr>`
      )
      .join("");
    win.document.write(`
      <html>
        <head><title>Accounting Report</title></head>
        <body style="font-family:Arial,sans-serif;padding:24px;">
          <h2 style="margin:0 0 8px;">Accounting Report</h2>
          <p style="margin:0 0 16px;color:#475569;">Range: ${accRange.toUpperCase()} ${accFrom ? `· From ${accFrom}` : ""} ${accTo ? `· To ${accTo}` : ""}</p>
          <table style="border-collapse:collapse;width:100%;font-size:13px;">
            <thead>
              <tr>
                <th style="padding:8px;border:1px solid #e2e8f0;text-align:left;">Option</th>
                <th style="padding:8px;border:1px solid #e2e8f0;text-align:right;">Count</th>
                <th style="padding:8px;border:1px solid #e2e8f0;text-align:right;">Amount</th>
                <th style="padding:8px;border:1px solid #e2e8f0;text-align:left;">Details</th>
              </tr>
            </thead>
            <tbody>${rows}</tbody>
          </table>
          <p style="margin-top:18px;color:#64748b;font-size:12px;">Generated at ${new Date().toLocaleString()}</p>
        </body>
      </html>
    `);
    win.document.close();
    win.focus();
    win.print();
  };

  const openAccountingLedgerModal = (option: string) => {
    let rows: { id: string; date: string; label: string; amount: number }[] = [];
    if (option === "Income") {
      rows = accountingIncomeFiltered.map((i) => ({
        id: i.id,
        date: i.date,
        label: i.title,
        amount: i.amount,
      }));
    } else if (option === "Expense") {
      rows = accountingExpenseFiltered.map((e) => ({
        id: e.id,
        date: e.date,
        label: e.title,
        amount: -Math.abs(e.amount),
      }));
    } else if (option === "Transfer") {
      rows = accountingTransferFiltered.map((t) => ({
        id: t.id,
        date: t.date,
        label: `${t.fromAccountId} → ${t.toAccountId}`,
        amount: t.amount,
      }));
    } else if (option === "Invoice") {
      rows = accountingInvoiceFiltered.map((inv) => ({
        id: inv.id,
        date: inv.date,
        label: inv.invoiceNumber,
        amount: inv.paidAmount,
      }));
    } else if (option === "Payment") {
      rows = accountingInvoiceFiltered.flatMap((inv) =>
        (inv.payments ?? []).map((p) => ({
          id: `${inv.id}-${p.incomeId}`,
          date: p.date,
          label: `${inv.invoiceNumber} · ${p.type}`,
          amount: p.amount,
        }))
      );
    } else if (option === "Assets") {
      rows = accountingAssetFiltered.map((a) => ({
        id: a.id,
        date: a.createdDate ?? a.purchaseDate,
        label: a.name,
        amount: assetBookValue(a),
      }));
    } else if (option === "Liabilities") {
      rows = accountingLiabilityFiltered.map((l) => ({
        id: l.id,
        date: l.createdDate ?? l.dueDate ?? "—",
        label: l.name,
        amount: liabilityOutstanding(l),
      }));
    } else {
      rows = accountingRecentRows.map((r) => ({
        id: r.id,
        date: r.date,
        label: r.label,
        amount: r.amount,
      }));
    }
    setLedgerModalTitle(`${option} Ledger`);
    setLedgerModalRows(rows.slice(0, 80));
    setLedgerModalOpen(true);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Reports"
        description="Sales, courier and payment insights with CSV export"
        actions={
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={exportCurrent}
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium shadow-sm"
            >
              <Download className="h-4 w-4" /> Export CSV
            </button>
            {tab === "accounting" && (
              <button
                type="button"
                onClick={exportAccountingPdf}
                className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2 text-sm font-semibold text-indigo-700 shadow-sm"
              >
                <Download className="h-4 w-4" /> Export PDF
              </button>
            )}
          </div>
        }
      />

      <div className="space-y-4 rounded-2xl border border-slate-200 bg-white p-4">
        <div className="flex flex-wrap items-center gap-2">
          {REPORT_TABS.map((item) => (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={clsx(
                "rounded-xl px-4 py-2 text-sm font-bold transition",
                tab === item.id
                  ? "bg-indigo-600 text-white shadow"
                  : "bg-slate-100 text-slate-700 hover:bg-slate-200"
              )}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="grid gap-3 md:grid-cols-4">
          <div>
            <p className="mb-1 text-xs font-semibold uppercase text-slate-500">Range</p>
            <select
              value={range}
              onChange={(e) => setRange(e.target.value as DateRange)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="all">All time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 days</option>
              <option value="month">This month</option>
            </select>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase text-slate-500">Status</p>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as "all" | OrderStatus)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            >
              <option value="all">All status</option>
              {ORDER_LIST_TABS.map((s) => (
                <option key={s.key} value={s.key}>
                  {s.label}
                </option>
              ))}
            </select>
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase text-slate-500">From</p>
            <input
              type="date"
              value={from}
              onChange={(e) => setFrom(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
          <div>
            <p className="mb-1 text-xs font-semibold uppercase text-slate-500">To</p>
            <input
              type="date"
              value={to}
              onChange={(e) => setTo(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
            />
          </div>
        </div>
        <div className="flex items-center justify-end">
          <label
            className={clsx(
              "inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-semibold",
              canCompare ? "text-slate-700" : "cursor-not-allowed text-slate-400"
            )}
          >
            <input
              type="checkbox"
              checked={compareMode}
              onChange={(e) => setCompareMode(e.target.checked)}
              disabled={!canCompare}
              className="h-4 w-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500"
            />
            Compare with previous period
          </label>
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="glass-card rounded-2xl p-4">
          <p className="text-sm text-slate-500">Orders</p>
          <p className="text-2xl font-bold text-slate-900">{filteredOrders.length}</p>
          {compareMode && compareWindow && (
            <p
              className={clsx(
                "mt-1 text-xs font-semibold",
                filteredOrders.length - previousSummary.orders >= 0 ? "text-emerald-600" : "text-rose-600"
              )}
            >
              {filteredOrders.length - previousSummary.orders >= 0 ? "+" : ""}
              {filteredOrders.length - previousSummary.orders} vs previous
            </p>
          )}
        </div>
        <div className="glass-card rounded-2xl p-4">
          <p className="text-sm text-slate-500">Gross Sales</p>
          <p className="text-2xl font-bold text-emerald-700">{formatBdt(grossSales)}</p>
          {compareMode && compareWindow && (
            <p
              className={clsx(
                "mt-1 text-xs font-semibold",
                grossSales - previousSummary.grossSales >= 0 ? "text-emerald-600" : "text-rose-600"
              )}
            >
              {grossSales - previousSummary.grossSales >= 0 ? "+" : ""}
              {formatCompactBdt(grossSales - previousSummary.grossSales)}{" "}
              {pctChange(grossSales, previousSummary.grossSales) == null
                ? ""
                : `(${pctChange(grossSales, previousSummary.grossSales)!.toFixed(1)}%)`}
            </p>
          )}
        </div>
        <div className="glass-card rounded-2xl p-4">
          <p className="text-sm text-slate-500">Delivered</p>
          <p className="text-2xl font-bold text-indigo-700">{deliveredCount}</p>
          {compareMode && compareWindow && (
            <p
              className={clsx(
                "mt-1 text-xs font-semibold",
                deliveredCount - previousSummary.delivered >= 0 ? "text-emerald-600" : "text-rose-600"
              )}
            >
              {deliveredCount - previousSummary.delivered >= 0 ? "+" : ""}
              {deliveredCount - previousSummary.delivered} vs previous
            </p>
          )}
        </div>
        <div className="glass-card rounded-2xl p-4">
          <p className="text-sm text-slate-500">Return Rate</p>
          <p className="text-2xl font-bold text-rose-700">{returnRate.toFixed(1)}%</p>
          {compareMode && compareWindow && (
            <p
              className={clsx(
                "mt-1 text-xs font-semibold",
                returnRate - previousSummary.returnRate <= 0 ? "text-emerald-600" : "text-rose-600"
              )}
            >
              {returnRate - previousSummary.returnRate >= 0 ? "+" : ""}
              {(returnRate - previousSummary.returnRate).toFixed(1)}pp vs previous
            </p>
          )}
        </div>
      </div>

      {tab === "sales" && (
        <div className="space-y-4">
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
                          formatter={(value) => `${formatBdt(asNumber(value))} (${formatCompactBdt(asNumber(value))})`}
                          labelFormatter={(label) => `Date: ${label}`}
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
                      <PieChart>
                        <Pie
                          data={statusBreakdown}
                          dataKey="count"
                          nameKey="label"
                          cx="50%"
                          cy="50%"
                          outerRadius={95}
                          label={(props) => {
                            const name = String(props.name ?? "");
                            const value = asNumber(props.value);
                            const percent = asNumber((props as { percent?: number }).percent) * 100;
                            return `${name} ${value} (${percent.toFixed(0)}%)`;
                          }}
                        >
                          {statusBreakdown.map((entry, idx) => (
                            <Cell key={entry.key} fill={PIE_COLORS[idx % PIE_COLORS.length]} />
                          ))}
                        </Pie>
                        <Tooltip formatter={(value) => `${asNumber(value)}`} />
                      </PieChart>
                    </ResponsiveContainer>
                  </div>
                </ChartClientOnly>
              )}
            </div>
          </div>

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
        </div>
      )}

      {tab === "courier" && (
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
      )}

      {tab === "payment" && (
        <div className="space-y-4">
          <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
          <div className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm text-slate-500">Advance Collected</p>
                <p className="text-2xl font-bold text-indigo-700">{formatBdt(paymentSummary.advance)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm text-slate-500">Delivery Collected</p>
                <p className="text-2xl font-bold text-emerald-700">{formatBdt(paymentSummary.delivery)}</p>
              </div>
              <div className="rounded-2xl border border-slate-200 bg-white p-4">
                <p className="text-sm text-slate-500">Outstanding Due</p>
                <p className="text-2xl font-bold text-rose-700">{formatBdt(paymentSummary.due)}</p>
              </div>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 font-bold text-slate-800">Payment Breakdown</h3>
              <ChartClientOnly height={300}>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart
                      data={[
                        {
                          name: "Payment",
                          advance: paymentSummary.advance,
                          delivery: paymentSummary.delivery,
                          due: paymentSummary.due,
                        },
                      ]}
                    >
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="name" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCompactBdt(asNumber(v))} />
                      <Tooltip formatter={(value) => `${formatBdt(asNumber(value))} (${formatCompactBdt(asNumber(value))})`} />
                      <Bar dataKey="advance" name="Advance" fill="#4f46e5" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="delivery" name="Delivery" fill="#10b981" radius={[6, 6, 0, 0]} />
                      <Bar dataKey="due" name="Due" fill="#ef4444" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartClientOnly>
            </div>
          </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 font-bold text-slate-800">Payment Share</h3>
              <ChartClientOnly height={380}>
                <div className="h-[380px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={[
                          { name: "Advance", value: paymentSummary.advance },
                          { name: "Delivery", value: paymentSummary.delivery },
                          { name: "Due", value: paymentSummary.due },
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
                        <Cell fill="#4f46e5" />
                        <Cell fill="#10b981" />
                        <Cell fill="#ef4444" />
                      </Pie>
                      <Tooltip
                        formatter={(value) => `${formatBdt(asNumber(value))} (${formatCompactBdt(asNumber(value))})`}
                      />
                    </PieChart>
                  </ResponsiveContainer>
                </div>
              </ChartClientOnly>
              {compareMode && compareWindow && (
                <p className="mt-2 text-xs text-slate-500">
                  Previous window: {previousSummary.orders} orders · Advance{" "}
                  {formatCompactBdt(previousSummary.payment.advance)} · Delivery{" "}
                  {formatCompactBdt(previousSummary.payment.delivery)} · Due{" "}
                  {formatCompactBdt(previousSummary.payment.due)}
                </p>
              )}
            </div>
          </div>

          <div className="grid gap-4 lg:grid-cols-[1.05fr_0.95fr]">
            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 font-bold text-slate-800">Payment Aging</h3>
              <ChartClientOnly height={300}>
                <div className="h-[300px] w-full">
                  <ResponsiveContainer width="100%" height="100%">
                    <BarChart data={paymentAgingRows.buckets}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" />
                      <XAxis dataKey="label" tick={{ fontSize: 11 }} />
                      <YAxis tick={{ fontSize: 11 }} tickFormatter={(v) => formatCompactBdt(asNumber(v))} />
                      <Tooltip formatter={(value) => formatBdt(asNumber(value))} />
                      <Bar dataKey="amount" name="Due" fill="#ef4444" radius={[6, 6, 0, 0]} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>
              </ChartClientOnly>
            </div>

            <div className="rounded-2xl border border-slate-200 bg-white p-4">
              <h3 className="mb-3 font-bold text-slate-800">Due Recovery List</h3>
              <div className="overflow-x-auto">
                <table className="w-full min-w-[520px] text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-500">
                      <th className="px-2 py-2">Order</th>
                      <th className="px-2 py-2">Customer</th>
                      <th className="px-2 py-2">Age</th>
                      <th className="px-2 py-2">Status</th>
                      <th className="px-2 py-2">Due</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paymentAgingRows.recovery.map((row) => (
                      <tr key={row.orderId} className="border-b border-slate-100">
                        <td className="px-2 py-2 font-semibold text-slate-800">{row.orderId}</td>
                        <td className="px-2 py-2">
                          {row.customer}
                          <div className="text-xs text-slate-500">{row.phone}</div>
                        </td>
                        <td className="px-2 py-2">{row.ageDays}d</td>
                        <td className="px-2 py-2">{row.status}</td>
                        <td className="px-2 py-2 font-bold text-rose-700">{formatBdt(row.due)}</td>
                      </tr>
                    ))}
                    {paymentAgingRows.recovery.length === 0 && (
                      <tr>
                        <td colSpan={5} className="px-2 py-6 text-center text-slate-500">
                          No due recovery items in selected filter.
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

      {tab === "staff" && (
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
      )}

      {tab === "accounting" && (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <div className="grid gap-3 md:grid-cols-3">
              <div>
                <p className="mb-1 text-xs font-semibold uppercase text-slate-500">Accounting Range</p>
                <select
                  value={accRange}
                  onChange={(e) => setAccRange(e.target.value as DateRange)}
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
                  onChange={(e) => setAccFrom(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
              <div>
                <p className="mb-1 text-xs font-semibold uppercase text-slate-500">To</p>
                <input
                  type="date"
                  value={accTo}
                  onChange={(e) => setAccTo(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 px-3 py-2 text-sm"
                />
              </div>
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
            <div className="glass-card rounded-2xl p-4">
              <p className="text-sm text-slate-500">Net Profit</p>
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
