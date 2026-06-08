"use client";

import clsx from "clsx";
import { Moon, Sun } from "lucide-react";
import { useMarketingTheme } from "@/components/marketing/MarketingThemeProvider";

export function MarketingThemeToggle({ className }: { className?: string }) {
  const { theme, toggleTheme, ready } = useMarketingTheme();
  const isLight = theme === "light";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      disabled={!ready}
      className={clsx(
        "mkt-theme-toggle inline-flex min-h-10 min-w-10 items-center justify-center gap-1.5 rounded-xl border px-2.5 py-2 text-xs font-bold transition active:scale-95 disabled:opacity-60 sm:min-h-11 sm:px-3",
        className
      )}
      aria-label={isLight ? "Switch to dark mode" : "Switch to day mode"}
      title={isLight ? "Dark mode" : "Day mode"}
    >
      {isLight ? (
        <Moon className="h-4 w-4 shrink-0" aria-hidden />
      ) : (
        <Sun className="h-4 w-4 shrink-0" aria-hidden />
      )}
      <span className="hidden sm:inline">{isLight ? "Dark" : "Day"}</span>
    </button>
  );
}
