import {
  autoCallLogOutcome,
  isAutoCallLogCalling,
} from "./auto-call-log-display";
import {
  autoCallKeyDigit,
  isAutoCallResponsePending,
  normalizeAutoCallResponseCode,
} from "./auto-call-response-codes";
import { findAutoCallLogsForOrder } from "./auto-call-order-status";
import type { AutoCallLogRow, AutoCallRule, AutoCallSettings } from "./auto-call-types";
import type { Order, OrderStatus } from "./orders-store";

export type AutoCallReportPeriod =
  | "today"
  | "yesterday"
  | "7d"
  | "30d"
  | "month"
  | "year"
  | "all";

export type AutoCallReportSourceFilter = "all" | "WORKFLOW" | "BATCH" | "TEST" | "MANUAL";

export type AutoCallReportOrderTypeFilter = "all" | "web" | "approved";

export type AutoCallOutcomeBucket =
  | "pressed1"
  | "pressed2"
  | "rejected"
  | "no_input"
  | "no_answer"
  | "failed"
  | "calling"
  | "try_again"
  | "other";

export type AutoCallReportFilters = {
  period: AutoCallReportPeriod;
  search: string;
  source: AutoCallReportSourceFilter;
  orderType: AutoCallReportOrderTypeFilter;
  outcomes: AutoCallOutcomeBucket[];
  page: number;
  pageSize: number;
};

export const AUTO_CALL_REPORT_PERIOD_OPTIONS: {
  id: AutoCallReportPeriod;
  label: string;
}[] = [
  { id: "today", label: "Today" },
  { id: "yesterday", label: "Yest." },
  { id: "7d", label: "7D" },
  { id: "30d", label: "30D" },
  { id: "month", label: "Month" },
  { id: "year", label: "Year" },
  { id: "all", label: "All" },
];

export const AUTO_CALL_OUTCOME_FILTER_OPTIONS: {
  id: AutoCallOutcomeBucket;
  label: string;
}[] = [
  { id: "pressed1", label: "Pressed 1" },
  { id: "pressed2", label: "Pressed 2" },
  { id: "rejected", label: "Rejected" },
  { id: "no_input", label: "No Input" },
  { id: "no_answer", label: "No Answer" },
  { id: "failed", label: "Failed" },
  { id: "calling", label: "In progress" },
  { id: "try_again", label: "Try again" },
];

export const AUTO_CALL_SOURCE_FILTER_OPTIONS: {
  id: AutoCallReportSourceFilter;
  label: string;
}[] = [
  { id: "all", label: "All sources" },
  { id: "WORKFLOW", label: "Workflow" },
  { id: "BATCH", label: "Batch" },
  { id: "TEST", label: "Test" },
  { id: "MANUAL", label: "Manual" },
];

export const AUTO_CALL_ORDER_TYPE_OPTIONS: {
  id: AutoCallReportOrderTypeFilter;
  label: string;
}[] = [
  { id: "all", label: "Web and approved orders" },
  { id: "web", label: "Web orders only" },
  { id: "approved", label: "Approved orders only" },
];

const CONFIRMED_STATUS_ROWS: { key: OrderStatus; label: string }[] = [
  { key: "pending", label: "Pending" },
  { key: "rts", label: "RTS" },
  { key: "shipped", label: "Delivering" },
  { key: "delivered", label: "Delivered" },
  { key: "partial", label: "Partial Delivery" },
  { key: "pending_return", label: "Pending Return" },
  { key: "returned", label: "Returned" },
  { key: "cancelled", label: "Cancelled" },
  { key: "pending_cancel", label: "Pending Cancel" },
  { key: "preorder", label: "Preorder" },
  { key: "lost", label: "Lost" },
];

function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

