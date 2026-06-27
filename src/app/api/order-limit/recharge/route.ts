import { NextResponse } from "next/server";
import { getSellerSessionUser } from "@/lib/seller-auth-server";
import { loadPlanConfig } from "@/lib/plan-config-server";
import { getPlanDefinition } from "@/lib/plan-config-utils";
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
  orders?: number;
  temporary?: boolean;
};

const MIN_ORDERS = 1;
const MAX_ORDERS = 1_000_000;

export async function POST(req: Request) {
  try {
    const creds = payStationCredentials();
    if (!creds.ok) {
      return NextResponse.json({ error: creds.error }, { status: 500 });
    }

    const sessionUser = await getSellerSessionUser();
    const body = (await req.json()) as Body;
    if (!sessionUser || String(sessionUser.id) !== body.userId?.trim()) {
      return NextResponse.json({ error: "Session expired. Sign in again." }, { status: 401 });
    }
    if (sessionUser.status === "pending") {
      return NextResponse.json(
        { error: "Your account is awaiting admin approval." },
        { status: 400 }
      );
    }

    const orders = Math.floor(Number(body.orders));
    if (!Number.isFinite(orders) || orders < MIN_ORDERS || orders > MAX_ORDERS) {
      return NextResponse.json({ error: "Invalid order amount." }, { status: 400 });
    }
    const temporary = body.temporary === true;

    // Rate comes from the plan config server-side — never trust the client.
    const planId =
      sessionUser.plan === "basic" ||
      sessionUser.plan === "pro" ||
      sessionUser.plan === "enterprise"
        ? sessionUser.plan
        : "basic";
    const config = await loadPlanConfig();
    const rate = getPlanDefinition(config, planId).orderRateTaka;
    const totalTaka = Math.round(orders * rate * 100) / 100;
    if (!(totalTaka > 0)) {
      return NextResponse.json({ error: "This plan does not allow buying extra orders." }, { status: 400 });
    }

    const invoiceNumber = createPayStationInvoiceNumber(String(sessionUser.id));
    const result = await initiatePayStationPayment({
      merchantId: creds.merchantId,
      password: creds.password,
      invoiceNumber,
      amountTaka: totalTaka,
      customerName: String(sessionUser.name ?? "") || String(sessionUser.company ?? "") || "YourAI Seller",
      customerPhone: String(sessionUser.phone ?? ""),
      customerEmail: String(sessionUser.email ?? "") || "customer@youraiseller.com",
      customerAddress: String(sessionUser.company ?? "") || "YourAI Seller order limit",
      callbackUrl: `${appBaseUrl(req)}/api/paystation/callback`,
      reference: `YourAI Seller order limit +${orders}`,
      checkoutItems: {
        kind: "order_limit",
        orders,
        temporary,
      },
    });

    if (String(result.status_code) !== "200" || result.status !== "success" || !result.payment_url) {
      return NextResponse.json(
        { error: result.message || "PayStation could not create payment link." },
        { status: 502 }
      );
    }

    await savePendingPayStationPayment({
      kind: "order_limit",
      invoiceNumber,
      userId: String(sessionUser.id),
      userEmail: String(sessionUser.email ?? ""),
      userName: String(sessionUser.name ?? ""),
      company: String(sessionUser.company ?? ""),
      orderCount: orders,
      orderTemporary: temporary,
      amountTaka: totalTaka,
      createdAt: new Date().toISOString(),
    });
    await recordPaymentHistory({
      kind: "order_limit",
      amountTaka: totalTaka,
      method: "paystation",
      status: "pending",
      invoiceNumber,
      gatewayStatus: "initiated",
      userId: String(sessionUser.id),
      userEmail: String(sessionUser.email ?? ""),
      userName: String(sessionUser.name ?? ""),
      company: String(sessionUser.company ?? ""),
      note: `Order limit +${orders}${temporary ? " (this month)" : " (permanent)"} - ${invoiceNumber}`,
    });

    return NextResponse.json({
      ok: true,
      invoiceNumber,
      paymentUrl: result.payment_url,
      orders,
      temporary,
      amountTaka: totalTaka,
    });
  } catch (e) {
    console.error("[order-limit/recharge]", e);
    return NextResponse.json({ error: "Could not start payment." }, { status: 500 });
  }
}
