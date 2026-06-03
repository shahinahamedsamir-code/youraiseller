import clsx from "clsx";
import type { Order } from "./orders-store";
import { findOrdersByPhone } from "./orders-store";
import {
  getOrderSourceLabel,
  inferOrderSourceFromOrder,
  orderSourceBadgeClass,
  type OrderSource,
} from "./order-source";

export function getWooCommerceStatus(order: Order): string | undefined {
  const fromSnapshot = order.wooSnapshot?.wcStatus?.trim();
  if (fromSnapshot) return fromSnapshot.replace(/^wc-/, "");
  const tag = order.tags?.find(
    (t) => t !== "WooCommerce" && !t.startsWith("WooCommerce ")
  );
  return tag?.toLowerCase().replace(/^wc-/, "");
}

export function wcStatusBadgeClass(status: string): string {
  const s = status.toLowerCase().replace(/^wc-/, "");
  if (s === "completed" || s === "complete") {
    return "bg-emerald-100 text-emerald-800 ring-emerald-200";
  }
  if (s === "cancelled" || s === "canceled" || s === "failed" || s === "refunded") {
    return "bg-slate-100 text-slate-600 ring-slate-200";
  }
  if (s === "processing") return "bg-sky-100 text-sky-800 ring-sky-200";
  if (s === "on-hold" || s === "onhold") return "bg-amber-100 text-amber-800 ring-amber-200";
  return "bg-yellow-100 text-yellow-800 ring-yellow-200";
}

export function formatWcStatusLabel(status: string): string {
  return status.replace(/^wc-/, "").replace(/-/g, " ");
}

export function getOrderSourceDisplay(order: Order): {
  source: OrderSource;
  label: string;
  badgeClass: string;
} {
  const source = inferOrderSourceFromOrder(order);
  return {
    source,
    label: getOrderSourceLabel(source, order.customOrderSource),
    badgeClass: orderSourceBadgeClass(source),
  };
}

export function findOtherWooOrdersByPhone(
  phone: string,
  excludeOrderId: string
): Order[] {
  return findOrdersByPhone(phone)
    .filter((o) => o.wooOrderId != null && o.id !== excludeOrderId)
    .sort(
      (a, b) =>
        new Date(b.updatedAt || b.createdAt).getTime() -
        new Date(a.updatedAt || a.createdAt).getTime()
    );
}

export function findPriorOrdersByPhone(
  phone: string,
  excludeOrderId: string
): Order[] {
  return findOrdersByPhone(phone)
    .filter((o) => o.id !== excludeOrderId)
    .sort(
      (a, b) =>
        new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
}

export function wcStatusBadgeCls(status: string, extra?: string): string {
  return clsx(
    "inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ring-1",
    wcStatusBadgeClass(status),
    extra
  );
}

export function sourceBadgeCls(source: OrderSource, extra?: string): string {
  return clsx(
    "inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold capitalize ring-1 ring-transparent",
    orderSourceBadgeClass(source),
    extra
  );
}
