import { getSessionUserId } from "./dev-users";
import { loadOrders } from "./orders-store";
import { applyCourierDeliveryStatus } from "./courier-status-sync";
import {
  carrybeeStatusFromWebhook,
  type CarrybeeWebhookPayload,
} from "./carrybee-webhook-types";

export function generateCarrybeeWebhookSignature(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `cb_${crypto.randomUUID().replace(/-/g, "")}`;
  }
  return `cb_${Date.now().toString(36)}`;
}

export async function registerCarrybeeWebhookWithServer(opts: {
  sellerId: string;
  methodId: string;
  webhookSignature: string;
}): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch("/api/webhooks/carrybee/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(opts),
  });
  return res.json();
}

function findOrderIdForCarrybeePayload(
  payload: CarrybeeWebhookPayload
): string | undefined {
  const invoice = payload.merchant_order_id?.trim();
  const cid = payload.consignment_id?.trim();
  const orders = loadOrders();

  if (invoice) {
    const direct = orders.find(
      (o) => o.id === invoice || invoice.includes(o.id) || o.id.includes(invoice)
    );
    if (direct) return direct.id;
  }
  if (cid) {
    const byTrack = orders.find(
      (o) =>
        o.trackingId === cid ||
        o.courierConsignmentId === cid
    );
    if (byTrack) return byTrack.id;
  }
  return undefined;
}

export async function pullAndApplyCarrybeeWebhooks(): Promise<{
  applied: number;
}> {
  const sellerId = getSessionUserId();
  if (!sellerId) return { applied: 0 };

  const res = await fetch(
    `/api/webhooks/carrybee/pending?sellerId=${encodeURIComponent(sellerId)}`
  );
  if (!res.ok) return { applied: 0 };

  const data = (await res.json()) as {
    ok: boolean;
    events?: { payload: CarrybeeWebhookPayload }[];
  };
  if (!data.ok || !data.events?.length) return { applied: 0 };

  let applied = 0;
  for (const ev of data.events) {
    const status = carrybeeStatusFromWebhook(ev.payload);
    if (!status) continue;
    const orderId = findOrderIdForCarrybeePayload(ev.payload);
    if (!orderId) continue;
    const r = applyCourierDeliveryStatus(orderId, status, {
      methodName: "Carrybee webhook",
      courierType: "carrybee",
      silent: false,
    });
    if (r.statusChanged || r.ok) applied++;
  }

  if (applied > 0) {
    window.dispatchEvent(new Event("youraiseller-data-updated"));
  }
  return { applied };
}
