import { NextResponse } from "next/server";
import { OAuth2Client } from "google-auth-library";

const clientId = process.env.GOOGLE_CLIENT_ID;

async function profileFromAccessToken(accessToken: string) {
  const res = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error("userinfo_failed");
  const data = (await res.json()) as {
    email?: string;
    name?: string;
    sub?: string;
    picture?: string;
  };
  if (!data.email) throw new Error("no_email");
  return {
    email: data.email,
    name: data.name ?? data.email.split("@")[0],
    sub: data.sub ?? data.email,
    picture: data.picture,
  };
}

export async function POST(req: Request) {
  if (!clientId) {
    return NextResponse.json(
      { error: "Google login is not configured. Add GOOGLE_CLIENT_ID to .env.local" },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const accessToken = body?.accessToken as string | undefined;
    const credential = body?.credential as string | undefined;

    if (accessToken) {
      const profile = await profileFromAccessToken(accessToken);
      return NextResponse.json(profile);
    }

    if (!credential) {
      return NextResponse.json({ error: "Missing Google credential" }, { status: 400 });
    }

    const client = new OAuth2Client(clientId);
    const ticket = await client.verifyIdToken({
      idToken: credential,
      audience: clientId,
    });
    const payload = ticket.getPayload();
    if (!payload?.email) {
      return NextResponse.json({ error: "Google account has no email" }, { status: 400 });
    }

    return NextResponse.json({
      email: payload.email,
      name: payload.name ?? payload.email.split("@")[0],
      sub: payload.sub ?? "",
      picture: payload.picture,
    });
  } catch (e) {
    console.error("[google-auth]", e);
    return NextResponse.json({ error: "Invalid Google sign-in" }, { status: 401 });
  }
}
