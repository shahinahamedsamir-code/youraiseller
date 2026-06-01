import { STEADFAST_API_BASE } from "./steadfast-types";

export type SteadfastCredentials = {
  apiKey: string;
  apiSecret: string;
};

export async function steadfastFetch(
  creds: SteadfastCredentials,
  path: string,
  init?: RequestInit
): Promise<Response> {
  const url = path.startsWith("http")
    ? path
    : `${STEADFAST_API_BASE}${path.startsWith("/") ? path : `/${path}`}`;

  return fetch(url, {
    ...init,
    headers: {
      "Api-Key": creds.apiKey.trim(),
      "Secret-Key": creds.apiSecret.trim(),
      "Content-Type": "application/json",
      ...init?.headers,
    },
    cache: "no-store",
  });
}

export async function steadfastJson<T>(
  creds: SteadfastCredentials,
  path: string,
  init?: RequestInit
): Promise<{ ok: boolean; status: number; data: T; raw: string }> {
  const res = await steadfastFetch(creds, path, init);
  const raw = await res.text();
  let data: T;
  try {
    data = JSON.parse(raw) as T;
  } catch {
    data = { message: raw } as T;
  }
  return { ok: res.ok, status: res.status, data, raw };
}
