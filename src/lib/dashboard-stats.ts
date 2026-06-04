import { getOrderStats, loadOrders, type Order } from "./orders-store";
import { getWebOrdersFromStore } from "./woocommerce-order-sync";
import { isInWebQueue } from "./web-order-queue";
import { countWebOrdersByTab, matchesWebOrderTab, WEB_ORDER_TABS, type WebOrderTabKey } from "./web-order-tabs";
import { ORDER_LIST_TABS, ORDER_STATUS_LABELS } from "./order-status-tabs";
import type { OrderStatus } from "./orders-store";
import { resolveWebDisplayStatus } from "./order-edit";
import type { WebDisplayStatus } from "./orders-store";
import { getProduct, loadProducts } from "./inventory-store";
import { parseActivityDate } from "./order-activity";
import {
  getOrderSourceLabel,
  inferOrderSourceFromOrder,
  type OrderSource,
} from "./order-source";

const SOURCE_COLORS: Record<string, string> = {
  facebook: "#1877f2",
  website: "#14b8a6",
  direct: "#8b5cf6",
  unknown: "#94a3b8",
  instagram: "#d946ef",
  tiktok: "#0f172a",
  whatsapp: "#22c55e",
  exchange: "#f59e0b",
  messenger: "#0ea5e9",
  custom: "#6366f1",
  /** @deprecated legacy channel field */
  web: "#5b4dff",
  manual: "#94a3b8",
  phone: "#22d3ee",
};

const WEB_PIPELINE_STATUS_ORDER: {
  key: WebDisplayStatus;
  label: string;
  color: string;
}[] = [
  { key: "processing", label: "Processing", color: "#5b4dff" },
  { key: "pending", label: "Pending", color: "#6366f1" },
  { key: "no_response", label: "No Response", color: "#f43f5e" },
  { key: "good_no_response", label: "Good But No Response", color: "#a855f7" },
  { key: "on_hold", label: "On Hold", color: "#64748b" },
  { key: "incomplete", label: "Incomplete", color: "#f97316" },
  { key: "complete", label: "Complete", color: "#22d3ee" },
  { key: "cancelled", label: "Cancel", color: "#f59e0b" },
];

export type OverviewDateField = "approved" | "web_order" | "courier";
export type OverviewDatePreset = "today" | "yesterday" | "7d" | "30d" | "all";

export type OverviewFilterOptions = {
  dateField: OverviewDateField;
  datePreset: OverviewDatePreset;
};

const DATE_FIELD_LABELS: Record<OverviewDateField, string> = {
  approved: "Approved date",
  web_order: "Web order date",
  courier: "Courier date",
};

const DATE_FIELD_SHORT: Record<OverviewDateField, string> = {
  approved: "Approved",
  web_order: "Web order",
  courier: "Courier",
};

const DATE_PRESET_LABELS: Record<OverviewDatePreset, string> = {
  today: "Today",
  yesterday: "Yesterday",
  "7d": "Last 7 days",
  "30d": "Last 30 days",
  all: "All time",
};

export function getOverviewDateFieldLabel(field: OverviewDateField): string {
  return DATE_FIELD_LABELS[field];
}

export function getOverviewDateFieldShortLabel(field: OverviewDateField): string {
  return DATE_FIELD_SHORT[field];
}

export function getOverviewDatePresetLabel(preset: OverviewDatePreset): string {
  return DATE_PRESET_LABELS[preset];
}

function toInputDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function dayStartMs(iso: string): number {
  return new Date(`${iso}T00:00:00`).getTime();
}

function dayEndMs(iso: string): number {
  return new Date(`${iso}T23:59:59.999`).getTime();
}

export function resolveOverviewDateRange(preset: OverviewDatePreset): {
  from: string;
  to: string;
  prevFrom: string;
  prevTo: string;
} | null {
  if (preset === "all") return null;

  const today = new Date();
  const start = new Date(today);
  const end = new Date(today);
  const prevEnd = new Date(today);
  const prevStart = new Date(today);

  if (preset === "today") {
    prevEnd.setDate(prevEnd.getDate() - 1);
    prevStart.setDate(prevStart.getDate() - 1);
  } else if (preset === "yesterday") {
    start.setDate(start.getDate() - 1);
    end.setDate(end.getDate() - 1);
    prevEnd.setDate(prevEnd.getDate() - 2);
    prevStart.setDate(prevStart.getDate() - 2);
  } else if (preset === "7d") {
    start.setDate(start.getDate() - 6);
    prevEnd.setDate(prevEnd.getDate() - 7);
    prevStart.setDate(prevStart.getDate() - 13);
  } else if (preset === "30d") {
    start.setDate(start.getDate() - 29);
    prevEnd.setDate(prevEnd.getDate() - 30);
    prevStart.setDate(prevStart.getDate() - 59);
  }

  return {
    from: toInputDate(start),
    to: toInputDate(end),
    prevFrom: toInputDate(prevStart),
    prevTo: toInputDate(prevEnd),
  };
}

