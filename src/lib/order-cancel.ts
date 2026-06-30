import {
  appendOrderActivity,
  getOrder,
  updateOrder,
  type Order,
  type OrderStatus,
} from "./orders-store";
import { increaseStock, getProduct } from "./inventory-store";
import { getSessionUser } from "./dev-users";
import { createActivityEntry } from "./order-activity";

export type CancelStockHandling = "automatic" | "restock" | "unchanged";

export const CANCEL_REASON_OPTIONS: { value: string; label: string }[] = [
  { value: "customer_request", label: "Customer request" },
  { value: "wrong_product", label: "Wrong product / order mistake" },
  { value: "duplicate_order", label: "Duplicate order" },
  { value: "out_of_stock", label: "Out of stock" },
  { value: "payment_issue", label: "Payment issue" },
  { value: "courier_issue", label: "Courier / delivery issue" },
  { value: "fraud_risk", label: "Fraud / risk" },
  { value: "other", label: "Other" },
];

export const CANCEL_STOCK_OPTIONS: {
  value: CancelStockHandling;
  label: string;
  hint: string;
}[] = [
  {
    value: "automatic",
    label: "Automatic",
    hint: "Restock if stock was deducted (RTS or later)",
  },
  {
    value: "restock",
    label: "Add back to stock",
    hint: "Return all line items to inventory",
  },
  {
    value: "unchanged",
    label: "Leave stock unchanged",
    hint: "Do not adjust inventory",
  },
];

/** Statuses where order creation flow already reserved inventory */
const STATUSES_AFTER_STOCK_RESERVE: OrderStatus[] = [
  "rts",
  "shipped",
  "delivered",
  "partial",
  "pending_return",
  "returned",
  "pending_cancel",
];

export function orderHadStockReserved(order: Order): boolean {
  // Explicitly released already (returned/cancelled put the stock back) — the
  // order no longer holds any stock, so never restock it again.
  if (order.stockReserved === false) return false;
  if (order.stockReserved) return true;
  if (STATUSES_AFTER_STOCK_RESERVE.includes(order.status)) return true;
  return (
    order.activityLog?.some(
      (a) =>
        a.title === "Approved — moved to RTS" ||
        a.title.includes("moved to RTS")
    ) ?? false
  );
}

function shouldRestockOnCancel(
  order: Order,
  handling: CancelStockHandling
): boolean {
  if (order.stockRestoredOnCancel) return false;
  if (handling === "unchanged") return false;
  if (handling === "restock") return true;
  return orderHadStockReserved(order);
}

export function isValidCancelReason(value: string | undefined): boolean {
  return !!value?.trim();
}

function reasonLabel(value: string): string {
  return (
    CANCEL_REASON_OPTIONS.find((r) => r.value === value)?.label ?? value.trim()
  );
}

export type CancelOrderResult = {
  ok: boolean;
  message: string;
  restockedLines: number;
};

export function cancelApprovedOrder(params: {
  orderId: string;
  reason?: string;
  note?: string;
  stockHandling: CancelStockHandling;
}): CancelOrderResult {
  if (!isValidCancelReason(params.reason)) {
    return {
      ok: false,
      message: "Cancel reason is required — select one from the list",
      restockedLines: 0,
    };
  }

  const order = getOrder(params.orderId);
  if (!order) {
    return { ok: false, message: "Order not found", restockedLines: 0 };
  }
  if (order.status === "cancelled") {
    return { ok: false, message: "Order is already cancelled", restockedLines: 0 };
  }
  if (order.status === "delivered") {
    return {
      ok: false,
      message: "Delivered orders cannot be cancelled from here",
      restockedLines: 0,
    };
  }

  const doRestock = shouldRestockOnCancel(order, params.stockHandling);
  let restockedLines = 0;
  const stockNotes: string[] = [];

  if (doRestock) {
    for (const line of order.items) {
      const product = getProduct(line.productId);
      if (!product?.manageStock) continue;
      try {
        increaseStock({
          productId: line.productId,
          qty: line.qty,
          reason: "Order cancelled",
          note: `Restock · ${order.id} · ${line.productCode} x${line.qty}`,
        });
        restockedLines++;
        stockNotes.push(`${line.productName} (+${line.qty})`);
      } catch {
        stockNotes.push(`${line.productName} (failed +${line.qty})`);
      }
    }
  }

  const reasonText = reasonLabel(params.reason ?? "");
  const noteText = params.note?.trim();
  const cancelChunk = noteText
    ? `Cancel: ${reasonText} — ${noteText}`
    : `Cancel: ${reasonText}`;
  const nextNote = order.note?.trim()
    ? `${order.note.trim()}\n${cancelChunk}`
    : cancelChunk;

  const actor = getSessionUser()?.name ?? "Staff";
  const patch: Parameters<typeof updateOrder>[1] = {
    status: "cancelled",
    note: nextNote,
    cancelReason: params.reason?.trim() || undefined,
    cancelNote: noteText || undefined,
    stockRestoredOnCancel: doRestock && restockedLines > 0,
    // Once put back, the order no longer holds stock — keep the flag in sync so
    // nothing double-restores it later.
    ...(restockedLines > 0 ? { stockReserved: false } : {}),
  };

  if (order.source === "web" || order.wooOrderId != null) {
    patch.webStatus = "cancelled";
    patch.inWebQueue = false;
  }

  const updated = updateOrder(params.orderId, patch);
  if (!updated) {
    return { ok: false, message: "Could not update order", restockedLines: 0 };
  }

  // Cancel goes through updateOrder (not updateOrderStatus), so push the
  // cancelled status to WooCommerce here too. Fire-and-forget.
  if (updated.wooOrderId != null) {
    void import("./woocommerce-order-sync")
      .then((m) => m.pushWooOrderStatus(updated))
      .catch(() => {});
  }

  const stockDetail = doRestock
    ? restockedLines > 0
      ? `Inventory restocked (${restockedLines} line(s)): ${stockNotes.join(", ")}`
      : "No managed-stock products to restock"
    : "Stock left unchanged";

  appendOrderActivity(
    params.orderId,
    createActivityEntry({
      type: "status",
      title: "Order cancelled",
      detail: `${reasonText}${noteText ? ` · ${noteText}` : ""} · ${stockDetail}`,
      actor,
    })
  );

  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("youraiseller-data-updated"));
  }

  return {
    ok: true,
    message:
      restockedLines > 0
        ? `Cancelled · ${restockedLines} product line(s) restocked to inventory`
        : "Order cancelled",
    restockedLines,
  };
}
