import { NextResponse } from "next/server";
import { pullCarrybeeWebhookQueue } from "@/lib/carrybee-webhook-server";

export async function GET(req: Request) {
  const sellerId = new URL(req.url).searchParams.get("sellerId")?.trim();
  if (!sellerId) {
    return NextResponse.json(
      { ok: false, message: "sellerId required" },
      { status: 400 }
    );
  }
  const events = pullCarrybeeWebhookQueue(sellerId);
  return NextResponse.json({ ok: true, events });
}
