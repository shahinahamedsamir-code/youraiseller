import { getDbPool } from "./db";
import type { Order } from "./orders-store";
import { resolveWebDisplayStatus } from "./order-edit";
import { isWebOrderIncomplete } from "./web-order-tabs";
import { isInWebQueue } from "./web-order-queue";

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
  // Approved Orders (Order List / All List) columns: the raw order status, its
  // Web-queue visibility, grand total (for sorting) and delivery method (chips).
  "status",
  "in_web_queue",
  "total",
  "delivery_method_id",
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
    o.status ?? null,
    isInWebQueue(o),
    typeof o.total === "number" ? o.total : null,
    o.deliveryMethodId ?? null,
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
 * Upsert ONE order row without touching the rest of the table (no delete pass).
 * Used by the per-order sync so a single edit (e.g. a cancel) persists to the
 * server without the browser uploading the whole — possibly multi-MB — blob.
 * Preserves the existing `ord` (page sort position) on conflict.
 */
export async function upsertOrderRow(scope: string, order: Order): Promise<void> {
  const pool = getDbPool();
  if (!pool) return;
  const row = rowValues(scope, order, 0);
  const updates = COLUMNS.filter((c) => c !== "scope" && c !== "id" && c !== "ord")
    .map((c) => `${c}=excluded.${c}`)
    .join(", ");
  const ph = row.map((_, k) => `$${k + 1}`);
  await pool.query(
    `insert into orders (${COLUMNS.join(",")})
     values (${ph.join(",")})
     on conflict (scope, id) do update set ${updates}, synced_at=now()`,
    row
  );
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
