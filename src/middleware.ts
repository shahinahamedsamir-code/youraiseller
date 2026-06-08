import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getAppHostForRedirect,
  isAppPath,
  isLocalDevHost,
  resolveEffectiveHost,
  shouldShowMainMarketingPage,
} from "@/lib/app-hosts";

function withRequestHostHeaders(
  request: NextRequest,
  host: string,
  extra?: Record<string, string>
): Headers {
  const requestHeaders = new Headers(request.headers);
  if (host) requestHeaders.set("x-effective-host", host);
  requestHeaders.set("x-url-hostname", request.nextUrl.hostname);
  for (const [key, value] of Object.entries(extra ?? {})) {
    requestHeaders.set(key, value);
  }
  return requestHeaders;
}

function nextWithHost(request: NextRequest, host: string): NextResponse {
  return NextResponse.next({
    request: { headers: withRequestHostHeaders(request, host) },
  });
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const host = resolveEffectiveHost(
    (name) => request.headers.get(name),
    request.nextUrl.hostname
  );

  if (!host || isLocalDevHost(host)) {
    return nextWithHost(request, host || request.nextUrl.hostname);
  }

  const onMarketingHome = shouldShowMainMarketingPage(host);

  if (onMarketingHome && pathname === "/") {
    const url = request.nextUrl.clone();
    url.pathname = "/marketing";
    return NextResponse.rewrite(url, {
      request: {
        headers: withRequestHostHeaders(request, host, {
          "x-marketing-home": "1",
        }),
      },
    });
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
