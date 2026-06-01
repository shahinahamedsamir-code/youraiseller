import { getPathaoAccessToken } from "./pathao-token-server";
import { resolvePathaoBaseUrl, type PathaoConfig } from "./pathao-types";

export async function pathaoJson<T>(
  config: PathaoConfig,
  apiPath: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data: T }> {
  const token = await getPathaoAccessToken(config);
  const base = resolvePathaoBaseUrl(config);
  const path = apiPath.startsWith("/") ? apiPath : `/${apiPath}`;

  const res = await fetch(`${base}${path}`, {
    ...init,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...init?.headers,
    },
    cache: "no-store",
  });

  let data: T;
  try {
    data = (await res.json()) as T;
  } catch {
    data = {} as T;
  }

  return { ok: res.ok, status: res.status, data };
}
