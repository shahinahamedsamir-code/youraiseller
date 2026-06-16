import { NextResponse } from "next/server";
import { loadPlanConfig } from "@/lib/plan-config-server";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export async function GET() {
  try {
    const config = await loadPlanConfig();
    return NextResponse.json(
      { ok: true, config },
      { headers: { "Cache-Control": "no-store, max-age=0" } }
    );
  } catch (e) {
    console.error("[plans GET]", e);
    return NextResponse.json({ error: "Failed to load plans" }, { status: 500 });
  }
}
