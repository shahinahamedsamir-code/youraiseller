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

    // Web Order List universe: web orders that are not preorders. Promoted
    // orders (webQueueReleased) stay visible here (Complete tab) as a record
    // while also appearing in Approved Orders.
    const baseWhere = "scope = $1 and is_web and not is_preorder";

    // Per-tab counts for the tab badges (single pass, no search filter).
    const countSelects = (Object.keys(TAB_SQL) as WebOrderTabKey[])
      .map((k) => `count(*) filter (where ${TAB_SQL[k]}) as "${k}"`)
      .join(", ");

    // Active tab + optional search → one page of full order JSON.
    const params: unknown[] = [scope];
    let where = `${baseWhere} and (${TAB_SQL[tab]})`;
    if (search) {
      params.push(`%${search}%`);
      where += ` and search_text like $${params.length}`;
    }
    const pageParams = [...params, limit, offset];

    // Run the counts and page queries in parallel to halve round-trip latency.
    // The total for the active tab comes for free from the counts row when there
    // is no search; only a search needs its own filtered count.
    const queries: Promise<unknown>[] = [
      pool.query(`select ${countSelects} from orders where ${baseWhere}`, [scope]),
      pool.query(
        `select data from orders where ${where}
         order by ord asc
         limit $${pageParams.length - 1} offset $${pageParams.length}`,
        pageParams
      ),
    ];
    if (search) {
      queries.push(
        pool.query(`select count(*) as n from orders where ${where}`, params)
      );
    }

    const [countsRes, rowsRes, totalRes] = (await Promise.all(queries)) as Array<{
      rows: Array<Record<string, unknown>>;
    }>;

    const counts = countsRes.rows[0] ?? {};
    for (const k of Object.keys(counts)) counts[k] = Number(counts[k]);
    const rows = rowsRes.rows.map((r) => r.data);
    const total = search
      ? Number(totalRes.rows[0]?.n ?? 0)
      : Number(counts[tab] ?? 0);

    return NextResponse.json({ ok: true, rows, total, counts, page, limit });
  } catch (e) {
    console.error("[api/orders]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Query failed" },
      { status: 500 }
    );
  }
}
