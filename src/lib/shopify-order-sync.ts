import { upsertWooCommerceOrder, type OrderLine } from "./orders-store";

type ShopifySyncMeta = {
  firstSyncCompleted: boolean;
  syncedShopDomain: string | null;
  lastSyncAt: string | null;
};

const META_KEY = "yai-shopify-order-sync-meta";
const CONFIG_KEY = "yai-shopify-integration-v1";

export type ShopifyOrderRow = {
  id: number;
  order_number: number;
  name: string;
  created_at: string;
  financial_status: string;
  fulfillment_status: string | null;
  total_price: string;
  total_discounts: string;
  total_shipping_price_set?: {
    shop_money?: { amount?: string };
  };
  customer?: {
    first_name?: string;
    last_name?: string;
    phone?: string;
    email?: string;
    default_address?: {
      phone?: string;
      city?: string;
      address1?: string;
      address2?: string;
      province?: string;
    };
  };
  shipping_address?: {
    phone?: string;
    city?: string;
    address1?: string;
    address2?: string;
    province?: string;
  };
  line_items?: Array<{
    id: number;
    title: string;
    sku?: string;
    quantity: number;
    price: string;
    variant_id?: number;
    product_id?: number;
  }>;
  note?: string;
  source_kind?: "order" | "abandoned_checkout";
};

export type ShopifyWebhookQueueItem = {
  id: string;
  receivedAt: string;
  topic: string;
  shop: string;
  payload: unknown;
};

export type ShopifyOrderSyncResult = {
  created: number;
  updated: number;
  failed: number;
  total: number;
  checkoutCount?: number;
  errors: string[];
};

export type ShopifyOrderSyncConfig = {
  shopDomain: string;
  accessToken: string;
  incompleteOrderSyncEnabled?: boolean;
};

function loadMeta(): ShopifySyncMeta {
  if (typeof window === "undefined" || !META_KEY) {
    return { firstSyncCompleted: false, syncedShopDomain: null, lastSyncAt: null };
  }
  try {
    const raw = localStorage.getItem(META_KEY);
    if (!raw) {
      return { firstSyncCompleted: false, syncedShopDomain: null, lastSyncAt: null };
    }
    const parsed = JSON.parse(raw) as Partial<ShopifySyncMeta>;
    return {
      firstSyncCompleted: parsed.firstSyncCompleted === true,
      syncedShopDomain:
        typeof parsed.syncedShopDomain === "string" ? parsed.syncedShopDomain : null,
      lastSyncAt: typeof parsed.lastSyncAt === "string" ? parsed.lastSyncAt : null,
    };
  } catch {
    return { firstSyncCompleted: false, syncedShopDomain: null, lastSyncAt: null };
  }
}

export function getShopifyOrderSyncMeta(): ShopifySyncMeta {
  return loadMeta();
}

function saveMeta(patch: Partial<ShopifySyncMeta>) {
  if (typeof window === "undefined" || !META_KEY) return;
  const next = { ...loadMeta(), ...patch };
  localStorage.setItem(META_KEY, JSON.stringify(next));
}

export function getShopifyOrderSyncConfig(): ShopifyOrderSyncConfig | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(CONFIG_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<{
      shopDomain: string;
      accessToken: string;
      incompleteOrderSyncEnabled: boolean;
    }>;
    const shopDomain = normalizeShopDomain(String(parsed.shopDomain ?? ""));
    const accessToken = String(parsed.accessToken ?? "").trim();
    if (!shopDomain || !accessToken) return null;
    return {
      shopDomain,
      accessToken,
      incompleteOrderSyncEnabled: parsed.incompleteOrderSyncEnabled === true,
    };
  } catch {
    return null;
  }
}

export function isShopifyOrderSyncReady(): boolean {
  return Boolean(getShopifyOrderSyncConfig());
}

