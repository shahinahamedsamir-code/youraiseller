import { NextResponse } from "next/server";
import { acceptTeamInvite, checkTeamInviteToken } from "@/lib/team-invite-server";
import {
  getClientIp,
  isRateLimited,
  RATE_WINDOWS,
  recordHit,
  retryAfterMs,
} from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const MAX_PER_IP = 15;
const WINDOW = RATE_WINDOWS.oneHour;

export async function GET(req: Request) {
  const token = new URL(req.url).searchParams.get("token") ?? "";
  const status = await checkTeamInviteToken(token);
  if (!status.ok) {
    return NextResponse.json(
      { ok: false, error: status.error, expired: status.expired ?? false },
      { status: 400 }
    );
  }
  return NextResponse.json({ ok: true, email: status.email, name: status.name });
}

export async function POST(req: Request) {
  try {
    const ip = getClientIp(req);
    const ipKey = `accept-invite:ip:${ip}`;
    if (isRateLimited(ipKey, MAX_PER_IP, WINDOW)) {
      const seconds = Math.ceil(retryAfterMs(ipKey, MAX_PER_IP, WINDOW) / 1000);
      return NextResponse.json(
        { error: `Too many attempts. Try again in ${Math.ceil(seconds / 60)} minute(s).` },
        { status: 429, headers: { "Retry-After": String(seconds) } }
      );
    }
    recordHit(ipKey, WINDOW);

    const body = await req.json();
    const token = typeof body?.token === "string" ? body.token : "";
    const password = typeof body?.password === "string" ? body.password : "";

    const result = await acceptTeamInvite(token, password);
    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[accept-invite]", e);
    return NextResponse.json({ error: "Could not accept invite." }, { status: 500 });
  }
}
