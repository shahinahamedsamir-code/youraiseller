import { NextResponse } from "next/server";
import { isDevAdminAuthenticated } from "@/lib/dev-admin-auth-server";
import { listSellerAutoCallSummaries } from "@/lib/auto-call-admin-server";
import { loadAutoCallPlatformControl } from "@/lib/auto-call-platform-control";
import {
  applyAutoCallRecharge,
  autoCallMinutesFromTaka,
  autoCallTakaFromMinutes,
} from "@/lib/auto-call-recharge-server";
import { sanitizeSmsScope } from "@/lib/teamitqan-sms";

type Body = {
  scope?: string;
  taka?: number;
  callMinutes?: number;
};

export async function POST(req: Request) {
  if (!isDevAdminAuthenticated()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as Body;
    const scope = sanitizeSmsScope(body.scope ?? "");
    if (!scope) {
      return NextResponse.json({ error: "Invalid seller scope" }, { status: 400 });
    }

    const taka = body.taka != null ? Number(body.taka) : 0;
    const extraMinutes =
      body.callMinutes != null ? Math.floor(Number(body.callMinutes)) : 0;

    if (taka > 0 && (!Number.isFinite(taka) || taka <= 0 || taka > 10_000_000)) {
      return NextResponse.json({ error: "Invalid taka amount" }, { status: 400 });
    }
    if (extraMinutes < 0 || extraMinutes > 1_000_000) {
      return NextResponse.json({ error: "Invalid call minutes" }, { status: 400 });
    }
    if (taka <= 0 && extraMinutes <= 0) {
      return NextResponse.json({ error: "Enter taka or call minutes" }, { status: 400 });
    }

    const control = await loadAutoCallPlatformControl();
    const rechargeTaka =
      taka > 0
        ? Math.floor(taka)
        : extraMinutes > 0
          ? autoCallTakaFromMinutes(extraMinutes, control.callPriceTaka)
          : 0;

    const account = await applyAutoCallRecharge({
      scope,
      taka: rechargeTaka,
      source: extraMinutes > 0 && taka <= 0 ? "admin_minutes" : "admin",
    });

    const sellers = await listSellerAutoCallSummaries();
    const row = sellers.find((s) => s.scope === scope);

    return NextResponse.json({
      ok: true,
      account,
      seller: row,
      message:
        taka > 0
          ? `Added BDT ${Math.floor(taka)} → +${autoCallMinutesFromTaka(taka, control.callPriceTaka)} min call time`
          : `Added ${extraMinutes} min call time`,
    });
  } catch (e) {
    console.error("[dev-admin/auto-call/recharge]", e);
    return NextResponse.json({ error: "Recharge failed" }, { status: 500 });
  }
}
