import { NextResponse } from "next/server";
import { wooFetch, normalizeStoreUrl, type WooCredentials } from "@/lib/woocommerce-api-proxy";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as WooCredentials & {
      page?: number;
      perPage?: number;
      type?: string;
      parentId?: number;
      /** List child variations via GET /products?parent=ID */
      parentQuery?: number;
    };
    const {
      storeUrl,
      consumerKey,
      consumerSecret,
      page = 1,
      perPage = 50,
      type,
      parentId,
      parentQuery,
    } = body;

    if (!storeUrl?.trim() || !consumerKey?.trim() || !consumerSecret?.trim()) {
      return NextResponse.json(
        { ok: false, message: "Missing WooCommerce credentials" },
        { status: 400 }
      );
    }

    const creds: WooCredentials = {
      storeUrl: normalizeStoreUrl(storeUrl),
      consumerKey: consumerKey.trim(),
      consumerSecret: consumerSecret.trim(),
    };

    if (type === "variation" || type === "variations") {
      return NextResponse.json({
        ok: false,
        message:
          "WooCommerce does not support type=variation on /products. Use parentId to load variations.",
      });
    }

    let path = `/wp-json/wc/v3/products?page=${page}&per_page=${perPage}&status=publish`;
    if (type && ["simple", "variable", "grouped", "external"].includes(type)) {
      path += `&type=${encodeURIComponent(type)}`;
    }
    if (parentQuery) {
      path = `/wp-json/wc/v3/products?parent=${parentQuery}&page=${page}&per_page=${perPage}&status=any`;
    } else if (parentId) {
      path = `/wp-json/wc/v3/products/${parentId}/variations?page=${page}&per_page=${perPage}&status=any`;
    }

    const res = await wooFetch(creds, path);

    if (!res.ok) {
      const detail = (await res.text()).slice(0, 280);
      return NextResponse.json({
        ok: false,
        message: `WooCommerce API error (${res.status})${detail ? `: ${detail}` : ""}`,
      });
    }

    const products = await res.json();
    const totalPages = parseInt(res.headers.get("x-wp-totalpages") ?? "1", 10);
    const total = parseInt(res.headers.get("x-wp-total") ?? "0", 10);

    return NextResponse.json({
      ok: true,
      products,
      page,
      totalPages,
      total,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Fetch failed";
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
