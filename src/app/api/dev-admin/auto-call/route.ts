import { NextResponse } from "next/server";
import { isDevAdminAuthenticated } from "@/lib/dev-admin-auth-server";
import { listSellerAutoCallSummaries } from "@/lib/auto-call-admin-server";
import {
  loadAutoCallPlatformControl,
  saveAutoCallPlatformControl,
} from "@/lib/auto-call-platform-control";
import {
  getTeamItqanAudioConfig,
  teamItqanCheckAudioApiBalance,
  teamItqanCheckDidBalance,
} from "@/lib/teamitqan-audio-call";

export async function GET() {
  if (!isDevAdminAuthenticated()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const control = await loadAutoCallPlatformControl();
    const sellers = await listSellerAutoCallSummaries();
    const config = getTeamItqanAudioConfig();

    let apiBalance: number | undefined;
    let didBalance: number | undefined;
    if (config) {
      const [apiRes, didRes] = await Promise.all([
        teamItqanCheckAudioApiBalance(config),
        teamItqanCheckDidBalance(config),
      ]);
      apiBalance = apiRes.balance;
      didBalance = didRes.balance;
    }

    const totals = sellers.reduce(
      (acc, s) => {
        acc.voices += s.voiceCount;
        acc.logs += s.logCount;
        acc.runs += s.runCount;
        acc.balanceTaka += s.balanceTaka;
        acc.walletTaka += s.walletTaka;
        acc.totalRechargedTaka += s.totalRechargedTaka;
        if (s.setupComplete) acc.setupComplete += 1;
        return acc;
      },
      {
        voices: 0,
        logs: 0,
        runs: 0,
        setupComplete: 0,
        balanceTaka: 0,
        walletTaka: 0,
        totalRechargedTaka: 0,
      }
    );

    return NextResponse.json({
      ok: true,
      control,
      sellers,
      totals,
      providerConfigured: Boolean(config),
      apiBalance,
      didBalance,
      defaultDid: config?.did ?? null,
    });
  } catch (e) {
    console.error("[dev-admin/auto-call GET]", e);
    return NextResponse.json({ error: "Failed to load auto call control" }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  if (!isDevAdminAuthenticated()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json();
    const patch: {
      enabled?: boolean;
      callPriceTaka?: number;
      selfRechargeEnabled?: boolean;
    } = {};

    if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
    if (typeof body.selfRechargeEnabled === "boolean") {
      patch.selfRechargeEnabled = body.selfRechargeEnabled;
    }
    if (body.callPriceTaka != null) {
      const price = Number(body.callPriceTaka);
      if (!Number.isFinite(price) || price <= 0 || price > 100) {
        return NextResponse.json({ error: "Invalid call price" }, { status: 400 });
      }
      patch.callPriceTaka = price;
    }

    const control = await saveAutoCallPlatformControl(patch);
    return NextResponse.json({ ok: true, control });
  } catch (e) {
    console.error("[dev-admin/auto-call PATCH]", e);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
