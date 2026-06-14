import { randomBytes } from "crypto";
import { NextResponse } from "next/server";
import { getPublicRequestOrigin } from "@/lib/app-hosts";

type StartBody = {
  shopDomain?: string;
  clientId?: string;
  clientSecret?: string;
};

function normalizeShopDomain(input: string): string {
  return input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

function isValidShopDomain(shop: string): boolean {
  // Shopify OAuth must target the store's myshopify hostname.
  return /^[a-z0-9][a-z0-9-]*\.myshopify\.com$/i.test(shop);
}

const OAUTH_STATE_COOKIE = "shopify_oauth_state";
const OAUTH_CTX_COOKIE = "shopify_oauth_ctx";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as StartBody;
    const shop = normalizeShopDomain(String(body.shopDomain ?? ""));
    const clientId = String(body.clientId ?? "").trim();
    const clientSecret = String(body.clientSecret ?? "").trim();

    if (!shop || !clientId || !clientSecret) {
      return NextResponse.json(
        { ok: false, message: "Shop domain, Client ID, and Client Secret are required." },
        { status: 400 }
      );
    }
    if (!isValidShopDomain(shop)) {
      return NextResponse.json(
        { ok: false, message: "Shop domain must be like: your-store.myshopify.com" },
        { status: 400 }
      );
    }

    const state = randomBytes(16).toString("hex");
    const scopes = [
      "read_products",
      "write_products",
      "read_orders",
      "write_orders",
      "read_inventory",
      "write_inventory",
      "read_locations",
      "read_checkouts",
    ].join(",");

    const current = new URL(req.url);
    const publicOrigin = getPublicRequestOrigin(req);
    const callbackUrl = `${publicOrigin}/api/shopify/oauth/callback`;
    const authorizeUrl =
      `https://${shop}/admin/oauth/authorize` +
      `?client_id=${encodeURIComponent(clientId)}` +
      `&scope=${encodeURIComponent(scopes)}` +
      `&redirect_uri=${encodeURIComponent(callbackUrl)}` +
      `&state=${encodeURIComponent(state)}`;

    const res = NextResponse.json({ ok: true, authorizeUrl });
    const secure = publicOrigin.startsWith("https://");
    const maxAge = 10 * 60; // 10 min

    res.cookies.set(OAUTH_STATE_COOKIE, state, {
      httpOnly: true,
      sameSite: "lax",
      secure,
      path: "/",
      maxAge,
    });
    res.cookies.set(
      OAUTH_CTX_COOKIE,
      JSON.stringify({ shop, clientId, clientSecret }),
      {
        httpOnly: true,
        sameSite: "lax",
        secure,
        path: "/",
        maxAge,
      }
    );

    return res;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to start Shopify OAuth.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
