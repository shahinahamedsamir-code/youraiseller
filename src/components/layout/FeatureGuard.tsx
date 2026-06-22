"use client";

import { useEffect } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Lock, Sparkles } from "lucide-react";
import { useFeatures } from "@/context/FeatureContext";
import { FEATURE_LIST, getFeatureKeyFromPath, type FeatureKey } from "@/lib/features";

function featureLabel(key: FeatureKey): string {
  return FEATURE_LIST.find((f) => f.key === key)?.label ?? "This feature";
}

export function FeatureGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isGloballyEnabled, isLocked, hydrated } = useFeatures();

  const key = getFeatureKeyFromPath(pathname);
  const isDashboardHome =
    pathname === "/dashboard" || pathname.startsWith("/dashboard?");

  // Only redirect when the module is globally disabled by admin. A plan-locked
  // module stays on its page and shows the upgrade prompt below.
  const globallyOff = !!key && !isDashboardHome && hydrated && !isGloballyEnabled(key);

  useEffect(() => {
    if (globallyOff) {
      router.replace("/dashboard?disabled=1");
    }
  }, [globallyOff, router]);

  if (!hydrated) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-400">
        Loading modules…
      </div>
    );
  }

  if (!key || isDashboardHome) {
    return <>{children}</>;
  }

  // Globally disabled by admin → hidden for everyone.
  if (!isGloballyEnabled(key)) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2">
        <p className="font-semibold text-slate-700">This module is disabled</p>
        <p className="text-sm text-slate-500">Contact admin to enable this feature.</p>
      </div>
    );
  }

  // Allowed globally but not in the user's plan → locked, needs upgrade.
  if (isLocked(key)) {
    return (
      <div className="flex min-h-[55vh] items-center justify-center px-4">
        <div className="w-full max-w-md overflow-hidden rounded-3xl border border-indigo-100 bg-white text-center shadow-xl">
          <div className="bg-gradient-to-br from-indigo-600 via-violet-600 to-indigo-700 px-8 py-10 text-white">
            <span className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white/15 backdrop-blur">
              <Lock className="h-8 w-8" />
            </span>
            <h2 className="mt-5 text-2xl font-extrabold">{featureLabel(key)} is a premium feature</h2>
            <p className="mt-2 text-sm font-medium text-indigo-100">
              This feature is not included in your current plan. Upgrade to unlock it.
            </p>
          </div>
          <div className="px-8 py-6">
            <Link
              href="/dashboard/billing-limit"
              className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-5 py-3 text-sm font-black text-white shadow-lg transition hover:scale-[1.02]"
            >
              <Sparkles className="h-4 w-4" />
              Upgrade Plan
            </Link>
            <p className="mt-3 text-xs font-semibold text-slate-400">
              Once you upgrade your subscription, this module activates instantly.
            </p>
          </div>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
