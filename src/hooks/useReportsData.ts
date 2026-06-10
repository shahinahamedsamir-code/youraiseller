"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
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
import {
  buildAutoCallOutcomeBreakdown,
  buildAutoCallSourceMix,
  buildConfirmedOrderReport,
  computeAutoCallReportStats,
} from "@/lib/auto-call-report-analytics";
import {
  loadAutoCallAccountLocal,
  loadAutoCallLogs,
  loadAutoCallRules,
  loadAutoCallRuns,
  loadAutoCallSettings,
} from "@/lib/auto-call-store";
import { ORDER_LIST_TABS, ORDER_STATUS_LABELS } from "@/lib/order-status-tabs";
import { loadScanLogs, summarizeScanLogs } from "@/lib/scan-log-store";
import { loadSmsAccountLocal } from "@/lib/sms-store";
import { loadWooCommerceSettings } from "@/lib/woocommerce-integration-store";
import { loadWooStockSyncSettings } from "@/lib/woocommerce-stock-sync-store";
import {
  buildAccountBalanceRows,
  buildInvoiceCollectionReport,
  buildLiabilityAgingRows,
  buildPeriodGrossProfit,
  summarizeLiabilityAging,
} from "@/lib/reports/accounting-depth-analytics";
import { buildCourierSlaReport } from "@/lib/reports/courier-sla-analytics";
import {
  buildOrderAllReport,
  filterOrdersByBucket,
} from "@/lib/reports/order-report-analytics";
import { buildProfitSalesReport } from "@/lib/reports/profit-sales-analytics";
import { reportTabFromSearchParam } from "@/lib/reports-nav";
import {
  buildBlockListReport,
  buildWebSourceMix,
} from "@/lib/reports/web-depth-analytics";
import {
  buildBrandBreakdown,
  buildCategoryBreakdown,
  buildDeadStockReport,
  buildInventoryValuation,
} from "@/lib/reports/inventory-depth-analytics";
import {
  getAbcAnalysis,
  getInventoryHealthStats,
  getSmartRestockList,
  loadMovements,
} from "@/lib/inventory-store";
import {
  formatPreorderDeliveryAt,
  getPreorderReasonLabel,
  type PreorderReason,
} from "@/lib/preorder-meta";
import {
  getOrderSourceLabel,
  inferOrderSourceFromOrder,
} from "@/lib/order-source";
import { loadOrders, type Order, type OrderStatus } from "@/lib/orders-store";
import { loadTeamUsers } from "@/lib/team-users-store";
import { normalizePhone } from "@/lib/web-customer-stats";
import { isInWebQueue, isWebSourceOrder } from "@/lib/web-order-queue";
import { resolveWebDisplayStatus } from "@/lib/order-edit";
import { loadBusinessSettings } from "@/lib/business-settings-store";
import {
  exportTabCsv,
  exportTabPdf,
  type ReportsExportPayload,
} from "@/lib/reports/report-export";
import {
  CHANNEL_LABELS,
  META_ORDER_SOURCES,
  PIPELINE_STATUSES,
  type DateRange,
  type ReportTab,
} from "@/lib/reports/report-types";
import {
  formatCompactBdt,
  formatDelta,
  formatRangeLabel,
  getPreviousPeriodBounds,
  getSelectedPeriodBounds,
  isOperatingAccountingRef,
  isWithinBounds,
  isWithinRange,
  parseDateLabel,
  parseOrderDate,
  summarizeOrderMetrics,
  toInputDate,
  webStatusLabel,
} from "@/lib/reports/report-utils";

