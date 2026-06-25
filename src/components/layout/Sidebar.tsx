"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import {
  useEffect,
  useMemo,
  useState,
  type Dispatch,
  type SetStateAction,
} from "react";
import { ChevronDown, Lock } from "lucide-react";
import { mainNav, type NavChild } from "@/lib/navigation";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { getSessionUser } from "@/lib/dev-users";
import { useFeatures } from "@/context/FeatureContext";
import { useWebOrderCounts } from "@/components/web-orders/useWebOrderCounts";
import clsx from "clsx";

type SidebarProps = { mobileOpen?: boolean };

function navHrefActive(
  pathname: string,
  href: string,
  searchParams: URLSearchParams,
  matchQueryTabs?: string[]
): boolean {
  const [path, query] = href.split("?");
  if (pathname !== path) return false;

  if (matchQueryTabs?.length) {
    const currentTab = searchParams.get("tab");
    if (currentTab && matchQueryTabs.includes(currentTab)) return true;
  }

  if (!query) return true;
  const expected = new URLSearchParams(query);
  for (const [key, value] of expected.entries()) {
    if (searchParams.get(key) !== value) return false;
  }
  return true;
}

export function Sidebar({ mobileOpen = false }: SidebarProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const { isGloballyEnabled, isLocked, hydrated } = useFeatures();
  const { processing: webProcessingCount } = useWebOrderCounts();
  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({});

  // Team members (sub-accounts) get locked modules HIDDEN instead of shown with
  // a lock — a lock implies "upgrade", which only makes sense for the owner who
  // controls billing. For them a missing module is just a permission they lack.
  const [isTeamMember, setIsTeamMember] = useState(false);
  useEffect(() => {
    setIsTeamMember(!!getSessionUser()?.parentAccountId);
  }, []);

  // Show everything the admin allows globally — including plan-locked modules,
  // which render with a lock icon so the owner knows to upgrade. For team
  // members, also drop modules they have no permission for.
  const filteredNav = useMemo(() => {
    if (!hydrated) return [];

    const canShow = (key: NavChild["featureKey"]) =>
      isGloballyEnabled(key) && (!isTeamMember || !isLocked(key));

    const filterNavChildren = (children: NavChild[]): NavChild[] =>
      children
        .filter((c) => canShow(c.featureKey))
        .map((c) => {
          if (!c.children?.length) return c;
          const nested = filterNavChildren(c.children);
          if (nested.length === 0) return null;
          return { ...c, children: nested };
        })
        .filter(Boolean) as NavChild[];

    return mainNav
      .filter((item) => canShow(item.featureKey))
      .map((item) => {
        if (!item.children) return item;
        const children = filterNavChildren(item.children);
        if (children.length === 0) return null;
        return { ...item, children };
      })
      .filter(Boolean) as typeof mainNav;
  }, [isGloballyEnabled, isLocked, isTeamMember, hydrated]);

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
                  {isLocked(item.featureKey) ? (
                    <Lock className="h-3.5 w-3.5 shrink-0 text-amber-500" />
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
                    {item.children.map((child) => (
                      <SidebarNavChild
                        key={child.label}
                        child={child}
                        pathname={pathname}
                        searchParams={searchParams}
                        openGroups={openGroups}
                        setOpenGroups={setOpenGroups}
                        isLocked={isLocked}
                      />
                    ))}
                  </div>
                )}
              </div>
            );
          }

          if (!item.href) return null;

          const active =
            pathname === item.href ||
            (item.href !== "/dashboard" && pathname.startsWith(item.href));

          const locked = isLocked(item.featureKey);

          return (
            <Link
              key={item.href}
              href={item.href}
              className={clsx(
                "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
                active
                  ? "bg-gradient-to-r from-indigo-600 to-indigo-500 text-white shadow-md shadow-indigo-200"
                  : locked
                    ? "text-slate-400 hover:bg-slate-50"
                    : "text-slate-600 hover:bg-slate-50"
              )}
            >
              <Icon className="h-[18px] w-[18px] shrink-0" />
              <span className="flex-1 truncate">{item.label}</span>
              {locked ? <Lock className="h-3.5 w-3.5 shrink-0 text-amber-500" /> : null}
            </Link>
          );
        })}
      </nav>
    </aside>
  );
}

function SidebarNavChild({
  child,
  pathname,
  searchParams,
  openGroups,
  setOpenGroups,
  isLocked,
}: {
  child: NavChild;
  pathname: string;
  searchParams: URLSearchParams;
  openGroups: Record<string, boolean>;
  setOpenGroups: Dispatch<SetStateAction<Record<string, boolean>>>;
  isLocked: (key: NavChild["featureKey"]) => boolean;
}) {
  if (child.children?.length) {
    const groupActive = child.expandPath
      ? pathname.startsWith(child.expandPath)
      : false;
    const isOpen = openGroups[child.label] ?? groupActive;

    return (
      <div className="space-y-0.5">
        <button
          type="button"
          onClick={() =>
            setOpenGroups((g) => ({ ...g, [child.label]: !isOpen }))
          }
          className={clsx(
            "flex w-full items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-semibold transition",
            groupActive
              ? "bg-indigo-50 text-indigo-700"
              : "text-slate-600 hover:bg-slate-100"
          )}
        >
          <span className="flex-1 truncate text-left">{child.label}</span>
          <ChevronDown
            className={clsx("h-3.5 w-3.5 shrink-0 transition", isOpen && "rotate-180")}
          />
        </button>
        {isOpen && (
          <div className="ml-3 space-y-0.5 border-l border-indigo-100 pl-2">
            {child.children.map((nested) => (
              <SidebarNavChild
                key={nested.href ?? nested.label}
                child={nested}
                pathname={pathname}
                searchParams={searchParams}
                openGroups={openGroups}
                setOpenGroups={setOpenGroups}
                isLocked={isLocked}
              />
            ))}
          </div>
        )}
      </div>
    );
  }

  if (!child.href) return null;

  const active = navHrefActive(pathname, child.href, searchParams, child.matchQueryTabs);
  const locked = isLocked(child.featureKey);

  return (
    <Link
      href={child.href}
      className={clsx(
        "flex items-center gap-2 rounded-lg px-3 py-2 text-[13px] font-medium transition",
        active
          ? "bg-indigo-600 text-white shadow-sm"
          : locked
            ? "text-slate-400 hover:bg-slate-100"
            : "text-slate-500 hover:bg-slate-100 hover:text-slate-800"
      )}
    >
      <span className="flex-1 truncate">{child.label}</span>
      {locked ? <Lock className="h-3 w-3 shrink-0 text-amber-500" /> : null}
    </Link>
  );
}
