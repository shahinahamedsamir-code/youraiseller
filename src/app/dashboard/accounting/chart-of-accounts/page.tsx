import { Suspense } from "react";
import { ChartOfAccountsPanel } from "@/components/accounting/ChartOfAccountsPanel";

export default function ChartOfAccountsPage() {
  return (
    <Suspense fallback={<div className="p-6 text-sm text-slate-500">Loading…</div>}>
      <ChartOfAccountsPanel />
    </Suspense>
  );
}
