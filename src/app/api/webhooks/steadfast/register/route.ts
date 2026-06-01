import { NextResponse } from "next/server";
import { registerSteadfastWebhookToken } from "@/lib/steadfast-webhook-server";

type Body = {
  sellerId?: string;
  methodId?: string;
  webhookSecret?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const sellerId = body.sellerId?.trim();
    const methodId = body.methodId?.trim();
    const webhookSecret = body.webhookSecret?.trim();

    if (!sellerId || !methodId || !webhookSecret) {
      return NextResponse.json(
        { ok: false, message: "sellerId, methodId and webhookSecret required" },
        { status: 400 }
      );
    }

    registerSteadfastWebhookToken(webhookSecret, sellerId, methodId);

    return NextResponse.json({
      ok: true,
      message: "Webhook token registered for Steadfast callbacks",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Register failed";
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
