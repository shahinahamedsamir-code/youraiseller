import { getDbPool } from "./db";
import type { Order } from "./orders-store";
import { resolveWebDisplayStatus } from "./order-edit";
import { isWebOrderIncomplete } from "./web-order-tabs";

/** Same web-order test the client uses in getWebOrdersFromStore(). */
function isWebOrder(o: Order): boolean {
  return o.source === "web" || o.wooOrderId != null || o.id.startsWith("WO-");
}

/** Lowercased haystack matching the Web Order List client-side search fields. */
function buildSearchText(o: Order): string {
  const parts = [
    o.id,
    o.customerName ?? "",
    o.phone ?? "",
    o.address ?? "",
    o.wooNumber ?? "",
    ...(o.items ?? []).map((i) => i.productName ?? ""),
  ];
  return parts.join(" ").toLowerCase();
}

const COLUMNS = [
  "scope",
  "id",
  "ord",
  "is_web",
  "is_preorder",
  "web_display_status",
  "is_incomplete",
  "has_advance",
  "phone",
  "customer_name",
  "woo_number",
  "created_at",
  "updated_at",
  "search_text",
  "data",
] as const;

function rowValues(scope: string, o: Order, ord: number): unknown[] {
  return [
    scope,
    o.id,
    ord,
    isWebOrder(o),
    Boolean(o.isPreorder) || o.status === "preorder",
    resolveWebDisplayStatus(o),
    isWebOrderIncomplete(o),
    (o.advance ?? 0) > 0,
    o.phone ?? null,
    o.customerName ?? null,
    o.wooNumber ?? null,
    o.createdAt ?? null,
    o.updatedAt ?? null,
    buildSearchText(o),
    JSON.stringify(o),
  ];
}

/**
 * Explode a seller's full order array into individual rows in the `orders`
 * table: upsert every order and remove rows that no longer exist. The computed
 * columns (web_display_status, is_incomplete, has_advance, search_text…) let
 * the read API filter/paginate in SQL so the browser only ever fetches one page.
 */
export async function syncOrdersTable(scope: string, orders: Order[]): Promise<void> {
  const pool = getDbPool();
  if (!pool) return;

  const client = await pool.connect();
  try {
    await client.query("begin");

    const ids: string[] = [];
    const CHUNK = 200;
    for (let i = 0; i < orders.length; i += CHUNK) {
      const chunk = orders.slice(i, i + CHUNK);
      const values: unknown[] = [];
      const tuples: string[] = [];
      chunk.forEach((o, j) => {
        const row = rowValues(scope, o, i + j);
        ids.push(o.id);
        const ph = row.map((_, k) => `$${values.length + k + 1}`);
        tuples.push(`(${ph.join(",")})`);
        values.push(...row);
      });

      const updates = COLUMNS.filter((c) => c !== "scope" && c !== "id")
        .map((c) => `${c}=excluded.${c}`)
        .join(", ");

      await client.query(
        `insert into orders (${COLUMNS.join(",")})
         values ${tuples.join(",")}
         on conflict (scope, id) do update set ${updates}, synced_at=now()`,
        values
      );
    }

    if (ids.length > 0) {
      await client.query(
        "delete from orders where scope = $1 and not (id = any($2::text[]))",
        [scope, ids]
      );
    } else {
      await client.query("delete from orders where scope = $1", [scope]);
    }

    await client.query("commit");
  } catch (e) {
    await client.query("rollback").catch(() => {});
    throw e;
  } finally {
    client.release();
  }
}

/**
 * One-time backfill: read every seller's orders blob already stored in
 * seller_data and explode it into the orders table.
 */
export async function migrateAllOrdersToTable(): Promise<{ scopes: number; orders: number }> {
  const pool = getDbPool();
  if (!pool) return { scopes: 0, orders: 0 };

  const res = await pool.query<{ scope: string; data: { orders?: Order[] } }>(
    "select scope, data from seller_data where kind = 'orders'"
  );
  let orders = 0;
  for (const row of res.rows) {
    const list = Array.isArray(row.data?.orders) ? row.data.orders : [];
    await syncOrdersTable(row.scope, list);
    orders += list.length;
  }
  return { scopes: res.rows.length, orders };
}
