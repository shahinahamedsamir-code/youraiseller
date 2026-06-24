import { promises as fs } from "fs";
import path from "path";
import { getDbPool } from "./db";
import { getAppDataDir } from "./platform-data-path";

/**
 * Complete-safety mirror of the on-disk `data/` directory into PostgreSQL.
 *
 * Several critical bits of state still live only as JSON files on the VPS
 * (seller/team accounts in dev-users.json, SMS/auto-call wallet balances,
 * platform control + payment history). If the VPS disk is lost, those are gone.
 * This module copies every JSON file under the data dir into an `app_files`
 * table verbatim, keyed by its relative POSIX path, so a single pg_dump captures
 * the full on-disk state. The live app does NOT read from this table — it is a
 * pure backup/restore mirror, so adding it cannot change app behaviour.
 */

const TABLE = "app_files";

async function ensureTable(): Promise<void> {
  const pool = getDbPool();
  if (!pool) return;
  await pool.query(
    `create table if not exists ${TABLE} (
       path text primary key,
       data jsonb not null,
       updated_at timestamptz not null default now()
     )`
  );
}

/** Relative POSIX path used as the stable key for a file (e.g. "seller/U-005/orders.json"). */
function relKey(root: string, abs: string): string {
  return path.relative(root, abs).split(path.sep).join("/");
}

async function walkJsonFiles(dir: string): Promise<string[]> {
  const out: string[] = [];
  let entries: import("fs").Dirent[];
  try {
    entries = await fs.readdir(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const entry of entries) {
    const abs = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      out.push(...(await walkJsonFiles(abs)));
    } else if (entry.isFile() && entry.name.endsWith(".json")) {
      out.push(abs);
    }
  }
  return out;
}

/**
 * Live dual-write: mirror a single JSON file into app_files immediately after it
 * is written to disk, so critical file-only state (accounts, wallet balances)
 * reaches Postgres within seconds instead of waiting for the periodic mirror.
 * Best-effort — never throws, so a DB hiccup can't break the caller's write.
 */
export async function mirrorFileToDb(absPath: string): Promise<void> {
  const pool = getDbPool();
  if (!pool) return;
  try {
    await ensureTable();
    const raw = await fs.readFile(absPath, "utf-8");
    const parsed = JSON.parse(raw);
    const key = relKey(getAppDataDir(), absPath);
    await pool.query(
      `insert into ${TABLE} (path, data, updated_at)
       values ($1, $2, now())
       on conflict (path) do update set data = excluded.data, updated_at = now()`,
      [key, JSON.stringify(parsed)]
    );
  } catch (e) {
    console.error("[data-mirror] live mirror failed", absPath, e);
  }
}

export type MirrorResult = {
  files: number;
  skipped: number;
  bytes: number;
};

/**
 * Copy every `*.json` file under the data dir into `app_files`. Idempotent:
 * re-running refreshes existing rows. Files that fail to parse as JSON are
 * skipped (logged) rather than aborting the whole mirror.
 */
export async function mirrorDataDirToDb(): Promise<MirrorResult> {
  const pool = getDbPool();
  if (!pool) return { files: 0, skipped: 0, bytes: 0 };
  await ensureTable();

  const root = getAppDataDir();
  const files = await walkJsonFiles(root);
  let written = 0;
  let skipped = 0;
  let bytes = 0;

  for (const abs of files) {
    let raw: string;
    try {
      raw = await fs.readFile(abs, "utf-8");
    } catch (e) {
      skipped++;
      console.error("[data-mirror] read failed", abs, e);
      continue;
    }
    // Validate it is JSON so the jsonb column accepts it; keep the parsed value.
    let parsed: unknown;
    try {
      parsed = JSON.parse(raw);
    } catch {
      skipped++;
      console.error("[data-mirror] not valid JSON, skipped", abs);
      continue;
    }
    const key = relKey(root, abs);
    try {
      await pool.query(
        `insert into ${TABLE} (path, data, updated_at)
         values ($1, $2, now())
         on conflict (path) do update set data = excluded.data, updated_at = now()`,
        [key, JSON.stringify(parsed)]
      );
      written++;
      bytes += Buffer.byteLength(raw);
    } catch (e) {
      skipped++;
      console.error("[data-mirror] db write failed", key, e);
    }
  }

  return { files: written, skipped, bytes };
}

/**
 * Disaster-recovery reverse: rewrite every mirrored file back onto disk from
 * `app_files`. Not wired to any route by default — call manually when restoring
 * a fresh VPS. Returns the number of files written.
 */
export async function restoreDataDirFromDb(): Promise<number> {
  const pool = getDbPool();
  if (!pool) return 0;
  await ensureTable();
  const root = getAppDataDir();
  const res = await pool.query<{ path: string; data: unknown }>(
    `select path, data from ${TABLE}`
  );
  let written = 0;
  for (const row of res.rows) {
    const abs = path.join(root, ...row.path.split("/"));
    await fs.mkdir(path.dirname(abs), { recursive: true });
    await fs.writeFile(abs, JSON.stringify(row.data, null, 2), "utf-8");
    written++;
  }
  return written;
}