export function parseAutoCallLogDate(sentAt: string): Date | null {
  const d = new Date(sentAt);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function getAutoCallReportDateRange(
  period: AutoCallReportPeriod,
  now = new Date()
): { from: Date | null; to: Date; label: string } {
  const to = now;
  const today = startOfDay(now);

  if (period === "all") {
    return { from: null, to, label: "Lifetime" };
  }

  if (period === "today") {
    return {
      from: today,
      to,
      label: today.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    };
  }

  if (period === "yesterday") {
    const y = new Date(today);
    y.setDate(y.getDate() - 1);
    return {
      from: y,
      to: new Date(today.getTime() - 1),
      label: y.toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
    };
  }

  let from = new Date(today);
  if (period === "7d") from.setDate(from.getDate() - 6);
  else if (period === "30d") from.setDate(from.getDate() - 29);
  else if (period === "month") from = new Date(now.getFullYear(), now.getMonth(), 1);
  else if (period === "year") from = new Date(now.getFullYear(), 0, 1);

  const fromLabel = from.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const toLabel = to.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });

  return { from, to, label: `${fromLabel} – ${toLabel}` };
}

export function filterAutoCallLogsByPeriod(
  logs: AutoCallLogRow[],
  period: AutoCallReportPeriod,
  now = new Date()
): AutoCallLogRow[] {
  if (period === "all") return logs;

  const { from, to } = getAutoCallReportDateRange(period, now);
  const today = startOfDay(now);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  return logs.filter((log) => {
    const d = parseAutoCallLogDate(log.sentAt);
    if (!d) return false;
    if (period === "today") return isSameDay(d, today);
    if (period === "yesterday") return isSameDay(d, yesterday);
    if (!from) return true;
    return d >= from && d <= to;
  });
}

function isAutoCallRetryableOutcome(log: AutoCallLogRow): boolean {
  if (log.status === "pending" || isAutoCallResponsePending(log.responseCode)) {
    return false;
  }

  const code = normalizeAutoCallResponseCode(log.responseCode);
  if (autoCallKeyDigit(code) != null) return false;

  if (code === "CRBNR" || code === "RBNIG" || code === "CD" || code === "WRKP") {
    return true;
  }

  if (log.status === "failed") {
    if (log.error?.includes("Insufficient")) return false;
    return true;
  }

  return false;
}

export function resolveAutoCallReportSource(
  log: AutoCallLogRow
): Exclude<AutoCallReportSourceFilter, "all"> {
  if (log.source === "WORKFLOW") return "WORKFLOW";
  if (log.source === "BATCH") return "BATCH";
  if (log.source === "TEST" || log.orderId === "test") return "TEST";
  return "MANUAL";
}

function isWebOrder(order: Order | undefined, log: AutoCallLogRow): boolean {
  if (order) {
    if (order.inWebQueue === true) return true;
    if (order.source === "web" || order.wooOrderId != null) return true;
    if (order.webQueueReleased) return false;
    return order.inWebQueue !== false && !order.webQueueReleased;
  }
  return log.orderId.startsWith("WO-") || log.orderId.startsWith("web-");
}

function isApprovedOrder(order: Order | undefined, log: AutoCallLogRow): boolean {
  if (order) {
    if (order.inWebQueue === false && order.webQueueReleased) return true;
    if (order.source !== "web" && !order.wooOrderId && !order.id.startsWith("WO-")) {
      return true;
    }
    return order.inWebQueue === false;
  }
  return !log.orderId.startsWith("WO-") && !log.orderId.startsWith("web-");
}

function orderForLog(log: AutoCallLogRow, orderIndex: Map<string, Order>): Order | undefined {
  if (!log.orderId || log.orderId === "unknown" || log.orderId === "test") return undefined;
  return orderIndex.get(log.orderId);
}

