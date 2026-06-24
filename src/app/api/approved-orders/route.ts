import { NextResponse } from "next/server";
import { getDbPool } from "@/lib/db";
import { isDevAdminAuthenticated } from "@/lib/dev-admin-auth-server";
import { sellerCanAccessScope } from "@/lib/seller-auth-server";

/**
 * Server-paginated Approved Orders (Order List / All List / Preorder List).
 * Mirrors loadOrders(filter) + the OrderTable status tabs, delivery-method chips,
 * search, sort and pagination — but filters/paginates in SQL so the browser only
 * ever holds one page. Counts are validated to match getOrderStatusCounts().
 */

function sanitizeScope(s: string | null): string | null {
  const v = String(s || "").trim();
  return v && /^[A-Za-z0-9_-]+$/.test(v) ? v : null;
}

const SORT_COLUMNS: Record<string, string> = {
  date: "created_at",
  total: "total",
  customer: "customer_name",
};

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

    const mode = searchParams.get("mode") ?? "approved"; // approved | all | preorder
    const status = searchParams.get("status") ?? "pending";
    const chip = (searchParams.get("chip") ?? "all").trim();
    const search = (searchParams.get("search") ?? "").trim().toLowerCase();
    const sortKey = SORT_COLUMNS[searchParams.get("sort") ?? "date"] ?? "created_at";
    const dir = searchParams.get("dir") === "asc" ? "asc" : "desc";
    const page = Math.max(1, parseInt(searchParams.get("page") ?? "1", 10) || 1);
    const limit = Math.min(
      200,
      Math.max(1, parseInt(searchParams.get("limit") ?? "10", 10) || 10)
    );
    const offset = (page - 1) * limit;

    // ── Base predicate for the active view (mirrors loadOrders filters) ──
    const params: unknown[] = [scope];
    let base = "scope = $1";
    if (mode === "preorder") {
      base += " and is_preorder";
    } else if (mode === "approved") {
      params.push(status);
      base += ` and status = $${params.length}`;
      // The Pending tab hides orders still on the Web Order List queue.
      if (status === "pending") base += " and not in_web_queue";
    }
    // mode === "all" → no status/preorder predicate (scope only).

    // ── Delivery-method chips: counts within the base, then the active chip ──
    const chipCountsRes = await pool.query(
      `select coalesce(delivery_method_id, '') as dm, count(*)::int as n
       from orders where ${base}
       group by delivery_method_id`,
      params
    );
    const chipCounts: Record<string, number> = {};
    let allCount = 0;
    for (const r of chipCountsRes.rows) {
      if (r.dm) chipCounts[r.dm] = r.n;
      allCount += r.n;
    }
    chipCounts.all = allCount;

    // ── Status tab counts (approved mode only) — match getOrderStatusCounts() ──
    const statusCounts: Record<string, number> = {};
    // grandTotal = how many orders exist in this mode's whole universe. The
    // client compares it to its local count to decide whether the localStorage
    // copy is complete (then it stays on the always-fresh local view) or
    // truncated/behind (then it defers to this DB page).
    let grandTotal = 0;
    if (mode === "approved") {
      const sc = await pool.query(
        `select status, count(*)::int as n from orders
         where scope = $1 and not (status = 'pending' and in_web_queue)
         group by status`,
        [scope]
      );
      for (const r of sc.rows) {
        if (r.status) statusCounts[r.status] = r.n;
        grandTotal += r.n;
      }
    } else {
      const gt = await pool.query(
        `select count(*)::int as n from orders where ${base}`,
        params
      );
      grandTotal = gt.rows[0]?.n ?? 0;
    }

    // ── Active page: base + chip + search, sorted + paginated ──
    let where = base;
    if (chip && chip !== "all") {
      params.push(chip);
      where += ` and delivery_method_id = $${params.length}`;
    }
    if (search) {
      params.push(`%${search}%`);
      where += ` and search_text like $${params.length}`;
    }

    const totalRes = await pool.query(
      `select count(*)::int as n from orders where ${where}`,
      params
    );
    const total = totalRes.rows[0]?.n ?? 0;

    const pageParams = [...params, limit, offset];
    const rowsRes = await pool.query(
      `select data from orders where ${where}
       order by ${sortKey} ${dir} nulls last, ord ${dir}
       limit $${pageParams.length - 1} offset $${pageParams.length}`,
      pageParams
    );
    const rows = rowsRes.rows.map((r) => r.data);

    return NextResponse.json({
      ok: true,
      rows,
      total,
      grandTotal,
      chipCounts,
      statusCounts,
      page,
      limit,
    });
  } catch (e) {
    console.error("[api/approved-orders]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Query failed" },
      { status: 500 }
    );
  }
}