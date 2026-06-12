import { NextResponse } from "next/server";

type ShopifyProductsBody = {
  shopDomain?: string;
  accessToken?: string;
  limit?: number;
};

function normalizeShopDomain(input: string): string {
  return input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

type ShopifyGraphQlResponse = {
  data?: {
    products?: {
      edges?: Array<{
        node?: {
          id?: string;
          title?: string;
          vendor?: string;
          totalInventory?: number;
          featuredImage?: { url?: string } | null;
          variants?: {
            edges?: Array<{
              node?: {
                id?: string;
                title?: string;
                sku?: string;
                price?: string;
                inventoryQuantity?: number | null;
                image?: { url?: string } | null;
              };
            }>;
          };
        };
      }>;
      pageInfo?: {
        hasNextPage?: boolean;
        endCursor?: string | null;
      };
    };
  };
  errors?: Array<{ message?: string }>;
};

type FlatProduct = {
  id: string;
  title: string;
  vendor: string;
  sku: string;
  price: number;
  stockQty: number;
  imageUrl?: string;
};

const QUERY = `
  query Products($first: Int!, $after: String) {
    products(first: $first, after: $after) {
      pageInfo { hasNextPage endCursor }
      edges {
        node {
          id
          title
          vendor
          totalInventory
          featuredImage { url }
          variants(first: 100) {
            edges {
              node {
                id
                title
                sku
                price
                inventoryQuantity
                image { url }
              }
            }
          }
        }
      }
    }
  }
`;

function toCodeFallback(shopifyGid: string): string {
  const tail = shopifyGid.split("/").pop() || `${Date.now()}`;
  return `SHP-${tail}`;
}

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as ShopifyProductsBody;
    const shopDomain = normalizeShopDomain(String(body.shopDomain ?? ""));
    const accessToken = String(body.accessToken ?? "").trim();
    const requestedLimit =
      typeof body.limit === "number" && Number.isFinite(body.limit) ? body.limit : 250;
    const hardLimit = Math.min(Math.max(1, Math.floor(requestedLimit)), 1000);

    if (!shopDomain || !accessToken) {
      return NextResponse.json(
        { ok: false, message: "Shop domain and access token are required." },
        { status: 400 }
      );
    }

    const rows: FlatProduct[] = [];
    let after: string | null = null;

    while (rows.length < hardLimit) {
      const take = Math.min(50, hardLimit - rows.length);
      const res = await fetch(`https://${shopDomain}/admin/api/2025-01/graphql.json`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "X-Shopify-Access-Token": accessToken,
        },
        body: JSON.stringify({
          query: QUERY,
          variables: { first: take, after },
        }),
        cache: "no-store",
      });

      if (!res.ok) {
        const txt = await res.text();
        return NextResponse.json({
          ok: false,
          message: `Shopify product API error (${res.status}): ${txt.slice(0, 180)}`,
        });
      }

      const json = (await res.json()) as ShopifyGraphQlResponse;
      if (json.errors?.length) {
        return NextResponse.json({
          ok: false,
          message: json.errors[0]?.message || "Shopify GraphQL products query failed.",
        });
      }

      const products = json.data?.products;
      const edges = products?.edges ?? [];

      for (const edge of edges) {
        const product = edge.node;
        if (!product) continue;

        const variants = product.variants?.edges?.map((v) => v.node).filter(Boolean) ?? [];
        if (variants.length === 0) {
          rows.push({
            id: product.id || "",
            title: product.title || "Untitled",
            vendor: product.vendor || "Shopify",
            sku: "",
            price: 0,
            stockQty: Number(product.totalInventory ?? 0) || 0,
            imageUrl: product.featuredImage?.url,
          });
          continue;
        }

        for (const variant of variants) {
          rows.push({
            id: variant?.id || product.id || "",
            title:
              variant?.title && variant.title !== "Default Title"
                ? `${product.title || "Product"} - ${variant.title}`
                : product.title || "Untitled",
            vendor: product.vendor || "Shopify",
            sku: (variant?.sku || "").trim(),
            price: Number.parseFloat(String(variant?.price ?? "0")) || 0,
            stockQty: Number(variant?.inventoryQuantity ?? 0) || 0,
            imageUrl: variant?.image?.url || product.featuredImage?.url,
          });
          if (rows.length >= hardLimit) break;
        }

        if (rows.length >= hardLimit) break;
      }

      if (!products?.pageInfo?.hasNextPage || !products.pageInfo.endCursor) break;
      after = products.pageInfo.endCursor;
    }

    return NextResponse.json({
      ok: true,
      products: rows.map((row) => ({
        ...row,
        sku: row.sku || toCodeFallback(row.id),
      })),
      total: rows.length,
    });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to sync Shopify products.";
    return NextResponse.json({ ok: false, message }, { status: 500 });
  }
}

