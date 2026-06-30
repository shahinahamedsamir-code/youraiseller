import { NextResponse } from "next/server";
import {
  resolveSellerByBusinessId,
  enqueuePushedOrder,
  type PushedOrder,
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

/** Public — the WooCommerce plugin pushes a placed order here instantly. */
export async function POST(req: Request) {
  try {
    const url = new URL(req.url);
    const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
    const businessId = String(body.businessId ?? url.searchParams.get("businessId") ?? "").trim();
    const apiKey = String(body.apiKey ?? "").trim();
    if (!businessId || !apiKey) {
      return NextResponse.json({ error: "missing auth" }, { status: 400, headers: CORS });
    }

    const entry = resolveSellerByBusinessId(businessId);
    if (!entry || entry.apiKey !== apiKey) {
      return NextResponse.json({ error: "invalid credentials" }, { status: 401, headers: CORS });
    }

    const key = `order-push:${businessId}:${getClientIp(req)}`;
    if (isRateLimited(key, 300, RATE_WINDOWS.fifteenMin)) {
      return NextResponse.json({ error: "too many" }, { status: 429, headers: CORS });
    }
    recordHit(key, RATE_WINDOWS.fifteenMin);

    const o = (body.order ?? {}) as Record<string, unknown>;
    const wooOrderId = Math.floor(Number(o.wooOrderId));
    if (!Number.isFinite(wooOrderId) || wooOrderId <= 0) {
      return NextResponse.json({ error: "wooOrderId required" }, { status: 400, headers: CORS });
    }

    const rawItems: unknown[] = Array.isArray(o.items) ? (o.items as unknown[]) : [];
    const items = rawItems.slice(0, 100).map((raw) => {
      const i = (raw ?? {}) as Record<string, unknown>;
      return {
        name: String(i.name ?? "").slice(0, 200),
        sku: i.sku ? String(i.sku).slice(0, 80) : undefined,
        qty: Math.max(1, Math.floor(Number(i.qty) || 1)),
        price: Number.isFinite(Number(i.price)) ? Number(i.price) : 0,
      };
    });

    const order: PushedOrder = {
      wooOrderId,
      wooNumber: o.wooNumber ? String(o.wooNumber).slice(0, 40) : undefined,
      customerName: String(o.customerName ?? "").slice(0, 160),
      phone: String(o.phone ?? "").slice(0, 40),
      email: o.email ? String(o.email).slice(0, 160) : undefined,
      address: String(o.address ?? "").slice(0, 400),
      district: o.district ? String(o.district).slice(0, 120) : undefined,
      paymentMethod: o.paymentMethod ? String(o.paymentMethod).slice(0, 40) : undefined,
      status: o.status ? String(o.status).slice(0, 40) : undefined,
      shippingCharge: Number(o.shippingCharge) || 0,
      discount: Number(o.discount) || 0,
      note: o.note ? String(o.note).slice(0, 500) : undefined,
      items,
      receivedAt: new Date().toISOString(),
    };

    if (!order.customerName || !order.phone || order.items.length === 0) {
      return NextResponse.json({ error: "incomplete order" }, { status: 400, headers: CORS });
    }

    enqueuePushedOrder(entry.sellerId, order);
    return NextResponse.json({ ok: true }, { headers: CORS });
  } catch {
    return NextResponse.json({ error: "failed" }, { status: 500, headers: CORS });
  }
}
