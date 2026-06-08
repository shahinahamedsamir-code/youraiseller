import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getAppHostForRedirect,
  isAppPath,
  isLocalDevHost,
  resolveEffectiveHost,
  shouldShowMainMarketingPage,
} from "@/lib/app-hosts";

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
    return NextResponse.rewrite(url);
  }

  if (onMarketingHome && isAppPath(pathname)) {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    url.host = getAppHostForRedirect();
    return NextResponse.redirect(url);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico|brand/|icon.png).*)"],
};
