import { NextResponse } from "next/server";
import { loadSubscriptionCoupons } from "@/lib/subscription-coupons-server";

export async function GET() {
  const coupons = await loadSubscriptionCoupons();
  return NextResponse.json({
    ok: true,
    coupons: coupons.filter((coupon) => coupon.active !== false),
  });
}
