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

/**
 * Refresh-only: re-sign an existing, already-verified session so the cookie
 * keeps rolling on each page load. This endpoint CANNOT bootstrap a session
 * from a client-supplied userId/email — a new session is only minted by
 * /api/auth/login (password) or /api/auth/google-account (verified Google),
 * both of which prove the credential first. Closes the prior hole where anyone
 * who knew a userId + email could mint that seller's session.
 */
export async function POST() {
  try {
    const currentId = getSellerSessionUserId();
    if (!currentId) {
      return NextResponse.json({ error: "No active session." }, { status: 401 });
    }

    const users = await readDevUsersFile();
    const user = users.find((u) => String(u.id) === currentId);
    if (!user) {
      // Stale cookie for a deleted account — clear it.
      const res = NextResponse.json({ error: "User not found." }, { status: 404 });
      res.cookies.set(SELLER_AUTH_COOKIE, "", {
        ...sellerSessionCookieOptions(),
        maxAge: 0,
      });
      return res;
    }

    const res = NextResponse.json({ ok: true, user: redactUserForClient(user) });
    res.cookies.set(
      SELLER_AUTH_COOKIE,
      signSellerSession(currentId),
      sellerSessionCookieOptions()
    );
    return res;
  } catch (e) {
    console.error("[auth/session POST]", e);
    return NextResponse.json({ error: "Session failed." }, { status: 500 });
  }
}

export async function DELETE() {
  const res = NextResponse.json({ ok: true });
  res.cookies.set(SELLER_AUTH_COOKIE, "", { ...sellerSessionCookieOptions(), maxAge: 0 });
  return res;
}
