import { NextResponse } from "next/server";
import { hashPassword, needsPasswordRehash, verifyPassword } from "@/lib/auth";
import { SELLER_AUTH_COOKIE } from "@/lib/seller-auth-cookie";
import {
  readDevUsersFile,
  sellerSessionCookieOptions,
  signSellerSession,
  writeDevUsersFile,
} from "@/lib/seller-auth-server";
import { redactUserForClient } from "@/lib/dev-users-server";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = typeof body?.email === "string" ? body.email.toLowerCase().trim() : "";
    const password = typeof body?.password === "string" ? body.password : "";

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password required." }, { status: 400 });
    }

    const users = await readDevUsersFile();
    const idx = users.findIndex(
      (u) => String(u.email ?? "").toLowerCase().trim() === email
    );
    if (idx < 0) {
      return NextResponse.json({ error: "No account found with this email." }, { status: 401 });
    }

    const user = users[idx];
    const storedHash = String(user.passwordHash ?? "");

    if (!storedHash) {
      return NextResponse.json(
        { error: "This account uses Google sign-in. Continue with Google instead." },
        { status: 401 }
      );
    }

    if (!verifyPassword(storedHash, password)) {
      return NextResponse.json({ error: "Incorrect email or password." }, { status: 401 });
    }

    if (user.status === "rejected") {
      return NextResponse.json({ error: "Your signup was rejected. Contact support." }, { status: 403 });
    }
    if (user.status === "expired") {
      return NextResponse.json(
        { error: "Your account has expired. Contact support to renew." },
        { status: 403 }
      );
    }

    if (needsPasswordRehash(storedHash)) {
      users[idx] = { ...user, passwordHash: hashPassword(password), authProvider: "password" };
      await writeDevUsersFile(users);
    }

    const redirect = user.status === "active" ? "dashboard" : "renew";
    const res = NextResponse.json({
      ok: true,
      redirect,
      user: redactUserForClient(users[idx]),
    });
    res.cookies.set(SELLER_AUTH_COOKIE, signSellerSession(String(user.id)), sellerSessionCookieOptions());
    return res;
  } catch (e) {
    console.error("[auth/login]", e);
    return NextResponse.json({ error: "Login failed." }, { status: 500 });
  }
}