function inDateRange(ms: number, from: string, to: string): boolean {
  if (!ms) return false;
  return ms >= dayStartMs(from) && ms <= dayEndMs(to);
}

export function getOverviewOrderDateMs(
  order: Order,
  field: OverviewDateField
): number {
  if (field === "approved") {
    return parseActivityDate(order.approvedAt ?? order.createdAt);
  }
  if (field === "web_order") {
    return parseActivityDate(order.createdAt);
  }

  const log = order.activityLog ?? [];
  for (const entry of log) {
    if (
      entry.type === "tracking" ||
      (entry.type === "status" &&
        /rts|courier|shipped|steadfast|pathao|carrybee/i.test(
          `${entry.title} ${entry.detail ?? ""}`
        ))
    ) {
      const ms = parseActivityDate(entry.at);
      if (ms > 0) return ms;
    }
  }

  if (["rts", "shipped", "delivered"].includes(order.status)) {
    return (
      parseActivityDate(order.updatedAt) ||
      parseActivityDate(order.approvedAt ?? "") ||
      parseActivityDate(order.createdAt)
    );
  }

  return 0;
}

function isCountableOrder(order: Order): boolean {
  return !["cancelled", "returned", "lost"].includes(order.status);
}

function orderCost(order: Order): number {
  return order.items.reduce((sum, line) => {
    const product = getProduct(line.productId);
    const unitCost = product?.costPrice ?? line.price * 0.65;
    return sum + unitCost * line.qty;
  }, 0);
}

function orderProfit(order: Order): number {
  if (!isCountableOrder(order)) return 0;
  return order.total - orderCost(order);
}

function pctChange(current: number, previous: number): number | null {
  if (previous === 0) {
    if (current === 0) return null;
    return 100;
  }
  return ((current - previous) / previous) * 100;
}

type PeriodMetrics = {
  orders: number;
  sales: number;
  profit: number;
};

function metricsForPeriod(
  orders: Order[],
  field: OverviewDateField,
  from: string,
  to: string
): PeriodMetrics {
  const inPeriod = orders.filter((o) =>
    inDateRange(getOverviewOrderDateMs(o, field), from, to)
  );

  return {
    orders: inPeriod.length,
    sales: inPeriod
      .filter(isCountableOrder)
      .reduce((sum, o) => sum + o.total, 0),
    profit: inPeriod.reduce((sum, o) => sum + orderProfit(o), 0),
  };
}

export function buildOverviewStats(
  filters: OverviewFilterOptions = { dateField: "approved", datePreset: "today" }
) {
  const orders = loadOrders();
  const webPending = countWebOrdersByTab(getWebOrdersFromStore()).processing;
  const range = resolveOverviewDateRange(filters.datePreset);

  let current: PeriodMetrics;
  let previous: PeriodMetrics | null = null;

  if (!range) {
    const stats = getOrderStats();
    const allProfit = orders.reduce((sum, o) => sum + orderProfit(o), 0);
    current = {
      orders: stats.total,
      sales: stats.revenue,
      profit: allProfit,
    };
  } else {
    current = metricsForPeriod(
      orders,
      filters.dateField,
      range.from,
      range.to
    );
    previous = metricsForPeriod(
      orders,
      filters.dateField,
      range.prevFrom,
      range.prevTo
    );
  }

  return [
    {
      id: "orders",
      label: "Total Orders",
      value: String(current.orders),
      trend:
        previous !== null
          ? pctChange(current.orders, previous.orders)
          : null,
      icon: "package" as const,
      accent: "indigo" as const,
    },
    {
      id: "sales",
      label: "Total Sales",
      value: `৳${current.sales.toLocaleString("en-BD")}`,
      trend:
        previous !== null ? pctChange(current.sales, previous.sales) : null,
      icon: "wallet" as const,
      accent: "cyan" as const,
    },
    {
      id: "profit",
      label: "Profit",
      value: `৳${Math.round(current.profit).toLocaleString("en-BD")}`,
      trend:
        previous !== null ? pctChange(current.profit, previous.profit) : null,
      icon: "trending" as const,
      accent: "amber" as const,
    },
    {
      id: "pending",
      label: "Pending Web Orders",
      value: String(webPending),
      trend: null,
      icon: "clock" as const,
      accent: "rose" as const,
    },
  ];
}

