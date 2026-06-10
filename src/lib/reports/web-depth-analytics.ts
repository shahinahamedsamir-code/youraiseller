import { mockBlocked } from "@/lib/mock-web-orders";
import type { Order } from "@/lib/orders-store";
import { normalizePhone } from "@/lib/web-customer-stats";

export type WebSourceMix = "woocommerce" | "manual_web" | "other_web";

export function classifyWebOrderSource(order: Order): WebSourceMix {
  if (order.wooOrderId != null) return "woocommerce";
  if (order.source === "web" || order.id.startsWith("WO-")) return "manual_web";
  return "other_web";
}

export const WEB_SOURCE_LABELS: Record<WebSourceMix, string> = {
  woocommerce: "WooCommerce",
  manual_web: "Manual / Panel Web",
  other_web: "Other Web",
};

export type WebSourceMixRow = {
  key: WebSourceMix;
  name: string;
  count: number;
  revenue: number;
};

export function buildWebSourceMix(orders: Order[]): WebSourceMixRow[] {
  const map = new Map<WebSourceMix, { count: number; revenue: number }>();
  for (const order of orders) {
    const key = classifyWebOrderSource(order);
    const row = map.get(key) ?? { count: 0, revenue: 0 };
    row.count += 1;
    if (!["cancelled", "returned", "lost"].includes(order.status)) {
      row.revenue += order.total;
    }
    map.set(key, row);
  }
  return (["woocommerce", "manual_web", "other_web"] as WebSourceMix[])
    .map((key) => ({
      key,
      name: WEB_SOURCE_LABELS[key],
      count: map.get(key)?.count ?? 0,
      revenue: map.get(key)?.revenue ?? 0,
    }))
    .filter((row) => row.count > 0);
}

export type BlockListRow = {
  id: string;
  type: string;
  value: string;
  reason: string;
  date: string;
  matchedOrders: number;
};

export function buildBlockListReport(orders: Order[]): {
  rows: BlockListRow[];
  totalBlocks: number;
  phoneBlocks: number;
  matchedInPeriod: number;
} {
  const periodPhones = new Set(
    orders.map((o) => normalizePhone(o.phone)).filter(Boolean)
  );

  const rows = mockBlocked.map((block) => {
    const valueNorm =
      block.type === "Phone" ? normalizePhone(block.value) : block.value.trim();
    let matchedOrders = 0;
    if (block.type === "Phone" && valueNorm) {
      matchedOrders = orders.filter((o) => normalizePhone(o.phone) === valueNorm).length;
    }
    return {
      id: block.id,
      type: block.type,
      value: block.value,
      reason: block.reason,
      date: block.date,
      matchedOrders,
    };
  });

  const matchedInPeriod = rows.filter(
    (row) =>
      row.type === "Phone" &&
      row.matchedOrders > 0 &&
      periodPhones.has(normalizePhone(row.value))
  ).length;

  return {
    rows,
    totalBlocks: rows.length,
    phoneBlocks: rows.filter((r) => r.type === "Phone").length,
    matchedInPeriod,
  };
}
