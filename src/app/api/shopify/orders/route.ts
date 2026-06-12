import { NextResponse } from "next/server";

type ShopifyOrdersBody = {
  shopDomain?: string;
  accessToken?: string;
  limit?: number;
};

type OrderRow = {
  id: number;
  order_number: number;
  name: string;
  created_at: string;
  currency: string;
  financial_status: string;
  fulfillment_status: string | null;
  total_price: string;
  subtotal_price: string;
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

type ShopifyOrdersResponse = {
  orders?: OrderRow[];
};

function normalizeShopDomain(input: string): string {
  return input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ShopifyOrdersBody;
    const shopDomain = normalizeShopDomain(String(body.shopDomain ?? ""));
    const accessToken = String(body.accessToken ?? "").trim();
    const limit =
      typeof body.limit === "number" && Number.isFinite(body.limit)
        ? Math.min(Math.max(1, Math.floor(body.limit)), 250)
        : 50;

    if (!shopDomain || !accessToken) {
      return NextResponse.json(
        { ok: false, message: "Shop domain and access token are required." },
        { status: 400 }
      );
    }

    const url =
      `https://${shopDomain}/admin/api/2025-01/orders.json` +
      `?status=any&limit=${limit}&order=created_at%20desc&fields=` +
      [
        "id",
        "order_number",
        "name",
        "created_at",
        "currency",
        "financial_status",
        "fulfillment_status",
        "total_price",
        "subtotal_price",
        "total_discounts",
        "total_shipping_price_set",
        "customer",
        "shipping_address",
        "line_items",
        "note",
      ].join(",");

    const res = await fetch(url, {
      method: "GET",
      headers: {
        "X-Shopify-Access-Token": accessToken,
        Accept: "application/json",
      },
      cache: "no-store",
    });

    if (!res.ok) {
      const txt = await res.text();
      if (txt && /access denied|not authorized|missing required scope/i.test(txt)) {
        return NextResponse.json({
          ok: false,
          message:
            "Shopify token scope missing for orders. Enable read_orders (and write_orders if needed), then reconnect app/token.",
        });
      }
      return NextResponse.json({
        ok: false,
        message: `Shopify orders API error (${res.status}): ${txt.slice(0, 160)}`,
      });
    }

    const json = (await res.json()) as ShopifyOrdersResponse;
    return NextResponse.json({
      ok: true,
      orders: json.orders ?? [],
      total: (json.orders ?? []).length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch Shopify orders.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

