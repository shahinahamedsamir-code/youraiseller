"use client";

import clsx from "clsx";
import { Globe } from "lucide-react";
import { useMarketingLanguage } from "@/components/marketing/MarketingLanguageProvider";

export function MarketingLanguageToggle({ className }: { className?: string }) {
  const { toggleLanguage, ready } = useMarketingLanguage();

  return (
    <button
      type="button"
      onClick={toggleLanguage}
      disabled={!ready}
      className={clsx(
        "mkt-theme-toggle inline-flex min-h-10 min-w-10 items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2 text-xs font-bold transition active:scale-95 disabled:opacity-60 sm:min-h-11 sm:px-3",
        className
      )}
      aria-label="English"
      title="English"
    >
      <Globe className="h-4 w-4 shrink-0" aria-hidden />
      <span className="hidden sm:inline">English</span>
    </button>
  );
}
