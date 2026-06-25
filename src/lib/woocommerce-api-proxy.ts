/** Server-side WooCommerce fetch helpers (used by API routes) */

export type WooCredentials = {
  storeUrl: string;
  consumerKey: string;
  consumerSecret: string;
};

export function normalizeStoreUrl(url: string): string {
  return url.trim().replace(/\/$/, "");
}

export function wooAuthHeader(key: string, secret: string): string {
  const token = Buffer.from(`${key.trim()}:${secret.trim()}`).toString("base64");
  return `Basic ${token}`;
}

export async function wooFetch(
  creds: WooCredentials,
  path: string,
  init?: RequestInit
): Promise<Response> {
  const base = normalizeStoreUrl(creds.storeUrl);
  const url = path.startsWith("http") ? path : `${base}${path}`;
  return fetch(url, {
    ...init,
    headers: {
      Authorization: wooAuthHeader(creds.consumerKey, creds.consumerSecret),
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });
}

export type WooProductTarget = {
  wooVariationId?: number;
  wooParentId?: number;
  wooProductId?: number;
  sku?: string;
};

/**
 * Resolve the WooCommerce REST path to update for a product. Prefers stored ids
 * (no lookup, and handles variable products' variations); falls back to finding
 * a simple product by SKU. Returns null when nothing matches.
 */
export async function resolveWooProductPath(
  creds: WooCredentials,
  target: WooProductTarget
): Promise<string | null> {
  // Variation of a variable product — must be updated on the variations resource.
  if (target.wooVariationId && target.wooParentId) {
    return `/wp-json/wc/v3/products/${target.wooParentId}/variations/${target.wooVariationId}`;
  }
  if (target.wooProductId) {
    return `/wp-json/wc/v3/products/${target.wooProductId}`;
  }

  const sku = target.sku?.trim();
  if (!sku) return null;

  const bySku = await wooFetch(
    creds,
    `/wp-json/wc/v3/products?sku=${encodeURIComponent(sku)}`
  );
  if (bySku.ok) {
    const found = (await bySku.json()) as { id: number }[];
    if (found?.[0]?.id) return `/wp-json/wc/v3/products/${found[0].id}`;
  }

  const bySearch = await wooFetch(
    creds,
    `/wp-json/wc/v3/products?search=${encodeURIComponent(sku)}&per_page=20`
  );
  if (bySearch.ok) {
    const list = (await bySearch.json()) as { id: number; sku: string }[];
    const match = list.find((p) => p.sku?.toLowerCase() === sku.toLowerCase());
    if (match?.id) return `/wp-json/wc/v3/products/${match.id}`;
  }

  return null;
}
