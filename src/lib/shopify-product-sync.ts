import {
  ensureWooCommerceBrand,
  ensureWooCommerceCategory,
  loadProducts,
  upsertProductByCode,
} from "./inventory-store";

type ShopifySyncRow = {
  id: string;
  title: string;
  vendor: string;
  sku: string;
  price: number;
  stockQty: number;
  imageUrl?: string;
};

export type ShopifyProductSyncResult = {
  created: number;
  updated: number;
  failed: number;
  total: number;
  errors: string[];
};

function sanitizeCode(raw: string): string {
  const value = raw.trim().toUpperCase();
  return value || `SHP-${Date.now()}`;
}

export async function syncProductsFromShopify(params: {
  shopDomain: string;
  accessToken: string;
  limit?: number;
}): Promise<ShopifyProductSyncResult> {
  const response = await fetch("/api/shopify/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      shopDomain: params.shopDomain,
      accessToken: params.accessToken,
      limit: params.limit ?? 250,
    }),
  });

  const payload = (await response.json()) as {
    ok?: boolean;
    message?: string;
    products?: ShopifySyncRow[];
  };

  if (!payload.ok || !payload.products) {
    throw new Error(payload.message || "Could not fetch Shopify products.");
  }

  const categoryId = ensureWooCommerceCategory();
  const brandId = ensureWooCommerceBrand();
  const existing = new Set(loadProducts().map((p) => p.code.toLowerCase()));

  const result: ShopifyProductSyncResult = {
    created: 0,
    updated: 0,
    failed: 0,
    total: 0,
    errors: [],
  };

  for (const row of payload.products) {
    result.total++;
    const code = sanitizeCode(row.sku || row.id);
    try {
      const { created } = upsertProductByCode({
        name: row.title || "Shopify Product",
        code,
        categoryId,
        brandId,
        costPrice: Math.max(0, Math.round((row.price || 0) * 0.7)),
        sellPrice: Math.max(0, row.price || 0),
        websitePrice: Math.max(0, row.price || 0),
        stockQty: Math.max(0, row.stockQty || 0),
        alertQty: 10,
        manageStock: true,
        featured: false,
        active: true,
        weight: 0,
        weightUnit: "g",
        imageDataUrl: row.imageUrl,
        wooProductId: undefined,
        wooVariationId: undefined,
        wooParentId: undefined,
      });
      if (created && !existing.has(code.toLowerCase())) {
        result.created++;
        existing.add(code.toLowerCase());
      } else {
        result.updated++;
      }
    } catch (error) {
      result.failed++;
      if (result.errors.length < 12) {
        result.errors.push(
          `${code}: ${error instanceof Error ? error.message : "Unknown sync error"}`
        );
      }
    }
  }

  return result;
}

