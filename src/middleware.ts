import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getAppHostForRedirect,
  isAppPath,
  isLocalDevHost,
  resolveEffectiveHost,
  shouldShowMainMarketingPage,
} from "@/lib/app-hosts";

function nextWithHost(request: NextRequest, host: string): NextResponse {
  const requestHeaders = new Headers(request.headers);
  if (host) requestHeaders.set("x-effective-host", host);
  return NextResponse.next({ request: { headers: requestHeaders } });
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = resolveEffectiveHost(
    (name) => request.headers.get(name),
    request.nextUrl.hostname
  );

  if (!host || isLocalDevHost(host)) {
    return NextResponse.next();
  }

  const onMarketingHome = shouldShowMainMarketingPage(host);

  if (onMarketingHome && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/marketing";
    const requestHeaders = new Headers(request.headers);
    requestHeaders.set("x-effective-host", host);
    return NextResponse.rewrite(url, { request: { headers: requestHeaders } });
  }

  if (onMarketingHome && isAppPath(pathname)) {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    url.host = getAppHostForRedirect();
    return NextResponse.redirect(url);
  }

  return nextWithHost(request, host);
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brand/|icon.png).*)"],
};
