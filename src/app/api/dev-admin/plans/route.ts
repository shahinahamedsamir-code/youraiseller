import { NextResponse } from "next/server";
import { isDevAdminAuthenticated } from "@/lib/dev-admin-auth-server";
import {
  loadPlanConfig,
  normalizePlanConfig,
  savePlanConfig,
} from "@/lib/plan-config-server";

export async function GET() {
  if (!isDevAdminAuthenticated()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const config = await loadPlanConfig();
    return NextResponse.json({ ok: true, config });
  } catch (e) {
    console.error("[dev-admin/plans GET]", e);
    return NextResponse.json({ error: "Failed to load plans" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!isDevAdminAuthenticated()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const config = normalizePlanConfig(body.config ?? body);
    const saved = await savePlanConfig(config);
    return NextResponse.json({ ok: true, config: saved });
  } catch (e) {
    console.error("[dev-admin/plans POST]", e);
    return NextResponse.json({ error: "Failed to save plans" }, { status: 500 });
  }
}
