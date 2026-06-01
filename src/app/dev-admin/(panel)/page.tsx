"use client";

import Link from "next/link";
import { useFeatures } from "@/context/FeatureContext";
import { FeatureToggleList } from "@/components/dev-admin/FeatureToggleList";
import { Power, PowerOff, RotateCcw, Users } from "lucide-react";

export default function DevAdminPage() {
  const { enableAll, disableAll, resetDefaults } = useFeatures();

  return (
    <div className="max-w-full overflow-x-hidden">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-white">Feature Control</h1>
          <p className="mt-1 max-w-xl text-sm text-slate-400">
            Global switches for YourAI Seller. OFF here disables a module for
            every user panel. Per-user overrides are in Software Users → feature
            icon — only when the module is ON globally.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={enableAll}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            <Power className="h-4 w-4" />
            Enable All
          </button>
          <button
            type="button"
            onClick={disableAll}
            className="flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500"
          >
            <PowerOff className="h-4 w-4" />
            Disable All
          </button>
          <button
            type="button"
            onClick={resetDefaults}
            className="flex items-center gap-2 rounded-xl border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
          >
            <RotateCcw className="h-4 w-4" />
            Reset
          </button>
          <Link
            href="/dev-admin/users"
            className="flex items-center gap-2 rounded-xl bg-orange-600 px-4 py-2 text-sm font-semibold text-white hover:bg-orange-500"
          >
            <Users className="h-4 w-4" />
            Manage Users
          </Link>
        </div>
      </div>

      <FeatureToggleList />
    </div>
  );
}
