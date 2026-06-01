import type { OrderStatus } from "./orders-store";

/** Map Carrybee transfer_status or webhook event → panel tab */
export function mapCarrybeeStatusToOrderStatus(status: string): OrderStatus | null {
  const raw = status.trim().toLowerCase();
  const s = raw.replace(/\./g, "_").replace(/-/g, "_");

  if (!s) return null;

  if (s.includes("delivered") && !s.includes("partial") && !s.includes("failed")) {
    return "delivered";
  }
  if (s.includes("partial")) return "partial";
  if (
    s.includes("cancelled") ||
    s.includes("pickup_cancelled") ||
    s.includes("pickup_failed")
  ) {
    return "cancelled";
  }
  if (s.includes("delivery_failed") || s.includes("delivery_on_hold") || s.includes("on_hold")) {
    return "pending_return";
  }
  if (
    s.includes("returned") ||
    s.includes("paid_return") ||
    (s.includes("return") && !s.includes("transit"))
  ) {
    return "returned";
  }
  if (
    s.includes("in_transit") ||
    s.includes("sorting") ||
    s.includes("warehouse") ||
    s.includes("assigned_for_delivery") ||
    s.includes("last_mile") ||
    s.includes("received_at")
  ) {
    return "shipped";
  }
  if (
    s.includes("pending") ||
    s.includes("pickup") ||
    s.includes("picked") ||
    s.includes("created") ||
    s.includes("exchange")
  ) {
    return "rts";
  }

  return null;
}
