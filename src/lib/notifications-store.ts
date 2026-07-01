"use client";

import { getInventoryStats, getNegativeStockProducts } from "@/lib/inventory-store";
import { loadOrders } from "@/lib/orders-store";
import { parseOrderDate } from "@/lib/reports/report-utils";
import {
  getWebOrdersProcessingCount,
  getWebOrderTabCounts,
} from "@/lib/web-order-counts";
import { getWebOrdersFromStore } from "@/lib/woocommerce-order-sync";
import { getSessionUser } from "@/lib/dev-users";
import { daysUntilPlanExpiry } from "@/lib/subscription-period";

export type NotifLevel = "urgent" | "warning" | "info";
export type NotifIcon =
  | "stock"
  | "shipping"
  | "order"
  | "incomplete"
  | "plan"
  | "sparkles";

export type AppNotification = {
  /** Stable id — read-state is tracked per key. */
  key: string;
  level: NotifLevel;
  icon: NotifIcon;
  title: string;
  subtitle?: string;
  /** Item count — also used so a growing count re-marks the item unread. */
  count?: number;
  href: string;
};

const SEEN_KEY = "notifications-seen-v1";
export const NOTIFICATIONS_UPDATED = "youraiseller-notifications-updated";

const DAY_MS = 24 * 60 * 60 * 1000;

/** Builds the current live notifications from local stores. */
export function buildAppNotifications(opts?: {
  latestVersion?: string;
}): AppNotification[] {
  const list: AppNotification[] = [];

  // What's New — newest changelog version the seller hasn't opened yet.
  if (opts?.latestVersion) {
    const seen =
      typeof window !== "undefined"
        ? localStorage.getItem("whatsnew-seen-version")
        : null;
    if (seen !== opts.latestVersion) {
      list.push({
        key: `whatsnew:${opts.latestVersion}`,
        level: "info",
        icon: "sparkles",
        title: "New update available",
        subtitle: `Version ${opts.latestVersion} — see what's new`,
        href: "/dashboard/whats-new",
      });
    }
  }

  const user = getSessionUser();

  // Plan expiry (owners only).
  if (user && !user.parentAccountId) {
    const days = daysUntilPlanExpiry(user.planExpiresAt);
    if (days !== null && days <= 7) {
      list.push({
        key: "plan-expiry",
        level: days <= 2 ? "urgent" : "warning",
        icon: "plan",
        title:
          days < 0
            ? "Your plan has expired"
            : days === 0
              ? "Your plan expires today"
              : `Plan expires in ${days} day${days === 1 ? "" : "s"}`,
        subtitle: "Renew now to keep full access",
        href: "/dashboard/billing-limit",
      });
    }
  }

  // Inventory alerts.
  try {
    const inv = getInventoryStats();
    const negative = getNegativeStockProducts().length;
    if (negative > 0) {
      list.push({
        key: "stock-negative",
        level: "urgent",
        icon: "stock",
        title: "Negative stock",
        subtitle: `${negative} product${negative === 1 ? "" : "s"} below zero`,
        count: negative,
        href: "/dashboard/inventory",
      });
    }
    if (inv.outOfStock > 0) {
      list.push({
        key: "stock-out",
        level: "urgent",
        icon: "stock",
        title: "Out of stock",
        subtitle: `${inv.outOfStock} product${inv.outOfStock === 1 ? "" : "s"} sold out`,
        count: inv.outOfStock,
        href: "/dashboard/inventory",
      });
    }
    if (inv.lowStock > 0) {
      list.push({
        key: "stock-low",
        level: "warning",
        icon: "stock",
        title: "Low stock products",
        subtitle: `${inv.lowStock} product${inv.lowStock === 1 ? "" : "s"} near the alert level`,
        count: inv.lowStock,
        href: "/dashboard/inventory",
      });
    }
  } catch {
    // inventory store not ready — skip
  }

  // Web orders needing action + incomplete captures.
  try {
    const web = getWebOrdersFromStore();
    const processing = getWebOrdersProcessingCount(web);
    if (processing > 0) {
      list.push({
        key: "web-processing",
        level: "info",
        icon: "order",
        title: "Web orders need action",
        subtitle: `${processing} order${processing === 1 ? "" : "s"} waiting to be processed`,
        count: processing,
        href: "/dashboard/web-orders",
      });
    }
    const tabs = getWebOrderTabCounts(web);
    const incomplete = tabs.incomplete ?? 0;
    if (incomplete > 0) {
      list.push({
        key: "web-incomplete",
        level: "warning",
        icon: "incomplete",
        title: "Incomplete orders",
        subtitle: `${incomplete} customer${incomplete === 1 ? "" : "s"} didn't finish checkout`,
        count: incomplete,
        href: "/dashboard/web-orders?tab=incomplete",
      });
    }
  } catch {
    // web order store not ready — skip
  }

  // Shipped 15+ days (aging shipments still not delivered).
  try {
    const now = Date.now();
    const shipped = loadOrders({ status: "shipped" });
    const stuck = shipped.filter((o) => {
      const d = parseOrderDate(o);
      if (!d) return false;
      return Math.floor((now - d.getTime()) / DAY_MS) >= 15;
    }).length;
    if (stuck > 0) {
      list.push({
        key: "shipped-aging",
        level: "warning",
        icon: "shipping",
        title: "Shipped 15+ days",
        subtitle: `${stuck} shipment${stuck === 1 ? "" : "s"} not delivered yet — follow up`,
        count: stuck,
        href: "/dashboard/orders?status=shipped",
      });
    }
  } catch {
    // orders store not ready — skip
  }

  // Urgent first, then warning, then info.
  const rank: Record<NotifLevel, number> = { urgent: 0, warning: 1, info: 2 };
  return list.sort((a, b) => rank[a.level] - rank[b.level]);
}

type SeenMap = Record<string, number>;

export function loadSeen(): SeenMap {
  if (typeof window === "undefined") return {};
  try {
    const raw = localStorage.getItem(SEEN_KEY);
    return raw ? (JSON.parse(raw) as SeenMap) : {};
  } catch {
    return {};
  }
}

/** A notification is unread if never seen, or its count grew since last seen. */
export function isUnread(seen: SeenMap, n: AppNotification): boolean {
  const prev = seen[n.key];
  if (prev === undefined) return true;
  return prev < (n.count ?? 1);
}

export function unreadCount(notifs: AppNotification[], seen: SeenMap): number {
  return notifs.filter((n) => isUnread(seen, n)).length;
}

export function urgentCount(notifs: AppNotification[]): number {
  return notifs.filter((n) => n.level === "urgent").length;
}

/** Mark everything currently shown as read (stores each key's current count). */
export function markAllRead(notifs: AppNotification[]): void {
  if (typeof window === "undefined") return;
  const map: SeenMap = {};
  for (const n of notifs) map[n.key] = n.count ?? 1;
  localStorage.setItem(SEEN_KEY, JSON.stringify(map));
  window.dispatchEvent(new Event(NOTIFICATIONS_UPDATED));
}

/** Mark a single notification read (used when the seller opens it). */
export function markRead(notif: AppNotification): void {
  if (typeof window === "undefined") return;
  const seen = loadSeen();
  seen[notif.key] = notif.count ?? 1;
  localStorage.setItem(SEEN_KEY, JSON.stringify(seen));
  window.dispatchEvent(new Event(NOTIFICATIONS_UPDATED));
}
