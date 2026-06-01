import { NextResponse } from "next/server";
import { wooFetch, type WooCredentials } from "@/lib/woocommerce-api-proxy";

type Body = WooCredentials & {
  sku: string;
  stockQty: number;
  mode: "exact" | "status_only";
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const { storeUrl, consumerKey, consumerSecret, sku, stockQty, mode } = body;

    if (!sku?.trim()) {
      return NextResponse.json({ ok: false, message: "SKU required" }, { status: 400 });
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
        const match = list.find(
          (p) => p.sku?.toLowerCase() === skuTrim.toLowerCase()
        );
        if (match?.id) productId = match.id;
      }
    }

    if (!productId) {
      return NextResponse.json({
        ok: false,
        message: `SKU "${skuTrim}" not found in WooCommerce. Run Sync Products first, or fix SKU in Inventory.`,
      });
    }

    const payload =
      mode === "exact"
        ? {
            manage_stock: true,
            stock_quantity: stockQty,
            stock_status: stockQty > 0 ? "instock" : "outofstock",
          }
        : {
            manage_stock: true,
            stock_status: stockQty > 0 ? "instock" : "outofstock",
          };

    const updateRes = await wooFetch(creds, `/wp-json/wc/v3/products/${productId}`, {
      method: "PUT",
      body: JSON.stringify(payload),
    });

    if (!updateRes.ok) {
      return NextResponse.json({
        ok: false,
        message: `WooCommerce update failed (${updateRes.status})`,
      });
    }

    return NextResponse.json({
      ok: true,
      message:
        mode === "exact"
          ? `Stock set to ${stockQty} for ${sku}`
          : stockQty > 0
            ? `${sku} marked in stock`
            : `${sku} marked out of stock`,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sync failed";
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
