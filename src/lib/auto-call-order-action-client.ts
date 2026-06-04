import type { AutoCallKeyOrderAction } from "./auto-call-key-actions";
import { buildAutoCallOrderTags } from "./auto-call-order-tags";
import { autoCallKeyDigit } from "./auto-call-response-codes";
import type { AutoCallAccount, AutoCallLogRow } from "./auto-call-types";
import {
  getOrder,
  promoteWebOrderToApproved,
  updateOrder,
  type Order,
} from "./orders-store";

function orderNeedsAutoCallAction(
  order: Order,
  action: AutoCallKeyOrderAction
): boolean {
  switch (action) {
    case "none":
    case "stay_processing":
      return false;
    case "approve_pending":
      return order.inWebQueue !== false || order.webStatus !== "complete";
    case "approve_rts":
      return order.status !== "rts" || order.inWebQueue !== false;
    case "web_cancel":
      return order.webStatus !== "cancelled";
    case "web_no_response":
      return order.webStatus !== "no_response";
    case "web_on_hold":
      return order.webStatus !== "on_hold";
    default:
      return false;
  }
}

export function applyAutoCallOrderActionClient(log: AutoCallLogRow): boolean {
  if (!log.orderId || log.orderId === "test" || log.orderId === "unknown") {
    return false;
  }
  if (log.status !== "completed") return false;

  const action = log.orderAction;
  if (!action || action === "none" || action === "stay_processing") return false;

  const order = getOrder(log.orderId);
  if (!order || !orderNeedsAutoCallAction(order, action)) return false;

  const digit = autoCallKeyDigit(log.responseCode) ?? 0;
  const tags = buildAutoCallOrderTags(action, digit, order.tags);
  const ts = new Date().toISOString();

  switch (action) {
    case "approve_pending":
      promoteWebOrderToApproved(log.orderId, {
        tags,
        webStatusStaffSetAt: ts,
      });
      return true;
    case "approve_rts":
      promoteWebOrderToApproved(log.orderId, { tags, webStatusStaffSetAt: ts });
      updateOrder(log.orderId, { status: "rts", tags });
      return true;
    case "web_cancel":
      updateOrder(log.orderId, {
        webStatus: "cancelled",
        status: "cancelled",
        tags,
        webStatusStaffSetAt: ts,
      });
      return true;
    case "web_no_response":
      updateOrder(log.orderId, {
        webStatus: "no_response",
        tags,
        webStatusStaffSetAt: ts,
      });
      return true;
    case "web_on_hold":
      updateOrder(log.orderId, {
        webStatus: "on_hold",
        tags,
        webStatusStaffSetAt: ts,
      });
      return true;
    default:
      return false;
  }
}

/** Apply configured routing on this browser + push to server via orders-store. */
export function syncAutoCallOrderActionsClient(account: AutoCallAccount): number {
  let applied = 0;
  for (const log of account.logs) {
    if (applyAutoCallOrderActionClient(log)) applied += 1;
  }
  return applied;
}
