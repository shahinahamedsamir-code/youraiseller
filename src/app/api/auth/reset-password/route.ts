import { NextResponse } from "next/server";
import {
  checkPasswordResetOtp,
  resetPasswordWithOtp,
} from "@/lib/password-reset-server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = typeof body?.email === "string" ? body.email : "";
    const otp = typeof body?.otp === "string" ? body.otp : "";
    const password = typeof body?.password === "string" ? body.password : "";
    if (body?.verifyOnly === true) {
      const status = await checkPasswordResetOtp(email, otp);
      if (!status.ok) {
        return NextResponse.json({ error: status.error }, { status: 400 });
      }
      return NextResponse.json({ ok: true, expiresAt: status.expiresAt });
    }
    const result = await resetPasswordWithOtp(email, otp, password);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[auth/reset-password]", e);
    return NextResponse.json({ error: "Could not reset password." }, { status: 500 });
  }
}
