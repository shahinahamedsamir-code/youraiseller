import { resolveCarrybeeBaseUrl, type CarrybeeConfig } from "./carrybee-types";

export async function carrybeeFetch(
  config: CarrybeeConfig,
  apiPath: string,
  init?: RequestInit
): Promise<Response> {
  const base = resolveCarrybeeBaseUrl(config);
  const path = apiPath.startsWith("/") ? apiPath : `/${apiPath}`;

  return fetch(`${base}${path}`, {
    ...init,
    headers: {
      "Client-ID": config.clientId.trim(),
      "Client-Secret": config.clientSecret.trim(),
      "Client-Context": config.clientContext.trim(),
      ...init?.headers,
    },
    cache: "no-store",
  });
}

export async function carrybeeJson<T>(
  config: CarrybeeConfig,
  apiPath: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data: T; raw: string }> {
  const res = await carrybeeFetch(config, apiPath, init);
  const raw = await res.text();
  let data: T;
  try {
    data = JSON.parse(raw) as T;
  } catch {
    data = { message: raw } as T;
  }
  return { ok: res.ok, status: res.status, data, raw };
}
