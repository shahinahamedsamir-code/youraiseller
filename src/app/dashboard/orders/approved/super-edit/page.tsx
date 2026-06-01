"use client";

import { Suspense } from "react";
import { SuperEditPanel } from "@/components/orders/SuperEditPanel";

function SuperEditFallback() {
  return (
    <div className="flex min-h-[40vh] items-center justify-center">
      <p className="text-sm text-slate-500">Loading Super Edit…</p>
    </div>
  );
}

export default function SuperEditPage() {
  return (
    <Suspense fallback={<SuperEditFallback />}>
      <SuperEditPanel />
    </Suspense>
  );
}
