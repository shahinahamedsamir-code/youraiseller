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

const PRODUCTION_APP_HOST = "app.youraiseller.com";
const PRODUCTION_MARKETING_HOST = "youraiseller.com";

function isProductionAppSubdomain(host: string): boolean {
  const h = stripHost(host);
  return (
    h === PRODUCTION_APP_HOST ||
    h.endsWith(`.${PRODUCTION_APP_HOST}`)
  );
}

function isProductionMarketingDomain(host: string): boolean {
  const h = stripHost(host);
  return h === PRODUCTION_MARKETING_HOST || h === `www.${PRODUCTION_MARKETING_HOST}`;
}

export function isAppHost(host: string): boolean {
  if (isProductionAppSubdomain(host)) return true;
  return hostsMatch(host, getAppHost());
}

export function isMarketingHost(host: string): boolean {
  if (isProductionMarketingDomain(host)) return true;
  return hostsMatch(host, getMarketingHost());
}

/** True when marketing site and dashboard use different hostnames */
export function isSplitDomainMode(): boolean {
  return getAppHost() !== getMarketingHost();
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

export function isLocalDevHost(host: string): boolean {
  const h = stripHost(host);
  return !h || h === "localhost" || h.endsWith(".localhost") || h.includes("127.0.0.1");
}

export function getAppBaseUrl(): string {
  return (
    process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ||
    process.env.APP_URL?.trim().replace(/\/$/, "") ||
    `https://${getAppHost()}`
  );
}

export function getAppLoginUrl(requestHost?: string): string {
  if (requestHost && isLocalDevHost(requestHost)) return "/login";
  if (!isSplitDomainMode()) return "/login";
  return `${getAppBaseUrl()}/login`;
}

export function getAppSignupUrl(requestHost?: string): string {
  if (requestHost && isLocalDevHost(requestHost)) return "/signup";
  if (!isSplitDomainMode()) return "/signup";
  return `${getAppBaseUrl()}/signup`;
}
