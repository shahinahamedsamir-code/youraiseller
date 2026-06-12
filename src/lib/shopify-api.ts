export const SHOPIFY_API_VERSION = "2025-01";

export function normalizeShopDomain(input: string): string {
  return input.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/\/+$/, "");
}

export type FlatShopifyProduct = {
  id: string;
  title: string;
  vendor: string;
  sku: string;
  price: number;
  stockQty: number;
  imageUrl?: string;
};

export function toShopifyCodeFallback(shopifyId: string): string {
  const tail = shopifyId.split("/").pop() || `${Date.now()}`;
  return `SHP-${tail}`;
}

function parseNextPageInfo(linkHeader: string | null): string | null {
  if (!linkHeader) return null;
  const parts = linkHeader.split(",");
  for (const part of parts) {
    const match = part.match(/<[^>]*[?&]page_info=([^&>]+)[^>]*>;\s*rel="next"/i);
    if (match?.[1]) return decodeURIComponent(match[1]);
  }
  return null;
}

type RestVariant = {
  id?: number;
  title?: string;
  sku?: string;
  price?: string;
  inventory_quantity?: number | null;
  image_id?: number | null;
};

type RestImage = {
  id?: number;
  src?: string;
};

type RestProduct = {
  id?: number;
  title?: string;
  vendor?: string;
  variants?: RestVariant[];
  images?: RestImage[];
};

function mapRestProduct(product: RestProduct): FlatShopifyProduct[] {
  const images = product.images ?? [];
  const imageById = new Map<number, string>();
  for (const image of images) {
    if (image.id && image.src) imageById.set(image.id, image.src);
  }

  const productId = product.id ? String(product.id) : "";
  const variants = product.variants ?? [];

  if (variants.length === 0) {
    return [
      {
        id: productId,
        title: product.title || "Untitled",
        vendor: product.vendor || "Shopify",
        sku: "",
        price: 0,
        stockQty: 0,
        imageUrl: images[0]?.src,
      },
    ];
  }

  return variants.map((variant) => {
    const variantId = variant.id ? String(variant.id) : productId;
    const imageUrl =
      (variant.image_id ? imageById.get(variant.image_id) : undefined) || images[0]?.src;
    return {
      id: variantId,
      title:
        variant.title && variant.title !== "Default Title"
          ? `${product.title || "Product"} - ${variant.title}`
          : product.title || "Untitled",
      vendor: product.vendor || "Shopify",
      sku: (variant.sku || "").trim(),
      price: Number.parseFloat(String(variant.price ?? "0")) || 0,
      stockQty: Number(variant.inventory_quantity ?? 0) || 0,
      imageUrl,
    };
  });
}

export async function fetchShopifyProductsViaRest(params: {
  shopDomain: string;
  accessToken: string;
  limit: number;
}): Promise<{ ok: true; products: FlatShopifyProduct[] } | { ok: false; message: string; scopeMissing?: boolean }> {
  const shopDomain = normalizeShopDomain(params.shopDomain);
  const accessToken = params.accessToken.trim();
  const hardLimit = Math.min(Math.max(1, Math.floor(params.limit)), 1000);

  const rows: FlatShopifyProduct[] = [];
  let pageInfo: string | null = null;

  while (rows.length < hardLimit) {
    const take = Math.min(250, hardLimit - rows.length);
    const base = `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/products.json`;
    const url = pageInfo
      ? `${base}?limit=${take}&page_info=${encodeURIComponent(pageInfo)}`
      : `${base}?limit=${take}&fields=id,title,vendor,variants,images`;

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
      if (res.status === 401 || res.status === 403) {
        return {
          ok: false,
          scopeMissing: true,
          message:
            "Shopify token scope missing for products. Enable read_products (and read_inventory if needed), then reinstall app and paste a new token.",
        };
      }
      return {
        ok: false,
        message: `Shopify product API error (${res.status}): ${txt.slice(0, 180)}`,
      };
    }

    const json = (await res.json()) as { products?: RestProduct[] };
    const products = json.products ?? [];
    if (products.length === 0) break;

    for (const product of products) {
      rows.push(...mapRestProduct(product));
      if (rows.length >= hardLimit) break;
    }

    if (rows.length >= hardLimit) break;
    pageInfo = parseNextPageInfo(res.headers.get("link"));
    if (!pageInfo) break;
  }

  return {
    ok: true,
    products: rows.slice(0, hardLimit).map((row) => ({
      ...row,
      sku: row.sku || toShopifyCodeFallback(row.id),
    })),
  };
}

