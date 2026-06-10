"use client";

import { Suspense } from "react";
import { ReportsPageContent } from "@/components/reports/ReportsPageContent";

export default function ReportsPage() {
  return (
    <Suspense
      fallback={
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-500">
          Loading reports…
        </div>
      }
    >
      <ReportsPageContent />
    </Suspense>
  );
}
