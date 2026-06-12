import { NextResponse } from "next/server";
import { getPublicRequestOrigin } from "@/lib/app-hosts";
import { createPasswordResetRequest } from "@/lib/password-reset-server";
import {
  getClientIp,
  isRateLimited,
  RATE_WINDOWS,
  recordHit,
  retryAfterMs,
} from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const MAX_PER_EMAIL = 3;
const MAX_PER_IP = 8;
const WINDOW = RATE_WINDOWS.oneHour;

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const email = typeof body?.email === "string" ? body.email : "";

    const ip = getClientIp(req);
    const ipKey = `forgot:ip:${ip}`;
    const emailKey = `forgot:email:${email.toLowerCase().trim()}`;

    if (
      isRateLimited(ipKey, MAX_PER_IP, WINDOW) ||
      isRateLimited(emailKey, MAX_PER_EMAIL, WINDOW)
    ) {
      const waitMs = Math.max(
        retryAfterMs(ipKey, MAX_PER_IP, WINDOW),
        retryAfterMs(emailKey, MAX_PER_EMAIL, WINDOW)
      );
      const seconds = Math.ceil(waitMs / 1000);
      return NextResponse.json(
        { error: `Too many reset requests. Try again in ${Math.ceil(seconds / 60)} minute(s).` },
        { status: 429, headers: { "Retry-After": String(seconds) } }
      );
    }
    recordHit(ipKey, WINDOW);
    recordHit(emailKey, WINDOW);

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
