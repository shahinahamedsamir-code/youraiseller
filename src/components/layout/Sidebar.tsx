"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown, Sparkles } from "lucide-react";
import { mainNav } from "@/lib/navigation";
import { useFeatures } from "@/context/FeatureContext";
import clsx from "clsx";

type SidebarProps = { mobileOpen?: boolean };

export function Sidebar({ mobileOpen = false }: SidebarProps) {
  const pathname = usePathname();
  const { isEnabled } = useFeatures();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const filteredNav = useMemo(() => {
    return mainNav
      .filter((item) => isEnabled(item.featureKey))
      .map((item) => {
        if (!item.children) return item;
        const children = item.children.filter((c) => isEnabled(c.featureKey));
        if (children.length === 0) return null;
        return { ...item, children };
      })
      .filter(Boolean) as typeof mainNav;
  }, [isEnabled]);

  useEffect(() => {
    filteredNav.forEach((item) => {
      if (item.expandPath && pathname.startsWith(item.expandPath)) {
        setOpenGroups((g) => ({ ...g, [item.label]: true }));
      }
    });
  }, [pathname, filteredNav]);

  return (
    <aside
      className={clsx(
        "sidebar-light fixed left-0 top-0 z-40 flex h-screen w-[260px] flex-col transition-transform duration-300",
        mobileOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
      )}
    >
      <div className="flex items-center gap-3 border-b border-slate-100 px-5 py-5">
        <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-indigo-600 to-rose-500 shadow-lg shadow-indigo-300/40">
          <Sparkles className="h-5 w-5 text-white" />
        </div>
        <div>
          <p className="text-lg font-extrabold tracking-tight text-slate-900">
            Your<span className="text-indigo-600">AI</span>
          </p>
          <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-slate-400">
            Seller OS
          </p>
        </div>
      </div>

      <nav className="flex-1 space-y-0.5 overflow-y-auto px-3 py-4">
        {filteredNav.map((item) => {
          const Icon = item.icon;

          if (item.children && item.expandPath) {
            const groupActive = pathname.startsWith(item.expandPath);
            const isOpen = openGroups[item.label] ?? groupActive;

            return (
              <div key={item.label} className="space-y-0.5">
                <button
                  type="button"
                  onClick={() =>
                    setOpenGroups((g) => ({ ...g, [item.label]: !isOpen }))
                  }
                  className={clsx(
                    "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                    groupActive
                      ? "bg-indigo-50 text-indigo-700"
                      : "text-slate-600 hover:bg-slate-50"
                  )}
                >
                  <Icon className="h-[18px] w-[18px] shrink-0" />
                  <span className="flex-1 truncate text-left">{item.label}</span>
                  {item.badge && (
                    <span className="rounded-md bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {item.badge}
                    </span>
                  )}
                  <ChevronDown
                    className={clsx(
                      "h-4 w-4 transition",
                      isOpen && "rotate-180"
                    )}
                  />
                </button>

                {isOpen && (
                  <div className="ml-4 space-y-0.5 border-l-2 border-indigo-100 pl-2">
                    {item.children.map((child) => {
                      const active = pathname === child.href;
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          className={clsx(
                            "block rounded-lg px-3 py-2 text-[13px] font-medium transition",
                            active
                              ? "bg-indigo-600 text-white shadow-sm"
                              : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
                          )}
                        >
                          {child.label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          }

          if (!item.href) return null;

          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                active
                  ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-200"
                  : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              <span className="truncate">{item.label}</span>
            </Link>
          );
        })}
      </nav>

      <div className="border-t border-slate-100 p-4">
        <div className="rounded-2xl bg-gradient-to-br from-indigo-600 to-violet-700 p-4 text-white">
          <p className="text-xs font-bold uppercase tracking-wider text-indigo-200">
            Pro Plan
          </p>
          <p className="mt-1 text-sm font-semibold">Smart inventory + orders</p>
          <p className="mt-2 text-[10px] text-indigo-200">Renews 17 Jun 2026</p>
        </div>
      </div>
    </aside>
  );
}
