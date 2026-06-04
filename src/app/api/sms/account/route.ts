import { NextResponse } from "next/server";
import { loadSmsAccount } from "@/lib/sms-account-server";
import { loadSmsPlatformControl } from "@/lib/sms-platform-control";
import {
  getTeamItqanConfig,
  sanitizeSmsScope,
  teamItqanFetchBalance,
} from "@/lib/teamitqan-sms";

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const scope = sanitizeSmsScope(searchParams.get("scope") ?? "");
    if (!scope) {
      return NextResponse.json({ error: "Invalid scope" }, { status: 400 });
    }

    const account = await loadSmsAccount(scope);
    const control = await loadSmsPlatformControl();
    const config = getTeamItqanConfig();
    let providerBalance: number | undefined;
    const providerConfigured = Boolean(config);

    if (config) {
      const bal = await teamItqanFetchBalance(config);
      if (bal.balance != null) providerBalance = bal.balance;
    }

    return NextResponse.json({
      ok: true,
      account,
      systemEnabled: control.enabled,
      selfRechargeEnabled: control.selfRechargeEnabled,
      smsPriceTaka: control.smsPriceTaka,
      providerConfigured,
      providerBalance,
    });
  } catch (e) {
    console.error("[sms/account]", e);
    return NextResponse.json({ error: "Could not load SMS account" }, { status: 500 });
  }
}
