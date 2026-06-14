import clsx from "clsx";
import { MessageCircle, PhoneCall, Shield, Sparkles, Zap } from "lucide-react";
import { MarketingBackLink } from "@/components/marketing/MarketingBackLink";
import { MarketingCompareTable } from "@/components/marketing/MarketingCompareTable";
import { MarketingPackageCards } from "@/components/marketing/MarketingPackageCards";
import { marketingSectionClass } from "@/lib/marketing-layout";
import { MarketingSiteShell } from "@/components/marketing/MarketingSiteShell";
import {
  MARKETING_PACKAGE_FAQ,
  MARKETING_PACKAGES,
  type MarketingPackage,
} from "@/lib/marketing-packages-content";
import type { FeatureKey } from "@/lib/features";
import { supportWhatsAppHref } from "@/lib/support-contact";

export function MarketingPackagesPage({
  homeHref = "/",
  packages = MARKETING_PACKAGES,
  planFeaturesById = {},
}: {
  homeHref?: string;
  packages?: MarketingPackage[];
  planFeaturesById?: Partial<Record<string, Record<FeatureKey, boolean>>>;
}) {
  return (
    <MarketingSiteShell active="package" homeHref={homeHref}>
      <main className="relative z-10">
        <section className="relative overflow-hidden mkt-border-b border-b">
          <div className="marketing-packages-orb marketing-packages-orb-a" aria-hidden />
          <div className="marketing-packages-orb marketing-packages-orb-b" aria-hidden />
          <div
            className={clsx(
              marketingSectionClass,
              "pb-12 pt-8 text-center sm:pb-16 sm:pt-12 lg:pb-20 lg:pt-16"
            )}
          >
            <MarketingBackLink />
            <p className="mkt-badge-fuchsia inline-flex items-center gap-2 rounded-full px-3 py-1.5 text-[10px] font-bold uppercase tracking-[0.14em] sm:px-4 sm:text-xs sm:tracking-[0.18em]">
              <Sparkles className="h-3.5 w-3.5" />
              Package & pricing
            </p>
            <h1 className="mkt-text mx-auto mt-5 max-w-3xl text-[1.75rem] font-extrabold leading-[1.12] tracking-tight sm:mt-6 sm:text-4xl lg:text-6xl lg:leading-[1.08]">
              Plans for every stage of{" "}
              <span className="bg-gradient-to-r from-fuchsia-500 via-violet-500 to-cyan-500 bg-clip-text text-transparent">
                growth
              </span>
            </h1>
            <p className="mkt-text-muted mx-auto mt-4 max-w-2xl text-[15px] leading-relaxed sm:mt-6 sm:text-base lg:text-lg">
              Start lean with Starter, scale with Growth, unlock every module on Business, or go
              custom with Enterprise. Pay monthly in BDT and upgrade when your team is ready.
            </p>
            <div className="mt-8 grid gap-2.5 sm:mx-auto sm:mt-12 sm:max-w-3xl sm:grid-cols-3 sm:gap-3">
              {[
                { icon: Zap, label: "No hidden fees", sub: "Clear BDT pricing" },
                { icon: Shield, label: "Cancel anytime", sub: "No long lock-in" },
                { icon: Sparkles, label: "Easy upgrade", sub: "Switch in settings" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="mkt-card flex items-center gap-3 rounded-2xl px-4 py-3.5 text-left"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-500">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="mkt-text text-sm font-bold">{item.label}</p>
                    <p className="mkt-text-subtle text-xs">{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        <section className="py-12 sm:py-16 lg:py-24">
          <div className={marketingSectionClass}>
            <MarketingPackageCards packages={packages} planFeaturesById={planFeaturesById} />
            <p className="mkt-text-subtle mt-8 text-center text-xs leading-relaxed sm:mt-10">
              Multiple brands or warehouses?{" "}
              <a
                href="mailto:support@youraiseller.com"
                className="font-semibold text-violet-500 underline-offset-2 hover:underline"
              >
                Contact us
              </a>{" "}
              for custom Enterprise pricing.
            </p>
          </div>
        </section>

        <section className="mkt-border-b mkt-section-alt border-y py-12 sm:py-14 lg:py-16">
          <div className={marketingSectionClass}>
            <h2 className="mkt-text text-center text-xl font-extrabold tracking-tight sm:text-2xl lg:text-3xl">
              What you get at a glance
            </h2>
            <p className="mkt-text-subtle mt-2 text-center text-sm md:hidden">
              Compare plans side by side
            </p>
            <div className="mt-8 sm:mt-10">
              <MarketingCompareTable />
            </div>
          </div>
        </section>

        <section className="py-12 sm:py-16 lg:py-24">
          <div className={clsx(marketingSectionClass, "max-w-3xl")}>
            <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-cyan-600">
              FAQ
            </p>
            <h2 className="mkt-text mt-3 text-center text-xl font-extrabold sm:text-2xl lg:text-3xl">
              Common questions
            </h2>
            <div className="mt-8 space-y-3 sm:mt-10">
              {MARKETING_PACKAGE_FAQ.map((item) => (
                <details key={item.q} className="mkt-card group rounded-2xl open:shadow-md">
                  <summary className="mkt-text flex min-h-14 cursor-pointer list-none items-center px-4 py-3 text-sm font-bold marker:content-none sm:px-6 sm:text-base">
                    {item.q}
                  </summary>
                  <p className="mkt-text-muted mkt-border-b border-t px-4 pb-4 pt-3 text-sm leading-relaxed sm:px-6">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        <section className="mkt-border-b border-t pb-14 pt-2 sm:pb-20 lg:pb-28">
          <div className={clsx(marketingSectionClass, "max-w-3xl text-center")}>
            <div className="mkt-cta-box overflow-hidden rounded-2xl p-6 sm:rounded-[2rem] sm:p-10 lg:p-14">
              <h2 className="mkt-text text-xl font-extrabold tracking-tight sm:text-2xl lg:text-3xl">
                Ready to choose a package?
              </h2>
              <p className="mkt-text-soft mx-auto mt-3 max-w-md text-sm leading-relaxed sm:mt-4 sm:text-base">
                Select a plan now and start managing orders, stock and courier from one dashboard.
              </p>
              <div className="mt-6 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <a
                  href={supportWhatsAppHref("Hi, I want to purchase a YourAI Seller package.")}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-full bg-emerald-500 px-5 py-3 text-sm font-bold text-white shadow-lg shadow-emerald-500/20 transition hover:brightness-110"
                >
                  <MessageCircle className="h-4 w-4" />
                  WhatsApp Chat
                </a>
                <a
                  href="mailto:support@youraiseller.com"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-slate-100 transition hover:bg-white/10"
                >
                  support@youraiseller.com
                </a>
                <a
                  href="tel:01874748286"
                  className="inline-flex items-center justify-center gap-2 rounded-full border border-white/10 bg-white/5 px-5 py-3 text-sm font-bold text-slate-100 transition hover:bg-white/10"
                >
                  <PhoneCall className="h-4 w-4" />
                  Direct call
                </a>
              </div>
            </div>
          </div>
        </section>
      </main>
    </MarketingSiteShell>
  );
}
