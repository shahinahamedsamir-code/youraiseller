"use client";

import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { Bell, Menu, Moon, Search, Sun } from "lucide-react";
import { quickLinks } from "@/lib/navigation";
import { BrandMark } from "@/components/brand/BrandLogo";
import { useFeatures } from "@/context/FeatureContext";
import { HeaderQuickSms } from "./HeaderQuickSms";
import { ProfileMenu } from "./ProfileMenu";
import { useTheme } from "@/context/ThemeContext";

type TopBarProps = {
  onMenuClick?: () => void;
};

export function TopBar({ onMenuClick }: TopBarProps) {
  const router = useRouter();
  const { isEnabled } = useFeatures();
  const { isDark, toggleTheme } = useTheme();
  const [query, setQuery] = useState("");
  const [hasUnseenUpdate, setHasUnseenUpdate] = useState(false);
  const searchRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    fetch("/api/changelog")
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((d: { entries?: { version?: string }[] }) => {
        const latest = d.entries?.[0]?.version ?? "";
        if (latest && localStorage.getItem("whatsnew-seen-version") !== latest) {
          setHasUnseenUpdate(true);
        }
      })
      .catch(() => {});
  }, []);

  const links = useMemo(
    () =>
      quickLinks
        .filter((l) => l.featureKey !== "search" && isEnabled(l.featureKey))
        .slice(0, 3),
    [isEnabled]
  );

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const isShortcut = (e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k";
      if (!isShortcut) return;
      const target = e.target as HTMLElement | null;
      if (target && ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)) return;
      e.preventDefault();
      searchRef.current?.focus();
      searchRef.current?.select();
    };

    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, []);

  const handleSearch = () => {
    const q = query.trim();
    if (!q) return;
    router.push(`/dashboard/search?q=${encodeURIComponent(q)}`);
  };

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
        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSearch();
          }}
          className="flex max-w-md flex-1 items-center gap-2 rounded-2xl border border-slate-200 bg-slate-50/80 px-4 py-2.5 dark:border-white/10 dark:bg-white/5"
        >
          <button
            type="submit"
            className="shrink-0 text-indigo-400 transition hover:text-indigo-500"
            aria-label="Run search"
          >
            <Search className="h-4 w-4" />
          </button>
          <input
            ref={searchRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSearch();
              }
            }}
            placeholder="Search orders, products, customers..."
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-slate-400 dark:text-slate-200 dark:placeholder:text-slate-500"
          />
          <kbd className="hidden rounded-lg bg-white px-2 py-0.5 text-[10px] font-bold text-slate-400 ring-1 ring-slate-200 sm:inline">
            Ctrl+K
          </kbd>
        </form>
      </div>

      <div className="hidden items-center gap-1 lg:flex">
        {links.map((link) => {
          const Icon = link.icon;
          return (
            <Link
              key={link.href}
              href={link.href}
              className="inline-flex items-center gap-1.5 rounded-xl px-3 py-2 text-xs font-bold uppercase tracking-wide text-slate-500 transition hover:bg-indigo-50 hover:text-indigo-700"
            >
              {Icon ? <Icon className="h-3.5 w-3.5" /> : null}
              {link.label}
            </Link>
          );
        })}
      </div>

      <div className="ml-auto flex items-center gap-2">
        <HeaderQuickSms />

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
          aria-label="What's New"
          onClick={() => router.push("/dashboard/whats-new")}
          className="relative rounded-xl p-2.5 text-slate-500 hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-white/10"
        >
          <Bell className="h-5 w-5" />
          {hasUnseenUpdate && (
            <span className="absolute right-1.5 top-1.5 h-2 w-2 rounded-full bg-rose-500 ring-2 ring-white dark:ring-[#16141f]" />
          )}
        </button>
        <ProfileMenu />
      </div>
    </header>
  );
}
