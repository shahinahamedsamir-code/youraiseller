import type { Order } from "./orders-store";
import {
  getDeliveryMethod,
  resolveDeliveryMethodId,
  type DeliveryMethodType,
} from "./delivery-methods-store";

function normalizePhoneForPathao(phone: string): string {
  let digits = phone.replace(/\D/g, "");
  if (digits.startsWith("880")) digits = digits.slice(3);
  if (digits.startsWith("88") && digits.length > 11) digits = digits.slice(2);
  return digits;
}

function inferCourierTypeFromLabel(label: string): DeliveryMethodType | null {
  const s = label.toLowerCase();
  if (s.includes("steadfast")) return "steadfast";
  if (s.includes("pathao")) return "pathao";
  if (s.includes("carrybee")) return "carrybee";
  if (s.includes("redx")) return "redx";
  if (s.includes("paperfly")) return "paperfly";
  if (s.includes("ecourier") || s.includes("e-courier")) return "ecourier";
  return null;
}

function isSteadfastTrackingId(id: string): boolean {
  const t = id.trim();
  return /^\d{6,}$/.test(t) || /^SFR[A-Z0-9]+$/i.test(t);
}

/** Carrybee consignment ids look like F0522EZAVM4 (not Steadfast SFR… codes) */
function isCarrybeeConsignmentId(id: string): boolean {
  return /^F\d{4}[A-Z0-9]{4,}$/i.test(id.trim());
}

/** Guess courier from consignment id shape when method/courier name is missing */
function inferCourierTypeFromTrackingId(id: string): DeliveryMethodType | null {
  const t = id.trim();
  if (!t) return null;
  if (isSteadfastTrackingId(t)) return "steadfast";
  if (/^[A-Z]{2}\d{6}[A-Z0-9]+$/i.test(t)) return "pathao";
  if (isCarrybeeConsignmentId(t)) return "carrybee";
  return null;
}

function resolveCourierType(
  order: Pick<Order, "deliveryMethodId" | "courier" | "trackingId" | "courierConsignmentId">
): DeliveryMethodType | null {
  const method = getDeliveryMethod(
    resolveDeliveryMethodId(order.deliveryMethodId ?? order.courier)
  );
  if (method?.type && method.type !== "others") return method.type;
  const fromLabel = inferCourierTypeFromLabel(order.courier ?? "");
  if (fromLabel) return fromLabel;
  const id =
    order.courierConsignmentId?.trim() ||
    order.trackingId?.trim() ||
    "";
  return inferCourierTypeFromTrackingId(id);
}

function buildPanelUrl(
  type: DeliveryMethodType,
  order: Pick<
    Order,
    "trackingId" | "courierConsignmentId" | "deliveryMethodId" | "courier" | "phone"
  >
): string | null {
  switch (type) {
    case "steadfast": {
      const cid =
        getSteadfastConsignmentId(order) ?? getSteadfastTrackingCode(order);
      if (!cid) return null;
      return `https://steadfast.com.bd/user/consignment/${encodeURIComponent(cid)}`;
    }
    case "pathao": {
      const pathaoId =
        order.courierConsignmentId?.trim() || order.trackingId?.trim();
      if (!pathaoId) return null;
      const params = new URLSearchParams({ consignment_id: pathaoId });
      const phone = normalizePhoneForPathao(order.phone ?? "");
      if (phone) params.set("phone", phone);
      return `https://merchant.pathao.com/tracking?${params.toString()}`;
    }
    case "carrybee": {
      const cid = getCarrybeeConsignmentId(order);
      if (!cid || !isCarrybeeConsignmentId(cid)) return null;
      return `https://merchant.carrybee.com/order-track/${encodeURIComponent(cid)}`;
    }
    default:
      return null;
  }
}

/** Order has courier consignment / tracking id saved */
export function orderHasCourierTracking(
  order: Pick<Order, "trackingId" | "courierConsignmentId">
): boolean {
  return !!(order.trackingId?.trim() || order.courierConsignmentId?.trim());
}

/** Carrybee merchant track page uses consignment_id (e.g. F0522EZAVM4) */
export function getCarrybeeConsignmentId(
  order: Pick<Order, "trackingId" | "courierConsignmentId">
): string | null {
  const cid =
    order.courierConsignmentId?.trim() || order.trackingId?.trim() || "";
  if (!cid || !isCarrybeeConsignmentId(cid)) return null;
  return cid;
}

/** Steadfast panel uses numeric consignment_id when available */
export function getSteadfastConsignmentId(
  order: Pick<Order, "trackingId" | "courierConsignmentId">
): string | null {
  const cid = order.courierConsignmentId?.trim();
  if (cid && /^\d+$/.test(cid)) return cid;
  const track = order.trackingId?.trim();
  if (track && /^\d{6,}$/.test(track)) return track;
  return null;
}

/** Steadfast tracking_code (e.g. SFR260522ST3B7BC9EBD) when numeric cid is missing */
export function getSteadfastTrackingCode(
  order: Pick<Order, "trackingId" | "courierConsignmentId">
): string | null {
  for (const raw of [order.trackingId, order.courierConsignmentId]) {
    const t = raw?.trim();
    if (t && /^SFR[A-Z0-9]+$/i.test(t)) return t;
  }
  return null;
}

/** Courier merchant panel / public tracking URL for a consignment */
export function getCourierPanelTrackingUrl(
  order: Pick<
    Order,
    | "trackingId"
    | "courierConsignmentId"
    | "deliveryMethodId"
    | "courier"
    | "phone"
  >
): string | null {
  if (!order.trackingId?.trim() && !order.courierConsignmentId?.trim()) {
    return null;
  }

  const type = resolveCourierType(order);
  if (type) {
    const direct = buildPanelUrl(type, order);
    if (direct) return direct;
  }

  const id =
    order.courierConsignmentId?.trim() || order.trackingId?.trim() || "";
  const inferred = inferCourierTypeFromTrackingId(id);
  if (inferred && inferred !== type) {
    return buildPanelUrl(inferred, order);
  }

  return null;
}

/** Label shown in order list (consignment id preferred for Steadfast) */
export function getCourierTrackingDisplayId(
  order: Pick<Order, "trackingId" | "courierConsignmentId" | "courier" | "deliveryMethodId">
): string | null {
  const type = resolveCourierType(order);
  if (type === "steadfast") {
    return (
      getSteadfastConsignmentId(order) ??
      getSteadfastTrackingCode(order) ??
      order.trackingId?.trim() ??
      null
    );
  }
  if (type === "carrybee") {
    return getCarrybeeConsignmentId(order);
  }
  return (
    order.courierConsignmentId?.trim() ||
    order.trackingId?.trim() ||
    null
  );
}

/** User-facing link text (Turume-style) */
export function getCourierPanelTrackingLabel(
  _order?: Pick<Order, "deliveryMethodId" | "courier">
): string {
  return "Parcel Link";
}

/** Short courier name for tooltips */
export function getCourierBrandName(
  order: Pick<Order, "deliveryMethodId" | "courier" | "trackingId" | "courierConsignmentId">
): string {
  const type = resolveCourierType(order);
  switch (type) {
    case "steadfast":
      return "Steadfast";
    case "pathao":
      return "Pathao";
    case "carrybee":
      return "Carrybee";
    default:
      return "Courier";
  }
}
