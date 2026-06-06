import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import {
  getAppHost,
  isAppHost,
  isAppPath,
  isMarketingHost,
  isSplitDomainMode,
  resolveRequestHost,
} from "@/lib/app-hosts";

export function middleware(request: NextRequest) {
  const host = resolveRequestHost((name) => request.headers.get(name));
  const { pathname } = request.nextUrl;

  if (
    !host ||
    host === "localhost" ||
    host.endsWith(".localhost") ||
    host.includes("127.0.0.1")
  ) {
    return NextResponse.next();
  }

  if (!isSplitDomainMode()) {
    return NextResponse.next();
  }

  const onMarketing = isMarketingHost(host);
  const onApp = isAppHost(host);

  if (onMarketing && isAppPath(pathname)) {
    const url = request.nextUrl.clone();
    url.protocol = "https:";
    url.host = getAppHost();
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
