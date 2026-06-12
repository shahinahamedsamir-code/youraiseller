import { upsertWooCommerceOrder, type OrderLine } from "./orders-store";

type ShopifyOrderRow = {
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
};

export type ShopifyOrderSyncResult = {
  created: number;
  updated: number;
  failed: number;
  total: number;
  errors: string[];
};

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

function mapStatus(raw: ShopifyOrderRow): "pending" | "rts" | "cancelled" | "delivered" {
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

export async function syncOrdersFromShopify(params: {
  shopDomain: string;
  accessToken: string;
  limit?: number;
}): Promise<ShopifyOrderSyncResult> {
  const res = await fetch("/api/shopify/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      shopDomain: params.shopDomain,
      accessToken: params.accessToken,
      limit: params.limit ?? 50,
    }),
  });

  const payload = (await res.json()) as {
    ok?: boolean;
    message?: string;
    orders?: ShopifyOrderRow[];
  };

  if (!payload.ok || !payload.orders) {
    throw new Error(payload.message || "Could not fetch Shopify orders.");
  }

  const result: ShopifyOrderSyncResult = {
    created: 0,
    updated: 0,
    failed: 0,
    total: payload.orders.length,
    errors: [],
  };

  for (const order of payload.orders) {
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
        items: mapLines(order.line_items),
        shippingCharge,
        discount,
        note: order.note?.trim() || undefined,
        source: "web",
        status: mapStatus(order),
        wooOrderId: order.id,
        wooNumber: order.name || String(order.order_number),
        createdAt: order.created_at ? new Date(order.created_at).toLocaleString("en-GB") : undefined,
        webStatus: "processing",
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

