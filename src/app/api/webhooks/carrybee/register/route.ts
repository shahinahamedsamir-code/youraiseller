import { NextResponse } from "next/server";
import { registerCarrybeeWebhook } from "@/lib/carrybee-webhook-server";

type Body = {
  sellerId?: string;
  methodId?: string;
  webhookSignature?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const sellerId = body.sellerId?.trim();
    const methodId = body.methodId?.trim();
    const webhookSignature = body.webhookSignature?.trim();

    if (!sellerId || !methodId || !webhookSignature) {
      return NextResponse.json(
        { ok: false, message: "sellerId, methodId and webhookSignature required" },
        { status: 400 }
      );
    }

    registerCarrybeeWebhook(webhookSignature, sellerId, methodId);

    return NextResponse.json({
      ok: true,
      message: "Carrybee webhook signature registered",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Register failed";
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
