import { NextResponse } from "next/server";

type ShopifyTestBody = {
  shopDomain?: string;
  accessToken?: string;
};

function normalizeShopDomain(input: string): string {
  const trimmed = input.trim().toLowerCase();
  if (!trimmed) return "";
  const noProtocol = trimmed.replace(/^https?:\/\//, "").replace(/\/+$/, "");
  return noProtocol;
}

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

    const res = await fetch(`https://${shopDomain}/admin/api/2025-01/shop.json`, {
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
          message: "Invalid Shopify access token or missing scope permissions.",
        });
      }
      return NextResponse.json({
        ok: false,
        message: `Shopify API request failed (${res.status}).`,
      });
    }

    const json = (await res.json()) as {
      shop?: { name?: string; domain?: string; myshopify_domain?: string };
    };

    const name = json.shop?.name?.trim() || json.shop?.myshopify_domain || shopDomain;

    return NextResponse.json({
      ok: true,
      message: `Connected successfully to ${name}.`,
      shop: json.shop ?? null,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Shopify connection test failed.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

