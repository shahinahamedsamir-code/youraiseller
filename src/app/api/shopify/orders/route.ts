import { NextResponse } from "next/server";

type ShopifyOrdersBody = {
  shopDomain?: string;
  accessToken?: string;
  limit?: number;
  after?: string;
  updatedAtMin?: string;
  includeIncomplete?: boolean;
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
  source_kind?: "order" | "abandoned_checkout";
};

type ShopifyOrdersResponse = {
  orders?: OrderRow[];
};

type ShopifyCheckoutsResponse = {
  checkouts?: Array<{
    id: number;
    token?: string;
    name?: string;
    created_at: string;
    updated_at?: string;
    total_price?: string;
    total_discounts?: string;
    total_shipping_price_set?: {
      shop_money?: { amount?: string };
    };
    customer?: OrderRow["customer"];
    email?: string;
    phone?: string;
    shipping_address?: OrderRow["shipping_address"];
    line_items?: OrderRow["line_items"];
    note?: string;
  }>;
};

function normalizeShopDomain(input: string): string {
  return input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ShopifyOrdersBody;
    const shopDomain = normalizeShopDomain(String(body.shopDomain ?? ""));
    const accessToken = String(body.accessToken ?? "").trim();
    const after = String(body.after ?? "").trim();
    const updatedAtMin = String(body.updatedAtMin ?? "").trim();
    const includeIncomplete = body.includeIncomplete === true;
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
    const filters = [
      after ? `created_at_min=${encodeURIComponent(after)}` : "",
      updatedAtMin ? `updated_at_min=${encodeURIComponent(updatedAtMin)}` : "",
    ].filter(Boolean);
    const finalUrl = filters.length ? `${url}&${filters.join("&")}` : url;

    const res = await fetch(finalUrl, {
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
    const orders: OrderRow[] = (json.orders ?? []).map((order) => ({
      ...order,
      source_kind: "order" as const,
    }));
    let checkoutMessage = "";
    let checkoutCount = 0;

    if (includeIncomplete) {
      const checkoutUrl =
        `https://${shopDomain}/admin/api/2025-01/checkouts.json` +
        `?limit=${limit}&fields=` +
        [
          "id",
          "token",
          "name",
          "created_at",
          "updated_at",
          "total_price",
          "total_discounts",
          "total_shipping_price_set",
          "customer",
          "email",
          "phone",
          "shipping_address",
          "line_items",
          "note",
        ].join(",");
      const checkoutCreatedAfter =
        after || new Date(Date.now() - 12 * 60 * 60 * 1000).toISOString();
      const checkoutFilters = [
        `created_at_min=${encodeURIComponent(checkoutCreatedAfter)}`,
      ].filter(Boolean);
      const checkoutFinalUrl = checkoutFilters.length
        ? `${checkoutUrl}&${checkoutFilters.join("&")}`
        : checkoutUrl;
      const checkoutRes = await fetch(checkoutFinalUrl, {
        method: "GET",
        headers: {
          "X-Shopify-Access-Token": accessToken,
          Accept: "application/json",
        },
        cache: "no-store",
      });

      if (checkoutRes.ok) {
        const checkoutJson = (await checkoutRes.json()) as ShopifyCheckoutsResponse;
        const checkouts = checkoutJson.checkouts ?? [];
        checkoutCount = checkouts.length;
        for (const checkout of checkouts) {
          orders.push({
            id: checkout.id,
            order_number: checkout.id,
            name: checkout.name || `Checkout-${checkout.token || checkout.id}`,
            created_at: checkout.created_at,
            currency: "",
            financial_status: "pending",
            fulfillment_status: null,
            total_price: checkout.total_price ?? "0",
            subtotal_price: checkout.total_price ?? "0",
            total_discounts: checkout.total_discounts ?? "0",
            total_shipping_price_set: checkout.total_shipping_price_set,
            customer: {
              ...checkout.customer,
              email: checkout.customer?.email || checkout.email,
              phone: checkout.customer?.phone || checkout.phone,
            },
            shipping_address: checkout.shipping_address,
            line_items: checkout.line_items ?? [],
            note: checkout.note,
            source_kind: "abandoned_checkout",
          });
        }
      } else {
        const txt = await checkoutRes.text();
        checkoutMessage =
          txt && /access denied|not authorized|missing required scope/i.test(txt)
            ? "Abandoned checkout sync needs Shopify checkout permission. Enable read_checkouts, then reinstall/reconnect."
            : `Abandoned checkout sync failed (${checkoutRes.status}).`;
      }
    }

    return NextResponse.json({
      ok: true,
      orders,
      total: orders.length,
      checkoutMessage,
      checkoutCount,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to fetch Shopify orders.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}
