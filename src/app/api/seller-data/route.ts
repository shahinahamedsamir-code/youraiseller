import { NextResponse } from "next/server";
import { promises as fs } from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data", "seller");

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
  "sms",
]);

function sanitize(part: string): string | null {
  const s = String(part || "").trim();
  // Allow only safe id/kind characters to prevent path traversal.
  if (!s || !/^[A-Za-z0-9_-]+$/.test(s)) return null;
  return s;
}

function fileFor(scope: string, kind: string): string {
  return path.join(DATA_DIR, scope, `${kind}.json`);
}

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const scope = sanitize(searchParams.get("scope") ?? "");
    const kind = sanitize(searchParams.get("kind") ?? "");
    if (!scope || !kind || !ALLOWED_KINDS.has(kind)) {
      return NextResponse.json({ error: "Invalid scope or kind" }, { status: 400 });
    }
    try {
      const raw = await fs.readFile(fileFor(scope, kind), "utf-8");
      return NextResponse.json({ ok: true, data: JSON.parse(raw) });
    } catch {
      // Not found yet — nothing synced for this business/kind.
      return NextResponse.json({ ok: true, data: null });
    }
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
    if (body?.data === undefined) {
      return NextResponse.json({ error: "Missing data" }, { status: 400 });
    }
    const dir = path.join(DATA_DIR, scope);
    await fs.mkdir(dir, { recursive: true });
    await fs.writeFile(
      fileFor(scope, kind),
      JSON.stringify(body.data, null, 2),
      "utf-8"
    );
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[seller-data]", e);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
