import type { Order } from "./orders-store";
import type { PathaoConfig, PathaoCreateOrderPayload } from "./pathao-types";
import { getDeliveryMethod } from "./delivery-methods-store";

export function normalizePathaoPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("0")) return digits;
  if (digits.length === 13 && digits.startsWith("880")) return `0${digits.slice(3)}`;
  if (digits.length === 10) return `0${digits}`;
  return digits.slice(0, 11);
}

export function validateOrderForPathao(order: Order): string | null {
  if (!order.customerName?.trim()) return "Customer name is required.";
  if (!order.address?.trim() || order.address.trim().length < 10) {
    return "Delivery address must be at least 10 characters.";
  }
  const phone = normalizePathaoPhone(order.phone);
  if (phone.length !== 11 || !/^01\d{9}$/.test(phone)) {
    return `Phone must be 11 digits (01XXXXXXXXX). Got: ${order.phone || "(empty)"}`;
  }
  return null;
}

export function buildPathaoCreatePayload(
  order: Order,
  config: PathaoConfig
): PathaoCreateOrderPayload {
  // order.total is already net of advance — the COD to collect IS the total.
  const due = Math.max(0, order.total);
  const cod = order.paymentMethod === "cod" ? Math.round(due) : 0;

  const noteParts = [
    config.defaultShippingNote?.trim(),
    order.note?.trim(),
  ].filter(Boolean);

  const itemDescription = config.sendProductNames
    ? order.items.map((i) => `${i.productName} x${i.qty}`).join(", ")
    : undefined;

  const totalWeight = Math.max(
    config.itemWeight,
    order.items.reduce((s, i) => s + i.qty * 0.5, 0)
  );

  return {
    store_id: config.storeId,
    merchant_order_id: order.id,
    recipient_name: order.customerName.trim().slice(0, 100),
    recipient_phone: normalizePathaoPhone(order.phone),
    recipient_address: order.address.trim().slice(0, 220),
    delivery_type: config.deliveryType,
    item_type: config.itemType,
    item_quantity: order.items.reduce((s, i) => s + i.qty, 0) || 1,
    item_weight: Math.min(10, Math.max(0.5, totalWeight)),
    item_description: itemDescription?.slice(0, 500),
    special_instruction: noteParts.join(" · ").slice(0, 500) || undefined,
    amount_to_collect: cod,
  };
}

export async function testPathaoConnection(
  config: PathaoConfig
): Promise<{
  ok: boolean;
  message: string;
  stores?: {
    store_id?: number;
    store_name?: string;
    is_default_store?: boolean;
    is_active?: boolean;
  }[];
}> {
  const res = await fetch("/api/pathao", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ config, action: "test" }),
  });
  return res.json();
}

export async function createPathaoShipment(
  order: Order,
  deliveryMethodId: string
): Promise<{
  ok: boolean;
  message: string;
  trackingCode?: string;
  pathaoStatus?: string;
}> {
  const method = getDeliveryMethod(deliveryMethodId);
  if (!method?.pathao?.clientId || !method.pathao.clientSecret) {
    return {
      ok: false,
      message: "Pathao API credentials not configured on this delivery method.",
    };
  }
  if (!method.pathao.storeId) {
    return {
      ok: false,
      message: "Pathao Store ID is required. Use Test connection to list stores.",
    };
  }

  const validationError = validateOrderForPathao(order);
  if (validationError) {
    return { ok: false, message: validationError };
  }

  const payload = buildPathaoCreatePayload(order, method.pathao);

  const res = await fetch("/api/pathao", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      config: method.pathao,
      action: "create_order",
      payload,
    }),
  });

  const data = (await res.json()) as {
    ok: boolean;
    message?: string;
    consignment?: {
      consignment_id?: string;
      order_status?: string;
    };
  };

  if (!data.ok) {
    return { ok: false, message: data.message ?? "Pathao create order failed" };
  }

  const tracking = data.consignment?.consignment_id?.trim();
  if (!tracking) {
    return {
      ok: false,
      message: "Pathao accepted order but no consignment_id returned",
    };
  }

  return {
    ok: true,
    message: data.message ?? "Order Created Successfully",
    trackingCode: tracking,
    pathaoStatus: data.consignment?.order_status ?? "Pending",
  };
}

export async function fetchPathaoOrderStatus(
  config: PathaoConfig,
  consignmentId: string
): Promise<{ ok: boolean; order_status?: string; message?: string }> {
  const res = await fetch("/api/pathao", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      config,
      action: "order_info",
      consignmentId,
    }),
  });
  return res.json();
}
