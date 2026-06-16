import { NextResponse } from "next/server";
import { recordPaymentHistory } from "@/lib/payment-history-server";
import type { PaymentHistoryKind } from "@/lib/payment-history-types";

type Body = {
  kind?: PaymentHistoryKind;
  amountTaka?: number;
  method?: "bkash" | "paystation" | "admin" | "manual";
  userId?: string;
  userEmail?: string;
  userName?: string;
  company?: string;
  planId?: string;
  months?: number;
  couponCode?: string;
  discountTaka?: number;
  note?: string;
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const kind = body.kind;
    const amountTaka = Number(body.amountTaka);

    if (kind !== "plan_renewal") {
      return NextResponse.json({ error: "Unsupported payment kind" }, { status: 400 });
    }
    if (!Number.isFinite(amountTaka) || amountTaka <= 0) {
      return NextResponse.json({ error: "Invalid amount" }, { status: 400 });
    }
    if (!body.userId?.trim() && !body.userEmail?.trim()) {
      return NextResponse.json({ error: "User reference required" }, { status: 400 });
    }

    const entry = await recordPaymentHistory({
      kind: "plan_renewal",
      amountTaka,
      method: body.method ?? "bkash",
      userId: body.userId,
      userEmail: body.userEmail,
      userName: body.userName,
      company: body.company,
      planId: body.planId,
      months: body.months,
      couponCode: body.couponCode,
      discountTaka: body.discountTaka,
      note: body.note,
    });

    return NextResponse.json({ ok: true, entry });
  } catch (e) {
    console.error("[payments/record]", e);
    return NextResponse.json({ error: "Record failed" }, { status: 500 });
  }
}
