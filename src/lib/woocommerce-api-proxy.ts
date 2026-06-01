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
