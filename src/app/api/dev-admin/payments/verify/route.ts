import { NextResponse } from "next/server";
import { isDevAdminAuthenticated } from "@/lib/dev-admin-auth-server";
import { formatPlanDate, planPeriodFromNow } from "@/lib/subscription-period";
import { loadPlanConfig } from "@/lib/plan-config-server";
import { planFeaturesFromConfig } from "@/lib/plan-config-utils";
import {
  getPaymentHistoryByInvoice,
  recordPaymentHistory,
} from "@/lib/payment-history-server";
import { applySmsRecharge } from "@/lib/sms-recharge-server";
import { applyAutoCallRecharge } from "@/lib/auto-call-recharge-server";
import {
  fetchPayStationTransactionStatus,
  getPendingPayStationPayment,
  isPayStationSuccessStatus,
  payStationCredentials,
  removePendingPayStationPayment,
} from "@/lib/paystation-server";
import {
  readDevUsersFile,
  writeDevUsersFile,
} from "@/lib/seller-auth-server";

type Body = {
  invoiceNumber?: string;
};

export async function POST(req: Request) {
  if (!isDevAdminAuthenticated()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = (await req.json()) as Body;
    const invoiceNumber = body.invoiceNumber?.trim() ?? "";
    if (!invoiceNumber) {
      return NextResponse.json({ error: "Invoice number required" }, { status: 400 });
    }

    const existing = await getPaymentHistoryByInvoice(invoiceNumber);
    if (existing?.status === "completed") {
      return NextResponse.json({ ok: true, entry: existing, message: "Already completed" });
    }

    const pending = await getPendingPayStationPayment(invoiceNumber);
    if (!pending) {
      return NextResponse.json({ error: "Pending payment not found" }, { status: 404 });
    }

    const creds = payStationCredentials();
    if (!creds.ok) {
      return NextResponse.json({ error: creds.error }, { status: 500 });
    }

    const status = await fetchPayStationTransactionStatus({
      merchantId: creds.merchantId,
      invoiceNumber,
    });
    const verifiedStatus = status.data?.trx_status;
    const gatewayAmount = Number(status.data?.payment_amount);
    const paid = String(status.status_code) === "200" && isPayStationSuccessStatus(verifiedStatus);
    const amountOk =
      !Number.isFinite(gatewayAmount) || gatewayAmount + 1e-9 >= pending.amountTaka;

    if (!paid || !amountOk) {
      const entry = await recordPaymentHistory({
        kind: pending.kind,
        amountTaka: pending.amountTaka,
        method: "paystation",
        status: "failed",
        invoiceNumber,
        transactionId: status.data?.trx_id,
        gatewayStatus: amountOk ? String(verifiedStatus || "failed") : "amount_mismatch",
        gatewayMethod: status.data?.payment_method,
        gatewayReference: status.data?.reference,
        gatewayAmountTaka: Number.isFinite(gatewayAmount) ? gatewayAmount : undefined,
        userId: pending.userId,
        userEmail: pending.userEmail,
        userName: pending.userName,
        company: pending.company,
        planId: pending.planId,
        months: pending.months,
        scope: pending.scope,
        smsCount: pending.smsCount,
        callMinutes: pending.callMinutes,
        couponCode: pending.couponCode,
        discountTaka: pending.discountTaka,
        note: amountOk
          ? `Manual verify failed · ${invoiceNumber}`
          : `Manual verify amount mismatch · expected ${pending.amountTaka}, got ${gatewayAmount}`,
      });
      return NextResponse.json(
        { ok: false, entry, error: "Payment is not successful" },
        { status: 409 }
      );
    }

    if (pending.kind === "plan_renewal") {
      const users = await readDevUsersFile();
      const idx = users.findIndex((u) => String(u.id) === pending.userId);
      if (idx < 0 || !pending.userId) {
        return NextResponse.json({ error: "User not found" }, { status: 404 });
      }
      const config = await loadPlanConfig();
      const paidPlanId =
        pending.planId === "basic" ||
        pending.planId === "pro" ||
        pending.planId === "enterprise"
          ? pending.planId
          : "basic";
      const wasExpiredRenewal = users[idx].status === "expired";
      users[idx] = {
        ...users[idx],
        plan: paidPlanId,
        features: planFeaturesFromConfig(config, paidPlanId),
        status: wasExpiredRenewal ? "active" : "inactive",
        expiredAt: undefined,
        ...(wasExpiredRenewal
          ? {
              planPaymentPaidAt: undefined,
              planPaymentInvoice: undefined,
              planPaymentMonths: undefined,
              ...planPeriodFromNow(pending.months ?? 1),
            }
          : {
              planPaymentPaidAt: formatPlanDate(new Date()),
              planPaymentInvoice: invoiceNumber,
              planPaymentMonths: pending.months ?? 1,
            }),
      };
      await writeDevUsersFile(users);
    } else if (pending.kind === "sms_recharge") {
      if (!pending.scope || !pending.smsCount) {
        return NextResponse.json({ error: "Invalid SMS recharge record" }, { status: 400 });
      }
      await applySmsRecharge({
        scope: pending.scope,
        smsCredits: pending.smsCount,
        taka: Math.ceil(pending.amountTaka),
        source: "self_paystation",
      });
    } else {
      if (!pending.scope || !pending.callMinutes) {
        return NextResponse.json({ error: "Invalid Auto Call recharge record" }, { status: 400 });
      }
      await applyAutoCallRecharge({
        scope: pending.scope,
        taka: pending.amountTaka,
        source: "self_paystation",
      });
    }

    const entry = await recordPaymentHistory({
      kind: pending.kind,
      amountTaka: pending.amountTaka,
      method: "paystation",
      status: "completed",
      invoiceNumber,
      transactionId: status.data?.trx_id,
      gatewayStatus: String(verifiedStatus || "successful"),
      gatewayMethod: status.data?.payment_method,
      gatewayReference: status.data?.reference,
      gatewayAmountTaka: Number.isFinite(gatewayAmount) ? gatewayAmount : undefined,
      userId: pending.userId,
      userEmail: pending.userEmail,
      userName: pending.userName,
      company: pending.company,
      planId: pending.planId,
      months: pending.months,
      scope: pending.scope,
      smsCount: pending.smsCount,
      callMinutes: pending.callMinutes,
      couponCode: pending.couponCode,
      discountTaka: pending.discountTaka,
      note: `Manual verify completed · ${status.data?.trx_id || invoiceNumber}`,
    });
    await removePendingPayStationPayment(invoiceNumber);

    return NextResponse.json({ ok: true, entry, message: "Payment verified" });
  } catch (e) {
    console.error("[dev-admin/payments/verify]", e);
    return NextResponse.json({ error: "Verify failed" }, { status: 500 });
  }
}
