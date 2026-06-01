"use client";

import { useSearchParams } from "next/navigation";
import { AlertTriangle } from "lucide-react";

export function DisabledBanner() {
  const params = useSearchParams();
  if (params.get("disabled") !== "1") return null;

  return (
    <div className="mb-4 flex items-center gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
      <AlertTriangle className="h-5 w-5 shrink-0 text-amber-600" />
      <p>
        This module is not available on your plan. Please contact your
        administrator.
      </p>
    </div>
  );
}
