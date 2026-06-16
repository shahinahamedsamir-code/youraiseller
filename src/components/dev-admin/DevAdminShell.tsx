"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import {
  ToggleLeft,
  Users,
  Package,
  LogOut,
  ClipboardList,
  Menu,
  MessageSquare,
  Phone,
  Layers,
  Receipt,
  BarChart3,
  Tag,
  X,
} from "lucide-react";
import { BrandLogo } from "@/components/brand/BrandLogo";
import { clearDevAuthenticated } from "@/lib/dev-auth";
import { getPendingUsers, syncDevUsersFromServer } from "@/lib/dev-users";
import clsx from "clsx";

const devNav = [
  { label: "Feature Control", href: "/dev-admin", icon: ToggleLeft, exact: true },
  { label: "Request", href: "/dev-admin/requests", icon: ClipboardList },
  { label: "Software Users", href: "/dev-admin/users", icon: Users },
  { label: "Plan Packages", href: "/dev-admin/plans", icon: Layers },
  { label: "Coupons", href: "/dev-admin/coupons", icon: Tag },
  { label: "SMS Control", href: "/dev-admin/sms", icon: MessageSquare },
  { label: "Auto Call Control", href: "/dev-admin/auto-call", icon: Phone },
  { label: "Payment History", href: "/dev-admin/payments", icon: Receipt },
  { label: "Business Report", href: "/dev-admin/business-report", icon: BarChart3 },
];

function isNavActive(pathname: string, href: string, exact?: boolean) {
  if (exact) return pathname === href;
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function DevAdminShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [pendingCount, setPendingCount] = useState(0);
  const [sidebarOpen, setSidebarOpen] = useState(false);

  useEffect(() => {
    const sync = () => setPendingCount(getPendingUsers().length);
    const load = async () => {
      await syncDevUsersFromServer(true);
      sync();
    };
    load();
    window.addEventListener("youraiseller-users-updated", sync);
    return () => {
      window.removeEventListener("youraiseller-users-updated", sync);
    };
  }, [pathname]);

  const handleLogout = () => {
    clearDevAuthenticated();
    window.location.href = "/dev-admin/login";
  };

  return (
    <div className="min-h-screen overflow-x-hidden bg-slate-950 text-slate-200">
      {sidebarOpen ? (
        <button
          type="button"
          aria-label="Close menu"
          className="fixed inset-0 z-40 bg-black/60 lg:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      ) : null}

      <aside
        className={clsx(
          "fixed left-0 top-0 z-50 flex h-screen w-60 flex-col border-r border-orange-500/20 bg-slate-900 transition-transform duration-200 lg:z-40 lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full lg:translate-x-0"
        )}
      >
        <div className="border-b border-orange-500/20 px-5 py-5">
          <BrandLogo
            size="sm"
            subtitle="Dev Admin"
            textClassName="[&_p:first-child]:text-white [&_p:last-child]:text-orange-400/90"
          />
        </div>

        <nav className="flex-1 space-y-1 p-3">
          {devNav.map((item) => {
            const active = isNavActive(pathname, item.href, item.exact);
            const badge =
              item.href === "/dev-admin/requests" && pendingCount > 0
                ? pendingCount
                : null;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={clsx(
                  "flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition",
                  active
                    ? "bg-orange-500/20 text-orange-300"
                    : "text-slate-400 hover:bg-white/5 hover:text-white"
                )}
              >
                <item.icon className="h-[18px] w-[18px]" />
                <span className="flex-1">{item.label}</span>
                {badge != null ? (
                  <span className="rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-slate-900">
                    {badge}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </nav>

        <div className="border-t border-orange-500/20 p-4 space-y-2">
          <Link
            href="/dashboard"
            target="_blank"
            rel="noopener noreferrer"
            className="block rounded-lg px-3 py-2 text-xs text-slate-500 hover:bg-white/5 hover:text-teal-400"
          >
            Preview customer dashboard ↗
          </Link>
          <button
            type="button"
            onClick={handleLogout}
            className="flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs font-semibold text-rose-400 hover:bg-rose-500/10"
          >
            <LogOut className="h-3.5 w-3.5" />
            Logout
          </button>
        </div>
      </aside>

      <div className="min-w-0 overflow-x-hidden lg:pl-60">
        <header className="sticky top-0 z-30 flex h-14 items-center gap-3 border-b border-orange-500/10 bg-slate-900/95 px-4 backdrop-blur sm:px-6">
          <button
            type="button"
            onClick={() => setSidebarOpen((o) => !o)}
            className="rounded-lg p-2 text-slate-400 hover:bg-white/5 hover:text-white lg:hidden"
            aria-label="Open menu"
          >
            {sidebarOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
          <div className="flex min-w-0 flex-1 items-center gap-2 text-sm text-orange-400/90">
            <Package className="h-4 w-4 shrink-0" />
            <span className="truncate">
              Software control panel — sell &amp; configure features per client
            </span>
          </div>
          <span className="shrink-0 rounded-full bg-orange-500/20 px-3 py-1 text-xs font-bold text-orange-300">
            DEV MODE
          </span>
        </header>
        <main className="min-w-0 max-w-full overflow-x-hidden p-4 sm:p-6">{children}</main>
      </div>
    </div>
  );
}
