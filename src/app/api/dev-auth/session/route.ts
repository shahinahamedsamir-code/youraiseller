import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { DEV_AUTH_COOKIE } from "@/lib/dev-auth-cookie";

export async function GET() {
  const cookie = cookies().get(DEV_AUTH_COOKIE);
  return NextResponse.json({ ok: cookie?.value === "1" });
}
