import { NextResponse } from "next/server";
import { redactUserForClient } from "@/lib/dev-users-server";
import { SELLER_AUTH_COOKIE } from "@/lib/seller-auth-cookie";
import {
  getSellerSessionUser,
  getSellerSessionUserId,
  readDevUsersFile,
  sellerSessionCookieOptions,
  signSellerSession,
} from "@/lib/seller-auth-server";

export async function GET() {
  const user = await getSellerSessionUser();
  if (!user) {
    return NextResponse.json({ ok: false }, { status: 401 });
  }
  return NextResponse.json({ ok: true, user: redactUserForClient(user) });
}

/** Establish a signed session after Google (or other client-verified) login. */
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const userId = typeof body?.userId === "string" ? body.userId.trim() : "";
    const email = typeof body?.email === "string" ? body.email.toLowerCase().trim() : "";

    if (!userId || !email) {
      return NextResponse.json({ error: "Invalid session request." }, { status: 400 });
    }

    const users = await readDevUsersFile();
    const user = users.find(
      (u) => String(u.id) === userId && String(u.email ?? "").toLowerCase().trim() === email
    );
    if (!user) {
      return NextResponse.json({ error: "User not found." }, { status: 404 });
    }

    const res = NextResponse.json({ ok: true, user: redactUserForClient(user) });
    res.cookies.set(SELLER_AUTH_COOKIE, signSellerSession(userId), sellerSessionCookieOptions());
    return res;
  } catch (e) {
    console.error("[auth/session POST]", e);
    return NextResponse.json({ error: "Session failed." }, { status: 500 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  const had = getSellerSessionUserId();
  res.cookies.set(SELLER_AUTH_COOKIE, "", { ...sellerSessionCookieOptions(), maxAge: 0 });
  return res;
}
