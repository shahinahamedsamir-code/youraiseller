import { NextResponse } from "next/server";
import {
  resolveSellerByBusinessId,
  enqueueIncompleteCapture,
} from "@/lib/incomplete-capture-server";
import { getClientIp, isRateLimited, recordHit, RATE_WINDOWS } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

// The plugin runs on the seller's own WooCommerce domain → allow cross-origin.
const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

/** Public — receives partial checkout data from the WooCommerce plugin. */
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
      return NextResponse.json(
        { error: "invalid credentials" },
        { status: 401, headers: CORS }
      );
    }

    // Cheap abuse guard per business + IP.
    const key = `capture:${businessId}:${getClientIp(req)}`;
    if (isRateLimited(key, 150, RATE_WINDOWS.fifteenMin)) {
      return NextResponse.json({ error: "too many" }, { status: 429, headers: CORS });
    }
    recordHit(key, RATE_WINDOWS.fifteenMin);

    const name = String(body.name ?? "").trim().slice(0, 120);
    const phone = String(body.phone ?? "").trim().slice(0, 40);
    if (!name && !phone) {
      return NextResponse.json({ error: "nothing to capture" }, { status: 400, headers: CORS });
    }

    const rawItems: unknown[] = Array.isArray(body.items) ? (body.items as unknown[]) : [];
    const items = rawItems.slice(0, 50).map((raw) => {
      const i = (raw ?? {}) as Record<string, unknown>;
      return {
        name: String(i.name ?? "").slice(0, 160),
        sku: i.sku ? String(i.sku).slice(0, 80) : undefined,
        qty: Math.max(1, Math.floor(Number(i.qty) || 1)),
        price: Number.isFinite(Number(i.price)) ? Number(i.price) : undefined,
      };
    });

    enqueueIncompleteCapture(entry.sellerId, {
      sessionId: String(body.sessionId ?? "").trim().slice(0, 80) || `cap_${Date.now()}`,
      name,
      phone,
      address: String(body.address ?? "").trim().slice(0, 300),
      email: body.email ? String(body.email).trim().slice(0, 160) : undefined,
      items,
      currency: body.currency ? String(body.currency).slice(0, 8) : undefined,
      pageUrl: body.pageUrl ? String(body.pageUrl).slice(0, 300) : undefined,
      receivedAt: new Date().toISOString(),
    });

    return NextResponse.json({ ok: true }, { headers: CORS });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500, headers: CORS });
  }
}
