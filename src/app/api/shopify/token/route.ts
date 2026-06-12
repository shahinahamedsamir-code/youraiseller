import { NextResponse } from "next/server";
import {
  normalizeShopDomain,
  SHOPIFY_API_VERSION,
  verifyShopifyProductAccess,
} from "@/lib/shopify-api";

type TokenBody = {
  shopDomain?: string;
  clientId?: string;
  clientSecret?: string;
};

const REQUIRED_SCOPES = ["read_products", "read_orders", "read_inventory"] as const;

function missingScopes(granted: string): string[] {
  const set = new Set(
    granted
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
  return REQUIRED_SCOPES.filter((scope) => !set.has(scope));
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as TokenBody;
    const shopDomain = normalizeShopDomain(String(body.shopDomain ?? ""));
    const clientId = String(body.clientId ?? "").trim();
    const clientSecret = String(body.clientSecret ?? "").trim();

    if (!shopDomain || !clientId || !clientSecret) {
      return NextResponse.json(
        { ok: false, message: "Shop domain, Client ID, and Client Secret are required." },
        { status: 400 }
      );
    }

    const tokenRes = await fetch(`https://${shopDomain}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "client_credentials",
        client_id: clientId,
        client_secret: clientSecret,
      }),
      cache: "no-store",
    });

    const raw = await tokenRes.text();
    if (!tokenRes.ok) {
      let message = `Token request failed (${tokenRes.status}).`;
      try {
        const err = JSON.parse(raw) as { error_description?: string; error?: string };
        message = err.error_description || err.error || message;
      } catch {
        if (raw) message = raw.slice(0, 220);
      }
      return NextResponse.json({
        ok: false,
        message: `${message} Ensure the app is installed on this store from Dev Dashboard (dev.shopify.com).`,
      });
    }

    const tokenJson = JSON.parse(raw) as {
      access_token?: string;
      scope?: string;
      expires_in?: number;
    };
    const accessToken = String(tokenJson.access_token ?? "").trim();
    if (!accessToken) {
      return NextResponse.json({ ok: false, message: "Shopify returned an empty access token." });
    }

    const scope = String(tokenJson.scope ?? "").trim();
    const gaps = missingScopes(scope);
    const productCheck = await verifyShopifyProductAccess({ shopDomain, accessToken });
    const scopesOk = gaps.length === 0;
    const apiOk = productCheck.ok;

    let message: string;
    if (scopesOk && apiOk) {
      message =
        "Connected successfully. You can sync products. (Token lasts ~24 hours — click Connect again when it expires.)";
    } else if (!scopesOk && !apiOk) {
      message =
        "Token received but some permissions are missing. Dev Dashboard → Versions → add permissions → Release → reinstall on your store → click Connect.";
    } else if (!scopesOk && apiOk) {
      message = "Connected successfully. Token will last about 24 hours.";
    } else {
      message = `Token received but product API check failed: ${productCheck.message}`;
    }

    return NextResponse.json({
      ok: true,
      accessToken,
      scope,
      expiresIn: tokenJson.expires_in ?? 86399,
      apiVersion: SHOPIFY_API_VERSION,
      missingScopes: apiOk ? [] : gaps.length ? gaps : ["read_products"],
      productsReadable: apiOk,
      message,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Could not get access token.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
