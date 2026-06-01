import type { Order } from "./orders-store";
import type {
  SteadfastConfig,
  SteadfastCreateOrderPayload,
} from "./steadfast-types";
import { getDeliveryMethod } from "./delivery-methods-store";

export function normalizeSteadfastPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 11 && digits.startsWith("0")) return digits;
  if (digits.length === 13 && digits.startsWith("880")) return `0${digits.slice(3)}`;
  if (digits.length === 10) return `0${digits}`;
  return digits.slice(0, 11);
}

export function buildSteadfastCreatePayload(
  order: Order,
  config: SteadfastConfig
): SteadfastCreateOrderPayload {
  const due = Math.max(0, order.total - (order.advance ?? 0));
  const cod = order.paymentMethod === "cod" ? due : 0;

  const itemDescription = config.sendProductNames
    ? order.items.map((i) => `${i.productName} x${i.qty}`).join(", ")
    : undefined;

  const noteParts = [
    config.defaultShippingNote?.trim(),
    order.note?.trim(),
  ].filter(Boolean);

  return {
    invoice: order.id.replace(/[^a-zA-Z0-9_-]/g, "_").slice(0, 64) || order.id,
    recipient_name: order.customerName.trim().slice(0, 100),
    recipient_phone: normalizeSteadfastPhone(order.phone),
    recipient_email: order.email?.trim(),
    recipient_address: order.address.trim().slice(0, 250),
    cod_amount: Math.round(cod),
    note: noteParts.join(" · ").slice(0, 500) || undefined,
    item_description: itemDescription?.slice(0, 500),
    total_lot: order.items.reduce((s, i) => s + i.qty, 0) || undefined,
    delivery_type: 0,
  };
}

export async function testSteadfastConnection(
  config: Pick<SteadfastConfig, "apiKey" | "apiSecret">
): Promise<{ ok: boolean; message: string; balance?: number }> {
  const res = await fetch("/api/steadfast", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apiKey: config.apiKey,
      apiSecret: config.apiSecret,
      action: "test",
    }),
  });
  return res.json();
}

export function validateOrderForSteadfast(order: Order): string | null {
  if (!order.customerName?.trim()) return "Customer name is required.";
  if (!order.address?.trim()) return "Delivery address is required.";
  const phone = normalizeSteadfastPhone(order.phone);
  if (phone.length !== 11 || !/^01\d{9}$/.test(phone)) {
    return `Phone must be 11 digits starting with 01 (e.g. 01712345678). Got: ${order.phone || "(empty)"}`;
  }
  return null;
}

export async function createSteadfastShipment(
  order: Order,
  deliveryMethodId: string
): Promise<{
  ok: boolean;
  message: string;
  trackingCode?: string;
  consignmentId?: number;
  steadfastStatus?: string;
}> {
  const method = getDeliveryMethod(deliveryMethodId);
  if (!method?.steadfast?.apiKey || !method.steadfast.apiSecret) {
    return {
      ok: false,
      message: "Steadfast API keys not configured on this delivery method.",
    };
  }

  const validationError = validateOrderForSteadfast(order);
  if (validationError) {
    return { ok: false, message: validationError };
  }

  const payload = buildSteadfastCreatePayload(order, method.steadfast);

  let res: Response;
  try {
    res = await fetch("/api/steadfast", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        apiKey: method.steadfast.apiKey,
        apiSecret: method.steadfast.apiSecret,
        action: "create_order",
        payload,
      }),
    });
  } catch (e) {
    return {
      ok: false,
      message:
        e instanceof Error ? e.message : "Network error — could not reach server",
    };
  }

  let data: {
    ok: boolean;
    message?: string;
    detail?: unknown;
    consignment?: {
      tracking_code?: string;
      trackingCode?: string;
      consignment_id?: number;
      status?: string;
    };
  };

  try {
    data = await res.json();
  } catch {
    return {
      ok: false,
      message: `Invalid response from server (${res.status})`,
    };
  }

  if (!data.ok) {
    const detailMsg =
      data.detail && typeof data.detail === "object" && data.detail !== null
        ? JSON.stringify(data.detail).slice(0, 200)
        : "";
    return {
      ok: false,
      message: [data.message ?? `Steadfast error (${res.status})`, detailMsg]
        .filter(Boolean)
        .join(" — "),
    };
  }

  const consignment = data.consignment;
  const trackingCode =
    consignment?.tracking_code?.trim() ||
    consignment?.trackingCode?.trim() ||
    undefined;

  if (!trackingCode) {
    return {
      ok: false,
      message:
        data.message ??
        "Steadfast accepted the order but no tracking code was returned.",
    };
  }

  return {
    ok: true,
    message: data.message ?? "Consignment created successfully",
    trackingCode,
    consignmentId: consignment?.consignment_id,
    steadfastStatus: consignment?.status,
  };
}

export async function fetchSteadfastDeliveryStatus(
  config: SteadfastConfig,
  opts: { invoice?: string; trackingCode?: string; consignmentId?: number }
): Promise<{ ok: boolean; delivery_status?: string; message?: string }> {
  const action = opts.trackingCode
    ? "status_by_tracking"
    : opts.consignmentId
      ? "status_by_cid"
      : "status_by_invoice";

  const res = await fetch("/api/steadfast", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      apiKey: config.apiKey,
      apiSecret: config.apiSecret,
      action,
      invoice: opts.invoice,
      trackingCode: opts.trackingCode,
      consignmentId: opts.consignmentId,
    }),
  });
  return res.json();
}
