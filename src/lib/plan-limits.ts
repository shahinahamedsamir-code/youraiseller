import { getSessionUser, type DevUser } from "./dev-users";
import { loadProducts } from "./inventory-store";
import { loadOrders, type Order } from "./orders-store";
import { loadTeamUsers } from "./team-users-store";
import { loadPlanConfigLocal } from "./plan-config-client";
import { getPlanDefinition } from "./plan-config-utils";
import type { PlanLimits } from "./plan-config-types";

export type LimitKind = "products" | "orders" | "users";

/** Web/WooCommerce orders are not counted against the plan order limit. */
export function isWebOrder(order: Order): boolean {
  return (
    order.source === "web" ||
    order.wooOrderId != null ||
    order.id.startsWith("WO-")
  );
}

/** Order createdAt → epoch ms (handles the human-readable date format). */
export function parseOrderTime(order: Order): number | null {
  const direct = Date.parse(order.createdAt);
  if (Number.isFinite(direct)) return direct;
  const cleaned = order.createdAt.replace(/,\s*/g, " ");
  const fallback = Date.parse(cleaned);
  return Number.isFinite(fallback) ? fallback : null;
}

/**
 * Start of the CURRENT monthly cycle, anchored to the plan's billing day.
 * The order limit resets every month on the same day the plan started (so a
 * renewal, early renewal, or multi-month plan all get a fresh monthly quota).
 * Falls back to the 1st of the month when no plan start date is known.
 */
export function periodStartTime(user: DevUser | null): number {
  const now = new Date();
  const started = user?.planStartedAt ? new Date(Date.parse(user.planStartedAt)) : null;
  const billingDay =
    started && !Number.isNaN(started.getTime()) ? started.getDate() : 1;

  // Clamp the billing day to the current month's length (e.g. 31 → 28/30).
  const daysThisMonth = new Date(now.getFullYear(), now.getMonth() + 1, 0).getDate();
  const day = Math.min(billingDay, daysThisMonth);

  const start = new Date(now.getFullYear(), now.getMonth(), day, 0, 0, 0, 0);
  // If this month's billing day hasn't arrived yet, the cycle began last month.
  if (start.getTime() > now.getTime()) {
    start.setMonth(start.getMonth() - 1);
  }
  return start.getTime();
}

/** Resolve the active plan's base limits from the dev-admin plan config. */
export function getPlanLimits(user: DevUser | null): PlanLimits {
  const config = loadPlanConfigLocal();
  return getPlanDefinition(config, user?.plan ?? "basic").limits;
}

/** Taka charged per extra order for the user's plan. */
export function getOrderRateTaka(user: DevUser | null): number {
  const config = loadPlanConfigLocal();
  return getPlanDefinition(config, user?.plan ?? "basic").orderRateTaka;
}

/**
 * Effective limit including purchased quota. For orders this is the plan base
 * plus permanently bought orders plus any boost bought for the current month.
 * A base of 0 means unlimited (purchases are ignored).
 */
export function getEffectiveLimit(kind: LimitKind, user: DevUser | null): number {
  const base = getPlanLimits(user)[kind];
  if (kind !== "orders" || base <= 0) return base;

  const extra = Math.max(0, user?.extraOrderLimit ?? 0);
  const boost = user?.orderBoostThisMonth;
  const boostAmount =
    boost && Date.parse(boost.cycleStart) >= periodStartTime(user)
      ? Math.max(0, boost.amount)
      : 0;
  return base + extra + boostAmount;
}

export function countPlanUsage(user: DevUser | null): {
  products: number;
  orders: number;
  users: number;
} {
  const periodStart = periodStartTime(user);
  return {
    products: loadProducts().filter((p) => p.active !== false).length,
    // Only APPROVED, non-web orders count toward the limit.
    orders: loadOrders().filter((o) => {
      if (!o.approvedAt || isWebOrder(o)) return false;
      const t = parseOrderTime(o);
      return t === null || t >= periodStart;
    }).length,
    users: loadTeamUsers().filter((u) => u.status === "active").length,
  };
}

export type LimitCheck = {
  kind: LimitKind;
  ok: boolean;
  used: number;
  limit: number;
  unlimited: boolean;
};

/**
 * Check whether one more of `kind` can be created under the current plan.
 * A limit of 0 (or less) means unlimited. ok = true when there is room.
 */
export function checkPlanLimit(kind: LimitKind, user?: DevUser | null): LimitCheck {
  const u = user ?? getSessionUser() ?? null;
  const limit = getEffectiveLimit(kind, u);
  const unlimited = !limit || limit <= 0;
  const used = countPlanUsage(u)[kind];
  return { kind, ok: unlimited || used < limit, used, limit, unlimited };
}

export function planLimitMessage(check: LimitCheck): string {
  const label =
    check.kind === "products"
      ? "product"
      : check.kind === "orders"
        ? "monthly order"
        : "team user";
  return `Plan ${label} limit reached (${check.used}/${check.limit}). Upgrade your plan or raise the limit in Billing & Limit to add more.`;
}
