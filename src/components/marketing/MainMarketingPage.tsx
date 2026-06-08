import clsx from "clsx";
import { ArrowRight } from "lucide-react";
import { MarketingAppCta } from "@/components/marketing/MarketingAppCta";
import { MarketingSiteShell } from "@/components/marketing/MarketingSiteShell";
import { getAppBaseUrl } from "@/lib/app-hosts";
import {
  MARKETING_FEATURE_GROUPS,
  MARKETING_HERO_STATS,
  MARKETING_STEPS,
} from "@/lib/marketing-site-content";

export function MainMarketingPage() {
  const appHost = getAppBaseUrl().replace(/^https?:\/\//, "");

  return (
    <MarketingSiteShell>
      <main className="relative z-10">
        {/* Hero */}
        <section className="mx-auto max-w-6xl px-5 pb-20 pt-16 lg:px-8 lg:pb-28 lg:pt-24">
          <div className="grid items-center gap-12 lg:grid-cols-[1.1fr_0.9fr]">
            <div>
              <p className="marketing-fade marketing-fade-1 mb-5 inline-flex items-center gap-2 rounded-full border border-cyan-500/20 bg-cyan-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-cyan-300">
                Made for Bangladesh sellers
              </p>
              <h1 className="marketing-fade marketing-fade-2 text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
                One dashboard for{" "}
                <span className="bg-gradient-to-r from-cyan-300 via-violet-300 to-fuchsia-300 bg-clip-text text-transparent">
                  orders, stock & courier
                </span>
              </h1>
              <p className="marketing-fade marketing-fade-3 mt-6 max-w-xl text-base leading-relaxed text-slate-400 sm:text-lg">
                YourAI Seller brings web orders, call-center approvals, inventory, SMS, auto
                call, WooCommerce sync and Steadfast booking into a single beautiful panel —
                so your team ships faster with fewer mistakes.
              </p>
              <div className="marketing-fade marketing-fade-4 mt-8 flex flex-wrap items-center gap-4">
                <MarketingAppCta large>
                  Start free — open app
                  <ArrowRight className="h-5 w-5" />
                </MarketingAppCta>
                <a
                  href="#features"
                  className="text-sm font-semibold text-slate-400 transition hover:text-white"
                >
                  Explore all features ↓
                </a>
              </div>
              <div className="marketing-fade marketing-fade-5 mt-10 grid grid-cols-3 gap-3 sm:max-w-lg">
                {MARKETING_HERO_STATS.map((s) => (
                  <div
                    key={s.label}
                    className="rounded-2xl border border-white/8 bg-white/[0.03] px-3 py-4 text-center backdrop-blur-sm"
                  >
                    <p className="text-xl font-extrabold text-white sm:text-2xl">{s.value}</p>
                    <p className="mt-1 text-[10px] font-medium leading-snug text-slate-500 sm:text-xs">
                      {s.label}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="marketing-fade marketing-fade-3 relative">
              <div className="absolute -inset-4 rounded-[2rem] bg-gradient-to-br from-violet-600/30 via-transparent to-cyan-500/20 blur-2xl" />
              <div className="relative overflow-hidden rounded-[1.75rem] border border-white/10 bg-gradient-to-b from-slate-900/90 to-slate-950/90 p-5 shadow-2xl shadow-violet-900/30 ring-1 ring-white/10 sm:p-6">
                <div className="mb-4 flex items-center justify-between">
                  <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
                    Live seller panel
                  </p>
                  <span className="rounded-full bg-emerald-500/15 px-2.5 py-1 text-[10px] font-bold text-emerald-400">
                    All modules
                  </span>
                </div>
                <div className="grid grid-cols-2 gap-2.5">
                  {[
                    { label: "Web orders", tone: "from-cyan-500/20 to-cyan-500/5", dot: "bg-cyan-400" },
                    { label: "Auto call", tone: "from-violet-500/20 to-violet-500/5", dot: "bg-violet-400" },
                    { label: "Inventory", tone: "from-emerald-500/20 to-emerald-500/5", dot: "bg-emerald-400" },
                    { label: "Courier", tone: "from-sky-500/20 to-sky-500/5", dot: "bg-sky-400" },
                    { label: "SMS", tone: "from-teal-500/20 to-teal-500/5", dot: "bg-teal-400" },
                    { label: "Reports", tone: "from-fuchsia-500/20 to-fuchsia-500/5", dot: "bg-fuchsia-400" },
                  ].map((card) => (
                    <div
                      key={card.label}
                      className={clsx(
                        "rounded-xl border border-white/8 bg-gradient-to-br p-3.5",
                        card.tone
                      )}
                    >
                      <span className={clsx("mb-2 inline-block h-2 w-2 rounded-full", card.dot)} />
                      <p className="text-sm font-bold text-white">{card.label}</p>
                      <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-white/10">
                        <div className="h-full w-2/3 rounded-full bg-white/30" />
                      </div>
                    </div>
                  ))}
                </div>
                <p className="mt-4 text-center text-[11px] text-slate-500">
                  Sign in at{" "}
                  <span className="font-mono text-slate-400">{appHost}</span>
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* Feature groups */}
        <section id="features" className="border-t border-white/5 bg-white/[0.02] py-20 lg:py-28">
          <div className="mx-auto max-w-6xl px-5 lg:px-8">
            <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-violet-400">
              Everything included
            </p>
            <h2 className="mx-auto mt-3 max-w-3xl text-center text-3xl font-extrabold tracking-tight sm:text-4xl">
              Every tool your ecommerce team needs — already built in
            </h2>
            <p className="mx-auto mt-4 max-w-2xl text-center text-slate-400">
              No patchwork of spreadsheets, courier panels and plugins. YourAI Seller is a
              complete operating system for Bangladesh online sellers.
            </p>

            <div className="mt-16 space-y-24">
              {MARKETING_FEATURE_GROUPS.map((group, gi) => {
                const GroupIcon = group.icon;
                return (
                  <div
                    key={group.id}
                    id={group.id === "integrations" ? "integrations" : undefined}
                    className="scroll-mt-24"
                  >
                    <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
                      <div className="flex items-start gap-4">
                        <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-violet-500/15 text-violet-300 ring-1 ring-violet-500/20">
                          <GroupIcon className="h-6 w-6" />
                        </div>
                        <div>
                          <p className="text-xs font-bold uppercase tracking-[0.16em] text-slate-500">
                            {group.label}
                          </p>
                          <h3 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">
                            {group.headline}
                          </h3>
                        </div>
                      </div>
                    </div>
                    <p className="mb-8 max-w-3xl text-slate-400">{group.blurb}</p>
                    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                      {group.features.map((feature, fi) => {
                        const Icon = feature.icon;
                        return (
                          <article
                            key={feature.title}
                            className="marketing-feature-card group rounded-2xl border border-white/8 bg-white/[0.03] p-5 transition hover:border-white/15 hover:bg-white/[0.05]"
                            style={{ animationDelay: `${(gi * 3 + fi) * 40}ms` }}
                          >
                            <div
                              className={clsx(
                                "mb-4 flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg",
                                feature.accent
                              )}
                            >
                              <Icon className="h-5 w-5" />
                            </div>
                            <h4 className="text-base font-bold text-white">{feature.title}</h4>
                            <p className="mt-2 text-sm leading-relaxed text-slate-400">
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

        {/* How it works */}
        <section id="how-it-works" className="py-20 lg:py-28">
          <div className="mx-auto max-w-6xl px-5 lg:px-8">
            <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">
              How it works
            </p>
            <h2 className="mt-3 text-center text-3xl font-extrabold tracking-tight sm:text-4xl">
              Go live in three steps
            </h2>
            <div className="mt-12 grid gap-6 md:grid-cols-3">
              {MARKETING_STEPS.map((step) => (
                <div
                  key={step.step}
                  className="relative rounded-2xl border border-white/8 bg-gradient-to-b from-white/[0.05] to-transparent p-6"
                >
                  <p className="text-4xl font-extrabold text-white/10">{step.step}</p>
                  <h3 className="mt-2 text-lg font-bold text-white">{step.title}</h3>
                  <p className="mt-3 text-sm leading-relaxed text-slate-400">{step.body}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-white/5 py-20 lg:py-28">
          <div className="mx-auto max-w-3xl px-5 text-center lg:px-8">
            <div className="overflow-hidden rounded-[2rem] border border-violet-500/20 bg-gradient-to-br from-violet-600/20 via-slate-900 to-cyan-600/10 p-10 sm:p-14">
              <h2 className="text-3xl font-extrabold tracking-tight sm:text-4xl">
                Ready to run your store smarter?
              </h2>
              <p className="mx-auto mt-4 max-w-lg text-slate-300">
                Join sellers who verify web orders with auto call, ship with Steadfast, and
                never lose track of stock again.
              </p>
              <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
                <MarketingAppCta large>
                  Open YourAI Seller
                  <ArrowRight className="h-5 w-5" />
                </MarketingAppCta>
              </div>
              <p className="mt-5 text-xs text-slate-500">
                App login:{" "}
                <span className="font-mono text-slate-400">{appHost}/login</span>
              </p>
            </div>
          </div>
        </section>
      </main>
    </MarketingSiteShell>
  );
}
