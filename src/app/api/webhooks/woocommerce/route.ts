import { NextResponse } from "next/server";
import {
  enqueueWooWebhookOrder,
  resolveSellerByWooToken,
} from "@/lib/woocommerce-webhook-server";

/**
 * WooCommerce order.created webhook receiver. The delivery URL carries a
 * per-store `token` (mapped to a seller at registration time); we resolve it,
 * queue the order payload, and the dashboard imports it on its next pull.
 * WooCommerce also pings this URL once with a `webhook_id` body on creation.
 */
export async function POST(req: Request) {
  try {
    const token = new URL(req.url).searchParams.get("token")?.trim();
    if (!token) {
      return NextResponse.json({ ok: false, message: "Missing token" }, { status: 401 });
    }

    const sellerId = resolveSellerByWooToken(token);
    if (!sellerId) {
      return NextResponse.json(
        { ok: false, message: "Unknown token. Re-enable instant sync in the panel." },
        { status: 401 }
      );
    }

    let payload: unknown = {};
    try {
      payload = await req.json();
    } catch {
      payload = {};
    }

    // The activation ping has no order id — acknowledge without queueing.
    const hasOrder =
      payload && typeof payload === "object" && "id" in (payload as Record<string, unknown>);
    if (hasOrder) {
      enqueueWooWebhookOrder(sellerId, payload);
    }

    return NextResponse.json({ ok: true, queued: hasOrder });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Webhook failed";
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
