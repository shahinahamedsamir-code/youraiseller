"use client";

import Link from "next/link";
import clsx from "clsx";
import { Menu, Package } from "lucide-react";
import { usePathname } from "next/navigation";
import { BrandMark } from "@/components/brand/BrandLogo";
import { MarketingAppCta } from "@/components/marketing/MarketingAppCta";
import {
  getMarketingHomePath,
  getMarketingSectionHref,
  getPackagesPath,
} from "@/lib/marketing-nav";

export function MarketingSiteHeader({ active }: { active?: "package" }) {
  const pathname = usePathname();
  const home = getMarketingHomePath(pathname);
  const packages = getPackagesPath(pathname);
  const onPackagePage = active === "package" || pathname?.includes("/packages");

  const navLink =
    "transition hover:text-white";
  const packageBtn = clsx(
    "inline-flex items-center gap-1.5 rounded-full border px-4 py-1.5 text-sm font-bold transition",
    onPackagePage
      ? "border-violet-400/50 bg-violet-500/20 text-violet-200"
      : "border-fuchsia-500/30 bg-fuchsia-500/10 text-fuchsia-200 hover:border-fuchsia-400/50 hover:bg-fuchsia-500/20 hover:text-white"
  );

  return (
    <header className="relative z-20 border-b border-white/5 bg-[#070b14]/80 backdrop-blur-xl">
      <div className="mx-auto flex max-w-6xl items-center justify-between gap-4 px-5 py-4 lg:px-8">
        <Link href={home} className="flex items-center gap-3">
          <BrandMark size="sm" priority className="shadow-lg shadow-violet-500/20" />
          <div className="hidden sm:block">
            <p className="text-sm font-extrabold tracking-tight">
              Your<span className="text-cyan-400">AI</span> Seller
            </p>
            <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-slate-500">
              Ecommerce OS
            </p>
          </div>
        </Link>

        <nav className="hidden items-center gap-5 text-sm font-semibold text-slate-400 md:flex">
          <a href={getMarketingSectionHref("features", pathname)} className={navLink}>
            Features
          </a>
          <Link href={packages} className={packageBtn}>
            <Package className="h-3.5 w-3.5" />
            Package
          </Link>
          <a href={getMarketingSectionHref("how-it-works", pathname)} className={navLink}>
            How it works
          </a>
          <a href={getMarketingSectionHref("integrations", pathname)} className={navLink}>
            Integrations
          </a>
        </nav>

        <div className="flex items-center gap-2">
          <MarketingAppCta className="hidden sm:inline-flex">Open app</MarketingAppCta>
          <details className="relative md:hidden">
            <summary className="flex cursor-pointer list-none items-center justify-center rounded-xl border border-white/10 bg-white/5 p-2.5 text-slate-300">
              <Menu className="h-5 w-5" />
            </summary>
            <div className="absolute right-0 top-full z-30 mt-2 w-52 rounded-2xl border border-white/10 bg-slate-900 p-2 shadow-xl">
              <a
                href={getMarketingSectionHref("features", pathname)}
                className="block rounded-xl px-3 py-2 text-sm text-slate-300 hover:bg-white/5"
              >
                Features
              </a>
              <Link
                href={packages}
                className="flex items-center gap-2 rounded-xl px-3 py-2 text-sm font-bold text-fuchsia-300 hover:bg-fuchsia-500/10"
              >
                <Package className="h-4 w-4" />
                Package
              </Link>
              <a
                href={getMarketingSectionHref("how-it-works", pathname)}
                className="block rounded-xl px-3 py-2 text-sm text-slate-300 hover:bg-white/5"
              >
                How it works
              </a>
              <a
                href={getMarketingSectionHref("integrations", pathname)}
                className="block rounded-xl px-3 py-2 text-sm text-slate-300 hover:bg-white/5"
              >
                Integrations
              </a>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}
