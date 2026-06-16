import { NextResponse } from "next/server";
import { isDevAdminAuthenticated } from "@/lib/dev-admin-auth-server";
import { getPaymentHistoryByInvoice } from "@/lib/payment-history-server";
import { buildPaymentReceiptHtml } from "@/lib/payment-receipt";
import {
  getSellerSessionUser,
  readDevUsersFile,
  resolveDataScopeForUser,
} from "@/lib/seller-auth-server";

function receiptFileName(invoice: string): string {
  return `payment-receipt-${invoice.replace(/[^a-z0-9_-]+/gi, "-")}.html`;
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const invoice = url.searchParams.get("invoice")?.trim() ?? "";
  const download = url.searchParams.get("download") === "1";

  if (!invoice) {
    return NextResponse.json({ error: "Missing invoice" }, { status: 400 });
  }

  const row = await getPaymentHistoryByInvoice(invoice);
  if (!row) {
    return NextResponse.json({ error: "Receipt not found" }, { status: 404 });
  }

  let allowed = isDevAdminAuthenticated();
  if (!allowed) {
    const user = await getSellerSessionUser();
    if (user) {
      const users = await readDevUsersFile();
      const scope = resolveDataScopeForUser(user, users);
      const userId = String(user.id ?? "");
      const email = String(user.email ?? "").toLowerCase();
      allowed =
        Boolean(userId && row.userId === userId) ||
        Boolean(scope && row.scope === scope) ||
        Boolean(email && row.userEmail?.toLowerCase() === email);
    }
  }

  if (!allowed) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return new NextResponse(buildPaymentReceiptHtml(row), {
    headers: {
      "Content-Type": "text/html; charset=utf-8",
      "Content-Disposition": `${download ? "attachment" : "inline"}; filename="${receiptFileName(invoice)}"`,
      "X-Content-Type-Options": "nosniff",
    },
  });
}
