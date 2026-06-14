"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  getFeaturesPath,
  getMarketingHomePath,
  getMarketingSectionHref,
  getPackagesPath,
} from "@/lib/marketing-nav";
import { marketingContainerClass } from "@/lib/marketing-layout";

const FOOTER_LINKS = [
  { label: "Features", section: "features" },
  { label: "Package", page: true },
  { label: "How it works", section: "how-it-works" },
  { label: "Integrations", section: "integrations" },
];

export function MarketingSiteFooter() {
  const pathname = usePathname();
  const features = getFeaturesPath(pathname);
  const packages = getPackagesPath(pathname);
  const home = getMarketingHomePath(pathname);

  return (
    <footer className="mkt-border-b relative z-10 border-t pb-[max(1.5rem,env(safe-area-inset-bottom))] pt-8">
      <div className={marketingContainerClass}>
        <nav
          className="mb-6 flex flex-wrap items-center justify-center gap-x-5 gap-y-3"
          aria-label="Footer navigation"
        >
          {FOOTER_LINKS.map((link) =>
            link.label === "Features" ? (
              <Link
                key={link.label}
                href={features}
                className="mkt-nav-link min-h-11 rounded-xl px-3 py-2 text-sm font-semibold"
              >
                {link.label}
              </Link>
            ) : link.page ? (
              <Link
                key={link.label}
                href={packages}
                className="mkt-nav-link min-h-11 rounded-xl px-3 py-2 text-sm font-semibold"
              >
                {link.label}
              </Link>
            ) : (
              <a
                key={link.label}
                href={getMarketingSectionHref(link.section!, pathname)}
                className="mkt-nav-link min-h-11 rounded-xl px-3 py-2 text-sm font-semibold"
              >
                {link.label}
              </a>
            )
          )}
        </nav>
        <p className="mkt-text-subtle text-center text-sm">
          © {new Date().getFullYear()} YourAI Seller — Ecommerce OS for Bangladesh
        </p>
        <p className="mkt-text-faint mt-2 text-center text-xs">
          <Link href={home} className="mkt-nav-link rounded-lg px-1 py-0.5">
            Home
          </Link>
          {" · "}
          <Link href={packages} className="mkt-nav-link rounded-lg px-1 py-0.5">
            Packages
          </Link>
        </p>
      </div>
    </footer>
  );
}
