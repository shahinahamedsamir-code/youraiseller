import { NextResponse } from "next/server";
import { normalizeShopDomain, SHOPIFY_API_VERSION, verifyShopifyProductAccess } from "@/lib/shopify-api";

type ShopifyTestBody = {
  shopDomain?: string;
  accessToken?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ShopifyTestBody;
    const shopDomain = normalizeShopDomain(String(body.shopDomain ?? ""));
    const accessToken = String(body.accessToken ?? "").trim();

    if (!shopDomain || !accessToken) {
      return NextResponse.json(
        { ok: false, message: "Shop domain and access token are required." },
        { status: 400 }
      );
    }

    const res = await fetch(`https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/shop.json`, {
      method: "GET",
      headers: {
        "X-Shopify-Access-Token": accessToken,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      if (res.status === 401 || res.status === 403) {
        return NextResponse.json({
          ok: false,
          productsReadable: false,
          message: "Invalid Shopify access token or missing scope permissions.",
        });
      }
      return NextResponse.json({
        ok: false,
        productsReadable: false,
        message: `Shopify API request failed (${res.status}).`,
      });
    }

    const json = (await res.json()) as {
      shop?: { name?: string; domain?: string; myshopify_domain?: string };
    };

    const name = json.shop?.name?.trim() || json.shop?.myshopify_domain || shopDomain;
    const productCheck = await verifyShopifyProductAccess({ shopDomain, accessToken });

    if (!productCheck.ok) {
      return NextResponse.json({
        ok: false,
        productsReadable: false,
        shopName: name,
        message: `Found store "${name}", but product sync will fail: ${productCheck.message}`,
      });
    }

    return NextResponse.json({
      ok: true,
      productsReadable: true,
      shopName: name,
      message: `Connected to ${name}. You can sync products now.`,
      shop: json.shop ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Connection test failed.";
    return NextResponse.json({ ok: false, productsReadable: false, message }, { status: 500 });
  }
}
