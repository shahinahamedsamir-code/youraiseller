"use client";

import Link from "next/link";
import clsx from "clsx";
import { Package } from "lucide-react";
import { usePathname } from "next/navigation";
import { MarketingThemeToggle } from "@/components/marketing/MarketingThemeToggle";
import {
  getMarketingSectionHref,
  getPackagesPath,
} from "@/lib/marketing-nav";

const NAV_ITEMS = [
  { id: "features", label: "Features", type: "section" as const },
  { id: "package", label: "Package", type: "page" as const },
  { id: "how-it-works", label: "Steps", type: "section" as const, desktopLabel: "How it works" },
  { id: "integrations", label: "Apps", type: "section" as const, desktopLabel: "Integrations" },
];

function linkClass(isActive: boolean, isPackage = false, mobile = false) {
  return clsx(
    "flex items-center justify-center rounded-xl font-semibold transition",
    mobile ? "min-h-11 flex-col px-1 py-2.5 text-xs" : "px-3 py-2 text-sm",
    isPackage
      ? clsx("mkt-nav-link--package", isActive && "mkt-nav-link--package-active")
      : clsx("mkt-nav-link", isActive && "mkt-nav-link--active")
  );
}

export function MarketingSiteHeaderNav({ active }: { active?: "package" }) {
  const pathname = usePathname();
  const packages = getPackagesPath(pathname);
  const onPackagePage = active === "package" || pathname?.includes("/packages");

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <nav
        className="hidden items-center gap-4 text-sm font-semibold md:flex lg:gap-6"
        aria-label="Main navigation"
      >
        {NAV_ITEMS.map((item) => {
          if (item.type === "page") {
            return (
              <Link key={item.id} href={packages} className={linkClass(onPackagePage, true)}>
                <Package className="mr-1.5 inline h-4 w-4" />
                Package
              </Link>
            );
          }
          return (
            <a
              key={item.id}
              href={getMarketingSectionHref(item.id, pathname)}
              className={linkClass(false)}
            >
              {item.desktopLabel ?? item.label}
            </a>
          );
        })}
      </nav>
      <MarketingThemeToggle className="shrink-0" />
    </div>
  );
}

export function MarketingSiteHeaderMobileNav({ active }: { active?: "package" }) {
  const pathname = usePathname();
  const packages = getPackagesPath(pathname);
  const onPackagePage = active === "package" || pathname?.includes("/packages");

  return (
    <nav
      className="mkt-border-b grid grid-cols-4 gap-1.5 border-t pb-3 pt-2 md:hidden"
      aria-label="Mobile navigation"
    >
      {NAV_ITEMS.map((item) => {
        if (item.type === "page") {
          return (
            <Link
              key={item.id}
              href={packages}
              className={linkClass(onPackagePage, true, true)}
            >
              <Package className="mb-0.5 inline h-3.5 w-3.5" />
              <span className="block">{item.label}</span>
            </Link>
          );
        }
        return (
          <a
            key={item.id}
            href={getMarketingSectionHref(item.id, pathname)}
            className={linkClass(false, false, true)}
          >
            {item.label}
          </a>
        );
      })}
    </nav>
  );
}
