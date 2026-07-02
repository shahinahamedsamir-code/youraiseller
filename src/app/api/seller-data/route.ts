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

const MONTHS: Record<string, number> = {
  jan: 0, feb: 1, mar: 2, apr: 3, may: 4, jun: 5,
  jul: 6, aug: 7, sep: 8, oct: 9, nov: 10, dec: 11,
};

/** Parse the app's "02 Jul 2026, 08:46 AM" (or ISO) updatedAt into a number. */
function parseUpdatedAt(s: unknown): number {
  const str = String(s ?? "").trim();
  if (!str) return 0;
  const iso = Date.parse(str);
  if (!Number.isNaN(iso)) return iso;
  const m = str.match(
    /(\d{1,2})\s+([A-Za-z]{3,})\s+(\d{4})(?:,?\s*(\d{1,2}):(\d{2})\s*(am|pm)?)?/i
  );
  if (!m) return 0;
  const mon = MONTHS[m[2].slice(0, 3).toLowerCase()];
  if (mon === undefined) return 0;
  let hh = m[4] ? parseInt(m[4], 10) : 0;
  const mm = m[5] ? parseInt(m[5], 10) : 0;
  const ap = m[6]?.toLowerCase();
  if (ap === "pm" && hh < 12) hh += 12;
  if (ap === "am" && hh === 12) hh = 0;
  return new Date(parseInt(m[3], 10), mon, parseInt(m[1], 10), hh, mm).getTime();
}

type ServerOrder = {
  id?: string;
  updatedAt?: string;
  advance?: number;
  status?: string;
  webQueueReleased?: boolean;
  items?: unknown[];
  subtotal?: number;
  total?: number;
  activityLog?: { at?: string }[];
};

// Terminal statuses a seller sets by hand — a background/stale write must never
// silently move an order OUT of one of these (e.g. cancelled → pending).
const SETTLED_STATUSES = new Set([
  "cancelled",
  "returned",
  "lost",
  "delivered",
]);

/**
 * Newest activity-log timestamp for an order (ISO). Every real seller edit
 * appends an activity entry, but a background Woo re-sync of a promoted order
 * does NOT — it only re-stamps updatedAt. So the activity tip, not updatedAt,
 * tells a genuine edit apart from a stale tab's Woo rewrite. Falls back to
 * updatedAt when there is no activity log.
 */
function activityTipMs(o: ServerOrder | undefined): number {
  const log = o?.activityLog;
  let max = 0;
  if (Array.isArray(log)) {
    for (const a of log) {
      const t = Date.parse(String(a?.at ?? ""));
      if (!Number.isNaN(t) && t > max) max = t;
    }
  }
  return max || parseUpdatedAt(o?.updatedAt);
}

function itemsDiffer(a: unknown, b: unknown): boolean {
  return JSON.stringify(a ?? null) !== JSON.stringify(b ?? null);
}

/**
 * A promoted (webQueueReleased) order is seller-owned — WooCommerce must never
 * change it. If an incoming write to such an order changes its line items but
 * carries NO newer activity than the copy we already have, it is a stale rewrite
 * (typically an old browser tab still running the pre-fix Woo sync). Keep the
 * existing items/totals so a manually added product can't be wiped a few
 * seconds/minutes after Save. Returns the items/totals to persist.
 */
function protectPromotedItems(
  incoming: ServerOrder,
  existing: ServerOrder | undefined
): Pick<ServerOrder, "items" | "subtotal" | "total"> | null {
  if (!existing?.webQueueReleased || !Array.isArray(existing.items)) return null;
  if (!itemsDiffer(incoming.items, existing.items)) return null;
  if (activityTipMs(incoming) > activityTipMs(existing)) return null; // genuine edit
  return {
    items: existing.items,
    subtotal: existing.subtotal,
    total: existing.total,
  };
}

/**
 * Guard an existing order against a stale rewrite. A real change always appends
 * a newer activity entry; a stale full-blob push (e.g. an old tab that never got
 * the seller's cancel) does not. So when an incoming copy would move an order OUT
 * of a settled status (cancelled/returned/lost/delivered) but carries no newer
 * activity, keep the settled status — this is what stopped a cancelled Approved
 * order from snapping back to pending. Also preserves promoted-order items.
 * Returns the fields to keep from `existing`, or null when nothing needs guarding.
 */
