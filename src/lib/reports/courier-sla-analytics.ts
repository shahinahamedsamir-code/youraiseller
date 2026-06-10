import {
  getOrderTimeline,
  parseActivityDate,
} from "@/lib/order-activity";
import { ORDER_STATUS_LABELS } from "@/lib/order-status-tabs";
import type { Order, OrderStatus } from "@/lib/orders-store";

const PICKUP_STATUSES = new Set<OrderStatus>(["rts", "shipped"]);
const DELIVERED_STATUSES = new Set<OrderStatus>(["delivered", "partial"]);

const dayMs = 24 * 60 * 60 * 1000;

function statusLabel(status: OrderStatus): string {
  return ORDER_STATUS_LABELS[status];
}

function findStatusTransitionMs(
  order: Order,
  targets: Set<OrderStatus>
): number | null {
  const timeline = [...getOrderTimeline(order)].sort(
    (a, b) => parseActivityDate(a.at) - parseActivityDate(b.at)
  );

  for (const entry of timeline) {
    if (entry.type !== "status") continue;
    for (const status of targets) {
      const needle = `→ ${statusLabel(status)}`;
      if (entry.title.includes(needle)) {
        const ms = parseActivityDate(entry.at);
        if (ms > 0) return ms;
      }
    }
  }
  return null;
}

function findPickupMs(order: Order): number | null {
  const fromStatus = findStatusTransitionMs(order, PICKUP_STATUSES);
  if (fromStatus) return fromStatus;

  const approvedMs = parseActivityDate(order.approvedAt ?? "");
  if (approvedMs > 0) return approvedMs;

  const timeline = [...getOrderTimeline(order)].sort(
    (a, b) => parseActivityDate(a.at) - parseActivityDate(b.at)
  );
  for (const entry of timeline) {
    if (entry.type === "tracking" || entry.type === "approved") {
      const ms = parseActivityDate(entry.at);
      if (ms > 0) return ms;
    }
  }
  return null;
}

function findDeliveryMs(order: Order): number | null {
  const fromStatus = findStatusTransitionMs(order, DELIVERED_STATUSES);
  if (fromStatus) return fromStatus;

  if (DELIVERED_STATUSES.has(order.status)) {
    const updated = parseActivityDate(order.updatedAt ?? "");
    if (updated > 0) return updated;
  }
  return null;
}

export type CourierSlaRow = {
  orderId: string;
  courier: string;
  pickupAt: string;
  deliveredAt: string;
  days: number;
};

export type CourierSlaSummary = {
  courier: string;
  samples: number;
  avgDays: number;
  minDays: number;
  maxDays: number;
};

export function buildCourierSlaReport(orders: Order[]): {
  rows: CourierSlaRow[];
  byCourier: CourierSlaSummary[];
  avgDays: number;
  measured: number;
  within3Days: number;
  within5Days: number;
} {
  const rows: CourierSlaRow[] = [];

  for (const order of orders) {
    if (!order.courier?.trim() && !order.trackingId?.trim()) continue;
    const pickupMs = findPickupMs(order);
    const deliveryMs = findDeliveryMs(order);
    if (!pickupMs || !deliveryMs || deliveryMs < pickupMs) continue;

    const days = (deliveryMs - pickupMs) / dayMs;
    rows.push({
      orderId: order.id,
      courier: order.courier?.trim() || "Unknown",
      pickupAt: new Date(pickupMs).toLocaleDateString("en-GB"),
      deliveredAt: new Date(deliveryMs).toLocaleDateString("en-GB"),
      days: Math.round(days * 10) / 10,
    });
  }

  rows.sort((a, b) => b.days - a.days);

  const byCourierMap = new Map<string, number[]>();
  for (const row of rows) {
    const list = byCourierMap.get(row.courier) ?? [];
    list.push(row.days);
    byCourierMap.set(row.courier, list);
  }

  const byCourier: CourierSlaSummary[] = [...byCourierMap.entries()]
    .map(([courier, daysList]) => {
      const sum = daysList.reduce((a, b) => a + b, 0);
      return {
        courier,
        samples: daysList.length,
        avgDays: Math.round((sum / daysList.length) * 10) / 10,
        minDays: Math.min(...daysList),
        maxDays: Math.max(...daysList),
      };
    })
    .sort((a, b) => a.avgDays - b.avgDays);

  const allDays = rows.map((r) => r.days);
  const avgDays =
    allDays.length > 0
      ? Math.round((allDays.reduce((a, b) => a + b, 0) / allDays.length) * 10) / 10
      : 0;

  return {
    rows: rows.slice(0, 20),
    byCourier,
    avgDays,
    measured: rows.length,
    within3Days: allDays.filter((d) => d <= 3).length,
    within5Days: allDays.filter((d) => d <= 5).length,
  };
}
