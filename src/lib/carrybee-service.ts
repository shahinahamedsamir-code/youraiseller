import type { Order } from "./orders-store";
import {
  asCarrybeeStoreId,
  type CarrybeeConfig,
  type CarrybeeCreateOrderPayload,
} from "./carrybee-types";
import { getDeliveryMethod } from "./delivery-methods-store";

export function normalizeCarrybeePhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.startsWith("880") && digits.length >= 13) return digits;
  if (digits.length === 11 && digits.startsWith("0")) return `88${digits}`;
  if (digits.length === 10) return `880${digits}`;
  return digits.slice(0, 13);
}

export function validateOrderForCarrybee(order: Order): string | null {
  if (!order.customerName?.trim()) return "Customer name is required.";
  if (!order.address?.trim() || order.address.trim().length < 10) {
    return "Delivery address must be at least 10 characters.";
  }
  const phone = order.phone.replace(/\D/g, "");
  if (phone.length < 10) return "Valid recipient phone is required.";
  return null;
}

export async function resolveCarrybeeLocation(
  config: CarrybeeConfig,
  address: string
): Promise<{ city_id: number; zone_id: number; area_id?: number }> {
  const query = address.trim();
  if (query.length >= 10) {
    const res = await fetch("/api/carrybee", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        config,
        action: "address_details",
        addressQuery: query,
      }),
    });
    const data = (await res.json()) as {
      ok: boolean;
      city_id?: number;
      zone_id?: number;
    };
    if (data.ok && data.city_id && data.zone_id) {
      return { city_id: data.city_id, zone_id: data.zone_id };
    }
  }
  return {
    city_id: config.defaultCityId,
    zone_id: config.defaultZoneId,
    area_id: config.defaultAreaId,
  };
}

export function buildCarrybeeCreatePayload(
  order: Order,
  config: CarrybeeConfig,
  location: { city_id: number; zone_id: number; area_id?: number }
): CarrybeeCreateOrderPayload {
  // order.total is already net of advance — the COD to collect IS the total.
  const due = Math.max(0, order.total);
  const cod = order.paymentMethod === "cod" ? Math.round(due) : 0;
  const totalQty = order.items.reduce((s, i) => s + i.qty, 0) || 1;
  const weight = Math.min(
    25000,
    Math.max(1, config.itemWeightGrams * totalQty)
  );

  const noteParts = [
    config.defaultShippingNote?.trim(),
    order.note?.trim(),
  ].filter(Boolean);

  const payload: CarrybeeCreateOrderPayload = {
    store_id: config.storeId,
    merchant_order_id: order.id.slice(0, 50),
    delivery_type: config.deliveryType,
    product_type: config.productType,
    recipient_phone: normalizeCarrybeePhone(order.phone),
    recipient_name: order.customerName.trim().slice(0, 99),
    recipient_address: order.address.trim().slice(0, 200),
    city_id: location.city_id,
    zone_id: location.zone_id,
    item_weight: weight,
    item_quantity: totalQty,
    collectable_amount: cod,
    special_instruction: noteParts.join(" · ").slice(0, 255) || undefined,
    product_description: config.sendProductNames
      ? order.items.map((i) => `${i.productName} x${i.qty}`).join(", ").slice(0, 255)
      : undefined,
    is_closed_box: false,
    is_exchange: false,
  };

  if (location.area_id) payload.area_id = location.area_id;
  return payload;
}

export async function testCarrybeeConnection(
  config: CarrybeeConfig
): Promise<{
  ok: boolean;
  message: string;
  stores?: {
    id: string;
    name: string;
    is_default_pickup_store?: boolean;
  }[];
}> {
  const res = await fetch("/api/carrybee", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ config, action: "test" }),
  });
  return res.json();
}

export async function createCarrybeeShipment(
  order: Order,
  deliveryMethodId: string
): Promise<{
  ok: boolean;
  message: string;
  trackingCode?: string;
  carrybeeStatus?: string;
}> {
  const method = getDeliveryMethod(deliveryMethodId);
  if (!method?.carrybee?.clientId || !method.carrybee.clientSecret) {
    return {
      ok: false,
      message: "Carrybee credentials not configured on this delivery method.",
    };
  }
  if (!method.carrybee.storeId?.trim()) {
    return {
      ok: false,
      message: "Carrybee Store ID required. Run Test API & load stores.",
    };
  }

  const validationError = validateOrderForCarrybee(order);
  if (validationError) return { ok: false, message: validationError };

  const location = await resolveCarrybeeLocation(method.carrybee, order.address);
  const payload = buildCarrybeeCreatePayload(order, method.carrybee, location);

  const res = await fetch("/api/carrybee", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      config: method.carrybee,
      action: "create_order",
      payload,
    }),
  });

  const data = (await res.json()) as {
    ok: boolean;
    message?: string;
    consignment?: { consignment_id?: string };
  };

  if (!data.ok) {
    return { ok: false, message: data.message ?? "Carrybee create order failed" };
  }

  const tracking = asCarrybeeStoreId(data.consignment?.consignment_id);
  if (!tracking) {
    return { ok: false, message: "No consignment_id returned from Carrybee" };
  }

  return {
    ok: true,
    message: data.message ?? "Order Created Successfully",
    trackingCode: tracking,
    carrybeeStatus: "Pending",
  };
}

export async function fetchCarrybeeOrderStatus(
  config: CarrybeeConfig,
  consignmentId: string
): Promise<{ ok: boolean; transfer_status?: string; message?: string }> {
  const res = await fetch("/api/carrybee", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      config,
      action: "order_details",
      consignmentId,
    }),
  });
  return res.json();
}
