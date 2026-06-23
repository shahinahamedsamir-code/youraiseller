import { NextResponse } from "next/server";
import { migrateAllOrdersToTable } from "@/lib/orders-db";
import { isDbConfigured } from "@/lib/db";

/**
 * One-time / maintenance endpoint: backfill the normalized `orders` table from
 * the seller_data blobs. Gated by a shared secret so it cannot be triggered
 * publicly. Call with header `x-admin-key: <ADMIN_TASK_KEY>`.
 */
export async function POST(req: Request) {
  const key = process.env.ADMIN_TASK_KEY;
  if (!key || req.headers.get("x-admin-key") !== key) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  if (!isDbConfigured()) {
    return NextResponse.json({ error: "Database not configured" }, { status: 400 });
  }
  try {
    const result = await migrateAllOrdersToTable();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("[sync-orders-table]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Migration failed" },
      { status: 500 }
    );
  }
}
