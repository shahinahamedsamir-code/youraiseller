import { Suspense } from "react";
import { TransactionListPanel } from "@/components/accounting/TransactionListPanel";

export default function TransactionsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading transactions…</div>}>
      <TransactionListPanel />
    </Suspense>
  );
}
