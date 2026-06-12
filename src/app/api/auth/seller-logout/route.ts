import { NextResponse } from "next/server";
import { SELLER_AUTH_COOKIE } from "@/lib/seller-auth-cookie";
import { sellerSessionCookieOptions } from "@/lib/seller-auth-server";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SELLER_AUTH_COOKIE, "", { ...sellerSessionCookieOptions(), maxAge: 0 });
  return res;
}