export function classifyAutoCallLogOutcome(
  log: AutoCallLogRow,
  ctx?: {
    allLogs: AutoCallLogRow[];
    settings: AutoCallSettings;
    rules: AutoCallRule[];
  }
): AutoCallOutcomeBucket {
  if (isAutoCallLogCalling(log)) return "calling";

  const code = normalizeAutoCallResponseCode(log.responseCode);
  const digit = autoCallKeyDigit(code);

  if (digit === 1 && log.status === "completed") return "pressed1";
  if (digit === 2 && log.status === "completed") return "pressed2";
  if (digit != null && log.status === "completed") return "other";
  if (code === "CD") return "rejected";
  if (code === "CRBNR") return "no_answer";
  if (code === "RBNIG") return "no_input";
  if (log.status === "failed" || code === "7533" || code === "WRKP") return "failed";

  if (ctx && log.orderId && log.orderId !== "unknown" && log.orderId !== "test") {
    const related = findAutoCallLogsForOrder(ctx.allLogs, log.orderId);
    const latest = related[0];
    if (latest?.id === log.id && isAutoCallRetryableOutcome(log)) {
      const retryOn = ctx.rules.find((r) => r.id === "retry")?.enabled;
      if (retryOn) {
        const maxRule = ctx.rules.find((r) => r.id === "max_attempts")?.enabled;
        const maxAttempts = maxRule
          ? Math.min(3, Math.max(1, ctx.settings.maxAttempts))
          : 1;
        const attempts = related.filter(
          (row) => row.source === "WORKFLOW" || row.source === "BATCH"
        ).length;
        if (attempts < maxAttempts) return "try_again";
      }
    }
  }

  return "other";
}

export function filterAutoCallReportLogs(
  logs: AutoCallLogRow[],
  filters: AutoCallReportFilters,
  orders: Order[],
  settings: AutoCallSettings,
  rules: AutoCallRule[],
  now = new Date()
): AutoCallLogRow[] {
  const orderIndex = new Map(orders.map((o) => [o.id, o]));
  const periodLogs = filterAutoCallLogsByPeriod(logs, filters.period, now);
  const q = filters.search.trim().toLowerCase();
  const phoneQ = filters.search.replace(/\D/g, "");

  return periodLogs.filter((log) => {
    if (filters.source !== "all" && resolveAutoCallReportSource(log) !== filters.source) {
      return false;
    }

    const order = orderForLog(log, orderIndex);
    if (filters.orderType === "web" && !isWebOrder(order, log)) return false;
    if (filters.orderType === "approved" && !isApprovedOrder(order, log)) return false;

    if (filters.outcomes.length > 0) {
      const bucket = classifyAutoCallLogOutcome(log, { allLogs: logs, settings, rules });
      if (!filters.outcomes.includes(bucket)) return false;
    }

    if (!q) return true;
    if (log.orderId.toLowerCase().includes(q)) return true;
    if (log.phone.replace(/\D/g, "").includes(phoneQ)) return true;
    if (phoneQ && log.phone.replace(/\D/g, "").includes(phoneQ)) return true;
    return false;
  });
}

export type AutoCallReportStats = {
  totalCalls: number;
  success: number;
  notConfirmed: number;
  liveQueue: number;
  inProgress: number;
  tryAgain: number;
  pressed2: number;
  failed: number;
  rejected: number;
  busy: number;
  successRate: number;
};

export function computeAutoCallReportStats(
  logs: AutoCallLogRow[],
  settings: AutoCallSettings,
  rules: AutoCallRule[]
): AutoCallReportStats {
  let success = 0;
  let notConfirmed = 0;
  let inProgress = 0;
  let tryAgain = 0;
  let pressed2 = 0;
  let failed = 0;
  let rejected = 0;

  for (const log of logs) {
    const bucket = classifyAutoCallLogOutcome(log, { allLogs: logs, settings, rules });
    if (bucket === "calling") inProgress += 1;
    else if (bucket === "try_again") tryAgain += 1;
    else if (bucket === "pressed1") success += 1;
    else if (bucket === "pressed2") pressed2 += 1;
    else if (bucket === "rejected") rejected += 1;
    else if (bucket === "failed") failed += 1;

    if (bucket !== "pressed1") notConfirmed += 1;
  }

  const liveQueue = inProgress + tryAgain;
  const totalCalls = logs.length;
  const successRate = totalCalls > 0 ? (success / totalCalls) * 100 : 0;

  return {
    totalCalls,
    success,
    notConfirmed,
    liveQueue,
    inProgress,
    tryAgain,
    pressed2,
    failed,
    rejected,
    busy: 0,
    successRate,
  };
}

