import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { getPublicRequestOrigin } from "@/lib/app-hosts";
import { wooFetch, type WooCredentials } from "@/lib/woocommerce-api-proxy";
import { registerWooWebhookToken } from "@/lib/woocommerce-webhook-server";

type Body = WooCredentials & { sellerId?: string };

/**
 * Enable instant order sync: create an `order.created` webhook in WooCommerce
 * that delivers to our receiver with a per-store token. The token maps to the
 * seller so the dashboard pulls the right queue.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const sellerId = body.sellerId?.trim();
    const creds: WooCredentials = {
      storeUrl: (body.storeUrl ?? "").trim().replace(/\/$/, ""),
      consumerKey: (body.consumerKey ?? "").trim(),
      consumerSecret: (body.consumerSecret ?? "").trim(),
    };

    if (!sellerId) {
      return NextResponse.json({ ok: false, message: "sellerId required" }, { status: 400 });
    }
    if (!creds.storeUrl || !creds.consumerKey || !creds.consumerSecret) {
      return NextResponse.json(
        { ok: false, message: "Connect WooCommerce (store URL + API keys) first." },
        { status: 400 }
      );
    }

    const origin = getPublicRequestOrigin(req).replace(/\/$/, "");
    if (origin.includes("localhost") || origin.includes("127.0.0.1")) {
      return NextResponse.json(
        {
          ok: false,
          message:
            "Webhooks need a public URL — WooCommerce can't reach localhost. Enable this on the live site.",
        },
        { status: 400 }
      );
    }

    const token = `wht_${randomBytes(24).toString("hex")}`;
    const deliveryUrl = `${origin}/api/webhooks/woocommerce?token=${token}`;

    const res = await wooFetch(creds, `/wp-json/wc/v3/webhooks`, {
      method: "POST",
      body: JSON.stringify({
        name: "YourAI Seller — New Order",
        topic: "order.created",
        delivery_url: deliveryUrl,
        status: "active",
      }),
    });

    if (!res.ok) {
      const detail = await res.text().catch(() => "");
      return NextResponse.json(
        {
          ok: false,
          message: `WooCommerce rejected the webhook (${res.status}). ${detail.slice(0, 160)}`,
        },
        { status: 502 }
      );
    }

    const created = (await res.json().catch(() => ({}))) as { id?: number };

    // Only persist the token mapping once WooCommerce accepted the webhook.
    registerWooWebhookToken(token, sellerId);

    return NextResponse.json({
      ok: true,
      webhookId: created.id ?? null,
      message: "Instant order sync enabled. New WooCommerce orders now arrive in real time.",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Register failed";
    return NextResponse.json({ ok: false, message: msg }, { status: 500 });
  }
}