function normalizeShopDomain(input: string): string {
  return input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

function shouldUseInitialWindow(shopDomain: string): boolean {
  const meta = loadMeta();
  const normalized = normalizeShopDomain(shopDomain);
  if (!meta.firstSyncCompleted) return true;
  if (!meta.syncedShopDomain) return true;
  return normalizeShopDomain(meta.syncedShopDomain) !== normalized;
}

function isoHoursAgo(hours: number): string {
  const d = new Date();
  d.setHours(d.getHours() - hours);
  return d.toISOString();
}

function parseAmount(raw: unknown): number {
  return Number.parseFloat(String(raw ?? "0")) || 0;
}

function mapPaymentMethod(raw: string): "cod" | "bkash" | "nagad" | "prepaid" {
  const value = raw.toLowerCase();
  if (value.includes("cod") || value.includes("pending")) return "cod";
  if (value.includes("bkash")) return "bkash";
  if (value.includes("nagad")) return "nagad";
  return "prepaid";
}

function isIncompleteShopifyOrder(raw: ShopifyOrderRow): boolean {
  return raw.source_kind === "abandoned_checkout";
}

function mapStatus(raw: ShopifyOrderRow): "pending" | "rts" | "cancelled" | "delivered" {
  if (isIncompleteShopifyOrder(raw)) return "pending";
  const financial = String(raw.financial_status ?? "").toLowerCase();
  const fulfillment = String(raw.fulfillment_status ?? "").toLowerCase();
  if (financial.includes("refunded") || financial.includes("voided")) return "cancelled";
  if (fulfillment.includes("fulfilled")) return "delivered";
  if (financial.includes("paid")) return "rts";
  return "pending";
}

function mapLines(lines: ShopifyOrderRow["line_items"]): OrderLine[] {
  return (lines ?? []).map((item) => {
    const qty = Number(item.quantity) || 1;
    const price = parseAmount(item.price);
    return {
      productId: item.product_id ? String(item.product_id) : `shp-li-${item.id}`,
      productName: item.title || "Shopify Item",
      productCode: item.sku?.trim() || `SHP-LI-${item.id}`,
      qty,
      price,
      total: price * qty,
    };
  });
}

function mapShopifyLines(order: ShopifyOrderRow): OrderLine[] {
  const lines = mapLines(order.line_items);
  if (lines.length > 0 || !isIncompleteShopifyOrder(order)) return lines;
  const total = parseAmount(order.total_price);
  return [
    {
      productId: `shp-checkout-${order.id}`,
      productName: "Incomplete Shopify checkout",
      productCode: `SHP-CHECKOUT-${order.id}`,
      qty: 1,
      price: total,
      total,
    },
  ];
}

function buildAddress(order: ShopifyOrderRow): { address: string; district: string; phone: string } {
  const shipping = order.shipping_address;
  const customerAddress = order.customer?.default_address;
  const phone =
    shipping?.phone?.trim() ||
    customerAddress?.phone?.trim() ||
    order.customer?.phone?.trim() ||
    "00000000000";
  const city = shipping?.city || customerAddress?.city || "Dhaka";
  const address = [shipping?.address1, shipping?.address2, shipping?.province]
    .filter(Boolean)
    .join(", ");
  return {
    address: address || "Shopify address not provided",
    district: city || "Dhaka",
    phone,
  };
}

function importShopifyRows(orders: ShopifyOrderRow[], checkoutMessage?: string): ShopifyOrderSyncResult {
  const result: ShopifyOrderSyncResult = {
    created: 0,
    updated: 0,
    failed: 0,
    total: orders.length,
    errors: checkoutMessage ? [checkoutMessage] : [],
  };

  for (const order of orders) {
    try {
      const customerName = `${order.customer?.first_name ?? ""} ${order.customer?.last_name ?? ""}`.trim() || "Shopify Customer";
      const { address, district, phone } = buildAddress(order);
      const shippingCharge = parseAmount(order.total_shipping_price_set?.shop_money?.amount);
      const discount = parseAmount(order.total_discounts);
      const mapped = upsertWooCommerceOrder({
        customerName,
        phone,
        email: order.customer?.email?.trim() || undefined,
        address,
        district,
        paymentMethod: mapPaymentMethod(order.financial_status || ""),
        courier: "Manual Delivery",
        items: mapShopifyLines(order),
        shippingCharge,
        discount,
        note: order.note?.trim() || undefined,
        source: "web",
        status: mapStatus(order),
        wooOrderId: isIncompleteShopifyOrder(order) ? -Math.abs(order.id) : order.id,
        wooNumber: order.name || String(order.order_number),
        createdAt: order.created_at ? new Date(order.created_at).toLocaleString("en-GB") : undefined,
        webStatus: isIncompleteShopifyOrder(order) ? "incomplete" : "processing",
        tags: isIncompleteShopifyOrder(order)
          ? ["Shopify", "Incomplete order"]
          : ["Shopify"],
      });
      if (mapped.created) result.created++;
      else result.updated++;
    } catch (error) {
      result.failed++;
      if (result.errors.length < 12) {
        result.errors.push(
          `#${order.name || order.order_number}: ${
            error instanceof Error ? error.message : "Order sync error"
          }`
        );
      }
    }
  }

  return result;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === "object" && !Array.isArray(value);
}

function str(value: unknown, fallback = ""): string {
  return typeof value === "string" ? value : fallback;
}

function num(value: unknown, fallback = 0): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

function normalizeWebhookPayload(item: ShopifyWebhookQueueItem): ShopifyOrderRow | null {
  if (!isRecord(item.payload)) return null;
  const topic = item.topic.toLowerCase();
  const id = num(item.payload.id);
  if (!id) return null;

  if (topic.includes("checkout")) {
    const customer = isRecord(item.payload.customer) ? item.payload.customer : {};
    return {
      id,
      order_number: id,
      name: str(item.payload.name) || `Checkout-${str(item.payload.token) || id}`,
      created_at: str(item.payload.created_at) || item.receivedAt,
      financial_status: "pending",
      fulfillment_status: null,
      total_price: str(item.payload.total_price, "0"),
      total_discounts: str(item.payload.total_discounts, "0"),
      total_shipping_price_set: isRecord(item.payload.total_shipping_price_set)
        ? (item.payload.total_shipping_price_set as ShopifyOrderRow["total_shipping_price_set"])
        : undefined,
      customer: {
        ...(customer as NonNullable<ShopifyOrderRow["customer"]>),
        email: str(customer.email) || str(item.payload.email) || undefined,
        phone: str(customer.phone) || str(item.payload.phone) || undefined,
      },
      shipping_address: isRecord(item.payload.shipping_address)
        ? (item.payload.shipping_address as ShopifyOrderRow["shipping_address"])
        : undefined,
      line_items: Array.isArray(item.payload.line_items)
        ? (item.payload.line_items as ShopifyOrderRow["line_items"])
        : [],
      note: str(item.payload.note) || undefined,
      source_kind: "abandoned_checkout",
    };
  }

  if (topic.includes("order")) {
    return {
      ...(item.payload as ShopifyOrderRow),
      id,
      order_number: num(item.payload.order_number, id),
      name: str(item.payload.name) || String(num(item.payload.order_number, id)),
      created_at: str(item.payload.created_at) || item.receivedAt,
      financial_status: str(item.payload.financial_status, "pending"),
      fulfillment_status: str(item.payload.fulfillment_status) || null,
      total_price: str(item.payload.total_price, "0"),
      total_discounts: str(item.payload.total_discounts, "0"),
      source_kind: "order",
    };
  }

  return null;
}

export async function syncShopifyWebhookQueue(
  shopDomain: string,
  options?: { includeIncomplete?: boolean }
): Promise<ShopifyOrderSyncResult> {
  const shop = normalizeShopDomain(shopDomain);
  if (!shop) {
    return { created: 0, updated: 0, failed: 0, total: 0, errors: [] };
  }

  const res = await fetch(`/api/webhooks/shopify/${encodeURIComponent(shop)}?drain=1`, {
    method: "GET",
    cache: "no-store",
  });
  const payload = (await res.json()) as {
    ok?: boolean;
    items?: ShopifyWebhookQueueItem[];
    message?: string;
  };
  if (!payload.ok) {
    throw new Error(payload.message || "Could not read Shopify webhook queue.");
  }

  const includeIncomplete = options?.includeIncomplete !== false;
  const rows = (payload.items ?? [])
    .map(normalizeWebhookPayload)
    .filter((row): row is ShopifyOrderRow => Boolean(row))
    .filter((row) => includeIncomplete || !isIncompleteShopifyOrder(row));
  return importShopifyRows(rows);
}

export async function syncOrdersFromShopify(params: {
  shopDomain: string;
  accessToken: string;
  limit?: number;
  includeIncomplete?: boolean;
  incompleteOrderSyncEnabled?: boolean;
}): Promise<ShopifyOrderSyncResult> {
  const shopDomain = normalizeShopDomain(params.shopDomain);
  const initialWindow = shouldUseInitialWindow(shopDomain);
  const meta = loadMeta();
  const after = initialWindow ? isoHoursAgo(12) : undefined;
  const updatedAfter = initialWindow
    ? undefined
    : meta.lastSyncAt
      ? new Date(new Date(meta.lastSyncAt).getTime() - 2 * 60 * 1000).toISOString()
      : isoHoursAgo(24);
  const res = await fetch("/api/shopify/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      shopDomain,
      accessToken: params.accessToken,
      limit: params.limit ?? 250,
      after,
      updatedAtMin: updatedAfter,
      includeIncomplete:
        params.includeIncomplete ?? params.incompleteOrderSyncEnabled === true,
    }),
  });

  const payload = (await res.json()) as {
    ok?: boolean;
    message?: string;
    checkoutMessage?: string;
    checkoutCount?: number;
    orders?: ShopifyOrderRow[];
  };

  if (!payload.ok || !payload.orders) {
    throw new Error(payload.message || "Could not fetch Shopify orders.");
  }

  const result: ShopifyOrderSyncResult = {
    ...importShopifyRows(payload.orders, payload.checkoutMessage),
    checkoutCount: payload.checkoutCount,
  };

  saveMeta({
    firstSyncCompleted: true,
    syncedShopDomain: shopDomain,
    lastSyncAt: new Date().toISOString(),
  });

  return result;
}
