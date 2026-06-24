import { NextResponse } from "next/server";
import { mirrorDataDirToDb } from "@/lib/data-mirror";
import { isDbConfigured } from "@/lib/db";

/**
 * Maintenance endpoint: mirror the on-disk data/ directory into the app_files
 * table so a pg_dump captures the full on-disk state (accounts, wallets,
 * platform control, etc.). Gated by a shared secret. Safe to run repeatedly.
 * Call with header `x-admin-key: <ADMIN_TASK_KEY>`.
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
    const result = await mirrorDataDirToDb();
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    console.error("[mirror-data]", e);
    return NextResponse.json(
      { error: e instanceof Error ? e.message : "Mirror failed" },
      { status: 500 }
    );
  }
}