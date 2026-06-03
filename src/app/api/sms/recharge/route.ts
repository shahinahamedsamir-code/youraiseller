import { NextResponse } from "next/server";
import { loadSmsPlatformControl } from "@/lib/sms-platform-control";
import {
  applySelfBkashRecharge,
  calcRechargeTotals,
} from "@/lib/sms-recharge-server";
import { sanitizeSmsScope } from "@/lib/teamitqan-sms";

type Body = {
  scope?: string;
  smsCount?: number;
  paymentMethod?: "bkash";
};

/**
 * Self recharge — bKash payment integration hooks here.
 * Until live gateway: mock success when user confirms Pay with bKash.
 */
export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const scope = sanitizeSmsScope(body.scope ?? "");
    const smsCount = Number(body.smsCount);

    if (!scope) {
      return NextResponse.json({ error: "Invalid scope" }, { status: 400 });
    }
    if (!Number.isFinite(smsCount) || smsCount < 1 || smsCount > 100000) {
      return NextResponse.json({ error: "Invalid SMS count" }, { status: 400 });
    }

    const control = await loadSmsPlatformControl();
    if (!control.enabled) {
      return NextResponse.json(
        { error: "SMS system is disabled" },
        { status: 503 }
      );
    }
    if (!control.selfRechargeEnabled) {
      return NextResponse.json(
        { error: "Self recharge is disabled. Contact admin." },
        { status: 403 }
      );
    }

    const method = body.paymentMethod ?? "bkash";
    if (method !== "bkash") {
      return NextResponse.json({ error: "Unsupported payment method" }, { status: 400 });
    }

    const preview = calcRechargeTotals(smsCount, control.smsPriceTaka);

    // TODO: bKash Checkout API — create payment session, return redirect URL.
    // Mock: payment succeeds immediately for development.
    const { account, totalTaka } = await applySelfBkashRecharge(scope, smsCount);

    return NextResponse.json({
      ok: true,
      mockPayment: true,
      paymentMethod: "bkash",
      smsCount: preview.smsCount,
      totalTaka,
      account,
      message: `bKash payment successful · ${preview.smsCount} SMS added`,
    });
  } catch (e) {
    console.error("[sms/recharge]", e);
    return NextResponse.json({ error: "Recharge failed" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const smsCount = Number(searchParams.get("smsCount") ?? "10");
  const control = await loadSmsPlatformControl();
  const preview = calcRechargeTotals(
    Number.isFinite(smsCount) ? smsCount : 10,
    control.smsPriceTaka
  );
  return NextResponse.json({
    ok: true,
    selfRechargeEnabled: control.selfRechargeEnabled,
    smsPriceTaka: control.smsPriceTaka,
    ...preview,
  });
}
