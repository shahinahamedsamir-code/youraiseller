import type { Order } from "./orders-store";
import { getDeliveryMethod } from "./delivery-methods-store";
import type {
  RedxArea,
  RedxConfig,
  RedxCreateParcelPayload,
  RedxPickupStore,
} from "./redx-types";

export function normalizeRedxPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("0")) return digits;
  if (digits.length === 13 && digits.startsWith("880")) return `0${digits.slice(3)}`;
  if (digits.length === 10) return `0${digits}`;
  return digits.slice(0, 11);
}

export function validateOrderForRedx(order: Order, config: RedxConfig): string | null {
  if (!order.customerName?.trim()) return "Customer name is required.";
  if (!order.address?.trim() || order.address.trim().length < 10) {
    return "Delivery address must be at least 10 characters.";
  }
  const phone = normalizeRedxPhone(order.phone);
  if (phone.length !== 11 || !/^01\d{9}$/.test(phone)) {
    return `Phone must be 11 digits (01XXXXXXXXX). Got: ${order.phone || "(empty)"}`;
  }
  if (!config.pickupStoreId) return "RedX Pickup Store ID is required.";
  if (!config.defaultDeliveryAreaId) return "RedX delivery area ID is required.";
  return null;
}

export function buildRedxCreatePayload(
  order: Order,
  config: RedxConfig
): RedxCreateParcelPayload {
  // order.total is already net of advance — the COD to collect IS the total.
  const due = Math.max(0, order.total);
  const cod = order.paymentMethod === "cod" ? Math.round(due) : 0;
  const totalQty = order.items.reduce((s, i) => s + i.qty, 0) || 1;
  const totalWeight = Math.min(
    25000,
    Math.max(1, config.parcelWeightGrams * totalQty)
  );
  const noteParts = [
    config.defaultShippingNote?.trim(),
    order.note?.trim(),
  ].filter(Boolean);

  return {
    customer_name: order.customerName.trim().slice(0, 100),
    customer_phone: normalizeRedxPhone(order.phone),
    delivery_area:
      config.defaultDeliveryAreaName?.trim() ||
      order.district?.trim() ||
      "Default area",
    delivery_area_id: config.defaultDeliveryAreaId,
    customer_address: order.address.trim().slice(0, 250),
    merchant_invoice_id: (order.invoiceNumber || order.id).slice(0, 80),
    cash_collection_amount: cod,
    parcel_weight: totalWeight,
    instruction: noteParts.join(" - ").slice(0, 250) || undefined,
    value: Math.round(order.total),
    is_closed_box: config.isClosedBox,
    pickup_store_id: config.pickupStoreId,
    parcel_details: config.sendProductNames
      ? order.items.slice(0, 10).map((item) => ({
          name: item.productName.slice(0, 100),
          category: "Product",
          value: Math.round(item.price * item.qty),
        }))
      : undefined,
  };
}

export async function testRedxConnection(
  config: RedxConfig
): Promise<{
  ok: boolean;
  message: string;
  stores?: RedxPickupStore[];
}> {
  const res = await fetch("/api/redx", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ config, action: "test" }),
  });
  return res.json();
}

export async function loadRedxAreas(
  config: RedxConfig,
  opts: { postCode?: string; districtName?: string } = {}
): Promise<{ ok: boolean; message: string; areas?: RedxArea[] }> {
  const action = opts.postCode
    ? "areas_by_post_code"
    : opts.districtName
      ? "areas_by_district"
      : "areas";
  const res = await fetch("/api/redx", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      config,
      action,
      postCode: opts.postCode,
      districtName: opts.districtName,
    }),
  });
  return res.json();
}

export async function createRedxShipment(
  order: Order,
  deliveryMethodId: string
): Promise<{
  ok: boolean;
  message: string;
  trackingCode?: string;
  redxStatus?: string;
}> {
  const method = getDeliveryMethod(deliveryMethodId);
  if (!method?.redx?.accessToken?.trim()) {
    return {
      ok: false,
      message: "RedX access token is not configured on this delivery method.",
    };
  }

  const validationError = validateOrderForRedx(order, method.redx);
  if (validationError) return { ok: false, message: validationError };

  const payload = buildRedxCreatePayload(order, method.redx);
  const res = await fetch("/api/redx", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      config: method.redx,
      action: "create_parcel",
      payload,
    }),
  });
  const data = (await res.json()) as {
    ok: boolean;
    message?: string;
    parcel?: { tracking_id?: string; status?: string };
  };

  if (!data.ok) {
    return { ok: false, message: data.message ?? "RedX create parcel failed" };
  }

  const tracking = data.parcel?.tracking_id?.trim();
  if (!tracking) {
    return { ok: false, message: "RedX accepted parcel but no tracking_id returned" };
  }

  return {
    ok: true,
    message: data.message ?? "Parcel created successfully",
    trackingCode: tracking,
    redxStatus: data.parcel?.status ?? "ready-for-delivery",
  };
}

export async function fetchRedxParcelStatus(
  config: RedxConfig,
  trackingId: string
): Promise<{ ok: boolean; message?: string; detail?: unknown }> {
  const res = await fetch("/api/redx", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      config,
      action: "track_parcel",
      trackingId,
    }),
  });
  return res.json();
}
