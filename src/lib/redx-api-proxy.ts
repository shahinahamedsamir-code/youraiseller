import { resolveRedxBaseUrl, type RedxConfig } from "./redx-types";

export async function redxFetch(
  config: RedxConfig,
  apiPath: string,
  init?: RequestInit
): Promise<Response> {
  const base = resolveRedxBaseUrl(config);
  const path = apiPath.startsWith("/") ? apiPath : `/${apiPath}`;

  return fetch(`${base}${path}`, {
    ...init,
    headers: {
      "API-ACCESS-TOKEN": `Bearer ${config.accessToken.trim()}`,
      ...init?.headers,
    },
    cache: "no-store",
  });
}

export async function redxJson<T>(
  config: RedxConfig,
  apiPath: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data: T; raw: string }> {
  const res = await redxFetch(config, apiPath, init);
  const raw = await res.text();
  let data: T;
  try {
    data = JSON.parse(raw) as T;
  } catch {
    data = { message: raw } as T;
  }
  return { ok: res.ok, status: res.status, data, raw };
}

