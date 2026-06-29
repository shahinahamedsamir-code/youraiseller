import { NextResponse } from "next/server";
import { getSellerSessionUser } from "@/lib/seller-auth-server";
import { registerIncompleteCapture } from "@/lib/incomplete-capture-server";

export const dynamic = "force-dynamic";

/** Authenticated seller links their WooCommerce businessId + apiKey to their
 *  account, so the public capture endpoint can resolve & verify the plugin. */
export async function POST(req: Request) {
  const user = await getSellerSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Sign in again." }, { status: 401 });
  }
  const body = (await req.json().catch(() => ({}))) as Record<string, unknown>;
  const businessId = String(body.businessId ?? "").trim();
  const apiKey = String(body.apiKey ?? "").trim();
  if (!businessId || !apiKey) {
    return NextResponse.json(
      { error: "businessId and apiKey required" },
      { status: 400 }
    );
  }
  registerIncompleteCapture(businessId, apiKey, String(user.id));
  return NextResponse.json({ ok: true });
}
