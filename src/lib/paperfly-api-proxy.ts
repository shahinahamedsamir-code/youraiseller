import { resolvePaperflyBaseUrl, type PaperflyConfig } from "./paperfly-types";

function basicAuth(config: PaperflyConfig): string {
  return Buffer.from(`${config.username}:${config.password}`).toString("base64");
}

export async function paperflyFetch(
  config: PaperflyConfig,
  apiPath: string,
  init?: RequestInit
): Promise<Response> {
  const base = resolvePaperflyBaseUrl(config);
  const path = apiPath.startsWith("/") ? apiPath : `/${apiPath}`;

  return fetch(`${base}${path}`, {
    ...init,
    headers: {
      Authorization: `Basic ${basicAuth(config)}`,
      paperflykey: config.paperflyKey.trim(),
      ...init?.headers,
    },
    cache: "no-store",
  });
}

export async function paperflyJson<T>(
  config: PaperflyConfig,
  apiPath: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data: T; raw: string }> {
  const res = await paperflyFetch(config, apiPath, init);
  const raw = await res.text();
  let data: T;
  try {
    data = JSON.parse(raw) as T;
  } catch {
    data = { message: raw } as T;
  }
  return { ok: res.ok, status: res.status, data, raw };
}

