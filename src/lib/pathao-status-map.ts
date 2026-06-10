import type { OrderStatus } from "./orders-store";

/** Map Pathao order_status / slug → Approved Order List tab */
export function mapPathaoOrderStatusToOrderStatus(
  status: string
): OrderStatus | null {
  const raw = status.trim();
  const s = raw
    .toLowerCase()
    .replace(/\./g, "_")
    .replace(/-/g, "_")
    .replace(/\s+/g, "_");

  if (!s) return null;

  if (
    s === "delivered" ||
    s === "order_delivered" ||
    (s.includes("delivered") && !s.includes("partial") && !s.includes("failed"))
  ) {
    return "delivered";
  }

  if (s.includes("partial")) return "partial";

  if (
    s.includes("cancelled") ||
    s.includes("pickup_cancelled") ||
    s === "pickup_failed"
  ) {
    return "cancelled";
  }

  // Return pipeline states should stay in "pending_return" until truly returned.
  if (
    (s.includes("return") && s.includes("pending")) ||
    (s.includes("return") && s.includes("processing")) ||
    s.includes("return_in_progress") ||
    s.includes("waiting_for_return")
  ) {
    return "pending_return";
  }

  if (s.includes("delivery_failed") || s.includes("on_hold")) {
    return "pending_return";
  }

  if (
    s.includes("returned") ||
    s.includes("paid_return") ||
    (s.includes("return") && !s.includes("pending"))
  ) {
    return "returned";
  }

  if (
    s.includes("in_transit") ||
    s.includes("sorting") ||
    s.includes("last_mile") ||
    s.includes("assigned_for_delivery") ||
    s.includes("received_at")
  ) {
    return "shipped";
  }

  if (
    s.includes("pending") ||
    s.includes("pickup") ||
    s.includes("picked") ||
    s.includes("created") ||
    s.includes("assigned_for_pickup") ||
    s.includes("exchange")
  ) {
    return "rts";
  }

  return null;
}
