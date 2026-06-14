import Link from "next/link";
import clsx from "clsx";
import { ArrowRight, Sparkles } from "lucide-react";
import { MarketingSiteShell } from "@/components/marketing/MarketingSiteShell";
import { marketingSectionClass } from "@/lib/marketing-layout";
import { MARKETING_FEATURE_GROUPS } from "@/lib/marketing-site-content";
import { marketingFeaturePath } from "@/lib/marketing-feature-pages";

export function MarketingFeaturesPage({ homeHref = "/" }: { homeHref?: string }) {
  return (
    <MarketingSiteShell active="features" homeHref={homeHref}>
      <main className="relative z-10">
        <section className="mkt-border-b border-b py-12 sm:py-16 lg:py-24">
          <div className={clsx(marketingSectionClass, "max-w-5xl")}>
            <p className="mkt-badge-cyan inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] sm:px-4 sm:text-xs sm:tracking-[0.18em]">
              <Sparkles className="h-3.5 w-3.5" />
              Feature pages
            </p>
            <h1 className="mkt-text mt-5 max-w-3xl text-[1.9rem] font-extrabold leading-[1.08] tracking-tight sm:text-4xl lg:text-6xl">
              Dedicated pages for every module
            </h1>
            <p className="mkt-text-muted mt-4 max-w-2xl text-[15px] leading-relaxed sm:mt-6 sm:text-base lg:text-lg">
              Each feature page shows what the module does, who uses it, and how it fits into the
              seller workflow. Use them as a sales walkthrough or product guide.
            </p>

            <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {MARKETING_FEATURE_GROUPS.map((group) => {
                const Icon = group.icon;
                return (
                  <Link
                    key={group.id}
                    href={marketingFeaturePath(group.id)}
                    className="mkt-card group rounded-2xl p-5 transition hover:-translate-y-0.5 hover:shadow-xl"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-500 ring-1 ring-violet-500/20">
                        <Icon className="h-5 w-5" />
                      </div>
                      <ArrowRight className="h-4 w-4 text-slate-400 transition group-hover:translate-x-0.5 group-hover:text-violet-500" />
                    </div>
                    <p className="mkt-text mt-5 text-base font-bold">{group.label}</p>
                    <p className="mkt-text-muted mt-2 text-sm leading-relaxed">{group.headline}</p>
                    <p className="mkt-text-soft mt-4 text-xs leading-relaxed">{group.blurb}</p>
                  </Link>
                );
              })}
            </div>

            <div className="mt-10 flex flex-wrap gap-3">
              <Link
                href={homeHref}
                className="mkt-btn-ghost inline-flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-semibold"
              >
                Home-এ যান
              </Link>
              <Link
                href="/packages"
                className="inline-flex items-center gap-2 rounded-full bg-violet-600 px-4 py-2.5 text-sm font-bold text-white shadow-lg shadow-violet-500/20"
              >
                View packages
              </Link>
            </div>
          </div>
        </section>
      </main>
    </MarketingSiteShell>
  );
}
