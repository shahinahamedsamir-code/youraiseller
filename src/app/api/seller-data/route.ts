import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import { gunzipSync, gzipSync } from "zlib";
import { isDevAdminAuthenticated } from "@/lib/dev-admin-auth-server";
import { sellerCanAccessScope } from "@/lib/seller-auth-server";
import { sellerDataFile, sellerScopeDir } from "@/lib/seller-data-path";
import { loadSmsAccount, saveSmsAccount } from "@/lib/sms-account-server";
import { normalizeSmsAccount } from "@/lib/sms-types";
import { getDbPool } from "@/lib/db";
import { syncOrdersTable, upsertOrderRow } from "@/lib/orders-db";
import type { Order } from "@/lib/orders-store";
import {
  SELLER_DATA_GZIP_THRESHOLD,
  slimOrdersBlob,
} from "@/lib/seller-data-payload";

/**
 * Read one (scope, kind) blob. Prefers PostgreSQL (Supabase); falls back to the
 * legacy JSON file when no DB is configured or the row does not exist yet.
 */
async function readData(scope: string, kind: string): Promise<unknown | null> {
  const pool = getDbPool();
  if (pool) {
    try {
      const res = await pool.query(
        "select data from seller_data where scope = $1 and kind = $2",
        [scope, kind]
      );
      if (res.rows.length > 0) return res.rows[0].data;
    } catch (e) {
      console.error("[seller-data] db read failed, falling back to file", e);
    }
  }
  try {
    const raw = await fs.readFile(fileFor(scope, kind), "utf-8");
    return JSON.parse(raw);
  } catch {
    return null;
  }
}

/**
 * Persist one (scope, kind) blob to PostgreSQL when configured, otherwise to the
 * legacy JSON file. On DB failure we fall back to the file so writes are never
 * silently lost.
 */
async function writeData(scope: string, kind: string, data: unknown): Promise<void> {
  const pool = getDbPool();
  if (pool) {
    try {
      await pool.query(
        `insert into seller_data (scope, kind, data, updated_at)
         values ($1, $2, $3, now())
         on conflict (scope, kind)
         do update set data = excluded.data, updated_at = now()`,
        [scope, kind, JSON.stringify(data)]
      );
      return;
    } catch (e) {
      console.error("[seller-data] db write failed, falling back to file", e);
    }
  }
  await fs.mkdir(sellerScopeDir(scope), { recursive: true });
  await fs.writeFile(fileFor(scope, kind), JSON.stringify(data, null, 2), "utf-8");
}

/** Whitelisted data kinds that may be synced per business. */
const ALLOWED_KINDS = new Set([
  "orders",
  "inventory",
  "customers",
  "woocommerce",
  "business",
  "ordersources",
  "shippingnotes",
  "ordertags",
  "advancesettings",
  "deliverymethods",
  "sms",
  "accounting",
  "poscash",
]);

function sanitize(part: string): string | null {
  const s = String(part || "").trim();
  if (!s || !/^[A-Za-z0-9_-]+$/.test(s)) return null;
  return s;
}

function fileFor(scope: string, kind: string): string {
  return sellerDataFile(scope, `${kind}.json`);
}

async function authorizeScope(scope: string): Promise<boolean> {
  if (isDevAdminAuthenticated()) return true;
  return sellerCanAccessScope(scope);
}

function gzipJsonResponse(payload: unknown): NextResponse {
  const json = JSON.stringify(payload);
  if (json.length >= SELLER_DATA_GZIP_THRESHOLD) {
    return new NextResponse(gzipSync(json), {
      headers: {
        "Content-Type": "application/json",
        "Content-Encoding": "gzip",
      },
    });
  }
  return NextResponse.json(payload);
}

async function readJsonBody(req: Request): Promise<unknown> {
  const buf = Buffer.from(await req.arrayBuffer());
  if (req.headers.get("content-encoding") === "gzip") {
    return JSON.parse(gunzipSync(buf).toString("utf-8"));
  }
  return JSON.parse(buf.toString("utf-8"));
}

