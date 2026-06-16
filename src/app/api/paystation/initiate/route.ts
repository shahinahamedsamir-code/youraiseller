import { NextResponse } from "next/server";
import { getSellerSessionUser } from "@/lib/seller-auth-server";
import { loadPlanConfig } from "@/lib/plan-config-server";
import { getPlanDefinition } from "@/lib/plan-config-utils";
import { calcSubscriptionRenewTotal, renewalMonthlyPriceTaka } from "@/lib/subscription-pricing";
import { validateSubscriptionCoupon } from "@/lib/subscription-coupons";
import { loadSubscriptionCoupons } from "@/lib/subscription-coupons-server";
import {
  appBaseUrl,
  createPayStationInvoiceNumber,
  initiatePayStationPayment,
  payStationCredentials,
  savePendingPayStationPayment,
} from "@/lib/paystation-server";
import { recordPaymentHistory } from "@/lib/payment-history-server";

type Body = {
  userId?: string;
  months?: number;
  couponCode?: string;
  quotedMonthlyTaka?: number;
};

export async function POST(req: Request) {
  try {
    const creds = payStationCredentials();
    if (!creds.ok) {
      return NextResponse.json({ error: creds.error }, { status: 500 });
    }

    const sessionUser = await getSellerSessionUser();
    const body = (await req.json()) as Body;
    const requestedUserId = body.userId?.trim();
    if (!sessionUser || String(sessionUser.id) !== requestedUserId) {
      return NextResponse.json({ error: "Session expired. Sign in again." }, { status: 401 });
    }
    if (sessionUser.status !== "expired") {
      return NextResponse.json(
        { error: "Only expired accounts can renew from this payment page." },
        { status: 400 }
      );
    }

    const planId =
      sessionUser.plan === "basic" ||
      sessionUser.plan === "pro" ||
      sessionUser.plan === "enterprise"
        ? sessionUser.plan
        : "basic";
    const months = Math.max(1, Math.floor(Number(body.months)) || 1);
    const config = await loadPlanConfig();
    const plan = getPlanDefinition(config, planId);
    const customRenewalPriceTaka = Number(sessionUser.customRenewalPriceTaka);
    const serverMonthlyTaka = renewalMonthlyPriceTaka(
      planId,
      plan.priceLabel,
      Number.isFinite(customRenewalPriceTaka) ? customRenewalPriceTaka : undefined
    );
    const quotedMonthlyTaka = Number(body.quotedMonthlyTaka);
    const monthlyTaka =
      Number.isFinite(quotedMonthlyTaka) && quotedMonthlyTaka > serverMonthlyTaka
        ? Math.round(quotedMonthlyTaka * 100) / 100
        : serverMonthlyTaka;
    const subtotalTaka = calcSubscriptionRenewTotal(monthlyTaka, months);
    let discountTaka = 0;
    let couponCode: string | undefined;
    if (body.couponCode?.trim()) {
      const coupons = await loadSubscriptionCoupons();
      const coupon = validateSubscriptionCoupon(body.couponCode, {
        planId,
        months,
        subtotalTaka,
      }, coupons);
      if (!coupon.ok) {
        return NextResponse.json({ error: coupon.error }, { status: 400 });
      }
      discountTaka = coupon.discountTaka;
      couponCode = coupon.coupon.code;
    }
    const totalTaka = Math.max(0, Math.round((subtotalTaka - discountTaka) * 100) / 100);
    if (totalTaka <= 0) {
      return NextResponse.json({ error: "Invalid renewal amount." }, { status: 400 });
    }

    const invoiceNumber = createPayStationInvoiceNumber(String(sessionUser.id));
    const baseUrl = appBaseUrl(req);
    const callbackUrl = `${baseUrl}/api/paystation/callback`;
    const payment = {
      kind: "plan_renewal" as const,
      invoiceNumber,
      userId: String(sessionUser.id),
      userEmail: String(sessionUser.email ?? ""),
      userName: String(sessionUser.name ?? ""),
      company: String(sessionUser.company ?? ""),
      planId,
      planName: plan.name,
      months,
      amountTaka: totalTaka,
      couponCode,
      discountTaka,
      createdAt: new Date().toISOString(),
    };

    const result = await initiatePayStationPayment({
      merchantId: creds.merchantId,
      password: creds.password,
      invoiceNumber,
      amountTaka: totalTaka,
      customerName: payment.userName || payment.company || "YourAI Seller",
      customerPhone: String(sessionUser.phone ?? ""),
      customerEmail: payment.userEmail || "customer@youraiseller.com",
      customerAddress: payment.company || "YourAI Seller renewal",
      callbackUrl,
      reference: `YourAI Seller ${plan.name} renewal`,
      checkoutItems: {
        kind: "plan_renewal",
        planId,
        planName: plan.name,
        months,
        couponCode,
      },
    });

    if (String(result.status_code) !== "200" || result.status !== "success" || !result.payment_url) {
      return NextResponse.json(
        { error: result.message || "PayStation could not create payment link." },
        { status: 502 }
      );
    }

    await savePendingPayStationPayment(payment);
    await recordPaymentHistory({
      kind: "plan_renewal",
      amountTaka: totalTaka,
      method: "paystation",
      status: "pending",
      invoiceNumber,
      gatewayStatus: "initiated",
      userId: payment.userId,
      userEmail: payment.userEmail,
      userName: payment.userName,
      company: payment.company,
      planId,
      months,
      couponCode,
      discountTaka,
      note: `PayStation initiated - ${invoiceNumber}`,
    });

    return NextResponse.json({
      ok: true,
      invoiceNumber,
      paymentUrl: result.payment_url,
      amountTaka: totalTaka,
    });
  } catch (e) {
    console.error("[paystation/initiate]", e);
    return NextResponse.json({ error: "Could not start PayStation payment." }, { status: 500 });
  }
}
