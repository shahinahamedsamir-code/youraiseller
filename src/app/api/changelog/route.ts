import { NextResponse } from "next/server";
import { loadChangelog } from "@/lib/changelog-server";

export const dynamic = "force-dynamic";

/** Public — every seller's dashboard reads the What's New feed from here. */
export async function GET() {
  return NextResponse.json(await loadChangelog());
}
