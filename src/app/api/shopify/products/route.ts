import { NextResponse } from "next/server";
import { fetchShopifyProducts, normalizeShopDomain } from "@/lib/shopify-api";

type ShopifyProductsBody = {
  shopDomain?: string;
  accessToken?: string;
  limit?: number;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ShopifyProductsBody;
    const shopDomain = normalizeShopDomain(String(body.shopDomain ?? ""));
    const accessToken = String(body.accessToken ?? "").trim();
    const requestedLimit =
      typeof body.limit === "number" && Number.isFinite(body.limit) ? body.limit : 250;
    const hardLimit = Math.min(Math.max(1, Math.floor(requestedLimit)), 1000);

    if (!shopDomain || !accessToken) {
      return NextResponse.json(
        { ok: false, message: "Shop domain and access token are required." },
        { status: 400 }
      );
    }

    const result = await fetchShopifyProducts({
      shopDomain,
      accessToken,
      limit: hardLimit,
    });

    if (!result.ok) {
      return NextResponse.json({
        ok: false,
        message: result.message,
        scopeMissing: result.scopeMissing ?? false,
      });
    }

    return NextResponse.json({
      ok: true,
      products: result.products,
      total: result.products.length,
      source: result.source,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to sync Shopify products.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
