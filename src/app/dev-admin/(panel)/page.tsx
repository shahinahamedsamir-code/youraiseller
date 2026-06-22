"use client";

import { useState } from "react";
import Link from "next/link";
import { useFeatures } from "@/context/FeatureContext";
import { FeatureToggleList } from "@/components/dev-admin/FeatureToggleList";
import { Power, PowerOff, RotateCcw, Users, AlertTriangle, X } from "lucide-react";

type BulkAction = {
  id: "enable" | "disable" | "reset";
  title: string;
  message: string;
  confirmLabel: string;
  confirmClass: string;
  run: () => void;
};

export default function DevAdminPage() {
  const { enableAll, disableAll, resetDefaults } = useFeatures();
  const [pending, setPending] = useState<BulkAction | null>(null);

  const actions: Record<BulkAction["id"], BulkAction> = {
    enable: {
      id: "enable",
      title: "Enable all features?",
      message:
        "Every module will be turned ON globally for all user panels. You can fine-tune individual features afterwards.",
      confirmLabel: "Enable All",
      confirmClass: "bg-emerald-600 hover:bg-emerald-500",
      run: enableAll,
    },
    disable: {
      id: "disable",
      title: "Disable all features?",
      message:
        "Every module will be turned OFF globally and hidden from all user panels. This affects every customer immediately.",
      confirmLabel: "Disable All",
      confirmClass: "bg-rose-600 hover:bg-rose-500",
      run: disableAll,
    },
    reset: {
      id: "reset",
      title: "Reset to defaults?",
      message:
        "All global feature switches will be restored to their default ON state. Your current customizations will be lost.",
      confirmLabel: "Reset",
      confirmClass: "bg-orange-600 hover:bg-orange-500",
      run: resetDefaults,
    },
  };

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
            onClick={() => setPending(actions.enable)}
            className="flex items-center gap-2 rounded-xl bg-emerald-600 px-4 py-2 text-sm font-semibold text-white hover:bg-emerald-500"
          >
            <Power className="h-4 w-4" />
            Enable All
          </button>
          <button
            type="button"
            onClick={() => setPending(actions.disable)}
            className="flex items-center gap-2 rounded-xl bg-rose-600 px-4 py-2 text-sm font-semibold text-white hover:bg-rose-500"
          >
            <PowerOff className="h-4 w-4" />
            Disable All
          </button>
          <button
            type="button"
            onClick={() => setPending(actions.reset)}
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

      {pending ? (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Cancel"
            className="absolute inset-0 bg-black/70"
            onClick={() => setPending(null)}
          />
          <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl border border-slate-600 bg-slate-900 shadow-2xl">
            <div className="flex items-start justify-between gap-3 border-b border-slate-700 px-5 py-4">
              <div className="flex items-center gap-3">
                <span
                  className={`flex h-10 w-10 items-center justify-center rounded-xl ${
                    pending.id === "disable"
                      ? "bg-rose-500/15 text-rose-400"
                      : pending.id === "reset"
                        ? "bg-orange-500/15 text-orange-400"
                        : "bg-emerald-500/15 text-emerald-400"
                  }`}
                >
                  <AlertTriangle className="h-5 w-5" />
                </span>
                <h2 className="text-lg font-bold text-white">{pending.title}</h2>
              </div>
              <button
                type="button"
                onClick={() => setPending(null)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-800 hover:text-white"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="px-5 py-5">
              <p className="text-sm text-slate-300">{pending.message}</p>
            </div>
            <div className="flex justify-end gap-2 border-t border-slate-700 px-5 py-4">
              <button
                type="button"
                onClick={() => setPending(null)}
                className="rounded-xl border border-slate-600 px-4 py-2 text-sm font-medium text-slate-300 hover:bg-slate-800"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  pending.run();
                  setPending(null);
                }}
                className={`rounded-xl px-5 py-2 text-sm font-bold text-white ${pending.confirmClass}`}
              >
                {pending.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}
