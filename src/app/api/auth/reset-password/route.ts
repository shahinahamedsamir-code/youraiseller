import { NextResponse } from "next/server";
import {
  checkPasswordResetToken,
  resetPasswordWithToken,
} from "@/lib/password-reset-server";

export const dynamic = "force-dynamic";

export async function GET(req: Request) {
  try {
    const token = new URL(req.url).searchParams.get("token") ?? "";
    const status = await checkPasswordResetToken(token);
    if (!status.ok) {
      return NextResponse.json(
        { ok: false, error: status.error, expired: status.expired ?? false },
        { status: 400 }
      );
    }
    return NextResponse.json({
      ok: true,
      expiresAt: status.expiresAt,
    });
  } catch (e) {
    console.error("[auth/reset-password GET]", e);
    return NextResponse.json({ error: "Could not verify reset link." }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const token = typeof body?.token === "string" ? body.token : "";
    const password = typeof body?.password === "string" ? body.password : "";
    const result = await resetPasswordWithToken(token, password);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[auth/reset-password]", e);
    return NextResponse.json({ error: "Could not reset password." }, { status: 500 });
  }
}
