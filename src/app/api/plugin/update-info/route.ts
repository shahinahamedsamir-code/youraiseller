import { NextResponse } from "next/server";
import fs from "fs";
import path from "path";

export const dynamic = "force-dynamic";

const CORS: Record<string, string> = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

export function OPTIONS() {
  return new NextResponse(null, { status: 204, headers: CORS });
}

/** Reads the live plugin version straight from the committed plugin file so the
 *  version served here can never drift from the zip we ship. */
function pluginVersion(): string {
  try {
    const file = path.join(
      process.cwd(),
      "wordpress-plugin",
      "yourai-incomplete-capture",
      "yourai-incomplete-capture.php"
    );
    const src = fs.readFileSync(file, "utf8");
    const m = src.match(/Version:\s*([0-9][0-9.]*)/i);
    return m ? m[1] : "1.0.0";
  } catch {
    return "1.0.0";
  }
}

/**
 * Update manifest the WooCommerce plugin polls. WordPress shows "Update
 * available" and one-click updates when this version is newer than the one a
 * seller has installed.
 */
// The distributed plugin always talks to production, so the package URL must be
// the public origin — not the internal localhost the app sees behind nginx.
const PUBLIC_BASE = "https://app.youraiseller.com";

export function GET() {
  const version = pluginVersion();
  return NextResponse.json(
    {
      name: "YourAI Seller Connect",
      slug: "yourai-incomplete-capture",
      version,
      download_url: `${PUBLIC_BASE}/yourai-incomplete-capture.zip`,
      requires: "5.5",
      tested: "6.6",
      last_updated: new Date().toISOString(),
      homepage: "https://youraiseller.com",
      description:
        "Capture unfinished checkouts and block fraud orders (phone/IP/email) straight from your YourAI Seller account.",
    },
    { headers: CORS }
  );
}
