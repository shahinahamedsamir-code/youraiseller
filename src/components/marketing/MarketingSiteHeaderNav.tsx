"use client";

import Link from "next/link";
import clsx from "clsx";
import { Package } from "lucide-react";
import { usePathname } from "next/navigation";
import { MarketingThemeToggle } from "@/components/marketing/MarketingThemeToggle";
import {
  getFeaturesPath,
  getMarketingSectionHref,
  getPackagesPath,
} from "@/lib/marketing-nav";

const SECTION_ITEMS = [
  { id: "how-it-works", label: "How it works" },
  { id: "integrations", label: "Integrations" },
] as const;

function linkClass(isActive: boolean, isPackage = false, mobile = false) {
  return clsx(
    "flex items-center justify-center rounded-xl font-semibold transition",
    mobile ? "min-h-11 flex-col px-1 py-2.5 text-xs" : "px-3 py-2 text-sm",
    isPackage
      ? clsx("mkt-nav-link--package", isActive && "mkt-nav-link--package-active")
      : clsx("mkt-nav-link", isActive && "mkt-nav-link--active")
  );
}

export function MarketingSiteHeaderNav({ active }: { active?: "package" | "features" }) {
  const pathname = usePathname();
  const features = getFeaturesPath(pathname);
  const packages = getPackagesPath(pathname);
  const onPackagePage = active === "package" || pathname?.includes("/packages");
  const onFeaturesPage = active === "features" || pathname?.includes("/features");

  return (
    <div className="flex items-center gap-2 sm:gap-3">
      <nav
        className="hidden items-center gap-4 text-sm font-semibold md:flex lg:gap-6"
        aria-label="Main navigation"
      >
        <Link href={features} className={linkClass(onFeaturesPage)}>
          Features
        </Link>
        <Link href={packages} className={linkClass(onPackagePage, true)}>
          <Package className="mr-1.5 inline h-4 w-4" />
          Package
        </Link>
        {SECTION_ITEMS.map((item) => (
          <a
            key={item.id}
            href={getMarketingSectionHref(item.id, pathname)}
            className={linkClass(false)}
          >
            {item.label}
          </a>
        ))}
      </nav>
      <MarketingThemeToggle className="shrink-0" />
    </div>
  );
}

export function MarketingSiteHeaderMobileNav({ active }: { active?: "package" | "features" }) {
  const pathname = usePathname();
  const features = getFeaturesPath(pathname);
  const packages = getPackagesPath(pathname);
  const onPackagePage = active === "package" || pathname?.includes("/packages");
  const onFeaturesPage = active === "features" || pathname?.includes("/features");

  return (
    <nav
      className="mkt-border-b grid grid-cols-4 gap-1.5 border-t pb-3 pt-2 md:hidden"
      aria-label="Mobile navigation"
    >
      <Link href={features} className={linkClass(onFeaturesPage, false, true)}>
        <span className="block">Features</span>
      </Link>
      <Link href={packages} className={linkClass(onPackagePage, true, true)}>
        <Package className="mb-0.5 inline h-3.5 w-3.5" />
        <span className="block">Package</span>
      </Link>
      {SECTION_ITEMS.map((item) => (
        <a
          key={item.id}
          href={getMarketingSectionHref(item.id, pathname)}
          className={linkClass(false, false, true)}
        >
          {item.label}
        </a>
      ))}
    </nav>
  );
}
