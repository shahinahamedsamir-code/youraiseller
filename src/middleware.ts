import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

function stripHost(raw: string | undefined): string {
  return (raw ?? "")
    .trim()
    .replace(/^https?:\/\//, "")
    .replace(/\/$/, "")
    .split(":")[0]
    .toLowerCase();
}

const APP_HOST = stripHost(process.env.APP_HOST) || "app.youraiseller.com";
const MARKETING_HOST = stripHost(process.env.MARKETING_HOST) || "youraiseller.com";

/** App-only routes — marketing domain redirects these to APP_HOST */
const APP_PATH_PREFIXES = [
  "/dashboard",
  "/login",
  "/signup",
  "/renew",
  "/dev-admin",
  "/api",
];

function isAppPath(pathname: string): boolean {
  return APP_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function hostsMatch(host: string, target: string): boolean {
  return host === target || host === `www.${target}`;
}

export function middleware(request: NextRequest) {
  const host = stripHost(request.headers.get("host") ?? "");
  const { pathname } = request.nextUrl;

  if (
    !host ||
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.includes("127.0.0.1")
  ) {
    return NextResponse.next();
  }

  const onMarketing = hostsMatch(host, MARKETING_HOST);
  const onApp = hostsMatch(host, APP_HOST);

  if (onMarketing && isAppPath(pathname)) {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    url.host = APP_HOST;
    return NextResponse.redirect(url);
  }

  if (onApp && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/login";
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brand/|icon.png).*)"],
};
