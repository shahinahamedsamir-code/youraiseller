"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";
import { useFeatures } from "@/context/FeatureContext";
import { getFeatureKeyFromPath } from "@/lib/features";

export function FeatureGuard({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const { isEnabled, hydrated } = useFeatures();

  const key = getFeatureKeyFromPath(pathname);
  const isDashboardHome =
    pathname === "/dashboard" || pathname.startsWith("/dashboard?");

  useEffect(() => {
    if (!hydrated || !key || isDashboardHome) return;
    if (!isEnabled(key)) {
      router.replace("/dashboard?disabled=1");
    }
  }, [pathname, isEnabled, router, key, hydrated, isDashboardHome]);

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

  if (!isEnabled(key)) {
    return (
      <div className="flex min-h-[40vh] flex-col items-center justify-center gap-2">
        <p className="font-semibold text-slate-700">This module is disabled</p>
        <p className="text-sm text-slate-500">Contact admin to enable this feature.</p>
      </div>
    );
  }

  return <>{children}</>;
}
