import { NextResponse } from "next/server";
import { isDevAdminAuthenticated } from "@/lib/dev-admin-auth-server";
import {
  listSellerSmsSummaries,
} from "@/lib/sms-admin-server";
import {
  loadSmsPlatformControl,
  saveSmsPlatformControl,
} from "@/lib/sms-platform-control";
import {
  getTeamItqanConfig,
  teamItqanFetchBalance,
} from "@/lib/teamitqan-sms";

export async function GET() {
  if (!isDevAdminAuthenticated()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const control = await loadSmsPlatformControl();
    const sellers = await listSellerSmsSummaries();
    const config = getTeamItqanConfig();
    let providerBalance: number | undefined;
    if (config) {
      const bal = await teamItqanFetchBalance(config);
      providerBalance = bal.balance;
    }

    const totals = sellers.reduce(
      (acc, s) => {
        acc.balance += s.balance;
        acc.walletTaka += s.walletTaka;
        acc.totalRechargedTaka += s.totalRechargedTaka;
        return acc;
      },
      { balance: 0, walletTaka: 0, totalRechargedTaka: 0 }
    );

    return NextResponse.json({
      ok: true,
      control,
      sellers,
      totals,
      providerConfigured: Boolean(config),
      providerBalance,
    });
  } catch (e) {
    console.error("[dev-admin/sms GET]", e);
    return NextResponse.json({ error: "Failed to load SMS control" }, { status: 500 });
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
      smsPriceTaka?: number;
      selfRechargeEnabled?: boolean;
    } = {};

    if (typeof body.enabled === "boolean") patch.enabled = body.enabled;
    if (typeof body.selfRechargeEnabled === "boolean") {
      patch.selfRechargeEnabled = body.selfRechargeEnabled;
    }
    if (body.smsPriceTaka != null) {
      const price = Number(body.smsPriceTaka);
      if (!Number.isFinite(price) || price <= 0 || price > 100) {
        return NextResponse.json({ error: "Invalid SMS price" }, { status: 400 });
      }
      patch.smsPriceTaka = price;
    }

    const control = await saveSmsPlatformControl(patch);
    return NextResponse.json({ ok: true, control });
  } catch (e) {
    console.error("[dev-admin/sms PATCH]", e);
    return NextResponse.json({ error: "Save failed" }, { status: 500 });
  }
}
