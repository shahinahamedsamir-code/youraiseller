import { Pool } from "pg";

/**
 * Shared PostgreSQL (Supabase) connection pool for server-side data access.
 *
 * The pool is created lazily and reused across requests. When DATABASE_URL is
 * not configured the app transparently falls back to the legacy JSON-file
 * storage, so local/dev environments without a database keep working.
 */
let pool: Pool | null = null;

export function getDbPool(): Pool | null {
  const url = process.env.DATABASE_URL?.trim();
  if (!url) return null;
  if (!pool) {
    pool = new Pool({
      connectionString: url,
      max: 8,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      // Supabase requires TLS; its pooler cert is not in Node's default CA set.
      ssl: { rejectUnauthorized: false },
    });
    pool.on("error", (err) => {
      console.error("[db] idle client error", err.message);
    });
  }
  return pool;
}

export function isDbConfigured(): boolean {
  return Boolean(process.env.DATABASE_URL?.trim());
}
