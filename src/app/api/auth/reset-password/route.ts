import { NextResponse } from "next/server";
import { resetPasswordWithToken } from "@/lib/password-reset-server";

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
