import { NextResponse } from "next/server";
import { loadSmsPlatformControl } from "@/lib/sms-platform-control";
import {
  applySelfBkashRecharge,
  calcRechargeTotals,
} from "@/lib/sms-recharge-server";
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
  smsCount?: number;
  paymentMethod?: "bkash" | "paystation";
};

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
    if (method !== "bkash" && method !== "paystation") {
      return NextResponse.json({ error: "Unsupported payment method" }, { status: 400 });
    }

    const preview = calcRechargeTotals(smsCount, control.smsPriceTaka);
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
        customerAddress: seller.company || "YourAI Seller SMS recharge",
        callbackUrl: `${appBaseUrl(req)}/api/paystation/callback`,
        reference: "YourAI Seller SMS recharge",
        checkoutItems: {
          kind: "sms_recharge",
          scope,
          smsCount: preview.smsCount,
        },
      });

      if (String(result.status_code) !== "200" || result.status !== "success" || !result.payment_url) {
        return NextResponse.json(
          { error: result.message || "PayStation could not create payment link." },
          { status: 502 }
        );
      }

      await savePendingPayStationPayment({
        kind: "sms_recharge",
        invoiceNumber,
        scope,
        userId: seller.userId,
        userEmail: seller.userEmail,
        userName: seller.userName,
        company: seller.company,
        smsCount: preview.smsCount,
        amountTaka: preview.totalTaka,
        createdAt: new Date().toISOString(),
      });

      return NextResponse.json({
        ok: true,
        paymentMethod: "paystation",
        paymentUrl: result.payment_url,
        invoiceNumber,
        smsCount: preview.smsCount,
        totalTaka: preview.totalTaka,
      });
    }

    const { account, totalTaka } = await applySelfBkashRecharge(scope, smsCount);
    await recordPaymentHistory({
      kind: "sms_recharge",
      amountTaka: totalTaka,
      method: "bkash",
      scope,
      smsCount: preview.smsCount,
      ...seller,
    });

    return NextResponse.json({
      ok: true,
      mockPayment: true,
      paymentMethod: "bkash",
      smsCount: preview.smsCount,
      totalTaka,
      account,
      message: `bKash payment successful - ${preview.smsCount} SMS added`,
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
