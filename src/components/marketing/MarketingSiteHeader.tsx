import Link from "next/link";
import { BrandMark } from "@/components/brand/BrandLogo";
import {
  MarketingSiteHeaderMobileNav,
  MarketingSiteHeaderNav,
} from "@/components/marketing/MarketingSiteHeaderNav";
import { marketingContainerClass } from "@/lib/marketing-layout";

export function MarketingSiteHeader({
  active,
  homeHref = "/",
}: {
  active?: "package";
  homeHref?: string;
}) {
  return (
    <header className="marketing-site-header mkt-header sticky top-0 z-30 backdrop-blur-xl">
      <div className={marketingContainerClass}>
        <div className="flex items-center justify-between gap-2 py-3 sm:py-4">
          <Link href={homeHref} className="flex min-h-11 min-w-0 items-center gap-2.5 sm:gap-3">
            <BrandMark size="sm" priority className="shadow-lg shadow-violet-500/20" />
            <div className="min-w-0">
              <p className="mkt-text truncate text-sm font-extrabold tracking-tight sm:text-base">
                Your<span className="text-cyan-500">AI</span> Seller
              </p>
              <p className="mkt-text-subtle text-[10px] font-bold uppercase tracking-[0.14em]">
                Ecommerce OS
              </p>
            </div>
          </Link>
          <MarketingSiteHeaderNav active={active} />
        </div>
        <MarketingSiteHeaderMobileNav active={active} />
      </div>
    </header>
  );
}
