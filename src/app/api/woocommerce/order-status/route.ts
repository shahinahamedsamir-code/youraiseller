import { NextResponse } from "next/server";
import { wooFetch, normalizeStoreUrl, type WooCredentials } from "@/lib/woocommerce-api-proxy";

/**
 * Push an order status change back to WooCommerce. Works with EITHER setup the
 * seller has:
 *   1) WooCommerce REST API (consumer key/secret) — PUT /wc/v3/orders/{id}
 *   2) the YourAI Seller Connect plugin — POST {store}/wp-json/yourai/v1/order-status
 * Tries REST first, falls back to the plugin, so status sync works whichever is
 * connected (and is fine if both are). Credentials are per-request, never stored.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as {
      storeUrl?: string;
      consumerKey?: string;
      consumerSecret?: string;
      apiKey?: string;
      orderId?: number;
      status?: string;
      fallbackStatus?: string;
    };
    const { storeUrl, consumerKey, consumerSecret, apiKey, orderId, status, fallbackStatus } = body;

    if (!storeUrl?.trim()) {
      return NextResponse.json({ ok: false, message: "Missing store URL" }, { status: 400 });
    }
    if (orderId == null || !Number.isFinite(orderId) || !status?.trim()) {
      return NextResponse.json({ ok: false, message: "Missing orderId or status" }, { status: 400 });
    }

    const base = normalizeStoreUrl(storeUrl);
    const hasRest = Boolean(consumerKey?.trim() && consumerSecret?.trim());
    const hasPlugin = Boolean(apiKey?.trim());
    let lastMsg = "No WooCommerce connection (REST keys or plugin) configured.";

    // 1) WooCommerce REST API (custom status, then standard fallback).
    if (hasRest) {
      const creds: WooCredentials = {
        storeUrl: base,
        consumerKey: consumerKey!.trim(),
        consumerSecret: consumerSecret!.trim(),
      };
      const put = (s: string) =>
        wooFetch(creds, `/wp-json/wc/v3/orders/${orderId}`, {
          method: "PUT",
          body: JSON.stringify({ status: s }),
        });
      let res = await put(status.trim());
      if (!res.ok && fallbackStatus?.trim() && fallbackStatus.trim() !== status.trim()) {
        res = await put(fallbackStatus.trim());
      }
      if (res.ok) {
        const order = await res.json();
        return NextResponse.json({ ok: true, via: "rest", status: order?.status });
      }
      lastMsg = `REST error ${res.status}`;
    }

    // 2) Plugin endpoint (no consumer keys needed).
    if (hasPlugin) {
      try {
        const r = await fetch(`${base}/wp-json/yourai/v1/order-status`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ apiKey: apiKey!.trim(), orderId, status: status.trim(), fallbackStatus }),
        });
        const data = (await r.json().catch(() => ({}))) as { ok?: boolean; status?: string; error?: string };
        if (r.ok && data.ok) {
          return NextResponse.json({ ok: true, via: "plugin", status: data.status });
        }
        lastMsg = `Plugin error ${r.status}${data.error ? `: ${data.error}` : ""}`;
      } catch (e) {
        lastMsg = e instanceof Error ? e.message : "Plugin request failed";
      }
    }

    return NextResponse.json({ ok: false, message: lastMsg });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Update failed";
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