export function buildWebOrderPipeline(options: {
  datePreset?: OverviewDatePreset;
  view?: "web" | "incomplete";
} = {}) {
  const { datePreset = "today", view = "web" } = options;
  const range = resolveOverviewDateRange(datePreset);

  const orders = getWebOrdersFromStore().filter((o) => {
    if (range) {
      const ms = parseActivityDate(o.createdAt);
      if (!inDateRange(ms, range.from, range.to)) return false;
    }
    if (view === "incomplete") {
      return matchesWebOrderTab(o, "incomplete");
    }
    return true;
  });

  const statusCounts = new Map<WebDisplayStatus, number>();
  for (const o of orders) {
    const ws = resolveWebDisplayStatus(o);
    statusCounts.set(ws, (statusCounts.get(ws) ?? 0) + 1);
  }

  const segments = WEB_PIPELINE_STATUS_ORDER.map(({ key, label, color }) => ({
    name: label,
    value: statusCounts.get(key) ?? 0,
    color,
  })).filter((s) => s.value > 0);

  return {
    segments,
    total: orders.length,
    dateLabel: getOverviewDatePresetLabel(datePreset),
  };
}

/** @deprecated use buildWebOrderPipeline */
export function buildWebOrderStatus() {
  return buildWebOrderPipeline().segments;
}

export function buildOrdersBySource(options?: {
  datePreset?: OverviewDatePreset;
}) {
  const datePreset = options?.datePreset ?? "today";
  const range = resolveOverviewDateRange(datePreset);

  const orders = loadOrders().filter((o) => {
    if (!range) return true;
    const ms = parseActivityDate(o.createdAt);
    return inDateRange(ms, range.from, range.to);
  });

  const map = new Map<
    string,
    { orders: number; amount: number; sourceKey: OrderSource }
  >();

  for (const o of orders) {
    const sourceKey = inferOrderSourceFromOrder(o);
    const label = getOrderSourceLabel(sourceKey, o.customOrderSource);
    const prev = map.get(label) ?? { orders: 0, amount: 0, sourceKey };
    prev.orders += 1;
    prev.amount += o.total;
    map.set(label, prev);
  }

  const rows = Array.from(map.entries()).map(([name, data]) => ({
    name,
    orders: data.orders,
    amount: data.amount,
    color: SOURCE_COLORS[data.sourceKey] ?? "#94a3b8",
  }));

  return {
    rows,
    dateLabel: getOverviewDatePresetLabel(datePreset),
  };
}

export type OrdersBySourceRow = ReturnType<typeof buildOrdersBySource>["rows"][number];

export function buildOrdersBySourceTable(
  rows: OrdersBySourceRow[]
) {
  const total = rows.reduce((s, r) => s + r.orders, 0);
  return rows.map((s) => ({
    source: s.name,
    orders: s.orders,
    amount: `৳${s.amount.toLocaleString("en-BD")}`,
    share: total ? `${Math.round((s.orders / total) * 100)}%` : "0%",
  }));
}

/** Daily created vs courier buckets for a date preset. */
export function buildOrderCountsRecent(options?: {
  datePreset?: OverviewDatePreset;
}) {
  const datePreset = options?.datePreset ?? "7d";
  const range = resolveOverviewDateRange(datePreset);
  const labels = range
    ? dayLabelsBetween(range.from, range.to)
    : lastNDayLabels(30);

  const orders = loadOrders();
  return labels.map((day) => ({
    day,
    created: orders.filter((o) => orderMatchesDayLabel(o.createdAt, day)).length,
    courier: orders.filter(
      (o) =>
        orderMatchesDayLabel(o.createdAt, day) &&
        ["rts", "shipped", "delivered"].includes(o.status)
    ).length,
  }));
}

function formatDayLabel(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "2-digit", month: "short" });
}

function orderMatchesDayLabel(createdAt: string, dayLabel: string): boolean {
  const ms = parseActivityDate(createdAt);
  if (ms) return formatDayLabel(new Date(ms)) === dayLabel;
  return createdAt.includes(dayLabel);
}

function lastNDayLabels(n: number): string[] {
  const now = new Date();
  const labels: string[] = [];
  for (let i = n - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    labels.push(formatDayLabel(d));
  }
  return labels;
}

