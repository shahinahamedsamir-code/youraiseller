import { NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { isDevAdminAuthenticated } from "@/lib/dev-admin-auth-server";
import { sellerCanAccessScope } from "@/lib/seller-auth-server";
import { isWebOrderTabKey, type WebOrderTabKey } from "@/lib/web-order-tabs";

/**
 * SQL predicate for each Web Order List tab, expressed against the precomputed
 * columns on the orders table. These are constant strings (no user input) so
 * they are safe to interpolate. Mirrors matchesWebOrderTab() in web-order-tabs.
 */
const TAB_SQL: Record<WebOrderTabKey, string> = {
  processing:
    "web_display_status in ('pending','processing','confirmed') and not is_incomplete",
  incomplete:
    "(web_display_status = 'incomplete' or is_incomplete) and web_display_status not in ('cancelled','complete')",
  good_no_response: "web_display_status = 'good_no_response'",
  no_response: "web_display_status = 'no_response'",
  advance_payment: "has_advance",
  on_hold: "web_display_status = 'on_hold'",
  complete: "web_display_status = 'complete'",
  cancel: "web_display_status = 'cancelled'",
  all: "true",
};

function sanitizeScope(s: string | null): string | null {
  const v = String(s || "").trim();
  return v && /^[A-Za-z0-9_-]+$/.test(v) ? v : null;
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const scope = sanitizeScope(searchParams.get("scope"));
    if (!scope) {
      return NextResponse.json({ error: "Invalid scope" }, { status: 400 });
    }
    if (!(isDevAdminAuthenticated() || (await sellerCanAccessScope(scope)))) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const pool = getDbPool();
    if (!pool) {
      return NextResponse.json({ error: "Database not configured" }, { status: 503 });
    }

    const tabParam = searchParams.get("tab") ?? "processing";
    const tab: WebOrderTabKey = isWebOrderTabKey(tabParam) ? tabParam : "processing";
    const search = (searchParams.get("search") ?? "").trim().toLowerCase();
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
    const limit = Math.min(
      200,
      Math.max(1, parseInt(searchParams.get("limit") ?? "10", 10) || 10)
    );
    const offset = (page - 1) * limit;

    // Web Order List universe: web orders that are not preorders.
    const baseWhere = "scope = $1 and is_web and not is_preorder";

    // Per-tab counts for the tab badges (single pass).
    const countSelects = (Object.keys(TAB_SQL) as WebOrderTabKey[])
      .map((k) => `count(*) filter (where ${TAB_SQL[k]}) as "${k}"`)
      .join(", ");
    const countsRes = await pool.query(
      `select ${countSelects} from orders where ${baseWhere}`,
      [scope]
    );
    const counts = countsRes.rows[0] ?? {};
    for (const k of Object.keys(counts)) counts[k] = Number(counts[k]);

    // Active tab + optional search → total and one page of full order JSON.
    const params: unknown[] = [scope];
    let where = `${baseWhere} and (${TAB_SQL[tab]})`;
    if (search) {
      params.push(`%${search}%`);
      where += ` and search_text like $${params.length}`;
    }

    const totalRes = await pool.query(
      `select count(*) as n from orders where ${where}`,
      params
    );
    const total = Number(totalRes.rows[0]?.n ?? 0);

    const pageParams = [...params, limit, offset];
    const rowsRes = await pool.query(
      `select data from orders where ${where}
       order by ord asc
       limit $${pageParams.length - 1} offset $${pageParams.length}`,
      pageParams
    );
    const rows = rowsRes.rows.map((r) => r.data);

    return NextResponse.json({ ok: true, rows, total, counts, page, limit });
  } catch (e) {
    console.error("[api/orders]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Query failed" },
      { status: 500 }
    );
  }
}
