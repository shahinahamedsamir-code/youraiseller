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

export function isProductionMarketingDomain(host: string): boolean {
  const h = stripHost(host);
  return h === PRODUCTION_MARKETING_HOST || h === `www.${PRODUCTION_MARKETING_HOST}`;
}

/** Main marketing site home (youraiseller.com) — not the app splash subdomain. */
export function shouldShowMainMarketingPage(host: string): boolean {
  if (!host || isLocalDevHost(host)) return false;
  if (isProductionAppSubdomain(host)) return false;
  if (isProductionMarketingDomain(host)) return true;
  return isSplitDomainMode() && isMarketingHost(host) && !isAppHost(host);
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

/**
 * Hostinger may send the Node app's primary hostname in headers even when the
 * browser URL is youraiseller.com — trust the request URL hostname when known.
 */
export function resolveEffectiveHost(
  headerGet: (name: string) => string | null,
  urlHostname?: string
): string {
  const fromUrl = stripHost(urlHostname);
  if (fromUrl && (isProductionMarketingDomain(fromUrl) || isProductionAppSubdomain(fromUrl))) {
    return fromUrl;
  }
  const fromHeaders = resolveRequestHost(headerGet);
  return fromHeaders || fromUrl;
}

/** Host to use when redirecting dashboard paths off the marketing domain. */
export function getAppHostForRedirect(): string {
  const h = stripHost(getAppHost());
  if (
    h === PRODUCTION_MARKETING_HOST ||
    h === `www.${PRODUCTION_MARKETING_HOST}` ||
    !h
  ) {
    return PRODUCTION_APP_HOST;
  }
  return h;
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
  const fromEnv =
    process.env.NEXT_PUBLIC_APP_URL?.trim().replace(/\/$/, "") ||
    process.env.APP_URL?.trim().replace(/\/$/, "");
  if (fromEnv) {
    const h = stripHost(fromEnv);
    if (h === PRODUCTION_MARKETING_HOST || h === `www.${PRODUCTION_MARKETING_HOST}`) {
      return `https://${PRODUCTION_APP_HOST}`;
    }
    return fromEnv;
  }
  const appHost = stripHost(getAppHost());
  if (appHost === PRODUCTION_MARKETING_HOST || appHost === `www.${PRODUCTION_MARKETING_HOST}`) {
    return `https://${PRODUCTION_APP_HOST}`;
  }
  return `https://${appHost || PRODUCTION_APP_HOST}`;
}

export function getAppLoginUrl(requestHost?: string): string {
  if (!requestHost || isLocalDevHost(requestHost)) return "/login";
  if (isAppHost(requestHost)) return "/login";
  if (!isSplitDomainMode()) return "/login";
  return `${getAppBaseUrl()}/login`;
}

export function getAppSignupUrl(requestHost?: string): string {
  if (requestHost && isLocalDevHost(requestHost)) return "/signup";
  if (!isSplitDomainMode()) return "/signup";
  return `${getAppBaseUrl()}/signup`;
}

function isInternalRequestHost(host: string): boolean {
  const h = stripHost(host);
  return (
    !h ||
    h === "0.0.0.0" ||
    h === "127.0.0.1" ||
    h === "localhost" ||
    h.endsWith(".localhost")
  );
}

/** Public site origin for emails/links — avoids internal 0.0.0.0:3000 on Hostinger. */
export function getPublicRequestOrigin(req: Request): string {
  const forwardedHost = req.headers.get("x-forwarded-host")?.split(",")[0]?.trim();
  const forwardedProto = req.headers.get("x-forwarded-proto")?.split(",")[0]?.trim();
  if (forwardedHost && !isInternalRequestHost(forwardedHost)) {
    const proto = forwardedProto || (process.env.NODE_ENV === "production" ? "https" : "http");
    return `${proto}://${forwardedHost}`;
  }

  const hostHeader = req.headers.get("host")?.split(",")[0]?.trim();
  if (hostHeader && !isInternalRequestHost(hostHeader)) {
    const proto =
      forwardedProto ||
      (process.env.NODE_ENV === "production" ? "https" : "http");
    return `${proto}://${hostHeader}`;
  }

  try {
    const originHost = new URL(req.url).hostname;
    if (!isInternalRequestHost(originHost)) {
      return new URL(req.url).origin;
    }
  } catch {
    /* fall through */
  }

  return getAppBaseUrl();
}