export type AutoCallBreakdownRow = {
  id: AutoCallOutcomeBucket;
  label: string;
  count: number;
  color: string;
};

export function buildAutoCallOutcomeBreakdown(
  logs: AutoCallLogRow[],
  settings: AutoCallSettings,
  rules: AutoCallRule[]
): AutoCallBreakdownRow[] {
  const counts: Record<AutoCallOutcomeBucket, number> = {
    pressed1: 0,
    pressed2: 0,
    rejected: 0,
    no_input: 0,
    no_answer: 0,
    failed: 0,
    calling: 0,
    try_again: 0,
    other: 0,
  };

  for (const log of logs) {
    const bucket = classifyAutoCallLogOutcome(log, { allLogs: logs, settings, rules });
    counts[bucket] += 1;
  }

  const rows: AutoCallBreakdownRow[] = [
    { id: "pressed1", label: "Pressed 1", count: counts.pressed1, color: "#10b981" },
    { id: "rejected", label: "Rejected", count: counts.rejected, color: "#f43f5e" },
    { id: "pressed2", label: "Pressed 2", count: counts.pressed2, color: "#8b5cf6" },
    { id: "no_input", label: "No Input", count: counts.no_input, color: "#f59e0b" },
    { id: "no_answer", label: "No Answer", count: counts.no_answer, color: "#94a3b8" },
    { id: "failed", label: "Failed", count: counts.failed, color: "#ef4444" },
  ];

  return rows.filter((row) => row.count > 0).sort((a, b) => b.count - a.count);
}

export type AutoCallMixRow = {
  id: string;
  label: string;
  count: number;
  percent: number;
};

export function buildAutoCallSourceMix(logs: AutoCallLogRow[]): AutoCallMixRow[] {
  const counts: Record<Exclude<AutoCallReportSourceFilter, "all">, number> = {
    WORKFLOW: 0,
    BATCH: 0,
    TEST: 0,
    MANUAL: 0,
  };
  for (const log of logs) {
    const src = resolveAutoCallReportSource(log);
    counts[src] += 1;
  }
  const total = logs.length || 1;
  return (Object.keys(counts) as (keyof typeof counts)[]).map((id) => ({
    id,
    label: id === "MANUAL" ? "Manual" : id.charAt(0) + id.slice(1).toLowerCase(),
    count: counts[id],
    percent: (counts[id] / total) * 100,
  }));
}

export function buildAutoCallOrderTypeMix(
  logs: AutoCallLogRow[],
  orders: Order[]
): AutoCallMixRow[] {
  const orderIndex = new Map(orders.map((o) => [o.id, o]));
  let web = 0;
  let approved = 0;

  for (const log of logs) {
    const order = orderForLog(log, orderIndex);
    if (isWebOrder(order, log)) web += 1;
    else if (isApprovedOrder(order, log)) approved += 1;
    else web += 1;
  }

  const total = logs.length || 1;
  return [
    { id: "web", label: "Web Orders", count: web, percent: (web / total) * 100 },
    {
      id: "approved",
      label: "Approved Orders",
      count: approved,
      percent: (approved / total) * 100,
    },
  ];
}

export type ConfirmedOrderStatusRow = {
  status: OrderStatus;
  label: string;
  count: number;
};

export type ConfirmedOrderSnapshot = {
  confirmedCount: number;
  activePipeline: number;
  delivered: number;
  returnedOrCancelled: number;
  completionRate: number;
  returnRate: number;
  cancelRate: number;
  statusRows: ConfirmedOrderStatusRow[];
};

