import { NextResponse } from "next/server";
import { DEV_AUTH_COOKIE } from "@/lib/dev-auth-cookie";

function normalizeEnvPassword(raw: string | undefined): string {
  if (!raw?.trim()) return "youraiseller-dev-2026";
  let v = raw.trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1).trim();
  }
  return v || "youraiseller-dev-2026";
}

function expectedPassword(): string {
  // Server-only — never use NEXT_PUBLIC_* (would expose in client bundle).
  return normalizeEnvPassword(process.env.DEV_ADMIN_PASSWORD);
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const password = body?.password;
    if (typeof password !== "string") {
      return NextResponse.json({ ok: false }, { status: 400 });
    }
    const ok = password.trim() === expectedPassword();
    const res = NextResponse.json({ ok });
    if (ok) {
      res.cookies.set(DEV_AUTH_COOKIE, "1", {
        httpOnly: true,
        path: "/",
        sameSite: "lax",
        secure: process.env.NODE_ENV === "production",
        maxAge: 60 * 60 * 24 * 30,
      });
    }
    return res;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
