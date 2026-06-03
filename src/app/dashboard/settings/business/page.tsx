"use client";

import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import { BusinessSettingsPanel } from "@/components/settings/BusinessSettingsPanel";

export default function BusinessSettingsPage() {
  return (
    <div className="space-y-4">
      <Link
        href="/dashboard/settings"
        className="inline-flex items-center gap-1 text-sm font-semibold text-slate-500 transition hover:text-violet-600"
      >
        <ChevronLeft className="h-4 w-4" />
        Back to Settings
      </Link>
      <BusinessSettingsPanel />
    </div>
  );
}
