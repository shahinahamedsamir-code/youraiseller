import { NextResponse } from "next/server";
import { getSellerSessionUser } from "@/lib/seller-auth-server";
import { pullIncompleteCaptureQueue } from "@/lib/incomplete-capture-server";

export const dynamic = "force-dynamic";

/** The seller dashboard polls this, pulls captured checkouts, and clears them. */
export async function GET() {
  const user = await getSellerSessionUser();
  if (!user) return NextResponse.json({ items: [] });
  const items = pullIncompleteCaptureQueue(String(user.id));
  return NextResponse.json({ items });
}
