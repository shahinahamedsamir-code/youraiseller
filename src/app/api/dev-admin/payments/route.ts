import { NextResponse } from "next/server";
import { isDevAdminAuthenticated } from "@/lib/dev-admin-auth-server";
import { buildPaymentBalanceReport } from "@/lib/payment-balance-report";
import {
  buildPaymentBusinessReport,
  type PaymentReportPeriod,
} from "@/lib/payment-business-report";
import {
  listPaymentHistory,
  paymentHistoryTotals,
} from "@/lib/payment-history-server";
import type { PaymentHistoryKind } from "@/lib/payment-history-types";

export async function GET(req: Request) {
  if (!isDevAdminAuthenticated()) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { searchParams } = new URL(req.url);
    const wantBalance = searchParams.get("balance") === "1";
    const wantReport = searchParams.get("report") === "1";

    if (wantBalance) {
      const balanceReport = await buildPaymentBalanceReport();
      return NextResponse.json({ ok: true, balanceReport });
    }

    if (wantReport) {
      const period = (searchParams.get("period") ?? "30d") as PaymentReportPeriod;
      const businessReport = await buildPaymentBusinessReport(
        period === "today" || period === "7d" || period === "30d" || period === "all"
          ? period
          : "30d"
      );
      return NextResponse.json({ ok: true, businessReport });
    }

    const kind = (searchParams.get("kind") ?? "all") as PaymentHistoryKind | "all";
    const entries = await listPaymentHistory({ kind });
    const completed = entries.filter((e) => e.status === "completed");
    return NextResponse.json({
      ok: true,
      entries,
      totals: {
        ...paymentHistoryTotals(entries),
        planCount: completed.filter((e) => e.kind === "plan_renewal").length,
        smsCount: completed.filter((e) => e.kind === "sms_recharge").length,
        autoCallCount: completed.filter((e) => e.kind === "auto_call_recharge").length,
      },
    });
  } catch (e) {
    console.error("[dev-admin/payments]", e);
    return NextResponse.json({ error: "Load failed" }, { status: 500 });
  }
}
