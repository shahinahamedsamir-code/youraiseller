import { NextResponse } from "next/server";
import { verifyGoogleProfile } from "@/lib/google-auth-server";
import { getPlanFeatures } from "@/lib/plan-presets";
import { redactUserForClient } from "@/lib/dev-users-server";
import { SELLER_AUTH_COOKIE } from "@/lib/seller-auth-cookie";
import {
  readDevUsersFile,
  sellerSessionCookieOptions,
  signSellerSession,
  writeDevUsersFile,
} from "@/lib/seller-auth-server";

function nextUserId(users: { id?: string }[]): string {
  let max = 0;
  for (const u of users) {
    const m = String(u.id ?? "").match(/U-(\d+)/);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `U-${String(max + 1).padStart(3, "0")}`;
}

function allocateCustomerId(users: Array<{ customerId?: string }>): string {
  let max = 0;
  for (const u of users) {
    const m = String(u.customerId ?? "").match(/YAIS-(\d+)/i);
    if (m) max = Math.max(max, parseInt(m[1], 10));
  }
  return `YAIS-${String(max + 1).padStart(3, "0")}`;
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const mode = body?.mode === "signup" ? "signup" : "login";

    // Verify the Google sign-in server-side — never trust a client-supplied
    // email. The session cookie below is only minted for the verified identity.
    const accessToken = typeof body?.accessToken === "string" ? body.accessToken : undefined;
    const credential = typeof body?.credential === "string" ? body.credential : undefined;
    if (!accessToken && !credential) {
      return NextResponse.json({ error: "Missing Google credential." }, { status: 400 });
    }

    let profile;
    try {
      profile = await verifyGoogleProfile({ accessToken, credential });
    } catch (err) {
      console.error("[auth/google-account] verify failed", err);
      return NextResponse.json({ error: "Invalid Google sign-in." }, { status: 401 });
    }

    const email = profile.email.toLowerCase().trim();
    const name = profile.name.trim() || email.split("@")[0];
    const googleId = profile.sub;

    if (!email) {
      return NextResponse.json({ error: "Invalid Google profile." }, { status: 400 });
    }

    const users = await readDevUsersFile();
    let idx = users.findIndex(
      (u) => String(u.email ?? "").toLowerCase().trim() === email
    );

    if (idx < 0) {
      const user = {
        id: nextUserId(users),
        customerId: allocateCustomerId(users as Array<{ customerId?: string }>),
        name,
        email,
        company: name,
        passwordHash: "",
        googleId,
        authProvider: "google",
        plan: "basic",
        status: "pending",
        features: getPlanFeatures("basic"),
        createdAt: new Date().toLocaleDateString("en-GB", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        }),
      };
      users.unshift(user);
      await writeDevUsersFile(users);
      idx = 0;
    } else {
      const user = users[idx];
      if (mode === "signup" && user.status !== "pending") {
        return NextResponse.json(
          {
            error:
              "This email is already registered. Sign in instead, or use Google on the login page.",
          },
          { status: 409 }
        );
      }
      if (user.status === "rejected") {
        return NextResponse.json(
          { error: "Your signup was rejected. Contact support." },
          { status: 403 }
        );
      }
      if (user.status === "expired") {
        return NextResponse.json(
          { error: "Your account has expired. Contact support to renew." },
          { status: 403 }
        );
      }
      if (!user.googleId && googleId) {
        users[idx] = { ...user, googleId, authProvider: "google" };
        await writeDevUsersFile(users);
      }
    }

    const user = users[idx];
    const redirect = user.status === "active" ? "dashboard" : "renew";
    const res = NextResponse.json({
      ok: true,
      redirect,
      user: redactUserForClient(user),
    });
    res.cookies.set(
      SELLER_AUTH_COOKIE,
      signSellerSession(String(user.id)),
      sellerSessionCookieOptions()
    );
    return res;
  } catch (e) {
    console.error("[auth/google-account]", e);
    return NextResponse.json({ error: "Google sign-in failed." }, { status: 500 });
  }
}
