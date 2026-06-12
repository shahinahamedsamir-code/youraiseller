import { createHmac, timingSafeEqual } from "crypto";
import { NextResponse } from "next/server";
import { getPublicRequestOrigin } from "@/lib/app-hosts";

const OAUTH_STATE_COOKIE = "shopify_oauth_state";
const OAUTH_CTX_COOKIE = "shopify_oauth_ctx";
const DONE_REDIRECT = "/dashboard/integration/shopify?oauth=success";
const FAIL_REDIRECT = "/dashboard/integration/shopify?oauth=failed";

type OAuthContext = {
  shop: string;
  clientId: string;
  clientSecret: string;
};

function safeEqual(a: string, b: string): boolean {
  const aa = Buffer.from(a, "utf8");
  const bb = Buffer.from(b, "utf8");
  if (aa.length !== bb.length) return false;
  return timingSafeEqual(aa, bb);
}

function verifyHmac(searchParams: URLSearchParams, clientSecret: string): boolean {
  const hmac = searchParams.get("hmac") || "";
  if (!hmac) return false;

  const pairs: string[] = [];
  for (const [key, value] of searchParams.entries()) {
    if (key === "hmac" || key === "signature") continue;
    pairs.push(`${key}=${value}`);
  }
  pairs.sort();
  const message = pairs.join("&");
  const digest = createHmac("sha256", clientSecret).update(message, "utf8").digest("hex");
  return safeEqual(digest, hmac);
}

function clearCookies(res: NextResponse) {
  res.cookies.set(OAUTH_STATE_COOKIE, "", { path: "/", maxAge: 0 });
  res.cookies.set(OAUTH_CTX_COOKIE, "", { path: "/", maxAge: 0 });
}

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const publicOrigin = getPublicRequestOrigin(req);
    const state = url.searchParams.get("state") || "";
    const code = url.searchParams.get("code") || "";
    const shopFromUrl = (url.searchParams.get("shop") || "").trim().toLowerCase();

    const cookieHeader = req.headers.get("cookie") || "";
    const cookieMap = Object.fromEntries(
      cookieHeader
        .split(";")
        .map((x) => x.trim())
        .filter(Boolean)
        .map((pair) => {
          const i = pair.indexOf("=");
          const k = i >= 0 ? pair.slice(0, i) : pair;
          const v = i >= 0 ? pair.slice(i + 1) : "";
          return [k, decodeURIComponent(v)];
        })
    ) as Record<string, string>;

    const expectedState = cookieMap[OAUTH_STATE_COOKIE] || "";
    const rawCtx = cookieMap[OAUTH_CTX_COOKIE] || "";
    const ctx = rawCtx ? (JSON.parse(rawCtx) as OAuthContext) : null;

    if (!expectedState || !ctx || !state || !safeEqual(state, expectedState)) {
      const res = NextResponse.redirect(
        new URL(`${FAIL_REDIRECT}&reason=state`, publicOrigin)
      );
      clearCookies(res);
      return res;
    }

    if (!code || !shopFromUrl || shopFromUrl !== ctx.shop) {
      const res = NextResponse.redirect(
        new URL(`${FAIL_REDIRECT}&reason=params`, publicOrigin)
      );
      clearCookies(res);
      return res;
    }

    if (!verifyHmac(url.searchParams, ctx.clientSecret)) {
      const res = NextResponse.redirect(
        new URL(`${FAIL_REDIRECT}&reason=hmac`, publicOrigin)
      );
      clearCookies(res);
      return res;
    }

    const tokenRes = await fetch(`https://${ctx.shop}/admin/oauth/access_token`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_id: ctx.clientId,
        client_secret: ctx.clientSecret,
        code,
      }),
      cache: "no-store",
    });

    if (!tokenRes.ok) {
      const res = NextResponse.redirect(
        new URL(`${FAIL_REDIRECT}&reason=token`, publicOrigin)
      );
      clearCookies(res);
      return res;
    }

    const tokenJson = (await tokenRes.json()) as {
      access_token?: string;
      scope?: string;
    };
    const accessToken = String(tokenJson.access_token ?? "").trim();
    if (!accessToken) {
      const res = NextResponse.redirect(
        new URL(`${FAIL_REDIRECT}&reason=empty_token`, publicOrigin)
      );
      clearCookies(res);
      return res;
    }

    const done = NextResponse.redirect(new URL(DONE_REDIRECT, publicOrigin));
    done.cookies.set("shopify_oauth_done", "1", {
      httpOnly: false,
      sameSite: "lax",
      secure: publicOrigin.startsWith("https://"),
      path: "/",
      maxAge: 60,
    });
    done.cookies.set("shopify_oauth_shop", ctx.shop, {
      httpOnly: false,
      sameSite: "lax",
      secure: publicOrigin.startsWith("https://"),
      path: "/",
      maxAge: 60,
    });
    done.cookies.set("shopify_oauth_token", accessToken, {
      httpOnly: false,
      sameSite: "lax",
      secure: publicOrigin.startsWith("https://"),
      path: "/",
      maxAge: 60,
    });
    clearCookies(done);
    return done;
  } catch {
    const url = new URL(req.url);
    const publicOrigin = getPublicRequestOrigin(req);
    void url;
    return NextResponse.redirect(new URL(`${FAIL_REDIRECT}&reason=server`, publicOrigin));
  }
}

