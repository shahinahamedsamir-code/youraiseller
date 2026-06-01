import { NextResponse } from "next/server";
import { wooFetch, normalizeStoreUrl, type WooCredentials } from "@/lib/woocommerce-api-proxy";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as WooCredentials;
    const { storeUrl, consumerKey, consumerSecret } = body;

    if (!storeUrl?.trim() || !consumerKey?.trim() || !consumerSecret?.trim()) {
      return NextResponse.json(
        { ok: false, message: "Store URL, Consumer Key and Secret are required." },
        { status: 400 }
      );
    }

    const creds: WooCredentials = {
      storeUrl: normalizeStoreUrl(storeUrl),
      consumerKey: consumerKey.trim(),
      consumerSecret: consumerSecret.trim(),
    };

    const tries = [
      "/wp-json/wc/v3/products?per_page=1",
      "/wp-json/wc/v3/system_status",
    ];

    let lastStatus = 0;
    for (const path of tries) {
      const res = await wooFetch(creds, path);
      lastStatus = res.status;
      if (res.ok) {
        return NextResponse.json({
          ok: true,
          message: `Connected to ${creds.storeUrl} via server (no CORS).`,
        });
      }
      if (res.status === 401) {
        return NextResponse.json({
          ok: false,
          message: "Invalid API credentials (401). Check key & secret.",
        });
      }
    }

    return NextResponse.json({
      ok: false,
      message: `WooCommerce API error (${lastStatus}). Check URL, SSL, and REST API.`,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Connection failed";
    return NextResponse.json(
      { ok: false, message: `Server could not reach store: ${msg}` },
      { status: 500 }
    );
  }
}
