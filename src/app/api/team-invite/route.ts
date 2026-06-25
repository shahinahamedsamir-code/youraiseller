import { NextResponse } from "next/server";
import { getPublicRequestOrigin } from "@/lib/app-hosts";
import { isEmailConfigured, sendTeamInviteEmail } from "@/lib/email-server";
import { createTeamInviteToken } from "@/lib/team-invite-server";
import {
  getSellerSessionUserId,
  readDevUsersFile,
  resolveDataScopeForUser,
} from "@/lib/seller-auth-server";
import {
  getClientIp,
  isRateLimited,
  RATE_WINDOWS,
  recordHit,
  retryAfterMs,
} from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

const MAX_PER_IP = 20;
const WINDOW = RATE_WINDOWS.oneHour;

function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

export async function POST(req: Request) {
  const sellerSessionId = getSellerSessionUserId();
  if (!sellerSessionId) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const ip = getClientIp(req);
    const ipKey = `invite:ip:${ip}`;
    if (isRateLimited(ipKey, MAX_PER_IP, WINDOW)) {
      const seconds = Math.ceil(retryAfterMs(ipKey, MAX_PER_IP, WINDOW) / 1000);
      return NextResponse.json(
        { error: `Too many invites. Try again in ${Math.ceil(seconds / 60)} minute(s).` },
        { status: 429, headers: { "Retry-After": String(seconds) } }
      );
    }

    const body = await req.json();
    const email = normalizeEmail(typeof body?.email === "string" ? body.email : "");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return NextResponse.json({ error: "A valid email is required." }, { status: 400 });
    }

    // Verify the target is a team member under this owner's scope.
    const allUsers = await readDevUsersFile();
    const seller = allUsers.find((u) => String(u.id) === sellerSessionId);
    if (!seller) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }
    const ownerScope = resolveDataScopeForUser(seller, allUsers);
    const target = allUsers.find(
      (u) => normalizeEmail(String(u.email ?? "")) === email
    );
    const targetParent = String(target?.parentAccountId ?? "");
    if (!target || !ownerScope || targetParent !== ownerScope) {
      return NextResponse.json(
        { error: "This email is not a member of your team." },
        { status: 403 }
      );
    }

    recordHit(ipKey, WINDOW);

    const inviterLabel =
      String(seller.company ?? "").trim() ||
      String(seller.name ?? "").trim() ||
      "Your account owner";

    const token = await createTeamInviteToken(email);
    const origin = getPublicRequestOrigin(req);
    const acceptUrl = `${origin.replace(/\/$/, "")}/accept-invite?token=${token}`;

    if (isEmailConfigured()) {
      const sent = await sendTeamInviteEmail(email, origin, acceptUrl, inviterLabel);
      if (!sent.ok) {
        return NextResponse.json(
          { error: `Could not send email. Check SMTP settings. (${sent.error})` },
          { status: 500 }
        );
      }
      return NextResponse.json({
        ok: true,
        emailSent: true,
        message: `Invite sent to ${email}.`,
      });
    }

    // Dev mode (no SMTP): return the link so the owner can share it manually.
    return NextResponse.json({
      ok: true,
      emailSent: false,
      acceptUrl,
      message: "SMTP not configured — copy this invite link and share it manually.",
    });
  } catch (e) {
    console.error("[team-invite]", e);
    return NextResponse.json({ error: "Could not create invite." }, { status: 500 });
  }
}
