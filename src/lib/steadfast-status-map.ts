import type { OrderStatus } from "./orders-store";

/**
 * Map Steadfast `delivery_status` → Approved Order List tab status.
 * @see https://docs.google.com/document/d/e/2PACX-1vTi0sTyR353xu1AK0nR8E_WKe5onCkUXGEf8ch8uoJy9qxGfgGnboSIkNosjQ0OOdXkJhgGuAsWxnIh/pub
 */
export function mapSteadfastDeliveryStatusToOrderStatus(
  deliveryStatus: string
): OrderStatus | null {
  const s = deliveryStatus.toLowerCase().trim();
  if (!s) return null;

  if (s === "delivered" || s === "delivered_approval_pending") {
    return "delivered";
  }

  if (
    s === "partial_delivered" ||
    s === "partial_delivered_approval_pending"
  ) {
    return "partial";
  }

  if (s === "cancelled" || s === "cancelled_approval_pending") {
    return "cancelled";
  }

  if (
    s.includes("return") &&
    (s.includes("pending") || s.includes("approval"))
  ) {
    return "pending_return";
  }

  if (s === "returned" || (s.includes("return") && !s.includes("partial"))) {
    return "returned";
  }

  if (s === "pending_cancel" || s.includes("cancel") && s.includes("pending")) {
    return "pending_cancel";
  }

  /** At courier / in transit — not delivered yet */
  if (s === "in_review" || s === "hold") {
    return "rts";
  }

  /**
   * Steadfast `pending` = consignment not delivered yet (usually out for delivery)
   */
  if (s === "pending") {
    return "shipped";
  }

  if (s === "unknown" || s === "unknown_approval_pending") {
    return "shipped";
  }

  return null;
}

/** Panel status right after manual courier API push (before auto-sync). */
export function statusAfterCourierPush(current: OrderStatus): OrderStatus {
  if (current === "pending") return "rts";
  if (current === "rts") return "rts";
  return current;
}
