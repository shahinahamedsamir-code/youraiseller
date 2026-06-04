import { NextResponse } from "next/server";
import { sendAutoOrderSms } from "@/lib/sms-auto-send-server";
import { sanitizeSmsScope } from "@/lib/teamitqan-sms";

type Body = {
  scope?: string;
  ruleId?: string;
  manual?: boolean;
  order?: {
    id?: string;
    invoiceNumber?: string;
    customerName?: string;
    phone?: string;
    total?: number;
    wooNumber?: string;
    wooOrderId?: number;
  };
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const scope = sanitizeSmsScope(body.scope ?? "");
    const ruleId = String(body.ruleId ?? "").trim();
    const order = body.order;

    if (!scope || !ruleId) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }
    if (!order?.id || !order.phone?.trim()) {
      return NextResponse.json({ error: "Invalid order data" }, { status: 400 });
    }

    const result = await sendAutoOrderSms(
      scope,
      ruleId,
      {
        id: String(order.id),
        invoiceNumber:
          typeof order.invoiceNumber === "string"
            ? order.invoiceNumber.trim()
            : undefined,
        customerName: String(order.customerName ?? "").trim() || "Customer",
        phone: String(order.phone).trim(),
        total: Number(order.total) || 0,
        wooNumber:
          typeof order.wooNumber === "string" ? order.wooNumber.trim() : undefined,
        wooOrderId:
          typeof order.wooOrderId === "number" ? order.wooOrderId : undefined,
      },
      { manual: body.manual === true }
    );

    if (result.skipped) {
      return NextResponse.json({ ok: false, skipped: result.skipped });
    }
    if (!result.ok) {
      return NextResponse.json({ ok: false, error: result.error ?? "Send failed" });
    }

    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("[sms/auto-send]", e);
    return NextResponse.json({ error: "Auto SMS failed" }, { status: 500 });
  }
}
