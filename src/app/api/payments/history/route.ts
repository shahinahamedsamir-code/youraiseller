import { NextResponse } from "next/server";
import { listPaymentHistory, paymentHistoryTotals } from "@/lib/payment-history-server";
import {
  getSellerSessionUser,
  readDevUsersFile,
  resolveDataScopeForUser,
} from "@/lib/seller-auth-server";
import type { PaymentHistoryEntry, PaymentHistoryKind } from "@/lib/payment-history-types";

function belongsToUser(row: PaymentHistoryEntry, opts: {
  userId: string;
  email: string;
  scope: string | null;
}): boolean {
  return (
    Boolean(opts.userId && row.userId === opts.userId) ||
    Boolean(opts.scope && row.scope === opts.scope) ||
    Boolean(opts.email && row.userEmail?.toLowerCase() === opts.email)
  );
}

export async function GET(req: Request) {
  const user = await getSellerSessionUser();
  if (!user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const url = new URL(req.url);
  const kind = (url.searchParams.get("kind") ?? "all") as PaymentHistoryKind | "all";
  const status = url.searchParams.get("status") ?? "all";
  const users = await readDevUsersFile();
  const scope = resolveDataScopeForUser(user, users);
  const userId = String(user.id ?? "");
  const email = String(user.email ?? "").toLowerCase();

  let entries = (await listPaymentHistory({ kind, limit: 1000 })).filter((row) =>
    belongsToUser(row, { userId, email, scope })
  );

  if (status !== "all") {
    entries = entries.filter((row) => row.status === status);
  }

  return NextResponse.json({
    ok: true,
    entries,
    totals: paymentHistoryTotals(entries),
  });
}