function normalizeKindData(kind: string, data: unknown): unknown {
  return kind === "orders" ? slimOrdersBlob(data) : data;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const scope = sanitize(searchParams.get("scope") ?? "");
    const kind = sanitize(searchParams.get("kind") ?? "");
    if (!scope || !kind || !ALLOWED_KINDS.has(kind)) {
      return NextResponse.json({ error: "Invalid scope or kind" }, { status: 400 });
    }

    if (!(await authorizeScope(scope))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (kind === "sms") {
      const account = await loadSmsAccount(scope);
      return gzipJsonResponse({ ok: true, data: account });
    }

    const raw = await readData(scope, kind);
    const data = raw == null ? null : normalizeKindData(kind, raw);
    return gzipJsonResponse({ ok: true, data });
  } catch {
    return NextResponse.json({ ok: true, data: null });
  }
}

export async function POST(req: Request) {
  try {
    const body = (await readJsonBody(req)) as {
      scope?: string;
      kind?: string;
      data?: unknown;
    };
    const scope = sanitize(body?.scope ?? "");
    const kind = sanitize(body?.kind ?? "");
    if (!scope || !kind || !ALLOWED_KINDS.has(kind)) {
      return NextResponse.json({ error: "Invalid scope or kind" }, { status: 400 });
    }

    if (!(await authorizeScope(scope))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    if (body?.data === undefined) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }

    if (kind === "sms") {
      const account = normalizeSmsAccount(body.data);
      await saveSmsAccount(scope, account);
      return NextResponse.json({ ok: true });
    }

    const data = normalizeKindData(kind, body.data);
    await writeData(scope, kind, data);

    // Keep the normalized `orders` table in sync so the paginated read API can
    // serve one page without the browser ever loading every order. Failures
    // here must not fail the seller's write (seller_data is the source of truth).
    if (kind === "orders") {
      const list = (data as { orders?: unknown })?.orders;
      if (Array.isArray(list)) {
        try {
          await syncOrdersTable(scope, list);
        } catch (e) {
          console.error("[seller-data] orders-table sync failed", e);
        }
      }
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[seller-data]", e);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}

/**
 * Persist a SINGLE order without the browser uploading the whole orders blob.
 * The server reads the current blob, patches the one order, writes it back, and
 * upserts the normalized row. This keeps large-store edits (e.g. cancelling an
 * order) from being dropped by the client-side payload size limit — which is why
 * a cancel could "snap back" to pending after a later pull.
 */
export async function PATCH(req: Request) {
  try {
    const body = (await readJsonBody(req)) as { scope?: string; order?: Order };
    const scope = sanitize(body?.scope ?? "");
    const order = body?.order;
    if (!scope) {
      return NextResponse.json({ error: "Invalid scope" }, { status: 400 });
    }
    if (!order || typeof order !== "object" || !order.id) {
      return NextResponse.json({ error: "Missing order" }, { status: 400 });
    }
    if (!(await authorizeScope(scope))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    // Slim the order the same way a full push would.
    const slimList = (slimOrdersBlob({ orders: [order] }) as { orders?: Order[] })
      .orders;
    const slimOrder = (slimList && slimList[0]) || order;

    // Update the normalized row FIRST — the paginated read API (the source large
    // stores display from) serves this, and it's a tiny single-row write that
    // won't fail like a multi-MB blob rewrite might.
    try {
      await upsertOrderRow(scope, slimOrder);
    } catch (e) {
      console.error("[seller-data] order-row upsert failed", e);
    }

    // Best-effort: also patch the full blob (used by the local-storage pull).
    // Never fail the request over this — it can be heavy on very large stores.
    try {
      const raw = (await readData(scope, "orders")) as { orders?: Order[] } | null;
      const orders = Array.isArray(raw?.orders) ? [...raw!.orders] : [];
      const idx = orders.findIndex((o) => o.id === slimOrder.id);
      if (idx >= 0) orders[idx] = slimOrder;
      else orders.unshift(slimOrder);
      await writeData(scope, "orders", { ...(raw ?? {}), orders });
    } catch (e) {
      console.error("[seller-data] blob patch failed (row still saved)", e);
    }
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[seller-data] patch", e);
    return NextResponse.json({ error: "Patch failed" }, { status: 500 });
  }
}
