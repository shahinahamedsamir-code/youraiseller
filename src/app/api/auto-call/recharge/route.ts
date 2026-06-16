import { NextResponse } from "next/server";
import { loadAutoCallPlatformControl } from "@/lib/auto-call-platform-control";
import {
  applySelfBkashAutoCallRecharge,
  calcAutoCallRechargeTotals,
} from "@/lib/auto-call-recharge-server";
import { recordPaymentHistory } from "@/lib/payment-history-server";
import { sellerInfoForScope } from "@/lib/payment-history-user";
import { sanitizeSmsScope } from "@/lib/teamitqan-sms";
import {
  appBaseUrl,
  createPayStationInvoiceNumber,
  initiatePayStationPayment,
  payStationCredentials,
  savePendingPayStationPayment,
} from "@/lib/paystation-server";

type Body = {
  scope?: string;
  callMinutes?: number;
  paymentMethod?: "bkash" | "paystation";
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const scope = sanitizeSmsScope(body.scope ?? "");
    const callMinutes = Number(body.callMinutes);

    if (!scope) {
      return NextResponse.json({ error: "Invalid scope" }, { status: 400 });
    }
    if (!Number.isFinite(callMinutes) || callMinutes < 1 || callMinutes > 100000) {
      return NextResponse.json({ error: "Invalid call minutes" }, { status: 400 });
    }

    const control = await loadAutoCallPlatformControl();
    if (!control.enabled) {
      return NextResponse.json({ error: "Auto call system is disabled" }, { status: 503 });
    }
    if (!control.selfRechargeEnabled) {
      return NextResponse.json(
        { error: "Self recharge is disabled. Contact admin." },
        { status: 403 }
      );
    }

    const method = body.paymentMethod ?? "bkash";
    if (method !== "bkash" && method !== "paystation") {
      return NextResponse.json({ error: "Unsupported payment method" }, { status: 400 });
    }

    const preview = calcAutoCallRechargeTotals(callMinutes, control.callPriceTaka);
    const seller = await sellerInfoForScope(scope);

    if (method === "paystation") {
      const creds = payStationCredentials();
      if (!creds.ok) {
        return NextResponse.json({ error: creds.error }, { status: 500 });
      }

      const invoiceNumber = createPayStationInvoiceNumber(scope);
      const result = await initiatePayStationPayment({
        merchantId: creds.merchantId,
        password: creds.password,
        invoiceNumber,
        amountTaka: preview.totalTaka,
        customerName: seller.userName || seller.company || "YourAI Seller",
        customerEmail: seller.userEmail || "customer@youraiseller.com",
        customerAddress: seller.company || "YourAI Seller auto call recharge",
        callbackUrl: `${appBaseUrl(req)}/api/paystation/callback`,
        reference: "YourAI Seller Auto Call recharge",
        checkoutItems: {
          kind: "auto_call_recharge",
          scope,
          callMinutes: preview.callMinutes,
        },
      });

      if (String(result.status_code) !== "200" || result.status !== "success" || !result.payment_url) {
        return NextResponse.json(
          { error: result.message || "PayStation could not create payment link." },
          { status: 502 }
        );
      }

      await savePendingPayStationPayment({
        kind: "auto_call_recharge",
        invoiceNumber,
        scope,
        userId: seller.userId,
        userEmail: seller.userEmail,
        userName: seller.userName,
        company: seller.company,
        callMinutes: preview.callMinutes,
        amountTaka: preview.totalTaka,
        createdAt: new Date().toISOString(),
      });

      return NextResponse.json({
        ok: true,
        paymentMethod: "paystation",
        paymentUrl: result.payment_url,
        invoiceNumber,
        callMinutes: preview.callMinutes,
        totalTaka: preview.totalTaka,
      });
    }

    const { account, totalTaka } = await applySelfBkashAutoCallRecharge(scope, callMinutes);
    await recordPaymentHistory({
      kind: "auto_call_recharge",
      amountTaka: totalTaka,
      method: "bkash",
      scope,
      callMinutes: preview.callMinutes,
      ...seller,
    });

    return NextResponse.json({
      ok: true,
      mockPayment: true,
      paymentMethod: "bkash",
      callMinutes: preview.callMinutes,
      totalTaka,
      account,
      message: `bKash payment successful - ${formatMinutes(preview.callMinutes)} added`,
    });
  } catch (e) {
    console.error("[auto-call/recharge]", e);
    return NextResponse.json({ error: "Recharge failed" }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const callMinutes = Number(searchParams.get("callMinutes") ?? "10");
  const control = await loadAutoCallPlatformControl();
  const preview = calcAutoCallRechargeTotals(
    Number.isFinite(callMinutes) ? callMinutes : 10,
    control.callPriceTaka
  );
  return NextResponse.json({
    ok: true,
    selfRechargeEnabled: control.selfRechargeEnabled,
    callPriceTaka: control.callPriceTaka,
    ...preview,
  });
}

function formatMinutes(minutes: number): string {
  return `${minutes} min call time`;
}
