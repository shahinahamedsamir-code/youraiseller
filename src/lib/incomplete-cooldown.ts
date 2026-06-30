import type { Order } from "./orders-store";

/** How long to hold off contacting a fresh incomplete lead — the customer may
 *  still be on the checkout page finishing their order. Resets on each capture
 *  ping (so it counts from the customer's last activity). */
export const INCOMPLETE_COOLDOWN_MS = 2 * 60 * 1000;

/** Milliseconds left before it's safe to contact a captured lead (0 = ready). */
export function incompleteCooldownRemainingMs(
  order: Pick<Order, "captureId" | "captureAt">
): number {
  if (!order.captureId || !order.captureAt) return 0;
  const t = new Date(order.captureAt).getTime();
  if (Number.isNaN(t)) return 0;
  const remaining = INCOMPLETE_COOLDOWN_MS - (Date.now() - t);
  return remaining > 0 ? remaining : 0;
}

export function formatCooldown(ms: number): string {
  const total = Math.max(0, Math.ceil(ms / 1000));
  const mm = Math.floor(total / 60);
  const ss = total % 60;
  return `${mm}:${String(ss).padStart(2, "0")}`;
}
