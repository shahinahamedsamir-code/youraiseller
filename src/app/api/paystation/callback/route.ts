import { NextResponse } from "next/server";
import {
  formatPlanDate,
  planPeriodFromNow,
  planPeriodExtended,
} from "@/lib/subscription-period";
import { recordPaymentHistory } from "@/lib/payment-history-server";
import { getPaymentHistoryByInvoice } from "@/lib/payment-history-server";
import { loadPlanConfig } from "@/lib/plan-config-server";
import { planFeaturesFromConfig } from "@/lib/plan-config-utils";
import { applySmsRecharge } from "@/lib/sms-recharge-server";
import { applyAutoCallRecharge } from "@/lib/auto-call-recharge-server";
import {
  appBaseUrl,
  fetchPayStationTransactionStatus,
  getPendingPayStationPayment,
  isPayStationSuccessStatus,
  payStationCredentials,
  removePendingPayStationPayment,
} from "@/lib/paystation-server";
import {
  readDevUsersFile,
  sellerSessionCookieOptions,
  signSellerSession,
  writeDevUsersFile,
} from "@/lib/seller-auth-server";
import { SELLER_AUTH_COOKIE } from "@/lib/seller-auth-cookie";

export async function GET(req: Request) {
  const url = new URL(req.url);
  const redirectOrigin = appBaseUrl(req);
  const invoiceNumber = url.searchParams.get("invoice_number")?.trim() ?? "";
  const callbackStatus = url.searchParams.get("status");
  const callbackTrxId = url.searchParams.get("trx_id")?.trim() ?? "";
  const redirect = new URL("/renew", redirectOrigin);

  if (!invoiceNumber) {
    redirect.searchParams.set("payment", "failed");
    redirect.searchParams.set("reason", "missing_invoice");
    return NextResponse.redirect(redirect);
  }

  try {
    const pending = await getPendingPayStationPayment(invoiceNumber);
    if (!pending) {
      redirect.searchParams.set("payment", "failed");
      redirect.searchParams.set("reason", "invoice_not_found");
      return NextResponse.redirect(redirect);
    }

    const existing = await getPaymentHistoryByInvoice(invoiceNumber);
    if (existing?.status === "completed") {
      const duplicateRedirect = payStationRedirectForPending(
        redirectOrigin,
        pending.kind,
        true
      );
      duplicateRedirect.searchParams.set("invoice", invoiceNumber);
      duplicateRedirect.searchParams.set("duplicate", "1");
      return NextResponse.redirect(duplicateRedirect);
    }

    const creds = payStationCredentials();
    if (!creds.ok) {
      redirect.searchParams.set("payment", "failed");
      redirect.searchParams.set("reason", "missing_credentials");
      return NextResponse.redirect(redirect);
    }

    const status = await fetchPayStationTransactionStatus({
      merchantId: creds.merchantId,
      invoiceNumber,
    });
    const verifiedStatus = status.data?.trx_status ?? callbackStatus;
    const gatewayAmount = Number(status.data?.payment_amount);
    const paid = String(status.status_code) === "200" && isPayStationSuccessStatus(verifiedStatus);
    const amountOk =
      !Number.isFinite(gatewayAmount) || gatewayAmount + 1e-9 >= pending.amountTaka;

    if (!paid || !amountOk) {
      await recordPaymentHistory({
        kind: pending.kind,
        amountTaka: pending.amountTaka,
        method: "paystation",
        status: "failed",
        invoiceNumber,
        transactionId: status.data?.trx_id || callbackTrxId,
        gatewayStatus: amountOk
          ? String(verifiedStatus || callbackStatus || "failed")
          : "amount_mismatch",
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
          ? `PayStation ${verifiedStatus || callbackStatus || "failed"} · ${invoiceNumber}`
          : `PayStation amount mismatch · expected ${pending.amountTaka}, got ${gatewayAmount}`,
      });
      const failedRedirect = payStationRedirectForPending(redirectOrigin, pending.kind, false);
      failedRedirect.searchParams.set("invoice", invoiceNumber);
      return NextResponse.redirect(failedRedirect);
    }

    if (pending.kind === "plan_renewal") {
      const users = await readDevUsersFile();
      const idx = users.findIndex((u) => String(u.id) === pending.userId);
      if (idx < 0 || !pending.userId) {
        redirect.searchParams.set("payment", "failed");
        redirect.searchParams.set("reason", "user_not_found");
        return NextResponse.redirect(redirect);
      }

      const config = await loadPlanConfig();
      const paidPlanId =
        pending.planId === "basic" ||
        pending.planId === "pro" ||
        pending.planId === "enterprise"
          ? pending.planId
          : "basic";
      const prevStatus = users[idx].status;
      const planChanged = users[idx].plan !== paidPlanId;
      const wasExpiredRenewal = prevStatus === "expired";
      // An already-active account is doing an early renewal / upgrade: keep it
      // active and add the purchased months on top of the current expiry so no
      // remaining days are lost — no admin approval needed. Expired accounts get
      // a fresh period from today. A fresh (inactive) account stays inactive and
      // waits for admin approval after recording the payment.
      const wasActiveRenewal = prevStatus === "active";
      users[idx] = {
        ...users[idx],
        plan: paidPlanId,
        features: planFeaturesFromConfig(config, paidPlanId),
        status: wasExpiredRenewal || wasActiveRenewal ? "active" : "inactive",
        expiredAt: undefined,
        // Switching plan drops purchased order quota — new plan, new limits.
        ...(planChanged ? { extraOrderLimit: undefined, orderBoostThisMonth: undefined } : {}),
        ...(wasExpiredRenewal
          ? {
              planPaymentPaidAt: undefined,
              planPaymentInvoice: undefined,
              planPaymentMonths: undefined,
              ...planPeriodFromNow(pending.months ?? 1),
            }
          : wasActiveRenewal
            ? {
                planPaymentPaidAt: undefined,
                planPaymentInvoice: undefined,
                planPaymentMonths: undefined,
                ...planPeriodExtended(
                  {
                    planStartedAt: users[idx].planStartedAt as string | undefined,
                    planExpiresAt: users[idx].planExpiresAt as string | undefined,
                  },
                  pending.months ?? 1
                ),
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
        const failedRedirect = payStationRedirectForPending(redirectOrigin, pending.kind, false);
        failedRedirect.searchParams.set("reason", "invalid_sms_recharge");
        return NextResponse.redirect(failedRedirect);
      }
      await applySmsRecharge({
        scope: pending.scope,
        smsCredits: pending.smsCount,
        taka: Math.ceil(pending.amountTaka),
        source: "self_paystation",
      });
    } else if (pending.kind === "auto_call_recharge") {
      if (!pending.scope || !pending.callMinutes) {
        const failedRedirect = payStationRedirectForPending(redirectOrigin, pending.kind, false);
        failedRedirect.searchParams.set("reason", "invalid_auto_call_recharge");
        return NextResponse.redirect(failedRedirect);
      }
      await applyAutoCallRecharge({
        scope: pending.scope,
        taka: pending.amountTaka,
        source: "self_paystation",
      });
    } else if (pending.kind === "order_limit") {
      const users = await readDevUsersFile();
      const idx = users.findIndex((u) => String(u.id) === pending.userId);
      const orders = Math.max(0, Math.floor(Number(pending.orderCount) || 0));
      if (idx < 0 || !pending.userId || orders <= 0) {
        const failedRedirect = payStationRedirectForPending(redirectOrigin, pending.kind, false);
        failedRedirect.searchParams.set("reason", "invalid_order_limit");
        return NextResponse.redirect(failedRedirect);
      }
      const now = new Date();
      if (pending.orderTemporary) {
        // Boost for the current month only — accumulate within the same month.
        const prev = users[idx].orderBoostThisMonth as
          | { amount?: number; cycleStart?: string }
          | undefined;
        const prevStart = prev?.cycleStart ? new Date(prev.cycleStart) : null;
        const sameMonth =
          prevStart &&
          prevStart.getMonth() === now.getMonth() &&
          prevStart.getFullYear() === now.getFullYear();
        users[idx] = {
          ...users[idx],
          orderBoostThisMonth: {
            amount: (sameMonth ? Number(prev?.amount) || 0 : 0) + orders,
            cycleStart: now.toISOString(),
          },
        };
      } else {
        users[idx] = {
          ...users[idx],
          extraOrderLimit: (Number(users[idx].extraOrderLimit) || 0) + orders,
        };
      }
      await writeDevUsersFile(users);
    }

    await recordPaymentHistory({
      kind: pending.kind,
      amountTaka: pending.amountTaka,
      method: "paystation",
      status: "completed",
      invoiceNumber,
      transactionId: status.data?.trx_id || callbackTrxId,
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
      note: `PayStation ${status.data?.payment_method || "payment"} · ${status.data?.trx_id || callbackTrxId || invoiceNumber}`,
    });
    await removePendingPayStationPayment(invoiceNumber);

    const successRedirect = payStationRedirectForPending(redirectOrigin, pending.kind, true);
    successRedirect.searchParams.set("invoice", invoiceNumber);
    const res = NextResponse.redirect(successRedirect);
    if (pending.kind === "plan_renewal" && pending.userId) {
      res.cookies.set(
        SELLER_AUTH_COOKIE,
        signSellerSession(pending.userId),
        sellerSessionCookieOptions()
      );
    }
    return res;
  } catch (e) {
    console.error("[paystation/callback]", e);
    redirect.searchParams.set("payment", "failed");
    redirect.searchParams.set("reason", "server_error");
    return NextResponse.redirect(redirect);
  }
}

function payStationRedirectForPending(
  origin: string,
  kind: "plan_renewal" | "sms_recharge" | "auto_call_recharge" | "order_limit",
  success: boolean
): URL {
  const path =
    kind === "sms_recharge"
      ? "/dashboard/integration/sms"
      : kind === "auto_call_recharge"
        ? "/dashboard/integration/auto-call"
        : kind === "order_limit"
          ? "/dashboard/billing-limit"
          : "/renew";
  const redirect = new URL(path, origin);
  redirect.searchParams.set("payment", success ? "success" : "failed");
  redirect.searchParams.set("kind", kind);
  return redirect;
}
