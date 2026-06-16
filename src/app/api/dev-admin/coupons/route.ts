import { NextResponse } from "next/server";
import { isDevAdminAuthenticated } from "@/lib/dev-admin-auth-server";
import {
  loadSubscriptionCoupons,
  saveSubscriptionCoupons,
} from "@/lib/subscription-coupons-server";
import { normalizeSubscriptionCoupons } from "@/lib/subscription-coupons";

export async function GET() {
  if (!isDevAdminAuthenticated()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ ok: true, coupons: await loadSubscriptionCoupons() });
}

export async function POST(req: Request) {
  if (!isDevAdminAuthenticated()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const coupons = normalizeSubscriptionCoupons(body.coupons ?? body);
    return NextResponse.json({
      ok: true,
      coupons: await saveSubscriptionCoupons(coupons),
    });
  } catch (e) {
    console.error("[dev-admin/coupons POST]", e);
    return NextResponse.json({ error: "Failed to save coupons" }, { status: 500 });
  }
}
