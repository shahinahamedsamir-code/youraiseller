"use client";

import Link from "next/link";
import { Bell, Menu, Moon, Search, Sun } from "lucide-react";
import { quickLinks } from "@/lib/navigation";
import { BrandMark } from "@/components/brand/BrandLogo";
import { useFeatures } from "@/context/FeatureContext";
import { useMemo } from "react";
import { HeaderQuickSms } from "./HeaderQuickSms";
import { ProfileMenu } from "./ProfileMenu";
import { useTheme } from "@/context/ThemeContext";

type TopBarProps = {
  onMenuClick?: () => void;
};

export function TopBar({ onMenuClick }: TopBarProps) {
  const { isEnabled } = useFeatures();
  const { isDark, toggleTheme } = useTheme();

  const links = useMemo(
    () => quickLinks.filter((l) => isEnabled(l.featureKey)).slice(0, 3),
    [isEnabled]
  );

  return (
    <header className="sticky top-0 z-30 flex h-16 items-center gap-4 border-b border-[var(--yai-border)] bg-[var(--yai-bg)] px-5 backdrop-blur-xl">
      <button
        type="button"
        onClick={onMenuClick}
        className="rounded-xl p-2 text-slate-500 hover:bg-slate-100 lg:hidden"
        aria-label="Open menu"
      >
        <Menu className="h-5 w-5" />
      </button>

      <Link
        href="/dashboard"
        className="rounded-lg transition hover:opacity-90 md:hidden"
        aria-label="Go to dashboard"
      >
        <BrandMark size="xs" />
      </Link>

      <div className="hidden flex-1 items-center gap-2 md:flex">
        <div className="flex max-w-md flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-2.5 dark:border-white/10 dark:bg-white/5">
          <Search className="h-4 w-4 text-indigo-400" />
          <input
            type="text"
            placeholder="Search orders, products, customers…"
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400 dark:text-slate-200 dark:placeholder:text-slate-500"
          />
          <kbd className="hidden rounded-lg bg-white px-2 py-0.5 text-[10px] font-bold text-slate-400 ring-1 ring-slate-200 sm:inline">
            ⌘K
          </kbd>
        </div>
      </div>

      <div className="hidden items-center gap-1 lg:flex">
        {links.map((link) => (
          <Link
            key={link.href}
            href={link.href}
            className="rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-500 transition hover:bg-indigo-50 hover:text-indigo-700"
          >
            {link.label}
          </Link>
        ))}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <HeaderQuickSms />

        {/* Dark / Light toggle */}
        <button
          type="button"
          onClick={toggleTheme}
          aria-label={isDark ? "Switch to light mode" : "Switch to dark mode"}
          className="relative rounded-xl p-2.5 text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10"
        >
          {isDark ? (
            <Sun className="h-5 w-5 text-amber-400" />
          ) : (
            <Moon className="h-5 w-5" />
          )}
        </button>

        <button
          type="button"
          aria-label="Notifications"
          className="relative rounded-xl p-2.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10"
        >
          <Bell className="h-5 w-5" />
          <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-[#16141f]" />
        </button>
        <ProfileMenu />
      </div>
    </header>
  );
}
