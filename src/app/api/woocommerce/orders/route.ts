import { NextResponse } from "next/server";
import { wooFetch, normalizeStoreUrl, type WooCredentials } from "@/lib/woocommerce-api-proxy";

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as WooCredentials & {
      page?: number;
      perPage?: number;
      statuses?: string;
      /** Single order — full REST payload (meta_data, etc.) */
      orderId?: number;
      /** ISO8601 — only orders created after this (Woo `after` param) */
      after?: string;
      /** ISO8601 — orders modified after (best for fast incremental sync) */
      modified_after?: string;
    };
    const {
      storeUrl,
      consumerKey,
      consumerSecret,
      orderId,
      page = 1,
      perPage = 50,
      statuses = "pending,processing,on-hold,completed,cancelled,failed,refunded,checkout-draft",
      after,
      modified_after,
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

    if (orderId != null && Number.isFinite(orderId)) {
      const res = await wooFetch(creds, `/wp-json/wc/v3/orders/${orderId}`);
      if (!res.ok) {
        const text = await res.text();
        return NextResponse.json({
          ok: false,
          message: `WooCommerce API error (${res.status}): ${text.slice(0, 200)}`,
        });
      }
      const order = await res.json();
      return NextResponse.json({ ok: true, order });
    }

    const afterParam = after?.trim()
      ? `&after=${encodeURIComponent(after.trim())}`
      : "";
    const modifiedParam = modified_after?.trim()
      ? `&modified_after=${encodeURIComponent(modified_after.trim())}`
      : "";
    const statusQuery =
      statuses === "all"
        ? ""
        : `&status=${encodeURIComponent(statuses)}`;
    const res = await wooFetch(
      creds,
      `/wp-json/wc/v3/orders?page=${page}&per_page=${perPage}&orderby=modified&order=desc${statusQuery}${afterParam}${modifiedParam}`
    );

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({
        ok: false,
        message: `WooCommerce API error (${res.status}): ${text.slice(0, 200)}`,
      });
    }

    const orders = await res.json();
    const totalPages = parseInt(res.headers.get("x-wp-totalpages") ?? "1", 10);
    const total = parseInt(res.headers.get("x-wp-total") ?? "0", 10);

    return NextResponse.json({
      ok: true,
      orders,
      page,
      totalPages,
      total,
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Fetch failed";
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
