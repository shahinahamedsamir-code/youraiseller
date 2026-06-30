import { NextResponse } from "next/server";
import {
  resolveSellerByBusinessId,
  enqueuePushedStock,
  type PushedStock,
} from "@/lib/incomplete-capture-server";
import { getClientIp, isRateLimited, recordHit, RATE_WINDOWS } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

/** Public — the WooCommerce plugin pushes a stock change (Woo → app). */
export async function POST(req: Request) {
  try {
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const businessId = String(body.businessId ?? "").trim();
    const apiKey = String(body.apiKey ?? "").trim();
    if (!businessId || !apiKey) {
      return NextResponse.json({ error: "missing auth" }, { status: 400, headers: CORS });
    }

    const entry = resolveSellerByBusinessId(businessId);
    if (!entry || entry.apiKey !== apiKey) {
      return NextResponse.json({ error: "invalid credentials" }, { status: 401, headers: CORS });
    }

    const key = `stock-push:${businessId}:${getClientIp(req)}`;
    if (isRateLimited(key, 800, RATE_WINDOWS.fifteenMin)) {
      return NextResponse.json({ error: "too many" }, { status: 429, headers: CORS });
    }
    recordHit(key, RATE_WINDOWS.fifteenMin);

    const sku = String(body.sku ?? "").trim().slice(0, 80);
    const stockQty = Math.floor(Number(body.stockQty));
    if (!sku || !Number.isFinite(stockQty)) {
      return NextResponse.json({ error: "sku and stockQty required" }, { status: 400, headers: CORS });
    }

    const item: PushedStock = {
      sku,
      stockQty: Math.max(0, stockQty),
      receivedAt: new Date().toISOString(),
    };
    enqueuePushedStock(entry.sellerId, item);
    return NextResponse.json({ ok: true }, { headers: CORS });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500, headers: CORS });
  }
}
