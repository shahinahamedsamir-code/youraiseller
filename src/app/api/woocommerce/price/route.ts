import { NextResponse } from "next/server";
import { wooFetch, type WooCredentials } from "@/lib/woocommerce-api-proxy";

type Body = WooCredentials & {
  sku: string;
  price: number;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const { storeUrl, consumerKey, consumerSecret, sku, price } = body;

    if (!sku?.trim()) {
      return NextResponse.json({ ok: false, message: "SKU required" }, { status: 400 });
    }
    if (!Number.isFinite(price) || price < 0) {
      return NextResponse.json({ ok: false, message: "Invalid price" }, { status: 400 });
    }

    const creds: WooCredentials = {
      storeUrl: storeUrl.trim().replace(/\/$/, ""),
      consumerKey: consumerKey.trim(),
      consumerSecret: consumerSecret.trim(),
    };

    const skuTrim = sku.trim();
    let productId: number | null = null;

    const bySku = await wooFetch(
      creds,
      `/wp-json/wc/v3/products?sku=${encodeURIComponent(skuTrim)}`
    );
    if (bySku.ok) {
      const found = (await bySku.json()) as { id: number }[];
      if (found?.[0]?.id) productId = found[0].id;
    }

    if (!productId) {
      const bySearch = await wooFetch(
        creds,
        `/wp-json/wc/v3/products?search=${encodeURIComponent(skuTrim)}&per_page=20`
      );
      if (bySearch.ok) {
        const list = (await bySearch.json()) as { id: number; sku: string }[];
        const match = list.find((p) => p.sku?.toLowerCase() === skuTrim.toLowerCase());
        if (match?.id) productId = match.id;
      }
    }

    if (!productId) {
      return NextResponse.json({
        ok: false,
        message: `SKU "${skuTrim}" not found in WooCommerce. Run Sync Products first, or fix SKU in Inventory.`,
      });
    }

    // WooCommerce prices are strings; setting regular_price updates the base price.
    const updateRes = await wooFetch(creds, `/wp-json/wc/v3/products/${productId}`, {
      method: "PUT",
      body: JSON.stringify({ regular_price: String(price) }),
    });

    if (!updateRes.ok) {
      return NextResponse.json({
        ok: false,
        message: `WooCommerce price update failed (${updateRes.status})`,
      });
    }

    return NextResponse.json({ ok: true, message: `Price set to ${price} for ${sku}` });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Price sync failed";
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
