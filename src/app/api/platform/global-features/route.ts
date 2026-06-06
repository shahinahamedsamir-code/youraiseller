import { NextResponse } from "next/server";
import { isDevAdminAuthenticated } from "@/lib/dev-admin-auth-server";
import {
  loadGlobalFeaturesConfig,
  saveGlobalFeaturesConfig,
} from "@/lib/global-features-server";
import { normalizeStoredFeatures } from "@/lib/features";

export async function GET() {
  try {
    const config = await loadGlobalFeaturesConfig();
    return NextResponse.json({ ok: true, features: config.features, updatedAt: config.updatedAt });
  } catch (e) {
    console.error("[platform/global-features GET]", e);
    return NextResponse.json({ error: "Failed to load global features" }, { status: 500 });
  }
}

export async function POST(req: Request) {
  if (!isDevAdminAuthenticated()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const features = normalizeStoredFeatures(body.features ?? body);
    const saved = await saveGlobalFeaturesConfig(features);
    return NextResponse.json({ ok: true, features: saved.features, updatedAt: saved.updatedAt });
  } catch (e) {
    console.error("[platform/global-features POST]", e);
    return NextResponse.json({ error: "Failed to save global features" }, { status: 500 });
  }
}
