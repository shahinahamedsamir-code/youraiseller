import { NextResponse } from "next/server";
import { loadAutoCallAccount } from "@/lib/auto-call-account-server";
import { placeAutoCallForWebOrder } from "@/lib/auto-call-workflow-server";
import { sanitizeSmsScope } from "@/lib/teamitqan-sms";

type Body = {
  scope?: string;
  manual?: boolean;
  order?: {
    id?: string;
    phone?: string;
    customerName?: string;
  };
};

export async function POST(req: Request) {
  try {
    const body = (await req.json()) as Body;
    const scope = sanitizeSmsScope(body.scope ?? "");
    const order = body.order;

    if (!scope || !order?.id || !order.phone?.trim()) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    const result = await placeAutoCallForWebOrder(
      scope,
      {
        id: String(order.id),
        phone: String(order.phone).trim(),
        customerName: String(order.customerName ?? "").trim() || undefined,
      },
      { manual: body.manual === true }
    );

    if (result.skipped) {
      const account = result.account ?? (await loadAutoCallAccount(scope));
      return NextResponse.json({ ok: false, skipped: result.skipped, account });
    }
    if (!result.ok) {
      return NextResponse.json({
        ok: false,
        error: result.error ?? "Auto call failed",
        account: result.account,
      });
    }

    return NextResponse.json({
      ok: true,
      account: result.account,
      log: result.log,
    });
  } catch (e) {
    console.error("[auto-call/workflow]", e);
    return NextResponse.json({ error: "Auto call workflow failed" }, { status: 500 });
  }
}
