import { NextResponse } from "next/server";
import { wooFetch, normalizeStoreUrl, type WooCredentials } from "@/lib/woocommerce-api-proxy";

/**
 * Push an order status change back to WooCommerce: PUT /wc/v3/orders/{id}
 * with the mapped Woo status. Credentials are sent per-request (same as the
 * other Woo proxy routes) and never stored server-side.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as WooCredentials & {
      orderId?: number;
      status?: string;
    };
    const { storeUrl, consumerKey, consumerSecret, orderId, status } = body;

    if (!storeUrl?.trim() || !consumerKey?.trim() || !consumerSecret?.trim()) {
      return NextResponse.json(
        { ok: false, message: "Missing WooCommerce credentials" },
        { status: 400 }
      );
    }
    if (orderId == null || !Number.isFinite(orderId) || !status?.trim()) {
      return NextResponse.json(
        { ok: false, message: "Missing orderId or status" },
        { status: 400 }
      );
    }

    const creds: WooCredentials = {
      storeUrl: normalizeStoreUrl(storeUrl),
      consumerKey: consumerKey.trim(),
      consumerSecret: consumerSecret.trim(),
    };

    const res = await wooFetch(creds, `/wp-json/wc/v3/orders/${orderId}`, {
      method: "PUT",
      body: JSON.stringify({ status: status.trim() }),
    });

    if (!res.ok) {
      const text = await res.text();
      return NextResponse.json({
        ok: false,
        message: `WooCommerce API error (${res.status}): ${text.slice(0, 200)}`,
      });
    }

    const order = await res.json();
    return NextResponse.json({ ok: true, status: order?.status });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Update failed";
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
