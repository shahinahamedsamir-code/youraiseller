import { NextResponse } from "next/server";
import { pullSteadfastWebhookQueue } from "@/lib/steadfast-webhook-server";

export async function GET(req: Request) {
  const sellerId = new URL(req.url).searchParams.get("sellerId")?.trim();
  if (!sellerId) {
    return NextResponse.json(
      { ok: false, message: "sellerId query required" },
      { status: 400 }
    );
  }

  const events = pullSteadfastWebhookQueue(sellerId);
  return NextResponse.json({ ok: true, events });
}
