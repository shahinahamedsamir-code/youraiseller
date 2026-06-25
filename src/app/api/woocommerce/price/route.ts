import { NextResponse } from "next/server";
import {
  resolveWooProductPath,
  wooFetch,
  type WooCredentials,
} from "@/lib/woocommerce-api-proxy";

type Body = WooCredentials & {
  sku: string;
  price: number;
  wooProductId?: number;
  wooVariationId?: number;
  wooParentId?: number;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const { storeUrl, consumerKey, consumerSecret, sku, price } = body;

    if (!sku?.trim() && !body.wooProductId && !body.wooVariationId) {
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

    // WooCommerce prices are strings; setting regular_price updates the base price.
    const updateRes = await wooFetch(creds, targetPath, {
      method: "PUT",
      body: JSON.stringify({ regular_price: String(price) }),
    });

    if (!updateRes.ok) {
      return NextResponse.json({
        ok: false,
        message: `WooCommerce price update failed (${updateRes.status})`,
      });
    }

    return NextResponse.json({ ok: true, message: `Price set to ${price} for ${skuTrim}` });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Price sync failed";
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