export function useReportsData() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [tab, setTab] = useState<ReportTab>(() => {
    return reportTabFromSearchParam(searchParams.get("tab")) ?? "sales";
  });

  useEffect(() => {
    if (!searchParams.get("tab")) {
      router.replace("/dashboard/reports?tab=sales", { scroll: false });
      return;
    }
    const fromUrl = reportTabFromSearchParam(searchParams.get("tab"));
    if (fromUrl && fromUrl !== tab) setTab(fromUrl);
  }, [searchParams, tab, router]);

  const selectTab = useCallback(
    (next: ReportTab) => {
      setTab(next);
      router.replace(`/dashboard/reports?tab=${next}`, { scroll: false });
    },
    [router]
  );
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
  const allOrdersIncludingWeb = useMemo(() => loadOrders(), []);
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

  const orderReportOrders = useMemo(() => {
    return allOrdersIncludingWeb.filter((o) => {
      if (status !== "all" && o.status !== status) return false;
      return isWithinRange(parseOrderDate(o), range, from, to);
    });
  }, [allOrdersIncludingWeb, status, range, from, to]);

  const approvedReportOrders = useMemo(
    () => filterOrdersByBucket(orderReportOrders, "approved"),
    [orderReportOrders]
  );

  const approvedOrderReport = useMemo(
    () => buildOrderAllReport(approvedReportOrders),
    [approvedReportOrders]
  );

  const grossSales = useMemo(
    () =>
      filteredOrders
        .filter((o) => !["cancelled", "returned", "lost"].includes(o.status))
        .reduce((sum, o) => sum + o.total, 0),
    [filteredOrders]
  );

  const profitSalesReport = useMemo(
    () =>
      buildProfitSalesReport(
        allOrdersIncludingWeb,
        accountingData.expenses,
        accountingData.income,
        range,
        from,
        to
      ),
    [allOrdersIncludingWeb, accountingData.expenses, accountingData.income, range, from, to]
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

  const webSourceOrders = useMemo(
    () =>
      allOrdersIncludingWeb.filter(
        (o) =>
          isWebSourceOrder(o) &&
          isWithinRange(parseOrderDate(o), range, from, to)
      ),
    [allOrdersIncludingWeb, range, from, to]
  );

  const webReport = useMemo(() => {
    const inQueue = webSourceOrders.filter((o) => isInWebQueue(o));
    const released = webSourceOrders.filter((o) => o.webQueueReleased);
    const complete = webSourceOrders.filter(
      (o) =>
        o.webStatus === "complete" ||
        o.status === "delivered" ||
        o.status === "partial"
    );
    const cancelled = webSourceOrders.filter(
      (o) => o.webStatus === "cancelled" || o.status === "cancelled"
    );
    const conversionRate = webSourceOrders.length
      ? (released.length / webSourceOrders.length) * 100
      : 0;

    const statusMap = new Map<string, number>();
    for (const o of inQueue) {
      const ws = resolveWebDisplayStatus(o);
      statusMap.set(ws, (statusMap.get(ws) ?? 0) + 1);
    }
    const queueByStatus = [...statusMap.entries()]
      .map(([status, count]) => ({ status, label: webStatusLabel(status), count }))
      .sort((a, b) => b.count - a.count);

    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;
    const agingBuckets = { "0_2": 0, "3_7": 0, "8_14": 0, "15_plus": 0 };
    const agingRows = inQueue
      .map((o) => {
        const d = parseOrderDate(o);
        const ageDays = d
          ? Math.max(0, Math.floor((now - d.getTime()) / dayMs))
          : 0;
        if (ageDays <= 2) agingBuckets["0_2"] += 1;
        else if (ageDays <= 7) agingBuckets["3_7"] += 1;
        else if (ageDays <= 14) agingBuckets["8_14"] += 1;
        else agingBuckets["15_plus"] += 1;
        return {
          orderId: o.id,
          customer: o.customerName,
          phone: o.phone,
          status: webStatusLabel(resolveWebDisplayStatus(o)),
          ageDays,
          total: o.total,
        };
      })
      .sort((a, b) => b.ageDays - a.ageDays || b.total - a.total)
      .slice(0, 15);

    const funnel = [
      { stage: "Received", count: webSourceOrders.length },
      { stage: "In Queue", count: inQueue.length },
      { stage: "Released", count: released.length },
      { stage: "Complete", count: complete.length },
      { stage: "Cancelled", count: cancelled.length },
    ];

    const agingChart = [
      { label: "0-2 days", count: agingBuckets["0_2"] },
      { label: "3-7 days", count: agingBuckets["3_7"] },
      { label: "8-14 days", count: agingBuckets["8_14"] },
      { label: "15+ days", count: agingBuckets["15_plus"] },
    ];

    const sourceMix = buildWebSourceMix(webSourceOrders);
    const blockList = buildBlockListReport(webSourceOrders);

    return {
      inQueue,
      released,
      complete,
      cancelled,
      conversionRate,
      queueByStatus,
      agingRows,
      funnel,
      agingChart,
      sourceMix,
      blockList,
      avgQueueAge:
        inQueue.length > 0
          ? inQueue.reduce((sum, o) => {
              const d = parseOrderDate(o);
              const age = d
                ? Math.max(0, Math.floor((now - d.getTime()) / dayMs))
                : 0;
              return sum + age;
            }, 0) / inQueue.length
          : 0,
    };
  }, [webSourceOrders]);

  const preorderReport = useMemo(() => {
    const list = allOrdersIncludingWeb.filter(
      (o) =>
        (o.isPreorder || o.status === "preorder") &&
        isWithinRange(parseOrderDate(o), range, from, to)
    );
    const now = Date.now();
    const dayMs = 24 * 60 * 60 * 1000;

    const reasonMap = new Map<string, number>();
    let overdue = 0;
    let dueSoon = 0;
    let open = 0;
    let totalValue = 0;

    const rows = list.map((o) => {
      const reason = getPreorderReasonLabel(o.preorderReason as PreorderReason | undefined);
      reasonMap.set(reason, (reasonMap.get(reason) ?? 0) + 1);
      totalValue += o.total;

      const deliveryAt = parseDateLabel(o.preorderDeliveryAt);
      let deliveryState: "overdue" | "due_soon" | "scheduled" | "none" = "none";
      if (deliveryAt) {
        const daysLeft = Math.floor((deliveryAt.getTime() - now) / dayMs);
        if (daysLeft < 0 && !["delivered", "cancelled", "returned"].includes(o.status)) {
          deliveryState = "overdue";
          overdue += 1;
        } else if (daysLeft >= 0 && daysLeft <= 7) {
          deliveryState = "due_soon";
          dueSoon += 1;
        } else {
          deliveryState = "scheduled";
        }
      }
      if (!["delivered", "cancelled", "returned"].includes(o.status)) open += 1;

      return {
        orderId: o.id,
        customer: o.customerName,
        phone: o.phone,
        reason,
        deliveryAt: formatPreorderDeliveryAt(o.preorderDeliveryAt),
        deliveryState,
        status: ORDER_STATUS_LABELS[o.status],
        total: o.total,
        notified: Boolean(o.preorderNotifiedAt),
      };
    });

    const byReason = [...reasonMap.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);

    return {
      total: list.length,
      open,
      overdue,
      dueSoon,
      totalValue,
      byReason,
      rows: rows.sort((a, b) => {
        const rank = { overdue: 0, due_soon: 1, scheduled: 2, none: 3 };
        return rank[a.deliveryState] - rank[b.deliveryState] || b.total - a.total;
      }),
    };
  }, [allOrdersIncludingWeb, range, from, to]);

  const scanReport = useMemo(() => {
    const logs = loadScanLogs().filter((log) =>
      isWithinRange(parseDateLabel(log.scannedAt), range, from, to)
    );
    const summary = summarizeScanLogs(logs);
    return {
      ...summary,
      chart: [
        { name: "Shipping", count: summary.byTab.shipping },
        { name: "Return", count: summary.byTab.return },
        { name: "RTS", count: summary.byTab.rts },
      ],
      outcomeChart: [
        { name: "Success", count: summary.success },
        { name: "Failed", count: summary.failed },
        { name: "Duplicate", count: summary.duplicate },
      ],
      recent: logs.slice(0, 12),
    };
  }, [allOrdersIncludingWeb, range, from, to]);

  const inventoryReport = useMemo(() => {
    const health = getInventoryHealthStats();
    const lowStock = getSmartRestockList();
    const topProducts = getAbcAnalysis(12);
    const movements = loadMovements().filter((m) =>
      isWithinRange(parseDateLabel(m.createdAt), range, from, to)
    );

    let unitsSold = 0;
    let unitsIn = 0;
    let returns = 0;
    for (const m of movements) {
      if (m.type === "decrease") unitsSold += m.qty;
      else if (m.type === "increase") {
        if (m.reason.toLowerCase().includes("return")) returns += m.qty;
        else unitsIn += m.qty;
      }
    }

    const dailyMap = new Map<string, { in: number; out: number }>();
    for (const m of movements) {
      const d = parseDateLabel(m.createdAt);
      const key = d ? toInputDate(d) : "Unknown";
      const row = dailyMap.get(key) ?? { in: 0, out: 0 };
      if (m.type === "decrease") row.out += m.qty;
      else if (m.type === "increase" && !m.reason.toLowerCase().includes("return")) row.in += m.qty;
      dailyMap.set(key, row);
    }
    const movementTrend = [...dailyMap.entries()]
      .map(([date, row]) => ({ date, in: row.in, out: row.out }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14);

    const valuation = buildInventoryValuation();
    const categories = buildCategoryBreakdown();
    const brands = buildBrandBreakdown();
    const deadStock = buildDeadStockReport(15);

    return {
      health,
      lowStock: lowStock.slice(0, 15),
      topProducts,
      movements: movements.slice(0, 20),
      summary: {
        unitsSold,
        unitsIn,
        returns,
        netChange: unitsIn + returns - unitsSold,
        totalMovements: movements.length,
      },
      movementTrend,
      valuation,
      categories,
      brands,
      deadStock,
    };
  }, [range, from, to]);

  const accountingDepthReport = useMemo(() => {
    const accountBalances = buildAccountBalanceRows();
    const liabilityRows = buildLiabilityAgingRows();
    const liabilityAging = summarizeLiabilityAging(liabilityRows);
    const invoiceCollection = buildInvoiceCollectionReport(
      accountingInvoiceFiltered,
      accRange,
      accFrom,
      accTo
    );
    return {
      accountBalances,
      activeAccountTotal: accountBalances
        .filter((row) => row.active)
        .reduce((sum, row) => sum + row.balance, 0),
      liabilityRows: liabilityRows.slice(0, 15),
      liabilityAging,
      invoiceCollection,
    };
  }, [accountingInvoiceFiltered, accRange, accFrom, accTo]);

  const accountingPl = useMemo(() => {
    const income = accountingIncomeFiltered
      .filter((row) => isOperatingAccountingRef(row.reference))
      .reduce((sum, row) => sum + row.amount, 0);
    const expense = accountingExpenseFiltered
      .filter((row) => isOperatingAccountingRef(row.reference))
      .reduce((sum, row) => sum + row.amount, 0);
    const netProfit = income - expense;
    const gross = buildPeriodGrossProfit(
      allOrdersIncludingWeb,
      accRange,
      accFrom,
      accTo
    );
    return {
      income,
      expense,
      netProfit,
      margin: income > 0 ? (netProfit / income) * 100 : 0,
      ...gross,
    };
  }, [
    accountingIncomeFiltered,
    accountingExpenseFiltered,
    allOrdersIncludingWeb,
    accRange,
    accFrom,
    accTo,
  ]);

  const accountingCashFlow = useMemo(() => {
    const inflow = accountingIncomeFiltered
      .filter((row) => isOperatingAccountingRef(row.reference))
      .reduce((sum, row) => sum + row.amount, 0);
    const outflow = accountingExpenseFiltered
      .filter((row) => isOperatingAccountingRef(row.reference))
      .reduce((sum, row) => sum + row.amount, 0);
    const transferVolume = accountingTransferFiltered
      .filter(isActiveTransfer)
      .reduce((sum, row) => sum + row.amount, 0);
    return {
      inflow,
      outflow,
      transferVolume,
      netCash: inflow - outflow,
    };
  }, [
    accountingIncomeFiltered,
    accountingExpenseFiltered,
    accountingTransferFiltered,
  ]);

  const customerReport = useMemo(() => {
    const ordersByPhone = new Map<string, Order[]>();
    for (const o of allOrdersIncludingWeb) {
      const phone = normalizePhone(o.phone);
      if (!phone) continue;
      const list = ordersByPhone.get(phone) ?? [];
      list.push(o);
      ordersByPhone.set(phone, list);
    }

    const periodPhones = new Set<string>();
    let periodRevenue = 0;
    for (const o of allOrdersIncludingWeb) {
      if (!isWithinRange(parseOrderDate(o), range, from, to)) continue;
      const phone = normalizePhone(o.phone);
      if (!phone) continue;
      periodPhones.add(phone);
      if (!["cancelled", "returned", "lost"].includes(o.status)) {
        periodRevenue += o.total;
      }
    }

    let newCustomers = 0;
    let repeatCustomers = 0;
    for (const phone of periodPhones) {
      const orders = ordersByPhone.get(phone) ?? [];
      const sorted = orders
        .map((o) => parseOrderDate(o))
        .filter((d): d is Date => d != null)
        .sort((a, b) => a.getTime() - b.getTime());
      const first = sorted[0];
      if (!first) continue;
      if (orders.length > 1) repeatCustomers += 1;
      else if (isWithinRange(first, range, from, to)) newCustomers += 1;
    }

    const topCustomers = [...ordersByPhone.entries()]
      .map(([phone, orders]) => {
        const inRange = orders.filter((o) =>
          isWithinRange(parseOrderDate(o), range, from, to)
        );
        if (inRange.length === 0) return null;
        const spent = inRange
          .filter((o) => !["cancelled", "returned", "lost"].includes(o.status))
          .reduce((sum, o) => sum + o.total, 0);
        return {
          phone,
          name: inRange[0]?.customerName ?? "—",
          orders: inRange.length,
          spent,
          lifetimeOrders: orders.length,
        };
      })
      .filter((row): row is NonNullable<typeof row> => row != null)
      .sort((a, b) => b.spent - a.spent || b.orders - a.orders)
      .slice(0, 15);

    const repeatRate = periodPhones.size
      ? (repeatCustomers / periodPhones.size) * 100
      : 0;

    return {
      activeCustomers: periodPhones.size,
      newCustomers,
      repeatCustomers,
      repeatRate,
      periodRevenue,
      topCustomers,
    };
  }, [allOrdersIncludingWeb, range, from, to]);

  const operationsReport = useMemo(() => {
    const pipeline = PIPELINE_STATUSES.map((key) => ({
      key,
      label: ORDER_STATUS_LABELS[key],
      count: filteredOrders.filter((o) => o.status === key).length,
    })).filter((row) => row.count > 0);

    const sourceMap = new Map<string, { orders: number; amount: number }>();
    const channelMap = new Map<string, { orders: number; amount: number }>();
    for (const o of filteredOrders) {
      const sourceLabel = getOrderSourceLabel(
        inferOrderSourceFromOrder(o),
        o.customOrderSource
      );
      const sourceRow = sourceMap.get(sourceLabel) ?? { orders: 0, amount: 0 };
      sourceRow.orders += 1;
      sourceRow.amount += o.total;
      sourceMap.set(sourceLabel, sourceRow);

      const channelLabel = CHANNEL_LABELS[o.source] ?? o.source;
      const channelRow = channelMap.get(channelLabel) ?? { orders: 0, amount: 0 };
      channelRow.orders += 1;
      channelRow.amount += o.total;
      channelMap.set(channelLabel, channelRow);
    }

    const sourceMix = [...sourceMap.entries()]
      .map(([name, data]) => ({ name, orders: data.orders, amount: data.amount }))
      .sort((a, b) => b.orders - a.orders);
    const channelMix = [...channelMap.entries()]
      .map(([name, data]) => ({ name, orders: data.orders, amount: data.amount }))
      .sort((a, b) => b.orders - a.orders);

    const dailyMap = new Map<string, { created: number; toCourier: number }>();
    for (const o of filteredOrders) {
      const d = parseOrderDate(o);
      const key = d ? toInputDate(d) : "Unknown";
      const row = dailyMap.get(key) ?? { created: 0, toCourier: 0 };
      row.created += 1;
      if (["rts", "shipped", "delivered", "partial"].includes(o.status)) {
        row.toCourier += 1;
      }
      dailyMap.set(key, row);
    }
    const velocity = [...dailyMap.entries()]
      .map(([date, row]) => ({ date, created: row.created, toCourier: row.toCourier }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14);

    const editMap = new Map<
      string,
      { actor: string; edits: number; superEdits: number }
    >();
    const recentEdits: {
      orderId: string;
      at: string;
      title: string;
      actor: string;
    }[] = [];

    for (const o of allOrdersIncludingWeb) {
      for (const entry of o.activityLog ?? []) {
        if (entry.type !== "edited") continue;
        if (entry.title === "Last updated") continue;
        if (!isWithinRange(parseDateLabel(entry.at), range, from, to)) continue;
        const actor = entry.actor?.trim() || "Staff";
        const row = editMap.get(actor) ?? { actor, edits: 0, superEdits: 0 };
        row.edits += 1;
        if (/super edit/i.test(entry.title)) row.superEdits += 1;
        editMap.set(actor, row);
        recentEdits.push({
          orderId: o.id,
          at: entry.at,
          title: entry.title,
          actor,
        });
      }
    }

    return {
      pipeline,
      sourceMix,
      channelMix,
      velocity,
      editRows: [...editMap.values()].sort(
        (a, b) => b.edits - a.edits || a.actor.localeCompare(b.actor)
      ),
      recentEdits: recentEdits
        .sort(
          (a, b) =>
            (parseDateLabel(b.at)?.getTime() ?? 0) -
            (parseDateLabel(a.at)?.getTime() ?? 0)
        )
        .slice(0, 12),
    };
  }, [filteredOrders, allOrdersIncludingWeb, range, from, to]);

  const courierDeepReport = useMemo(() => {
    const statusMap = new Map<string, number>();
    let riderAssigned = 0;
    let riderUnassigned = 0;
    let withTracking = 0;
    let synced = 0;

    const paymentByCourier = new Map<
      string,
      { cod: number; prepaid: number; other: number }
    >();

    for (const o of filteredOrders) {
      const status = o.courierStatus?.trim() || "Not synced";
      statusMap.set(status, (statusMap.get(status) ?? 0) + 1);
      if (o.courierStatus?.trim()) synced += 1;
      if (o.trackingId?.trim()) withTracking += 1;
      if (o.courierRiderAssigned) riderAssigned += 1;
      else if (o.trackingId || o.courierConsignmentId) riderUnassigned += 1;

      const courier = o.courier || "Unknown";
      const pay = paymentByCourier.get(courier) ?? { cod: 0, prepaid: 0, other: 0 };
      if (o.paymentMethod === "cod") pay.cod += 1;
      else if (o.paymentMethod === "prepaid") pay.prepaid += 1;
      else pay.other += 1;
      paymentByCourier.set(courier, pay);
    }

    const statusBreakdown = [...statusMap.entries()]
      .map(([status, count]) => ({ status, count }))
      .sort((a, b) => b.count - a.count)
      .slice(0, 12);

    const paymentRows = [...paymentByCourier.entries()]
      .map(([courier, pay]) => ({
        courier,
        cod: pay.cod,
        prepaid: pay.prepaid,
        other: pay.other,
        total: pay.cod + pay.prepaid + pay.other,
      }))
      .sort((a, b) => b.total - a.total);

    const sla = buildCourierSlaReport(
      filteredOrders.filter(
        (o) => o.status === "delivered" || o.status === "partial" || o.trackingId
      )
    );

    return {
      statusBreakdown,
      riderAssigned,
      riderUnassigned,
      withTracking,
      synced,
      paymentRows,
      sla,
    };
  }, [filteredOrders]);

  const integrationsReport = useMemo(() => {
    const smsAccount = loadSmsAccountLocal();
    const smsLogs = (smsAccount?.logs ?? []).filter((log) =>
      isWithinRange(parseDateLabel(log.sentAt), range, from, to)
    );

    let smsDelivered = 0;
    let smsFailed = 0;
    let smsPending = 0;
    let smsCost = 0;
    const smsTypeMap = new Map<string, number>();
    const smsDailyMap = new Map<string, number>();

    for (const log of smsLogs) {
      if (log.status === "delivered") smsDelivered += 1;
      else if (log.status === "failed") smsFailed += 1;
      else smsPending += 1;
      smsCost += log.totalTaka ?? log.cost ?? 0;
      const typeKey = log.type || "Other";
      smsTypeMap.set(typeKey, (smsTypeMap.get(typeKey) ?? 0) + 1);
      const d = parseDateLabel(log.sentAt);
      const dayKey = d ? toInputDate(d) : "Unknown";
      smsDailyMap.set(dayKey, (smsDailyMap.get(dayKey) ?? 0) + 1);
    }

    const smsTypeMix = [...smsTypeMap.entries()]
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => b.count - a.count);
    const smsDailyTrend = [...smsDailyMap.entries()]
      .map(([date, count]) => ({ date, count }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14);

    const autoSettings = smsAccount?.autoSettings;
    const smsAutoEnabled = autoSettings
      ? Object.values(autoSettings)
          .flat()
          .filter((row) => row.enabled).length
      : 0;
    const smsAutoTotal = autoSettings
      ? Object.values(autoSettings).flat().length
      : 0;

    const autoCallSettings = loadAutoCallSettings();
    const autoCallRules = loadAutoCallRules();
    const autoCallLogs = loadAutoCallLogs().filter((log) =>
      isWithinRange(parseDateLabel(log.sentAt), range, from, to)
    );
    const autoCallStats = computeAutoCallReportStats(
      autoCallLogs,
      autoCallSettings,
      autoCallRules
    );
    const autoCallBreakdown = buildAutoCallOutcomeBreakdown(
      autoCallLogs,
      autoCallSettings,
      autoCallRules
    );
    const autoCallSourceMix = buildAutoCallSourceMix(autoCallLogs);
    const autoCallConfirmed = buildConfirmedOrderReport(
      autoCallLogs,
      allOrdersIncludingWeb
    );
    const autoCallRuns = loadAutoCallRuns().filter((run) =>
      isWithinRange(parseDateLabel(run.startedAt), range, from, to)
    );
    const autoCallAccount = loadAutoCallAccountLocal();

    const woo = loadWooCommerceSettings();
    const wooStock = loadWooStockSyncSettings();
    const wooLogs = woo.logs.filter((log) =>
      isWithinRange(parseDateLabel(log.at), range, from, to)
    );
    const wooErrorCount = wooLogs.filter((log) => log.level === "error").length;
    const wooSuccessCount = wooLogs.filter((log) => log.level === "success").length;

    return {
      sms: {
        enabled: smsAccount?.serviceEnabled ?? false,
        balance: smsAccount?.balance ?? 0,
        walletTaka: smsAccount?.walletTaka ?? 0,
        delivered: smsDelivered,
        failed: smsFailed,
        pending: smsPending,
        total: smsLogs.length,
        cost: smsCost,
        typeMix: smsTypeMix,
        dailyTrend: smsDailyTrend,
        autoEnabled: smsAutoEnabled,
        autoTotal: smsAutoTotal,
        recent: smsLogs.slice(0, 12),
      },
      autoCall: {
        enabled: autoCallAccount?.serviceEnabled ?? false,
        balanceTaka: autoCallAccount?.balanceTaka ?? 0,
        stats: autoCallStats,
        breakdown: autoCallBreakdown,
        sourceMix: autoCallSourceMix,
        confirmed: autoCallConfirmed,
        runs: autoCallRuns,
        recent: autoCallLogs.slice(0, 12),
      },
      woo: {
        connected: woo.connected,
        storeUrl: woo.storeUrl,
        syncViaPlugin: woo.syncViaPlugin,
        stockSyncEnabled: wooStock.enabled,
        stockSuccess: wooStock.successCount,
        stockFailed: wooStock.failedCount,
        lastStockSync: wooStock.lastSyncAt,
        errorCount: wooErrorCount,
        successCount: wooSuccessCount,
        recentLogs: wooLogs.slice(-10).reverse(),
      },
    };
  }, [allOrdersIncludingWeb, range, from, to]);

  const marketingReport = useMemo(() => {
    const adSpend = accountingExpenseFiltered
      .filter(
        (row) =>
          isOperatingAccountingRef(row.reference) &&
          (row.category === "ad" ||
            row.title.toLowerCase().includes("meta") ||
            row.title.toLowerCase().includes("facebook") ||
            row.title.toLowerCase().includes("instagram"))
      )
      .reduce((sum, row) => sum + row.amount, 0);

    const attributedOrders = filteredOrders.filter((o) =>
      META_ORDER_SOURCES.has(inferOrderSourceFromOrder(o))
    );
    const revenue = attributedOrders
      .filter((o) => !["cancelled", "returned", "lost"].includes(o.status))
      .reduce((sum, o) => sum + o.total, 0);
    const roas = adSpend > 0 ? revenue / adSpend : 0;
    const costPerOrder = attributedOrders.length > 0 ? adSpend / attributedOrders.length : 0;

    const sourceMap = new Map<string, { orders: number; revenue: number }>();
    for (const o of attributedOrders) {
      const label = getOrderSourceLabel(
        inferOrderSourceFromOrder(o),
        o.customOrderSource
      );
      const row = sourceMap.get(label) ?? { orders: 0, revenue: 0 };
      row.orders += 1;
      if (!["cancelled", "returned", "lost"].includes(o.status)) {
        row.revenue += o.total;
      }
      sourceMap.set(label, row);
    }

    const dailyMap = new Map<string, { spend: number; revenue: number }>();
    for (const e of accountingExpenseFiltered) {
      if (e.category !== "ad" && !e.title.toLowerCase().includes("meta")) continue;
      const d = parseDateLabel(e.date);
      const key = d ? toInputDate(d) : "Unknown";
      const row = dailyMap.get(key) ?? { spend: 0, revenue: 0 };
      row.spend += e.amount;
      dailyMap.set(key, row);
    }
    for (const o of attributedOrders) {
      const d = parseOrderDate(o);
      const key = d ? toInputDate(d) : "Unknown";
      const row = dailyMap.get(key) ?? { spend: 0, revenue: 0 };
      if (!["cancelled", "returned", "lost"].includes(o.status)) {
        row.revenue += o.total;
      }
      dailyMap.set(key, row);
    }
    const dailyTrend = [...dailyMap.entries()]
      .map(([date, row]) => ({ date, spend: row.spend, revenue: row.revenue }))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-14);

    return {
      adSpend,
      revenue,
      roas,
      costPerOrder,
      orders: attributedOrders.length,
      bySource: [...sourceMap.entries()]
        .map(([name, data]) => ({ name, ...data }))
        .sort((a, b) => b.revenue - a.revenue),
      dailyTrend,
    };
  }, [accountingExpenseFiltered, filteredOrders]);

  const teamProductivityRows = useMemo(() => {
    const teamUsers = loadTeamUsers();
    const usersByName = new Map(
      teamUsers.map((u) => [u.name.trim().toLowerCase(), u.name.trim()])
    );

    const map = new Map<
      string,
      {
        staff: string;
        orders: number;
        delivered: number;
        revenue: number;
        edits: number;
        scans: number;
        activity: number;
      }
    >();

    for (const user of teamUsers) {
      const key = user.name.trim();
      map.set(key, {
        staff: key,
        orders: 0,
        delivered: 0,
        revenue: 0,
        edits: 0,
        scans: 0,
        activity: 0,
      });
    }

    for (const row of staffRows) {
      const entry = map.get(row.staff) ?? {
        staff: row.staff,
        orders: 0,
        delivered: 0,
        revenue: 0,
        edits: 0,
        scans: 0,
        activity: 0,
      };
      entry.orders = row.total;
      entry.delivered = row.delivered;
      entry.revenue = row.revenue;
      map.set(row.staff, entry);
    }

    for (const row of operationsReport.editRows) {
      const key = usersByName.get(row.actor.toLowerCase()) ?? row.actor;
      const entry = map.get(key) ?? {
        staff: key,
        orders: 0,
        delivered: 0,
        revenue: 0,
        edits: 0,
        scans: 0,
        activity: 0,
      };
      entry.edits = row.edits;
      map.set(key, entry);
    }

    const scanLogs = loadScanLogs().filter((log) =>
      isWithinRange(parseDateLabel(log.scannedAt), range, from, to)
    );
    for (const log of scanLogs) {
      const actor = log.actor?.trim() || "Staff";
      const key = usersByName.get(actor.toLowerCase()) ?? actor;
      const entry = map.get(key) ?? {
        staff: key,
        orders: 0,
        delivered: 0,
        revenue: 0,
        edits: 0,
        scans: 0,
        activity: 0,
      };
      if (log.type === "success") entry.scans += 1;
      map.set(key, entry);
    }

    return [...map.values()]
      .map((row) => ({
        ...row,
        activity: row.orders + row.edits + row.scans,
        deliveryRate: row.orders ? (row.delivered / row.orders) * 100 : 0,
      }))
      .sort(
        (a, b) => b.activity - a.activity || b.revenue - a.revenue || a.staff.localeCompare(b.staff)
      );
  }, [staffRows, operationsReport.editRows, range, from, to]);

  const orderStatusFilterTabs = new Set<ReportTab>([
    "sales",
    "courier",
    "payment",
    "staff",
    "approved_orders",
    "web",
    "preorder",
  ]);
  const orderSummaryCardTabs = new Set<ReportTab>(["sales", "courier", "payment", "staff"]);
  const showOrderStatusFilter = orderStatusFilterTabs.has(tab);
  const showOrderSummaryCards = orderSummaryCardTabs.has(tab);

  const periodBounds = useMemo(
    () => getSelectedPeriodBounds(range, from, to),
    [range, from, to]
  );
  const previousBounds = useMemo(
    () => (periodBounds ? getPreviousPeriodBounds(periodBounds) : null),
    [periodBounds]
  );

  const previousOrders = useMemo(() => {
    if (!compareMode || !previousBounds) return [];
    return allOrders.filter((o) => {
      if (status !== "all" && o.status !== status) return false;
      return isWithinBounds(parseOrderDate(o), previousBounds);
    });
  }, [compareMode, previousBounds, allOrders, status]);

  const periodCompare = useMemo(() => {
    if (!compareMode || !previousBounds) return null;
    const current = summarizeOrderMetrics(filteredOrders);
    const previous = summarizeOrderMetrics(previousOrders);
    return {
      orders: current.orders - previous.orders,
      grossSales: current.grossSales - previous.grossSales,
      delivered: current.delivered - previous.delivered,
      returnRate: current.returnRate - previous.returnRate,
      previous,
      current,
    };
  }, [compareMode, previousBounds, filteredOrders, previousOrders]);

  const tabCompareNotes = useMemo(() => {
    if (!compareMode || !previousBounds) return null;

    const prevCustomers = allOrdersIncludingWeb.filter((o) =>
      isWithinBounds(parseOrderDate(o), previousBounds)
    );
    const currPhones = new Set(
      allOrdersIncludingWeb
        .filter((o) => isWithinRange(parseOrderDate(o), range, from, to))
        .map((o) => normalizePhone(o.phone))
        .filter(Boolean)
    );
    const prevPhones = new Set(
      prevCustomers.map((o) => normalizePhone(o.phone)).filter(Boolean)
    );

    const prevWeb = prevCustomers.filter(isWebSourceOrder);
    const prevScan = loadScanLogs().filter((log) =>
      isWithinBounds(parseDateLabel(log.scannedAt), previousBounds)
    );

    const prevSms = (loadSmsAccountLocal()?.logs ?? []).filter((log) =>
      isWithinBounds(parseDateLabel(log.sentAt), previousBounds)
    );
    const prevMetaRevenue = prevCustomers
      .filter((o) => META_ORDER_SOURCES.has(inferOrderSourceFromOrder(o)))
      .filter((o) => !["cancelled", "returned", "lost"].includes(o.status))
      .reduce((s, o) => s + o.total, 0);

    let prevNetStock = 0;
    for (const m of loadMovements()) {
      if (!isWithinBounds(parseDateLabel(m.createdAt), previousBounds)) continue;
      if (m.type === "decrease") prevNetStock -= m.qty;
      else if (m.type === "increase" && !m.reason.toLowerCase().includes("return")) {
        prevNetStock += m.qty;
      }
    }

    return {
      customers: `${formatDelta(currPhones.size, prevPhones.size)} active customers`,
      web: `${formatDelta(webSourceOrders.length, prevWeb.length)} web orders`,
      courier: `${formatDelta(periodCompare?.delivered ?? 0, periodCompare?.previous.delivered ?? 0)} delivered`,
      scans: `${formatDelta(scanReport.total, prevScan.length)} scans`,
      sms: `${formatDelta(integrationsReport.sms.total, prevSms.length)} SMS`,
      marketing: `${formatCompactBdt(marketingReport.revenue - prevMetaRevenue)} attributed revenue`,
      inventory: `${formatDelta(inventoryReport.summary.netChange, prevNetStock)} net stock units`,
    };
  }, [
    compareMode,
    previousBounds,
    allOrdersIncludingWeb,
    range,
    from,
    to,
    webSourceOrders.length,
    scanReport.total,
    integrationsReport.sms.total,
    marketingReport.revenue,
    periodCompare,
    inventoryReport.summary.netChange,
  ]);

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

  const [businessName, setBusinessName] = useState("");
  const [businessLogo, setBusinessLogo] = useState("");

  useEffect(() => {
    const sync = () => {
      const biz = loadBusinessSettings();
      setBusinessName(biz.name || "YourAI Seller");
      setBusinessLogo(biz.logoUrl || "");
    };
    sync();
    window.addEventListener("youraiseller-business-settings-updated", sync);
    return () => window.removeEventListener("youraiseller-business-settings-updated", sync);
  }, []);

  const rangeLabel = useMemo(
    () => formatRangeLabel(range, from, to),
    [range, from, to]
  );
  const accRangeLabel = useMemo(
    () => formatRangeLabel(accRange, accFrom, accTo),
    [accRange, accFrom, accTo]
  );

  const exportPayload = useMemo<ReportsExportPayload>(
    () => ({
      filteredOrders,
      courierRows,
      courierDeepReport,
      accountingOptionRows,
      teamProductivityRows,
      customerReport,
      webReport,
      preorderReport,
      marketingReport,
      integrationsReport,
      inventoryReport,
      grossSales,
      filteredOrdersCount: filteredOrders.length,
      deliveredCount,
      paymentSummary,
      accountingPl,
      rangeLabel,
      accRangeLabel,
    }),
    [
      filteredOrders,
      courierRows,
      courierDeepReport,
      accountingOptionRows,
      teamProductivityRows,
      customerReport,
      webReport,
      preorderReport,
      marketingReport,
      integrationsReport,
      inventoryReport,
      grossSales,
      deliveredCount,
      paymentSummary,
      accountingPl,
      rangeLabel,
      accRangeLabel,
    ]
  );

  const exportCurrent = () => exportTabCsv(tab, exportPayload);

  const exportCurrentPdf = () =>
    exportTabPdf(tab, exportPayload, businessName, businessLogo || undefined);

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

  return {
    accFrom,
    accRange,
    accRangeLabel,
    accTo,
    accountingAssetFiltered,
    accountingCashFlow,
    accountingChartData,
    accountingData,
    accountingDepthReport,
    accountingExpenseByCategory,
    accountingExpenseFiltered,
    accountingIncomeFiltered,
    accountingInvoiceFiltered,
    accountingLiabilityFiltered,
    accountingOptionRows,
    accountingPl,
    accountingQuickLinks,
    accountingRecentRows,
    accountingSummary,
    accountingTransferFiltered,
    allOrders,
    allOrdersIncludingWeb,
    businessLogo,
    businessName,
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
    exportPayload,
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
    approvedOrderReport,
    paymentAgingRows,
    paymentSummary,
    periodBounds,
    periodCompare,
    profitSalesReport,
    preorderReport,
    previousBounds,
    previousOrders,
    range,
    rangeLabel,
    returnRate,
    returnedCount,
    router,
    scanReport,
    searchParams,
    selectTab,
    setAccFrom,
    setAccRange,
    setAccTo,
    setBusinessLogo,
    setBusinessName,
    setCompareMode,
    setDrillStatus,
    setFrom,
    setLedgerModalOpen,
    setLedgerModalRows,
    setLedgerModalTitle,
    setRange,
    setStatus,
    setTab,
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
  };
}

export type ReportsViewProps = ReturnType<typeof useReportsData>;
