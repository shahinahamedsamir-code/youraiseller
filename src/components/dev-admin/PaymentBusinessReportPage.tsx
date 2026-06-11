"use client";

import { PaymentBusinessReportPanel } from "@/components/dev-admin/PaymentBusinessReportPanel";

export function PaymentBusinessReportPage() {
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-extrabold text-white">Business Report</h1>
        <p className="mt-1 text-sm text-slate-400">
          Revenue, seller accounts &amp; gateway liability overview
        </p>
      </div>
      <PaymentBusinessReportPanel />
    </div>
  );
}