const GRAPHQL_QUERY = `
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
                image { url }
              }
            }
          }
        }
      }
    }
  }
`;

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

export async function fetchShopifyProductsViaGraphql(params: {
  shopDomain: string;
  accessToken: string;
  limit: number;
}): Promise<{ ok: true; products: FlatShopifyProduct[] } | { ok: false; message: string; scopeMissing?: boolean }> {
  const shopDomain = normalizeShopDomain(params.shopDomain);
  const accessToken = params.accessToken.trim();
  const hardLimit = Math.min(Math.max(1, Math.floor(params.limit)), 1000);

  const rows: FlatShopifyProduct[] = [];
  let after: string | null = null;

  while (rows.length < hardLimit) {
    const take = Math.min(50, hardLimit - rows.length);
    const res = await fetch(`https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/graphql.json`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-Shopify-Access-Token": accessToken,
      },
      body: JSON.stringify({
        query: GRAPHQL_QUERY,
        variables: { first: take, after },
      }),
      cache: "no-store",
    });

    if (!res.ok) {
      const txt = await res.text();
      return {
        ok: false,
        message: `Shopify product API error (${res.status}): ${txt.slice(0, 180)}`,
      };
    }

    const json = (await res.json()) as ShopifyGraphQlResponse;
    if (json.errors?.length) {
      const firstError = json.errors[0]?.message || "Shopify GraphQL products query failed.";
      if (/access denied/i.test(firstError) || /not authorized/i.test(firstError)) {
        return {
          ok: false,
          scopeMissing: true,
          message:
            "Shopify token scope missing for products. Enable read_products (and write_products if needed), then reconnect app/token.",
        };
      }
      return { ok: false, message: firstError };
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
          stockQty: Number(product.totalInventory ?? 0) || 0,
          imageUrl: variant?.image?.url || product.featuredImage?.url,
        });
        if (rows.length >= hardLimit) break;
      }

      if (rows.length >= hardLimit) break;
    }

    if (!products?.pageInfo?.hasNextPage || !products.pageInfo.endCursor) break;
    after = products.pageInfo.endCursor;
  }

  return {
    ok: true,
    products: rows.slice(0, hardLimit).map((row) => ({
      ...row,
      sku: row.sku || toShopifyCodeFallback(row.id),
    })),
  };
}

export async function fetchShopifyProducts(params: {
  shopDomain: string;
  accessToken: string;
  limit: number;
}): Promise<{ ok: true; products: FlatShopifyProduct[]; source: "rest" | "graphql" } | { ok: false; message: string; scopeMissing?: boolean }> {
  const rest = await fetchShopifyProductsViaRest(params);
  if (rest.ok) return { ...rest, source: "rest" };

  const graphql = await fetchShopifyProductsViaGraphql(params);
  if (graphql.ok) return { ...graphql, source: "graphql" };

  return rest.scopeMissing || graphql.scopeMissing
    ? {
        ok: false,
        scopeMissing: true,
        message:
          rest.scopeMissing && graphql.scopeMissing
            ? rest.message
            : rest.message || graphql.message,
      }
    : { ok: false, message: rest.message || graphql.message };
}

export async function verifyShopifyProductAccess(params: {
  shopDomain: string;
  accessToken: string;
}): Promise<{ ok: boolean; message: string }> {
  const shopDomain = normalizeShopDomain(params.shopDomain);
  const accessToken = params.accessToken.trim();

  const res = await fetch(
    `https://${shopDomain}/admin/api/${SHOPIFY_API_VERSION}/products.json?limit=1&fields=id`,
    {
      method: "GET",
      headers: {
        "X-Shopify-Access-Token": accessToken,
        Accept: "application/json",
      },
      cache: "no-store",
    }
  );

  if (res.ok) {
    return { ok: true, message: "Product read scope verified." };
  }

  if (res.status === 401 || res.status === 403) {
    return {
      ok: false,
      message:
        "Shop connected but read_products scope missing. Dev Dashboard (dev.shopify.com) → your app → Versions → enable read_products (+ read_inventory, read_orders) → Release → reinstall app on store → get a new token.",
    };
  }

  return {
    ok: false,
    message: `Product scope check failed (${res.status}).`,
  };
}
