import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import { isDevAdminAuthenticated } from "@/lib/dev-admin-auth-server";
import { sellerCanAccessScope } from "@/lib/seller-auth-server";
import { sellerDataFile, sellerScopeDir } from "@/lib/seller-data-path";
import { loadSmsAccount, saveSmsAccount } from "@/lib/sms-account-server";
import { normalizeSmsAccount } from "@/lib/sms-types";
import { getDbPool } from "@/lib/db";

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
      return NextResponse.json({ ok: true, data: account });
    }

    const data = await readData(scope, kind);
    return NextResponse.json({ ok: true, data });
  } catch {
    return NextResponse.json({ ok: true, data: null });
  }
}

export async function POST(req: Request) {
  try {
    const body = await req.json();
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

    await writeData(scope, kind, body.data);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[seller-data]", e);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
