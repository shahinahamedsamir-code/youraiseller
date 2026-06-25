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

/** Start of the current billing period (plan start, else 1st of this month). */
export function periodStartTime(user: DevUser | null): number {
  const startedAt = user?.planStartedAt ? Date.parse(user.planStartedAt) : NaN;
  if (Number.isFinite(startedAt)) return startedAt;
  const d = new Date();
  d.setDate(1);
  d.setHours(0, 0, 0, 0);
  return d.getTime();
}

/** Resolve the active plan's limits from the dev-admin plan config. */
export function getPlanLimits(user: DevUser | null): PlanLimits {
  const config = loadPlanConfigLocal();
  return getPlanDefinition(config, user?.plan ?? "basic").limits;
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
  const limit = getPlanLimits(u)[kind];
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
