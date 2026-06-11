import { NextResponse } from "next/server";
import { isDevAdminAuthenticated } from "@/lib/dev-admin-auth-server";
import { loadSmsPlatformControl } from "@/lib/sms-platform-control";
import { applySmsRecharge, smsCreditsFromTaka } from "@/lib/sms-recharge-server";
import { recordPaymentHistory } from "@/lib/payment-history-server";
import { sellerInfoForScope } from "@/lib/payment-history-user";
import { sanitizeSmsScope } from "@/lib/teamitqan-sms";

type Body = {
  scope?: string;
  taka?: number;
  smsCredits?: number;
  note?: string;
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
    const extraCredits =
      body.smsCredits != null ? Math.floor(Number(body.smsCredits)) : 0;

    if (taka > 0 && (!Number.isFinite(taka) || taka <= 0 || taka > 10_000_000)) {
      return NextResponse.json({ error: "Invalid taka amount" }, { status: 400 });
    }
    if (extraCredits < 0 || extraCredits > 1_000_000) {
      return NextResponse.json({ error: "Invalid SMS credits" }, { status: 400 });
    }
    if (taka <= 0 && extraCredits <= 0) {
      return NextResponse.json({ error: "Enter taka or SMS credits" }, { status: 400 });
    }

    const control = await loadSmsPlatformControl();
    const account = await applySmsRecharge({
      scope,
      smsCredits:
        extraCredits > 0
          ? extraCredits
          : taka > 0
            ? smsCreditsFromTaka(taka, control.smsPriceTaka)
            : 0,
      taka: taka > 0 ? Math.floor(taka) : 0,
      source: extraCredits > 0 && taka <= 0 ? "admin_credits" : "admin",
    });

    const { listSellerSmsSummaries } = await import("@/lib/sms-admin-server");
    const sellers = await listSellerSmsSummaries();
    const row = sellers.find((s) => s.scope === scope);
    const seller = await sellerInfoForScope(scope);
    const paidTaka = taka > 0 ? Math.floor(taka) : 0;
    if (paidTaka > 0) {
      await recordPaymentHistory({
        kind: "sms_recharge",
        amountTaka: paidTaka,
        method: "admin",
        scope,
        smsCount:
          extraCredits > 0
            ? extraCredits
            : smsCreditsFromTaka(paidTaka, control.smsPriceTaka),
        note: body.note,
        ...seller,
      });
    }

    return NextResponse.json({
      ok: true,
      account,
      seller: row,
      message:
        taka > 0
          ? `Added BDT ${Math.floor(taka)} → +${smsCreditsFromTaka(taka, control.smsPriceTaka)} SMS`
          : `Added ${extraCredits} SMS credits`,
    });
  } catch (e) {
    console.error("[dev-admin/sms/recharge]", e);
    return NextResponse.json({ error: "Recharge failed" }, { status: 500 });
  }
}
