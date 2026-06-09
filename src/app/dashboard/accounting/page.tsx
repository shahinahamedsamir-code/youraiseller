"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { AccountingDashboard } from "@/components/accounting/AccountingDashboard";

export default function AccountingOverviewPage() {
  return (
    <div>
      <PageHeader
        title="Accounting"
        description="Income, expenses, accounts & profit — your business money in one place"
      />
      <AccountingDashboard />
    </div>
  );
}
