import { NextResponse } from "next/server";
import {
  resolveSellerByBusinessId,
  checkOrderGuard,
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

/** Public — the WooCommerce plugin asks this at checkout whether a customer's
 *  phone / IP / email is on the seller's Order Block List. */
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

    const key = `guard:${businessId}:${getClientIp(req)}`;
    if (isRateLimited(key, 200, RATE_WINDOWS.fifteenMin)) {
      return NextResponse.json({ blocked: false }, { headers: CORS });
    }
    recordHit(key, RATE_WINDOWS.fifteenMin);

    const match = checkOrderGuard(businessId, {
      phone: body.phone ? String(body.phone) : undefined,
      ip: body.ip ? String(body.ip) : getClientIp(req),
      email: body.email ? String(body.email) : undefined,
    });

    return NextResponse.json(
      match
        ? { blocked: true, type: match.type, value: match.value }
        : { blocked: false },
      { headers: CORS }
    );
  } catch {
    // Fail open — never break a real customer's checkout on our error.
    return NextResponse.json({ blocked: false }, { status: 200, headers: CORS });
  }
}