function dayLabelsBetween(from: string, to: string): string[] {
  const labels: string[] = [];
  const cursor = new Date(`${from}T12:00:00`);
  const end = new Date(`${to}T12:00:00`);
  while (cursor <= end) {
    labels.push(formatDayLabel(cursor));
    cursor.setDate(cursor.getDate() + 1);
  }
  return labels;
}

export function buildTopProducts(
  limit = 5,
  options?: { datePreset?: OverviewDatePreset }
) {
  const datePreset = options?.datePreset ?? "7d";
  const range = resolveOverviewDateRange(datePreset);

  const orders = loadOrders().filter((o) => {
    if (!range) return true;
    const ms = parseActivityDate(o.createdAt);
    return inDateRange(ms, range.from, range.to);
  });

  const counts = new Map<string, { name: string; qty: number }>();

  for (const o of orders) {
    for (const line of o.items) {
      const key = line.productId || line.productName;
      const prev = counts.get(key) ?? { name: line.productName, qty: 0 };
      prev.qty += line.qty;
      counts.set(key, prev);
    }
  }

  const sorted = Array.from(counts.values()).sort((a, b) => b.qty - a.qty);
  const max = sorted[0]?.qty ?? 1;

  return sorted.slice(0, limit).map((p) => ({
    name: p.name,
    sales: p.qty,
    pct: Math.round((p.qty / max) * 100),
  }));
}

export function hasSellerOrderData(): boolean {
  return loadOrders().length > 0;
}

export function buildHourlyOrdersChart() {
  const hours = Array.from({ length: 24 }, (_, i) => {
    const h = i.toString().padStart(2, "0");
    return { hour: `${h}:00`, today: 0, yesterday: 0 };
  });

  const today = new Date();
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  const todayLabel = today.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });
  const yesterdayLabel = yesterday.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
  });

  for (const o of loadOrders()) {
    const match = o.createdAt.match(/(\d{2}):\d{2}/);
    if (!match) continue;
    const hourIdx = parseInt(match[1], 10);
    if (hourIdx < 0 || hourIdx > 23) continue;
    if (o.createdAt.includes(todayLabel)) {
      hours[hourIdx].today += 1;
    } else if (o.createdAt.includes(yesterdayLabel)) {
      hours[hourIdx].yesterday += 1;
    }
  }

  return hours;
}

export type FounderDatePreset = "today" | "yesterday" | "7d" | "30d" | "all";

export type FounderDateFilter =
  | { mode: "preset"; preset: FounderDatePreset }
  | { mode: "single"; date: string }
  | { mode: "range"; from: string; to: string };

export const DEFAULT_FOUNDER_DATE_FILTER: FounderDateFilter = {
  mode: "preset",
  preset: "30d",
};

const FOUNDER_DATE_PRESET_LABELS: Record<FounderDatePreset, string> = {
  today: "Today",
  yesterday: "Yest.",
  "7d": "7D",
  "30d": "30D",
  all: "All",
};

export function getFounderDatePresetLabel(preset: FounderDatePreset): string {
  return FOUNDER_DATE_PRESET_LABELS[preset];
}

function formatFounderIsoDateLabel(iso: string, withYear = true): string {
  return new Date(`${iso}T12:00:00`).toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    ...(withYear ? { year: "numeric" } : {}),
  });
}

export function resolveFounderDateRange(
  filter: FounderDateFilter
): { from: string; to: string } | null {
  if (filter.mode === "preset") {
    if (filter.preset === "all") return null;
    const range = resolveOverviewDateRange(filter.preset);
    return range ? { from: range.from, to: range.to } : null;
  }

  if (filter.mode === "single") {
    if (!filter.date) return null;
    return { from: filter.date, to: filter.date };
  }

  const from = filter.from.trim();
  const to = filter.to.trim();
  if (!from && !to) return null;
  if (from && to) {
    return from <= to ? { from, to } : { from: to, to: from };
  }
  const day = from || to;
  return { from: day, to: day };
}

export function getFounderDateRangeLabel(filter: FounderDateFilter): string {
  if (filter.mode === "preset" && filter.preset === "all") return "All time";

  const range = resolveFounderDateRange(filter);
  if (!range) {
    if (filter.mode === "single") return "Pick a date";
    if (filter.mode === "range") return "Pick date range";
    return "All time";
  }

  const spanYears = range.from.slice(0, 4) !== range.to.slice(0, 4);
  if (range.from === range.to) {
    return formatFounderIsoDateLabel(range.from, true);
  }
  return `${formatFounderIsoDateLabel(range.from, spanYears)} – ${formatFounderIsoDateLabel(range.to, true)}`;
}

