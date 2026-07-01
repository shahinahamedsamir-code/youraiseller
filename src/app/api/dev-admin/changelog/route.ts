import { NextResponse } from "next/server";
import { isDevAdminAuthenticated } from "@/lib/dev-admin-auth-server";
import { loadChangelog, saveChangelog } from "@/lib/changelog-server";

export const dynamic = "force-dynamic";

export async function GET() {
  if (!isDevAdminAuthenticated()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  return NextResponse.json({ ok: true, changelog: await loadChangelog() });
}

export async function POST(req: Request) {
  if (!isDevAdminAuthenticated()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  try {
    const body = await req.json();
    const changelog = await saveChangelog(body.changelog ?? body);
    return NextResponse.json({ ok: true, changelog });
  } catch (e) {
    console.error("[dev-admin/changelog POST]", e);
    return NextResponse.json({ error: "Failed to save changelog" }, { status: 500 });
  }
}
