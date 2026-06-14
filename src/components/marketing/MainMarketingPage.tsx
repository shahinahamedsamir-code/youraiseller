import clsx from "clsx";
import { ChevronDown } from "lucide-react";
import { LiveSellerPanelPreview } from "@/components/marketing/LiveSellerPanelPreview";
import {
  marketingAnchorClass,
  marketingSectionClass,
} from "@/lib/marketing-layout";
import { MarketingSiteShell } from "@/components/marketing/MarketingSiteShell";
import { getAppBaseUrl } from "@/lib/app-hosts";
import { getFeaturesPath } from "@/lib/marketing-nav";
import {
  MARKETING_FEATURE_GROUPS,
  MARKETING_HERO_STATS,
  MARKETING_STEPS,
} from "@/lib/marketing-site-content";

export function MainMarketingPage({ homeHref = "/" }: { homeHref?: string }) {
  const appHost = getAppBaseUrl().replace(/^https?:\/\//, "");
  const featuresHref = getFeaturesPath(homeHref);

  return (
    <MarketingSiteShell homeHref={homeHref}>
      <main className="relative z-10">
        <section className={clsx(marketingSectionClass, "pb-14 pt-8 sm:pb-20 sm:pt-12 lg:pb-28 lg:pt-20")}>
          <div className="grid items-center gap-8 lg:grid-cols-[1.1fr_0.9fr] lg:gap-12">
            <div className="order-2 lg:order-1">
              <p className="marketing-fade marketing-fade-1 mkt-badge-cyan mb-4 inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] sm:mb-5 sm:px-4 sm:text-xs sm:tracking-[0.18em]">
                Built for Bangladesh sellers
              </p>
              <h1 className="marketing-fade marketing-fade-2 mkt-text text-[1.75rem] font-extrabold leading-[1.12] tracking-tight min-[400px]:text-3xl sm:text-4xl sm:leading-[1.08] lg:text-6xl">
                One dashboard for{" "}
                <span className="bg-gradient-to-r from-cyan-500 via-violet-500 to-fuchsia-500 bg-clip-text text-transparent">
                  orders, stock & courier
                </span>
              </h1>
              <p className="marketing-fade marketing-fade-3 mkt-text-muted mt-4 max-w-xl text-[15px] leading-relaxed sm:mt-6 sm:text-base lg:text-lg">
                YourAI Seller brings web orders, call-center approval, inventory, SMS, auto call,
                WooCommerce sync and Steadfast booking into a clean panel so your team can ship
                faster with fewer mistakes.
              </p>
              <div className="marketing-fade marketing-fade-4 mt-6 sm:mt-8">
                <a
                  href={featuresHref}
                  className="mkt-btn-ghost inline-flex min-h-11 items-center gap-2 rounded-2xl px-5 py-2.5 text-sm font-semibold transition active:scale-[0.98]"
                >
                  Explore all features
                  <ChevronDown className="h-4 w-4" />
                </a>
              </div>
              <div className="marketing-fade marketing-fade-5 mt-8 grid grid-cols-3 gap-2 sm:mt-10 sm:max-w-lg sm:gap-3">
                {MARKETING_HERO_STATS.map((s) => (
                  <div
                    key={s.label}
                    className="mkt-card rounded-xl px-2 py-3 text-center backdrop-blur-sm sm:rounded-2xl sm:px-3 sm:py-4"
                  >
                    <p className="mkt-text text-lg font-extrabold sm:text-2xl">{s.value}</p>
                    <p className="mkt-text-subtle mt-1 text-[10px] font-medium leading-snug sm:text-xs">
                      {s.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="order-1 lg:order-2">
              <LiveSellerPanelPreview appHost={appHost} />
            </div>
          </div>
        </section>

        <section
          id="features"
          className={clsx(marketingAnchorClass, "mkt-border-b mkt-section-alt border-t py-14 sm:py-20 lg:py-28")}
        >
          <div className={marketingSectionClass}>
            <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-violet-500">
              Everything included
            </p>
            <h2 className="mkt-text mx-auto mt-3 max-w-3xl text-center text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl">
              Every tool your ecommerce team needs is already built in
            </h2>
            <p className="mkt-text-muted mx-auto mt-3 max-w-2xl text-center text-sm leading-relaxed sm:mt-4 sm:text-base">
              No spreadsheets, courier panels or plugin juggling. YourAI Seller is a complete
              operating system for Bangladesh online sellers.
            </p>

            <div className="mt-10 space-y-16 sm:mt-16 sm:space-y-24">
              {MARKETING_FEATURE_GROUPS.map((group, gi) => {
                const GroupIcon = group.icon;
                return (
                  <div
                    key={group.id}
                    id={group.id === "integrations" ? "integrations" : undefined}
                    className={group.id === "integrations" ? marketingAnchorClass : undefined}
                  >
                    <div className="mb-6 flex flex-col gap-4 sm:mb-8">
                      <div className="flex items-start gap-3 sm:gap-4">
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-500 ring-1 ring-violet-500/20 sm:h-12 sm:w-12">
                          <GroupIcon className="h-5 w-5 sm:h-6 sm:w-6" />
                        </div>
                        <div>
                          <p className="mkt-text-subtle text-xs font-bold uppercase tracking-[0.16em]">
                            {group.label}
                          </p>
                          <h3 className="mkt-text mt-1 text-xl font-extrabold tracking-tight sm:text-2xl lg:text-3xl">
                            {group.headline}
                          </h3>
                        </div>
                      </div>
                    </div>
                    <p className="mkt-text-muted mb-6 max-w-3xl text-sm leading-relaxed sm:mb-8 sm:text-base">
                      {group.blurb}
                    </p>
                    <div className="grid gap-3 sm:grid-cols-2 sm:gap-4 lg:grid-cols-3">
                      {group.features.map((feature, fi) => {
                        const Icon = feature.icon;
                        return (
                          <article
                            key={feature.title}
                            className="marketing-feature-card mkt-card group rounded-2xl p-4 transition active:scale-[0.99] sm:p-5 sm:hover:shadow-lg"
                            style={{ animationDelay: `${(gi * 3 + fi) * 40}ms` }}
                          >
                            <div
                              className={clsx(
                                "mb-3 flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg sm:mb-4 sm:h-11 sm:w-11",
                                feature.accent
                              )}
                            >
                              <Icon className="h-5 w-5" />
                            </div>
                            <h4 className="mkt-text text-base font-bold">{feature.title}</h4>
                            <p className="mkt-text-muted mt-2 text-sm leading-relaxed">
                              {feature.description}
                            </p>
                          </article>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>

        <section
          id="how-it-works"
          className={clsx(marketingAnchorClass, "py-14 sm:py-20 lg:py-28")}
        >
          <div className={marketingSectionClass}>
            <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-cyan-600">
              How it works
            </p>
            <h2 className="mkt-text mt-3 text-center text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl">
              Go live in 3 steps
            </h2>
            <div className="mt-8 grid gap-4 sm:mt-12 sm:gap-6 md:grid-cols-3">
              {MARKETING_STEPS.map((step) => (
                <div key={step.step} className="mkt-step-card relative rounded-2xl p-5 sm:p-6">
                  <p className="mkt-step-num text-3xl font-extrabold sm:text-4xl">{step.step}</p>
                  <h3 className="mkt-text mt-2 text-base font-bold sm:text-lg">{step.title}</h3>
                  <p className="mkt-text-muted mt-2 text-sm leading-relaxed sm:mt-3">
                    {step.body}
                  </p>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="mkt-border-b border-t py-14 sm:py-20 lg:py-28">
          <div className={clsx(marketingSectionClass, "max-w-3xl text-center")}>
            <div className="mkt-cta-box overflow-hidden rounded-2xl p-6 sm:rounded-[2rem] sm:p-10 lg:p-14">
              <h2 className="mkt-text text-2xl font-extrabold tracking-tight sm:text-3xl lg:text-4xl">
                Ready to run your store smarter?
              </h2>
              <p className="mkt-text-soft mx-auto mt-3 max-w-lg text-sm leading-relaxed sm:mt-4 sm:text-base">
                Join sellers who verify web orders with auto call, ship with Steadfast, and never
                lose track of stock again.
              </p>
            </div>
          </div>
        </section>
      </main>
    </MarketingSiteShell>
  );
}
