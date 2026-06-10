import { parseActivityDate } from "@/lib/order-activity";
import type { Order } from "@/lib/orders-store";
import type { DateRange, PeriodBounds } from "./report-types";

export function webStatusLabel(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

export function isOperatingAccountingRef(reference?: string): boolean {
  return !reference?.startsWith("LIA-") && !reference?.startsWith("AST-");
}

export function parseOrderDate(order: Order): Date | null {
  const raw = order.createdAt?.trim();
  if (!raw) return null;
  const parsed = Date.parse(raw);
  if (!Number.isNaN(parsed)) return new Date(parsed);
  return null;
}

export function toInputDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function isWithinRange(
  date: Date | null,
  range: DateRange,
  from: string,
  to: string
): boolean {
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

export function parseDateLabel(value?: string): Date | null {
  if (!value) return null;
  const activityMs = parseActivityDate(value);
  if (activityMs > 0) return new Date(activityMs);
  const parsed = Date.parse(value);
  if (!Number.isNaN(parsed)) return new Date(parsed);
  return null;
}

export function asNumber(value: unknown): number {
  const n = typeof value === "number" ? value : Number(value);
  return Number.isFinite(n) ? n : 0;
}

export function formatCompactBdt(value: number): string {
  const abs = Math.abs(value);
  if (abs < 1000) return `৳${Math.round(value).toLocaleString("en-BD")}`;
  const compact = new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 1,
  }).format(value);
  return `৳${compact}`;
}

export function pctChange(current: number, previous: number): number | null {
  if (previous === 0) return null;
  return ((current - previous) / previous) * 100;
}

export function getSelectedPeriodBounds(
  range: DateRange,
  from: string,
  to: string
): PeriodBounds | null {
  const now = new Date();
  const end = to ? new Date(to) : new Date(now);
  end.setHours(23, 59, 59, 999);

  let start: Date;
  if (from) {
    start = new Date(from);
  } else if (range === "today") {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  } else if (range === "week") {
    start = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    start.setDate(start.getDate() - 6);
  } else if (range === "month") {
    start = new Date(now.getFullYear(), now.getMonth(), 1);
  } else {
    return null;
  }
  start.setHours(0, 0, 0, 0);
  return { from: start, to: end };
}

export function getPreviousPeriodBounds(bounds: PeriodBounds): PeriodBounds {
  const span = bounds.to.getTime() - bounds.from.getTime();
  const prevTo = new Date(bounds.from.getTime() - 1);
  const prevFrom = new Date(prevTo.getTime() - span);
  prevFrom.setHours(0, 0, 0, 0);
  return { from: prevFrom, to: prevTo };
}

export function isWithinBounds(date: Date | null, bounds: PeriodBounds | null): boolean {
  if (!bounds) return true;
  if (!date) return false;
  return date >= bounds.from && date <= bounds.to;
}

export function summarizeOrderMetrics(orders: Order[]) {
  const grossSales = orders
    .filter((o) => !["cancelled", "returned", "lost"].includes(o.status))
    .reduce((sum, o) => sum + o.total, 0);
  const delivered = orders.filter(
    (o) => o.status === "delivered" || o.status === "partial"
  ).length;
  const returned = orders.filter((o) => o.status === "returned").length;
  const base = delivered + returned;
  return {
    orders: orders.length,
    grossSales,
    delivered,
    returnRate: base ? (returned / base) * 100 : 0,
  };
}

export function formatDelta(current: number, previous: number, suffix = ""): string {
  const diff = current - previous;
  const sign = diff >= 0 ? "+" : "";
  return `${sign}${suffix === "%" ? diff.toFixed(1) : Math.round(diff)}${suffix}`;
}

export function csvValue(v: string | number): string {
  const s = String(v ?? "");
  if (s.includes(",") || s.includes('"') || s.includes("\n")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

export function formatRangeLabel(
  range: DateRange,
  from: string,
  to: string
): string {
  const parts = [`Range: ${range.toUpperCase()}`];
  if (from) parts.push(`From ${from}`);
  if (to) parts.push(`To ${to}`);
  return parts.join(" · ");
}

export function exportCsv(filename: string, headers: string[], rows: (string | number)[][]) {
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
