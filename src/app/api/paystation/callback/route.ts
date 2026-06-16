import { NextResponse } from "next/server";
import { planPeriodFromNow } from "@/lib/subscription-period";
import { recordPaymentHistory } from "@/lib/payment-history-server";
import {
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
  const invoiceNumber = url.searchParams.get("invoice_number")?.trim() ?? "";
  const callbackStatus = url.searchParams.get("status");
  const callbackTrxId = url.searchParams.get("trx_id")?.trim() ?? "";
  const redirect = new URL("/renew", url.origin);

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
    const paid = String(status.status_code) === "200" && isPayStationSuccessStatus(verifiedStatus);

    if (!paid) {
      await recordPaymentHistory({
        kind: "plan_renewal",
        amountTaka: pending.amountTaka,
        method: "paystation",
        status: "failed",
        userId: pending.userId,
        userEmail: pending.userEmail,
        userName: pending.userName,
        company: pending.company,
        planId: pending.planId,
        months: pending.months,
        couponCode: pending.couponCode,
        discountTaka: pending.discountTaka,
        note: `PayStation ${verifiedStatus || callbackStatus || "failed"} · ${invoiceNumber}`,
      });
      redirect.searchParams.set("payment", "failed");
      redirect.searchParams.set("invoice", invoiceNumber);
      return NextResponse.redirect(redirect);
    }

    const users = await readDevUsersFile();
    const idx = users.findIndex((u) => String(u.id) === pending.userId);
    if (idx < 0) {
      redirect.searchParams.set("payment", "failed");
      redirect.searchParams.set("reason", "user_not_found");
      return NextResponse.redirect(redirect);
    }

    users[idx] = {
      ...users[idx],
      status: "active",
      expiredAt: undefined,
      ...planPeriodFromNow(pending.months),
    };
    await writeDevUsersFile(users);
    await recordPaymentHistory({
      kind: "plan_renewal",
      amountTaka: pending.amountTaka,
      method: "paystation",
      status: "completed",
      userId: pending.userId,
      userEmail: pending.userEmail,
      userName: pending.userName,
      company: pending.company,
      planId: pending.planId,
      months: pending.months,
      couponCode: pending.couponCode,
      discountTaka: pending.discountTaka,
      note: `PayStation ${status.data?.payment_method || "payment"} · ${status.data?.trx_id || callbackTrxId || invoiceNumber}`,
    });
    await removePendingPayStationPayment(invoiceNumber);

    redirect.searchParams.set("payment", "success");
    redirect.searchParams.set("invoice", invoiceNumber);
    const res = NextResponse.redirect(redirect);
    res.cookies.set(
      SELLER_AUTH_COOKIE,
      signSellerSession(pending.userId),
      sellerSessionCookieOptions()
    );
    return res;
  } catch (e) {
    console.error("[paystation/callback]", e);
    redirect.searchParams.set("payment", "failed");
    redirect.searchParams.set("reason", "server_error");
    return NextResponse.redirect(redirect);
  }
}
