import type { Order } from "./orders-store";
import {
  getDeliveryMethod,
  resolveDeliveryMethodId,
  type DeliveryMethodType,
} from "./delivery-methods-store";

function normalizeStatus(raw: string): string {
  return raw
    .trim()
    .toLowerCase()
    .replace(/\./g, "_")
    .replace(/-/g, "_")
    .replace(/\s+/g, "_");
}

function resolveCourierType(
  order: Pick<Order, "deliveryMethodId" | "courier" | "trackingId" | "courierConsignmentId">
): DeliveryMethodType | null {
  const method = getDeliveryMethod(
    resolveDeliveryMethodId(order.deliveryMethodId ?? order.courier)
  );
  if (method?.type && method.type !== "others") return method.type;
  const label = (order.courier ?? "").toLowerCase();
  if (label.includes("steadfast")) return "steadfast";
  if (label.includes("pathao")) return "pathao";
  if (label.includes("carrybee")) return "carrybee";
  return null;
}

/** Courier API / webhook status → delivery rider picked up parcel for last-mile */
export function inferCourierRiderAssigned(
  courierType: DeliveryMethodType | null,
  courierStatus?: string
): boolean {
  const s = normalizeStatus(courierStatus ?? "");
  if (!s) return false;

  if (
    s.includes("no_rider") ||
    s.includes("rider_not") ||
    s.includes("unassigned")
  ) {
    return false;
  }

  if (
    s.includes("assigned_for_delivery") ||
    s.includes("assigned_for_pickup") ||
    s.includes("assigned_for")
  ) {
    return s.includes("delivery") || s.includes("assigned_for_delivery");
  }

  if (
    s.includes("last_mile") ||
    s.includes("out_for_delivery") ||
    s.includes("on_the_way") ||
    s.includes("picked_up") ||
    s.includes("pickedup")
  ) {
    return true;
  }

  if (s.includes("delivered") || s.includes("partial_delivered")) {
    return true;
  }

  if (courierType === "steadfast") {
    if (s === "pending" || s.includes("partial")) return true;
    if (s === "in_review" || s === "hold" || s.includes("cancel")) return false;
    return false;
  }

  if (courierType === "carrybee") {
    if (
      s.includes("assigned_for_delivery") ||
      s.includes("order_assigned_for_delivery")
    ) {
      return true;
    }
    if (s.includes("in_transit") || s === "in_transit") return true;
    if (
      s.includes("pending") ||
      s.includes("pickup") ||
      s.includes("picked") ||
      s.includes("created") ||
      s.includes("exchange") ||
      s.includes("sorting") ||
      s.includes("warehouse")
    ) {
      return false;
    }
    if (s.includes("assigned") && s.includes("delivery")) return true;
    return false;
  }

  if (courierType === "pathao") {
    if (s.includes("delivered") || s.includes("picked")) return true;
    if (s.includes("assigned") || s.includes("started")) return true;
    return false;
  }

  if (s.includes("in_transit") || s.includes("shipped")) return true;
  return false;
}

export function isCourierDeliveryRiderAssigned(
  order: Pick<
    Order,
    | "courierStatus"
    | "courierRiderAssigned"
    | "deliveryMethodId"
    | "courier"
    | "trackingId"
    | "courierConsignmentId"
  >
): boolean {
  if (order.courierRiderAssigned === true) return true;
  if (order.courierRiderAssigned === false) return false;
  const type = resolveCourierType(order);
  return inferCourierRiderAssigned(type, order.courierStatus);
}

export function getCourierRiderStatusLabel(
  order: Pick<
    Order,
    | "courierStatus"
    | "courierRiderAssigned"
    | "courierRiderName"
    | "deliveryMethodId"
    | "courier"
    | "trackingId"
    | "courierConsignmentId"
  >
): string {
  if (order.courierRiderName?.trim()) {
    return `Rider: ${order.courierRiderName.trim()}`;
  }
  return isCourierDeliveryRiderAssigned(order)
    ? "Rider assigned"
    : "No rider assigned yet";
}

/** Webhook / sync: persist rider flag when courier event implies assignment */
export function riderAssignedPatchFromCourierStatus(
  courierType: DeliveryMethodType | null,
  courierStatus: string
): { courierRiderAssigned: boolean; courierRiderName?: string } {
  const assigned = inferCourierRiderAssigned(courierType, courierStatus);
  return { courierRiderAssigned: assigned };
}
