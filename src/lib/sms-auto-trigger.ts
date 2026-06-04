"use client";

import { getSellerStorageScope } from "./seller-storage";
import type { Order } from "./orders-store";
import { isInWebQueue } from "./web-order-queue";
import { matchesWebOrderTab } from "./web-order-tabs";

export type AutoSmsRuleId =
  | "new_order_created"
  | "new_order_edited"
  | "new_order_shipped"
  | "preorder_created"
  | "preorder_pending"
  | "web_received"
  | "web_reminder"
  | "web_advance";

function orderPayload(
  order: Pick<
    Order,
    "id" | "invoiceNumber" | "customerName" | "phone" | "total" | "wooNumber" | "wooOrderId"
  >
) {
  return {
    id: order.id,
    invoiceNumber: order.invoiceNumber,
    customerName: order.customerName,
    phone: order.phone,
    total: order.total,
    wooNumber: order.wooNumber,
    wooOrderId: order.wooOrderId,
  };
}

const SKIP_LABELS: Record<string, string> = {
  rule_disabled: "This SMS rule is turned off in Auto SMS settings.",
  rule_not_found: "SMS template not found.",
  system_disabled: "SMS system is disabled by admin.",
};

function smsErrorMessage(json: {
  error?: string;
  skipped?: string;
}): string {
  if (json.error) return json.error;
  if (json.skipped) {
    return SKIP_LABELS[json.skipped] ?? json.skipped;
  }
  return "SMS send failed.";
}

/** Fire-and-forget auto SMS — respects enabled rules + balance on server. */
export function triggerAutoSms(
  ruleId: AutoSmsRuleId,
  order: Pick<
    Order,
    "id" | "invoiceNumber" | "customerName" | "phone" | "total" | "wooNumber" | "wooOrderId"
  >
): void {
  if (typeof window === "undefined") return;
  const scope = getSellerStorageScope();
  if (!scope || !order.phone?.trim()) return;

  void sendOrderRuleSms(ruleId, order).catch(() => {
    /* offline — order save still succeeds */
  });
}

/** Manual or awaited SMS using a saved rule template. */
export async function sendOrderRuleSms(
  ruleId: AutoSmsRuleId,
  order: Pick<
    Order,
    "id" | "invoiceNumber" | "customerName" | "phone" | "total" | "wooNumber" | "wooOrderId"
  >,
  opts?: { manual?: boolean }
): Promise<{ ok: boolean; error?: string; skipped?: string }> {
  if (typeof window === "undefined") {
    return { ok: false, error: "Not available on server." };
  }
  const scope = getSellerStorageScope();
  if (!scope) return { ok: false, error: "Not signed in." };
  if (!order.phone?.trim()) {
    return { ok: false, error: "Customer phone is required." };
  }

  try {
    const res = await fetch("/api/sms/auto-send", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        scope,
        ruleId,
        manual: opts?.manual === true,
        order: orderPayload(order),
      }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      error?: string;
      skipped?: string;
    };

    if (json.ok) {
      const { refreshSmsAccount } = await import("./sms-store");
      await refreshSmsAccount();
      return { ok: true };
    }

    return {
      ok: false,
      error: smsErrorMessage(json),
      skipped: json.skipped,
    };
  } catch {
    return { ok: false, error: "Network error — try again." };
  }
}

function isOrderPreorder(order: Pick<Order, "status" | "isPreorder">): boolean {
  return order.isPreorder || order.status === "preorder";
}

function orderAmountSnapshot(
  order: Pick<Order, "items" | "shippingCharge" | "discount" | "advance">
): string {
  return JSON.stringify({
    items: order.items.map((i) => ({
      productId: i.productId,
      qty: i.qty,
      price: i.price,
    })),
    shippingCharge: order.shippingCharge,
    discount: order.discount,
    advance: order.advance ?? 0,
  });
}

export function shouldTriggerEditOrderSms(
  prev: Order,
  patch: Partial<Order>
): boolean {
  if (patch.status === "shipped" && prev.status !== "shipped") {
    return false;
  }

  const items = patch.items ?? prev.items;
  const shippingCharge = patch.shippingCharge ?? prev.shippingCharge;
  const discount = patch.discount ?? prev.discount;
  const advance =
    patch.advance !== undefined ? patch.advance : prev.advance ?? 0;

  const before = orderAmountSnapshot(prev);
  const after = orderAmountSnapshot({
    ...prev,
    items,
    shippingCharge,
    discount,
    advance,
  });

  return before !== after;
}

/** Web order promoted to Approved → Pending (Create Order). */
export function shouldTriggerNewApprovedOrderSms(
  prev: Order,
  next: Order
): boolean {
  if (isOrderPreorder(next)) return false;
  if (next.status !== "pending") return false;
  return Boolean(prev.inWebQueue && !next.inWebQueue);
}

export function shouldTriggerNewOrderSms(order: Order): boolean {
  if (order.isPreorder || order.status === "preorder") return false;
  if (order.source === "web" && order.inWebQueue) return false;
  return true;
}

/** New web order landed on Web Order List → Processing tab. */
export function shouldTriggerWebReceivedSms(order: Order): boolean {
  if (order.isPreorder || order.status === "preorder") return false;
  if (!isInWebQueue(order)) return false;
  return matchesWebOrderTab(order, "processing");
}

/** New preorder saved to Preorder List. */
export function shouldTriggerPreorderCreatedSms(order: Order): boolean {
  return isOrderPreorder(order);
}

/** Preorder released to Approved Orders → Pending. */
export function shouldTriggerPreorderToPendingSms(
  prev: Order,
  next: Order
): boolean {
  return (
    isOrderPreorder(prev) &&
    !isOrderPreorder(next) &&
    next.status === "pending"
  );
}
