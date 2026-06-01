import { getSessionUserId } from "./dev-users";
import { loadOrders } from "./orders-store";
import { applyCourierDeliveryStatus } from "./courier-status-sync";
import type { SteadfastWebhookPayload } from "./steadfast-webhook-server";

export function generateSteadfastWebhookSecret(): string {
  if (typeof crypto !== "undefined" && "randomUUID" in crypto) {
    return `ys_${crypto.randomUUID().replace(/-/g, "")}`;
  }
  return `ys_${Date.now().toString(36)}_${Math.random().toString(36).slice(2, 12)}`;
}

export function getSteadfastWebhookPublicUrl(): string {
  if (typeof window !== "undefined") {
    return `${window.location.origin}/api/webhooks/steadfast`;
  }
  const base = process.env.NEXT_PUBLIC_APP_URL?.replace(/\/$/, "");
  return base ? `${base}/api/webhooks/steadfast` : "/api/webhooks/steadfast";
}

export async function registerSteadfastWebhookWithServer(opts: {
  sellerId: string;
  methodId: string;
  webhookSecret: string;
}): Promise<{ ok: boolean; message?: string }> {
  const res = await fetch("/api/webhooks/steadfast/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(opts),
  });
  return res.json();
}

export function findOrderIdForWebhookPayload(
  payload: SteadfastWebhookPayload
): string | undefined {
  const orders = loadOrders();
  const invoice = payload.invoice?.trim();
  const tracking = payload.tracking_code?.trim();
  const consignmentId =
    payload.consignment_id != null
      ? String(payload.consignment_id).trim()
      : "";

  if (invoice) {
    const direct = orders.find(
      (o) =>
        o.id === invoice ||
        o.id.replace(/[^a-zA-Z0-9_-]/g, "_") === invoice ||
        invoice.includes(o.id) ||
        o.id.includes(invoice)
    );
    if (direct) return direct.id;
  }

  if (tracking) {
    const byTrack = orders.find((o) => o.trackingId === tracking);
    if (byTrack) return byTrack.id;
  }

  if (consignmentId) {
    const byCid = orders.find(
      (o) =>
        o.courierConsignmentId === consignmentId ||
        o.trackingId === consignmentId
    );
    if (byCid) return byCid.id;
  }

  return undefined;
}

export async function pullAndApplySteadfastWebhooks(): Promise<{
  applied: number;
  missed: number;
}> {
  const sellerId = getSessionUserId();
  if (!sellerId) return { applied: 0, missed: 0 };

  const res = await fetch(
    `/api/webhooks/steadfast/pending?sellerId=${encodeURIComponent(sellerId)}`
  );
  if (!res.ok) return { applied: 0, missed: 0 };

  const data = (await res.json()) as {
    ok: boolean;
    events?: { id: string; payload: SteadfastWebhookPayload }[];
  };
  if (!data.ok || !data.events?.length) return { applied: 0, missed: 0 };

  let applied = 0;
  let missed = 0;

  for (const ev of data.events) {
    const status =
      ev.payload.status ?? ev.payload.delivery_status ?? "";
    if (!status) {
      missed++;
      continue;
    }
    const orderId = findOrderIdForWebhookPayload(ev.payload);
    if (!orderId) {
      missed++;
      continue;
    }
    const r = applyCourierDeliveryStatus(orderId, status, {
      methodName: "Steadfast webhook",
      silent: false,
    });
    if (r.statusChanged || r.ok) applied++;
    else missed++;
  }

  if (applied > 0 && typeof window !== "undefined") {
    window.dispatchEvent(new Event("youraiseller-data-updated"));
  }

  return { applied, missed };
}
