import { NextResponse } from "next/server";
import {
  deliveryStatusFromWebhookPayload,
  enqueueSteadfastWebhook,
  extractBearerToken,
  resolveSellerByWebhookToken,
  type SteadfastWebhookPayload,
} from "@/lib/steadfast-webhook-server";

export async function POST(req: Request) {
  try {
    const token = extractBearerToken(req.headers.get("authorization"));
    if (!token) {
      return NextResponse.json(
        { ok: false, error: "Missing Authorization: Bearer token" },
        { status: 401 }
      );
    }

    const entry = resolveSellerByWebhookToken(token);
    if (!entry) {
      return NextResponse.json(
        {
          ok: false,
          error:
            "Unknown webhook token. Save your Steadfast delivery method in the panel first.",
        },
        { status: 401 }
      );
    }

    const payload = (await req.json()) as SteadfastWebhookPayload;
    const status = deliveryStatusFromWebhookPayload(payload);
    if (!status && !payload.notification_type) {
      return NextResponse.json(
        { ok: false, error: "Missing status in webhook payload" },
        { status: 400 }
      );
    }

    enqueueSteadfastWebhook(entry.sellerId, payload);

    return NextResponse.json({
      ok: true,
      status: "success",
      message: "Webhook received",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Webhook handler failed";
    return NextResponse.json({ ok: false, error: msg }, { status: 500 });
  }
}
