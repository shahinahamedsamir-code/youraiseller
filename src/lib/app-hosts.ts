export function stripHost(raw: string | undefined): string {
  return (raw ?? "")
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .split(":")[0]
    .toLowerCase();
}

export function getAppHost(): string {
  return stripHost(process.env.APP_HOST) || "app.youraiseller.com";
}

export function getMarketingHost(): string {
  return stripHost(process.env.MARKETING_HOST) || "youraiseller.com";
}

export function hostsMatch(host: string, target: string): boolean {
  const h = stripHost(host);
  const t = stripHost(target);
  return h === t || h === `www.${t}`;
}

export function isAppHost(host: string): boolean {
  const app = getAppHost();
  return hostsMatch(host, app);
}

export function isMarketingHost(host: string): boolean {
  return hostsMatch(host, getMarketingHost());
}

/** Prefer proxy headers used by Hostinger / reverse proxies */
export function resolveRequestHost(
  headerGet: (name: string) => string | null
): string {
  return stripHost(
    headerGet("x-forwarded-host") ??
      headerGet("x-host") ??
      headerGet("host") ??
      ""
  );
}

export const APP_PATH_PREFIXES = [
  "/dashboard",
  "/login",
  "/signup",
  "/renew",
  "/dev-admin",
  "/api",
] as const;

export function isAppPath(pathname: string): boolean {
  return APP_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

export function getAppBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ||
    process.env.APP_URL?.trim().replace(/\/$/, "") ||
    `https://${getAppHost()}`
  );
}

export function getAppLoginUrl(): string {
  return `${getAppBaseUrl()}/login`;
}

export function getAppSignupUrl(): string {
  return `${getAppBaseUrl()}/signup`;
}