export function buildConfirmedOrderReport(
  logs: AutoCallLogRow[],
  orders: Order[]
): ConfirmedOrderSnapshot {
  const orderIndex = new Map(orders.map((o) => [o.id, o]));
  const confirmedOrderIds = new Set<string>();

  for (const log of logs) {
    if (
      log.orderId &&
      log.orderId !== "unknown" &&
      log.orderId !== "test" &&
      classifyAutoCallLogOutcome(log) === "pressed1"
    ) {
      confirmedOrderIds.add(log.orderId);
    }
  }

  const statusCounts = new Map<OrderStatus, number>();
  for (const key of CONFIRMED_STATUS_ROWS) {
    statusCounts.set(key.key, 0);
  }

  let activePipeline = 0;
  let delivered = 0;
  let returnedOrCancelled = 0;

  for (const orderId of Array.from(confirmedOrderIds)) {
    const order = orderIndex.get(orderId);
    const status = order?.status ?? "pending";
    statusCounts.set(status, (statusCounts.get(status) ?? 0) + 1);

    if (status === "pending" || status === "rts" || status === "shipped") {
      activePipeline += 1;
    }
    if (status === "delivered") delivered += 1;
    if (
      status === "returned" ||
      status === "cancelled" ||
      status === "pending_return" ||
      status === "pending_cancel"
    ) {
      returnedOrCancelled += 1;
    }
  }

  const confirmedCount = confirmedOrderIds.size;
  const completionRate = confirmedCount > 0 ? (delivered / confirmedCount) * 100 : 0;
  const returnCount =
    (statusCounts.get("returned") ?? 0) +
    (statusCounts.get("pending_return") ?? 0) +
    (statusCounts.get("partial") ?? 0);
  const cancelCount = statusCounts.get("cancelled") ?? 0;
  const returnRate = confirmedCount > 0 ? (returnCount / confirmedCount) * 100 : 0;
  const cancelRate = confirmedCount > 0 ? (cancelCount / confirmedCount) * 100 : 0;

  const statusRows = CONFIRMED_STATUS_ROWS.map((row) => ({
    status: row.key,
    label: row.label,
    count: statusCounts.get(row.key) ?? 0,
  })).filter((row) => row.count > 0);

  return {
    confirmedCount,
    activePipeline,
    delivered,
    returnedOrCancelled,
    completionRate,
    returnRate,
    cancelRate,
    statusRows,
  };
}

export function paginateAutoCallLogs<T>(rows: T[], page: number, pageSize: number): T[] {
  const start = page * pageSize;
  return rows.slice(start, start + pageSize);
}

export function formatAutoCallReportTime(sentAt: string): string {
  const d = parseAutoCallLogDate(sentAt);
  if (!d) return sentAt;
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function exportAutoCallReportCsv(
  logs: AutoCallLogRow[],
  orders: Order[]
): string {
  const orderIndex = new Map(orders.map((o) => [o.id, o]));
  const header = [
    "Time",
    "Order ID",
    "Phone",
    "Source",
    "Order Type",
    "Outcome",
    "Attempt",
    "Duration",
    "Web Status",
    "Approved Status",
    "Error",
  ];

  const rows = logs.map((log) => {
    const order = orderForLog(log, orderIndex);
    const outcome = autoCallLogOutcome(log).label;
    const source = resolveAutoCallReportSource(log);
    const orderType = isWebOrder(order, log) ? "Web" : "Approved";
    const duration =
      log.durationSec != null && log.durationSec > 0
        ? `${Math.floor(log.durationSec / 60)}:${String(log.durationSec % 60).padStart(2, "0")}`
        : "";
    return [
      formatAutoCallReportTime(log.sentAt),
      log.orderId,
      log.phone,
      source,
      orderType,
      outcome,
      String(log.attempt ?? 1),
      duration,
      order?.webStatus ?? "",
      order?.status ?? "",
      log.error ?? "",
    ]
      .map((cell) => `"${String(cell).replace(/"/g, '""')}"`)
      .join(",");
  });

  return [header.join(","), ...rows].join("\n");
}

export function downloadAutoCallReportCsv(
  logs: AutoCallLogRow[],
  orders: Order[],
  filename = "auto-call-report.csv"
): void {
  const csv = exportAutoCallReportCsv(logs, orders);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  link.click();
  URL.revokeObjectURL(url);
}
