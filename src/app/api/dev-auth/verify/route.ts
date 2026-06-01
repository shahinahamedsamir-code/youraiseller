import { NextResponse } from "next/server";
import { DEV_AUTH_COOKIE } from "@/lib/dev-auth-cookie";

function normalizeEnvPassword(raw: string | undefined): string {
  if (!raw) return "youraiseller-dev-2026";
  let v = raw.trim();
  if (
    (v.startsWith('"') && v.endsWith('"')) ||
    (v.startsWith("'") && v.endsWith("'"))
  ) {
    v = v.slice(1, -1);
  }
  return v;
}

function expectedPassword(): string {
  const raw =
    process.env.DEV_ADMIN_PASSWORD ??
    process.env.NEXT_PUBLIC_DEV_ADMIN_PASSWORD;
  return normalizeEnvPassword(raw);
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
        maxAge: 60 * 60 * 24 * 30,
      });
    }
    return res;
  } catch {
    return NextResponse.json({ ok: false }, { status: 400 });
  }
}