function protectStaleOrderRewrite(
  incoming: ServerOrder,
  existing: ServerOrder | undefined
): Partial<ServerOrder> | null {
  if (!existing) return null;
  const preserve: Partial<ServerOrder> = {};

  const items = protectPromotedItems(incoming, existing);
  if (items) Object.assign(preserve, items);

  const es = String(existing.status ?? "");
  if (
    SETTLED_STATUSES.has(es) &&
    String(incoming.status ?? "") !== es &&
    activityTipMs(incoming) <= activityTipMs(existing)
  ) {
    preserve.status = existing.status;
  }

  return Object.keys(preserve).length ? preserve : null;
}

/**
 * Merge an incoming orders blob into what the server already has, keeping the
 * newest copy of each order (and never wiping a seller advance the server has
 * but the push lacks). This stops a stale full-blob push from one tab/device
 * from reverting a newer edit (status/cancel/note/advance) made elsewhere.
 */
function mergeServerOrders(incoming: unknown, existing: unknown): unknown {
  const inc = (incoming as { orders?: ServerOrder[] })?.orders;
  const exi = (existing as { orders?: ServerOrder[] })?.orders;
  if (!Array.isArray(inc)) return incoming;
  if (!Array.isArray(exi) || exi.length === 0) return incoming;

  const byId = new Map<string, ServerOrder>();
  for (const o of inc) if (o?.id) byId.set(o.id, o);
  for (const eo of exi) {
    if (!eo?.id) continue;
    const io = byId.get(eo.id);
    if (!io) {
      byId.set(eo.id, eo); // order only on the server — don't lose it
      continue;
    }
    const existingNewer =
      parseUpdatedAt(eo.updatedAt) > parseUpdatedAt(io.updatedAt);
    const advanceProtect = (eo.advance ?? 0) > 0 && !(io.advance ?? 0);
    if (existingNewer || advanceProtect) {
      byId.set(eo.id, eo);
      continue;
    }
    // Keep a settled status / promoted-order items when the incoming copy is a
    // stale rewrite (changed them but carries no newer activity than we have).
    const keep = protectStaleOrderRewrite(io, eo);
    if (keep) byId.set(eo.id, { ...io, ...keep });
  }
  return { ...(incoming as object), orders: [...byId.values()] };
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

    let data = normalizeKindData(kind, body.data);
    // Merge orders with what the server already has so a stale full-blob push
    // from another tab/device can't revert a newer edit (status/cancel/note/
    // advance) — the permanent fix for multi-tab reverts.
    if (kind === "orders") {
      try {
        const existing = await readData(scope, "orders");
        data = mergeServerOrders(data, existing);
      } catch (e) {
        console.error("[seller-data] order merge failed, writing as-is", e);
      }
    }
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
    let slimOrder = (slimList && slimList[0]) || order;

    // Read the current blob up front so we can (a) guard a promoted order's items
    // against a stale Woo rewrite and (b) patch the blob below — one read, reused.
    let raw: { orders?: Order[] } | null = null;
    try {
      raw = (await readData(scope, "orders")) as { orders?: Order[] } | null;
    } catch (e) {
      console.error("[seller-data] blob read failed", e);
    }
    const existingOrders = Array.isArray(raw?.orders) ? raw!.orders : [];
    const existingOrder = existingOrders.find((o) => o.id === slimOrder.id);

    // A stale write (an old tab that never got the seller's cancel/edit) must not
    // revert a settled status or wipe a promoted order's items. When the incoming
    // copy carries no newer activity, keep those fields from what we already have.
    const keep = protectStaleOrderRewrite(
      slimOrder as ServerOrder,
      existingOrder as ServerOrder | undefined
    );
    if (keep) {
      slimOrder = { ...slimOrder, ...keep } as Order;
    }

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
      const orders = existingOrders.length ? [...existingOrders] : [];
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
