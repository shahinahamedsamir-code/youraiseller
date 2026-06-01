import type { Order, WebDisplayStatus } from "./orders-store";
import { isWooOrderStatusSyncEnabled } from "./woo-sync-config";

/** Web / WooCommerce-sourced order (not yet split to a separate approved row). */
export function isWebSourceOrder(o: Pick<Order, "source" | "wooOrderId" | "id">): boolean {
  return o.source === "web" || o.wooOrderId != null || o.id.startsWith("WO-");
}

/** Whether a synced Woo order should appear on Web Order List. */
export function shouldStayInWebQueueAfterWooSync(
  prev: Pick<
    Order,
    "inWebQueue" | "isPreorder" | "webStatus" | "webQueueReleased"
  >,
  nextWebStatus?: WebDisplayStatus
): boolean {
  if (prev.webQueueReleased) return false;
  if (prev.isPreorder) return false;
  const ws = nextWebStatus ?? prev.webStatus ?? "pending";
  if (ws === "complete" || ws === "cancelled") return false;
  return true;
}

/** Still on Web Order List — not promoted to Approved → Pending. */
export function isInWebQueue(o: Order): boolean {
  if (!isWebSourceOrder(o)) return false;
  if (o.webQueueReleased) return false;
  if (o.isPreorder || o.status === "preorder") return false;
  return shouldStayInWebQueueAfterWooSync(o, o.webStatus);
}

export function isApprovedPendingVisible(o: Order): boolean {
  if (o.status !== "pending") return true;
  return !isInWebQueue(o);
}

/** Panel statuses that WooCommerce live sync must not overwrite */
export const WOO_SYNC_IMMUNE_WEB_STATUSES: WebDisplayStatus[] = [
  "on_hold",
  "good_no_response",
  "no_response",
  "incomplete",
  "cancelled",
  "complete",
];

/** Keep staff web status when Woo order is still "processing" in the store */
export function resolveWebStatusAfterWooSync(
  prev: Pick<Order, "webStatus" | "webStatusStaffSetAt">,
  incoming?: WebDisplayStatus
): WebDisplayStatus {
  if (!isWooOrderStatusSyncEnabled()) {
    return prev.webStatus ?? "processing";
  }
  if (prev.webStatus === "complete") return "complete";
  if (prev.webStatusStaffSetAt && prev.webStatus) return prev.webStatus;
  if (
    prev.webStatus &&
    WOO_SYNC_IMMUNE_WEB_STATUSES.includes(prev.webStatus)
  ) {
    return prev.webStatus;
  }
  return incoming ?? prev.webStatus ?? "processing";
}
