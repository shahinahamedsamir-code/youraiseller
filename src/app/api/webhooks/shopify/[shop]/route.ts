import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";

type ShopifyWebhookQueueItem = {
  id: string;
  receivedAt: string;
  topic: string;
  shop: string;
  payload: unknown;
};

const globalWebhookQueues = globalThis as typeof globalThis & {
  __youraisellerShopifyWebhookQueues?: Map<string, ShopifyWebhookQueueItem[]>;
};

function queueStore(): Map<string, ShopifyWebhookQueueItem[]> {
  if (!globalWebhookQueues.__youraisellerShopifyWebhookQueues) {
    globalWebhookQueues.__youraisellerShopifyWebhookQueues = new Map();
  }
  return globalWebhookQueues.__youraisellerShopifyWebhookQueues;
}

function normalizeShop(input: string): string {
  return input.trim().toLowerCase();
}

function queueKey(shop: string): string {
  return `youraiseller-shopify-webhook-queue-${shop}`;
}

function enqueueWebhook(item: ShopifyWebhookQueueItem) {
  const key = queueKey(item.shop);
  const store = queueStore();
  const current = store.get(key) ?? [];
  store.set(key, [...current.slice(-49), item]);
}

function drainWebhookQueue(shop: string): ShopifyWebhookQueueItem[] {
  const key = queueKey(shop);
  const store = queueStore();
  const items = store.get(key) ?? [];
  store.set(key, []);
  return items;
}

function getSignatureSecret(shop: string): string | null {
  void shop;
  const envSecret =
    process.env.SHOPIFY_WEBHOOK_SECRET ||
    process.env.NEXT_PUBLIC_SHOPIFY_WEBHOOK_SECRET ||
    "";
  if (envSecret.trim()) return envSecret.trim();
  return null;
}

function signatureCheckEnabled(shop: string): boolean {
  void shop;
  const envFlag = process.env.SHOPIFY_WEBHOOK_SIGNATURE_CHECK;
  if (envFlag === "0" || envFlag === "false") return false;
  if (envFlag === "1" || envFlag === "true") return true;
  return true;
}

function safeEqual(a: string, b: string): boolean {
  const aa = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (aa.length !== bb.length) return false;
  return timingSafeEqual(aa, bb);
}

export async function POST(
  req: Request,
  ctx: { params: Promise<{ shop: string }> }
) {
  try {
    const url = new URL(req.url);
    const { shop: rawShop } = await ctx.params;
    const shop = normalizeShop(String(rawShop ?? ""));
    if (!shop) {
      return NextResponse.json({ ok: false, message: "Missing shop parameter." }, { status: 400 });
    }

    const rawBody = await req.text();
    const topic = req.headers.get("x-shopify-topic")?.trim() || "unknown";
    const hmacHeader = req.headers.get("x-shopify-hmac-sha256")?.trim() || "";

    const verifyMode = url.searchParams.get("verify");
    const verifyRequested =
      verifyMode === "1" || (verifyMode === null && signatureCheckEnabled(shop));

    if (verifyRequested) {
      const secret = getSignatureSecret(shop);
      if (!secret) {
        return NextResponse.json(
          { ok: false, message: "Webhook secret not configured on server." },
          { status: 500 }
        );
      }
      const digest = createHmac("sha256", secret).update(rawBody, "utf8").digest("base64");
      if (!hmacHeader || !safeEqual(digest, hmacHeader)) {
        return NextResponse.json(
          { ok: false, message: "Invalid Shopify webhook signature." },
          { status: 401 }
        );
      }
    }

    let payload: unknown = {};
    try {
      payload = rawBody ? (JSON.parse(rawBody) as unknown) : {};
    } catch {
      payload = {};
    }

    const item: ShopifyWebhookQueueItem = {
      id: `shp-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
      receivedAt: new Date().toISOString(),
      topic,
      shop,
      payload,
    };
    enqueueWebhook(item);

    return NextResponse.json({
      ok: true,
      message: "Shopify webhook received.",
      received: item,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Shopify webhook failed.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

export async function GET(
  _req: Request,
  ctx: { params: Promise<{ shop: string }> }
) {
  const url = new URL(_req.url);
  const { shop: rawShop } = await ctx.params;
  const shop = normalizeShop(String(rawShop ?? ""));
  if (!shop) {
    return NextResponse.json({ ok: false, message: "Missing shop parameter." }, { status: 400 });
  }
  if (url.searchParams.get("drain") === "1") {
    const items = drainWebhookQueue(shop);
    return NextResponse.json({
      ok: true,
      message: "Shopify webhook queue drained.",
      shop,
      items,
      total: items.length,
    });
  }
  return NextResponse.json({
    ok: true,
    message: "Shopify webhook endpoint is reachable.",
    shop,
    signatureVerification: url.searchParams.get("verify") === "1",
    queueHint: queueKey(shop),
  });
}
