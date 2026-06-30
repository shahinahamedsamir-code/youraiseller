import { NextResponse } from "next/server";
import { getSellerSessionUser } from "@/lib/seller-auth-server";
import {
  registerIncompleteCapture,
  type BlockListItem,
} from "@/lib/incomplete-capture-server";

export const dynamic = "force-dynamic";

/** Authenticated seller links their WooCommerce businessId + apiKey to their
 *  account (and syncs their Order Block List) so the public capture and
 *  order-guard endpoints can resolve, verify and protect the plugin. */
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

  const rawBlocks: unknown[] = Array.isArray(body.blockList) ? (body.blockList as unknown[]) : [];
  const blockList: BlockListItem[] = rawBlocks
    .map((raw) => {
      const b = (raw ?? {}) as Record<string, unknown>;
      const type = String(b.type ?? "");
      const value = String(b.value ?? "").trim();
      return { type, value };
    })
    .filter(
      (b): b is BlockListItem =>
        (b.type === "phone" || b.type === "ip" || b.type === "email") && !!b.value
    )
    .slice(0, 5000);

  registerIncompleteCapture(businessId, apiKey, String(user.id), blockList);
  return NextResponse.json({ ok: true });
}
