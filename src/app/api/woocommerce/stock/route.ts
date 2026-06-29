import { NextResponse } from "next/server";
import {
  resolveWooProductPath,
  wooFetch,
  type WooCredentials,
} from "@/lib/woocommerce-api-proxy";

type Body = WooCredentials & {
  sku: string;
  stockQty: number;
  mode: "exact" | "status_only";
  wooProductId?: number;
  wooVariationId?: number;
  wooParentId?: number;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const { storeUrl, consumerKey, consumerSecret, sku, stockQty, mode } = body;

    if (!sku?.trim() && !body.wooProductId && !body.wooVariationId) {
      return NextResponse.json({ ok: false, message: "SKU required" }, { status: 400 });
    }

    const creds: WooCredentials = {
      storeUrl: storeUrl.trim().replace(/\/$/, ""),
      consumerKey: consumerKey.trim(),
      consumerSecret: consumerSecret.trim(),
    };

    const skuTrim = (sku ?? "").trim();
    const targetPath = await resolveWooProductPath(creds, {
      wooVariationId: body.wooVariationId,
      wooParentId: body.wooParentId,
      wooProductId: body.wooProductId,
      sku: skuTrim,
    });

    if (!targetPath) {
      return NextResponse.json({
        ok: false,
        message: `"${skuTrim}" not found in WooCommerce. Run Sync Products first, or fix SKU in Inventory.`,
      });
    }

    const payload =
      mode === "exact"
        ? {
            // App owns the real number — set quantity AND status.
            manage_stock: true,
            stock_quantity: stockQty,
            stock_status: stockQty > 0 ? "instock" : "outofstock",
          }
        : {
            // Status only — turn OFF WooCommerce quantity tracking so it honours
            // the in/out status we send instead of recomputing from its own qty.
            manage_stock: false,
            stock_status: stockQty > 0 ? "instock" : "outofstock",
          };

    const updateRes = await wooFetch(creds, targetPath, {
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
          ? `Stock set to ${stockQty} for ${skuTrim}`
          : stockQty > 0
            ? `${skuTrim} marked in stock`
            : `${skuTrim} marked out of stock`,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Sync failed";
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
