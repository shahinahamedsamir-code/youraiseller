import type { Order } from "./orders-store";
import { getDeliveryMethod } from "./delivery-methods-store";
import type { PaperflyConfig, PaperflyCreateOrderPayload } from "./paperfly-types";

export function normalizePaperflyPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("0")) return digits;
  if (digits.length === 13 && digits.startsWith("880")) return `0${digits.slice(3)}`;
  if (digits.length === 10) return `0${digits}`;
  return digits.slice(0, 11);
}

export function validateOrderForPaperfly(order: Order, config: PaperflyConfig): string | null {
  if (!config.username.trim() || !config.password) return "Paperfly username and password are required.";
  if (!config.paperflyKey.trim()) return "Paperfly key is required.";
  if (!config.storeName.trim()) return "Paperfly store name is required.";
  if (!order.customerName?.trim()) return "Customer name is required.";
  if (!order.address?.trim() || order.address.trim().length < 10) {
    return "Delivery address must be at least 10 characters.";
  }
  const phone = normalizePaperflyPhone(order.phone);
  if (phone.length !== 11 || !/^01\d{9}$/.test(phone)) {
    return `Phone must be 11 digits (01XXXXXXXXX). Got: ${order.phone || "(empty)"}`;
  }
  return null;
}

export function buildPaperflyCreatePayload(
  order: Order,
  config: PaperflyConfig
): PaperflyCreateOrderPayload {
  const productBrief =
    config.sendProductNames && order.items.length
      ? order.items.map((i) => `${i.productName} x${i.qty}`).join(", ")
      : config.defaultProductBrief?.trim() || "Product";
  const totalQty = order.items.reduce((s, i) => s + i.qty, 0) || 1;
  const weight = Math.max(0.1, config.packageWeightKg * totalQty);
  const payload: PaperflyCreateOrderPayload = {
    merchantOrderReference: (order.invoiceNumber || order.id).slice(0, 80),
    storeName: config.storeName.trim().slice(0, 100),
    productBrief: productBrief.slice(0, 250),
    packagePrice: String(Math.round(order.total)),
    max_weight: String(weight),
    customerName: order.customerName.trim().slice(0, 100),
    customerAddress: order.address.trim().slice(0, 250),
    customerPhone: normalizePaperflyPhone(order.phone),
  };

  if (config.exchangeEnabled) {
    payload.orderType = "Exchange";
    payload.exchangeDescription =
      config.exchangeDescription?.trim().slice(0, 250) || productBrief.slice(0, 250);
    payload.exchangePrice = String(Math.max(0, config.exchangePrice));
    payload.exchangeWeight = String(Math.max(0.1, config.exchangeWeightKg));
  }

  return payload;
}

export async function testPaperflyConnection(
  config: PaperflyConfig
): Promise<{ ok: boolean; message: string; detail?: unknown }> {
  const res = await fetch("/api/paperfly", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ config, action: "test" }),
  });
  return res.json();
}

export async function createPaperflyShipment(
  order: Order,
  deliveryMethodId: string
): Promise<{
  ok: boolean;
  message: string;
  trackingCode?: string;
  barcode?: string;
  paperflyStatus?: string;
}> {
  const method = getDeliveryMethod(deliveryMethodId);
  if (!method?.paperfly) {
    return { ok: false, message: "Paperfly credentials are not configured on this delivery method." };
  }

  const validationError = validateOrderForPaperfly(order, method.paperfly);
  if (validationError) return { ok: false, message: validationError };

  const payload = buildPaperflyCreatePayload(order, method.paperfly);
  const res = await fetch("/api/paperfly", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      config: method.paperfly,
      action: "create_order",
      payload,
    }),
  });
  const data = (await res.json()) as {
    ok: boolean;
    message?: string;
    tracking_number?: string;
    tracking_barcode?: string;
  };

  if (!data.ok) {
    return { ok: false, message: data.message ?? "Paperfly order create failed" };
  }

  const tracking = data.tracking_number?.trim();
  if (!tracking) {
    return { ok: false, message: "Paperfly accepted order but no tracking_number returned" };
  }

  return {
    ok: true,
    message: data.message ?? "successfully inserted",
    trackingCode: tracking,
    barcode: data.tracking_barcode,
    paperflyStatus: "created",
  };
}

export async function fetchPaperflyTracking(
  config: PaperflyConfig,
  referenceNumber: string
): Promise<{ ok: boolean; message?: string; detail?: unknown }> {
  const res = await fetch("/api/paperfly", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      config,
      action: "track",
      referenceNumber,
    }),
  });
  return res.json();
}

export async function cancelPaperflyOrder(
  config: PaperflyConfig,
  orderId: string
): Promise<{ ok: boolean; message?: string; detail?: unknown }> {
  const res = await fetch("/api/paperfly", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      config,
      action: "cancel",
      orderId,
    }),
  });
  return res.json();
}

