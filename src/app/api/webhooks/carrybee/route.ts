import { NextResponse } from "next/server";
import {
  carrybeeStatusFromWebhook,
  enqueueCarrybeeWebhook,
  resolveSellerByCarrybeeSignature,
  type CarrybeeWebhookPayload,
} from "@/lib/carrybee-webhook-server";

export async function POST(req: Request) {
  try {
    const signature = req.headers.get("x-carrybee-webhook-signature")?.trim();
    if (!signature) {
      return NextResponse.json(
        { error: true, message: "Missing X-Carrybee-Webhook-Signature header" },
        { status: 401 }
      );
    }

    const entry = resolveSellerByCarrybeeSignature(signature);
    if (!entry) {
      return NextResponse.json(
        {
          error: true,
          message:
            "Unknown webhook signature. Save Carrybee delivery method in panel first.",
        },
        { status: 401 }
      );
    }

    let payload: CarrybeeWebhookPayload;
    try {
      payload = (await req.json()) as CarrybeeWebhookPayload;
    } catch {
      payload = {};
    }

    enqueueCarrybeeWebhook(entry.sellerId, payload);

    return NextResponse.json({
      error: false,
      message: "Webhook received",
      event: carrybeeStatusFromWebhook(payload),
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Webhook failed";
    return NextResponse.json({ error: true, message: msg }, { status: 500 });
  }
}
