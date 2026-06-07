"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { ChevronDown } from "lucide-react";
import { mainNav } from "@/lib/navigation";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { useFeatures } from "@/context/FeatureContext";
import { useWebOrderCounts } from "@/components/web-orders/useWebOrderCounts";
import clsx from "clsx";

type SidebarProps = { mobileOpen?: boolean };

export function Sidebar({ mobileOpen = false }: SidebarProps) {
  const pathname = usePathname();
  const { isEnabled, hydrated } = useFeatures();
  const { processing: webProcessingCount } = useWebOrderCounts();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  const filteredNav = useMemo(() => {
    if (!hydrated) return [];
    return mainNav
      .filter((item) => isEnabled(item.featureKey))
      .map((item) => {
        if (!item.children) return item;
        const children = item.children.filter((c) => isEnabled(c.featureKey));
        if (children.length === 0) return null;
        return { ...item, children };
      })
      .filter(Boolean) as typeof mainNav;
  }, [isEnabled, hydrated]);

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
      <div className="border-b border-slate-100 px-5 py-5">
        <Link
          href="/dashboard"
          className="inline-flex rounded-xl transition hover:opacity-90 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-500"
          aria-label="Go to dashboard"
        >
          <BrandLogo size="md" priority />
        </Link>
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
                  {item.label === "Web Orders" && webProcessingCount > 0 ? (
                    <span className="rounded-md bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {webProcessingCount}
                    </span>
                  ) : item.badge ? (
                    <span className="rounded-md bg-rose-500 px-1.5 py-0.5 text-[10px] font-bold text-white">
                      {item.badge}
                    </span>
                  ) : null}
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
    </aside>
  );
}
