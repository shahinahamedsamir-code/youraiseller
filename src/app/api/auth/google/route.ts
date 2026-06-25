import { NextResponse } from "next/server";
import { verifyGoogleProfile } from "@/lib/google-auth-server";

export async function POST(req: Request) {
  if (!process.env.GOOGLE_CLIENT_ID?.trim()) {
    return NextResponse.json(
      { error: "Google login is not configured. Add GOOGLE_CLIENT_ID to .env.local" },
      { status: 503 }
    );
  }

  try {
    const body = await req.json();
    const accessToken = typeof body?.accessToken === "string" ? body.accessToken : undefined;
    const credential = typeof body?.credential === "string" ? body.credential : undefined;

    if (!accessToken && !credential) {
      return NextResponse.json({ error: "Missing Google credential" }, { status: 400 });
    }

    const profile = await verifyGoogleProfile({ accessToken, credential });
    return NextResponse.json(profile);
  } catch (e) {
    console.error("[google-auth]", e);
    return NextResponse.json({ error: "Invalid Google sign-in" }, { status: 401 });
  }
}
