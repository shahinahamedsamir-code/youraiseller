import { NextResponse } from "next/server";
import { getPublicRequestOrigin } from "@/lib/app-hosts";
import { createPasswordResetRequest } from "@/lib/password-reset-server";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = typeof body?.email === "string" ? body.email : "";
    const origin = getPublicRequestOrigin(req);
    const result = await createPasswordResetRequest(email, origin);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({
      ok: true,
      message: result.message,
      emailSent: result.emailSent ?? false,
      resetUrl: result.emailSent ? undefined : result.resetUrl,
    });
  } catch (e) {
    console.error("[auth/forgot-password]", e);
    return NextResponse.json({ error: "Could not process request." }, { status: 500 });
  }
}
