import { promises as fs } from "fs";
import type { AutoCallAccount, AutoCallLogRow } from "./auto-call-types";
import {
  autoCallKeyOrderActionLabel,
  resolveOrderActionForDigit,
  type AutoCallKeyOrderAction,
} from "./auto-call-key-actions";
import { buildAutoCallOrderTags } from "./auto-call-order-tags";
import { autoCallKeyDigit } from "./auto-call-response-codes";
import { sellerDataFile, sellerScopeDir } from "./seller-data-path";

type OrdersFile = {
  orders: Array<Record<string, unknown>>;
};

function ordersPath(scope: string): string {
  return sellerDataFile(scope, "orders.json");
}

function nowLabel(): string {
  return new Date().toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function nextInvoiceId(orders: Array<Record<string, unknown>>): string {
  let max = 1000;
  for (const o of orders) {
    const id = String(o.invoiceNumber ?? o.id ?? "");
    const m = id.match(/(\d+)/);
    if (m) max = Math.max(max, Number(m[1]));
  }
  return `AO-${max + 1}`;
}

function applyActionToOrder(
  order: Record<string, unknown>,
  action: AutoCallKeyOrderAction,
  digit: number
): boolean {
  const ts = new Date().toISOString();
  const label = nowLabel();
  const withAutoCallTags = () => {
    order.tags = buildAutoCallOrderTags(action, digit, order.tags);
  };

  switch (action) {
    case "none":
    case "stay_processing":
      return false;
    case "approve_pending": {
      withAutoCallTags();
      order.status = "pending";
      order.inWebQueue = false;
      order.webQueueReleased = true;
      order.webStatus = "complete";
      order.webStatusStaffSetAt = ts;
      order.updatedAt = label;
      return true;
    }
    case "approve_rts": {
      withAutoCallTags();
      order.status = "rts";
      order.inWebQueue = false;
      order.webQueueReleased = true;
      order.webStatus = "complete";
      order.webStatusStaffSetAt = ts;
      order.approvedAt = label;
      order.updatedAt = label;
      return true;
    }
    case "web_cancel":
      withAutoCallTags();
      order.webStatus = "cancelled";
      order.status = "cancelled";
      order.webStatusStaffSetAt = ts;
      order.updatedAt = label;
      return true;
    case "web_no_response":
      withAutoCallTags();
      order.webStatus = "no_response";
      order.webStatusStaffSetAt = ts;
      order.updatedAt = label;
      return true;
    case "web_on_hold":
      withAutoCallTags();
      order.webStatus = "on_hold";
      order.webStatusStaffSetAt = ts;
      order.updatedAt = label;
      return true;
    default:
      return false;
  }
}

async function loadOrdersFile(scope: string): Promise<OrdersFile | null> {
  try {
    const raw = await fs.readFile(ordersPath(scope), "utf-8");
    const parsed = JSON.parse(raw) as OrdersFile;
    if (!Array.isArray(parsed.orders)) return null;
    return parsed;
  } catch {
    return null;
  }
}

async function saveOrdersFile(scope: string, data: OrdersFile): Promise<void> {
  await fs.mkdir(sellerScopeDir(scope), { recursive: true });
  await fs.writeFile(ordersPath(scope), JSON.stringify(data, null, 2), "utf-8");
}

/** Apply configured order routing when customer pressed a key (server-side). */
export async function applyAutoCallKeyOrderActionForLog(
  scope: string,
  account: AutoCallAccount,
  log: AutoCallLogRow
): Promise<{ applied: boolean; action?: AutoCallKeyOrderAction }> {
  if (log.orderActionApplied) {
    return { applied: false, action: log.orderAction };
  }
  if (log.status !== "completed") return { applied: false };
  if (!log.orderId || log.orderId === "test" || log.orderId === "unknown") {
    return { applied: false };
  }

  const digit = autoCallKeyDigit(log.responseCode);
  if (digit == null) return { applied: false };

  const action = resolveOrderActionForDigit(account.settings.dtmfOptions, digit);
  log.orderAction = action;

  if (action === "none" || action === "stay_processing") {
    log.orderActionApplied = true;
    log.providerMessage = [
      log.providerMessage,
      `Key ${digit} → ${autoCallKeyOrderActionLabel(action)}`,
    ]
      .filter(Boolean)
      .join(" · ");
    return { applied: true, action };
  }

  const file = await loadOrdersFile(scope);
  if (!file) return { applied: false, action };

  const idx = file.orders.findIndex((o) => String(o.id) === log.orderId);
  if (idx === -1) return { applied: false, action };

  const changed = applyActionToOrder(file.orders[idx], action, digit);
  if (changed) {
    if (action === "approve_pending" || action === "approve_rts") {
      if (!String(file.orders[idx].invoiceNumber ?? "").trim()) {
        file.orders[idx].invoiceNumber = nextInvoiceId(file.orders);
      }
    }
    await saveOrdersFile(scope, file);
  }

  log.orderActionApplied = true;
  log.providerMessage = [
    log.providerMessage,
    `Key ${digit} → ${autoCallKeyOrderActionLabel(action)}`,
  ]
    .filter(Boolean)
    .join(" · ");

  return { applied: true, action };
}

const SETTLED_ORDER_STATUSES = [
  "cancelled",
  "delivered",
  "returned",
  "lost",
  "shipped",
  "partial",
  "rts",
];
const SETTLED_WEB_STATUSES = [
  "cancelled",
  "complete",
  "on_hold",
  "no_response",
  "good_no_response",
];

function orderNeedsAutoCallActionServer(
  order: Record<string, unknown>,
  action: AutoCallKeyOrderAction
): boolean {
  // Auto-call only acts on orders still in Processing. Once the call outcome (or
  // the seller) has moved an order to any other status/tab, the reconcile pass
  // must leave it alone — re-applying kept resurrecting a cancelled call-center
  // order back to pending on every poll.
  const status = String(order.status ?? "");
  if (SETTLED_ORDER_STATUSES.includes(status)) return false;
  const webStatus = String(order.webStatus ?? "");
  if (SETTLED_WEB_STATUSES.includes(webStatus)) return false;
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

/** Re-apply routing when log says applied but order file was overwritten (e.g. Woo sync). */
export async function reconcileAutoCallOrderActions(
  scope: string,
  account: AutoCallAccount
): Promise<number> {
  let fixed = 0;

  for (const log of account.logs) {
    if (log.status !== "completed") continue;
    if (!log.orderId || log.orderId === "test" || log.orderId === "unknown") continue;

    const digit = autoCallKeyDigit(log.responseCode);
    if (digit == null) continue;

    const action =
      log.orderAction ?? resolveOrderActionForDigit(account.settings.dtmfOptions, digit);

    if (action === "none" || action === "stay_processing") continue;

    const file = await loadOrdersFile(scope);
    if (!file) continue;

    const order = file.orders.find((o) => String(o.id) === log.orderId);
    if (!order) continue;

    if (!orderNeedsAutoCallActionServer(order, action)) continue;

    log.orderActionApplied = false;
    log.orderAction = action;
    const result = await applyAutoCallKeyOrderActionForLog(scope, account, log);
    if (result.applied) fixed += 1;
  }

  return fixed;
}
