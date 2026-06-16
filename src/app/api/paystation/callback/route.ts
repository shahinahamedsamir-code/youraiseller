import { NextResponse } from "next/server";
import { planPeriodFromNow } from "@/lib/subscription-period";
import { recordPaymentHistory } from "@/lib/payment-history-server";
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

    if (!paid) {
      await recordPaymentHistory({
        kind: pending.kind,
        amountTaka: pending.amountTaka,
        method: "paystation",
        status: "failed",
        invoiceNumber,
        transactionId: status.data?.trx_id || callbackTrxId,
        gatewayStatus: String(verifiedStatus || callbackStatus || "failed"),
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
        note: `PayStation ${verifiedStatus || callbackStatus || "failed"} · ${invoiceNumber}`,
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

      users[idx] = {
        ...users[idx],
        status: "active",
        expiredAt: undefined,
        ...planPeriodFromNow(pending.months ?? 1),
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
  kind: "plan_renewal" | "sms_recharge" | "auto_call_recharge",
  success: boolean
): URL {
  const path =
    kind === "sms_recharge"
      ? "/dashboard/integration/sms"
      : kind === "auto_call_recharge"
        ? "/dashboard/integration/auto-call"
        : "/renew";
  const redirect = new URL(path, origin);
  redirect.searchParams.set("payment", success ? "success" : "failed");
  redirect.searchParams.set("kind", kind);
  return redirect;
}