export function getFounderDateFilterSummary(filter: FounderDateFilter): string {
  if (filter.mode === "preset") return getFounderDatePresetLabel(filter.preset);
  if (filter.mode === "single") return "Single date";
  return "Date range";
}

export function isFounderPresetFilter(
  filter: FounderDateFilter,
  preset: FounderDatePreset
): boolean {
  return filter.mode === "preset" && filter.preset === preset;
}

export function formatFounderCurrency(amount: number): string {
  return `৳ ${Math.round(amount).toLocaleString("en-IN")}`;
}

export function formatFounderCount(value: number): string {
  return value.toLocaleString("en-IN");
}

function orderCreatedDayKey(order: Order): string {
  const ms = parseActivityDate(order.createdAt);
  if (!ms) return "";
  return toInputDate(new Date(ms));
}

function founderOrderInRange(order: Order, filter: FounderDateFilter): boolean {
  const range = resolveFounderDateRange(filter);
  if (!range) return true;
  const day = orderCreatedDayKey(order);
  if (!day) return false;
  return day >= range.from && day <= range.to;
}

function founderWebOrdersForFilter(filter: FounderDateFilter): Order[] {
  return getWebOrdersFromStore().filter((o) => founderOrderInRange(o, filter));
}

export function buildFounderOverview(
  filter: FounderDateFilter = DEFAULT_FOUNDER_DATE_FILTER
) {
  const orders = loadOrders().filter((o) => founderOrderInRange(o, filter));
  const countable = orders.filter(isCountableOrder);

  return {
    totalOrders: orders.length,
    totalOrderValue: countable.reduce((sum, o) => sum + o.total, 0),
    totalProductsInStock: loadProducts().reduce((sum, p) => sum + p.stockQty, 0),
    totalProfit: orders.reduce((sum, o) => sum + orderProfit(o), 0),
    dateLabel: getFounderDateFilterSummary(filter),
    dateRangeLabel: getFounderDateRangeLabel(filter),
  };
}

export type FounderWebSummaryItem = {
  key: WebOrderTabKey;
  label: string;
  count: number;
};

export function buildFounderWebOrderSummary(
  filter: FounderDateFilter = DEFAULT_FOUNDER_DATE_FILTER
): FounderWebSummaryItem[] {
  const webOrders = founderWebOrdersForFilter(filter);
  const counts = countWebOrdersByTab(webOrders);

  return WEB_ORDER_TABS.filter((tab) => tab.key !== "all").map((tab) => ({
    key: tab.key,
    label: tab.label,
    count: counts[tab.key],
  }));
}

const FOUNDER_REVIEW_TABS: WebOrderTabKey[] = [
  "incomplete",
  "good_no_response",
  "no_response",
  "on_hold",
];

export function getFounderOrdersInReview(
  filter: FounderDateFilter = DEFAULT_FOUNDER_DATE_FILTER
): Order[] {
  const webOrders = founderWebOrdersForFilter(filter);
  return webOrders.filter((o) =>
    FOUNDER_REVIEW_TABS.some((tab) => matchesWebOrderTab(o, tab))
  );
}

export type FounderApprovedSummaryItem = {
  key: OrderStatus;
  label: string;
  count: number;
};

function orderApprovedDayKey(order: Order): string {
  const ms = parseActivityDate(order.approvedAt ?? order.createdAt);
  if (!ms) return "";
  return toInputDate(new Date(ms));
}

function founderApprovedOrderInRange(
  order: Order,
  filter: FounderDateFilter
): boolean {
  const range = resolveFounderDateRange(filter);
  if (!range) return true;
  const day = orderApprovedDayKey(order);
  if (!day) return false;
  return day >= range.from && day <= range.to;
}

function founderApprovedOrdersForFilter(
  filter: FounderDateFilter
): Order[] {
  return loadOrders().filter(
    (o) => !isInWebQueue(o) && founderApprovedOrderInRange(o, filter)
  );
}

/** Approved order list statuses (same tabs as Approved → Order List). */
export function buildFounderApprovedOrderSummary(
  filter: FounderDateFilter = DEFAULT_FOUNDER_DATE_FILTER
): FounderApprovedSummaryItem[] {
  const orders = founderApprovedOrdersForFilter(filter);

  return ORDER_LIST_TABS.map((tab) => ({
    key: tab.key,
    label: ORDER_STATUS_LABELS[tab.key] ?? tab.label,
    count: orders.filter((o) => o.status === tab.key).length,
  }));
}
