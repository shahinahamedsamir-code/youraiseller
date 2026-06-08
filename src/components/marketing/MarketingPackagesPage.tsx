import { ArrowRight, Shield, Sparkles, Zap } from "lucide-react";
import { MarketingAppCta } from "@/components/marketing/MarketingAppCta";
import { MarketingBackLink } from "@/components/marketing/MarketingBackLink";
import { MarketingPackageCards } from "@/components/marketing/MarketingPackageCards";
import { MarketingSiteShell } from "@/components/marketing/MarketingSiteShell";
import { MARKETING_PACKAGE_FAQ } from "@/lib/marketing-packages-content";

export function MarketingPackagesPage() {
  return (
    <MarketingSiteShell active="package">
      <main className="relative z-10">
        {/* Hero */}
        <section className="relative overflow-hidden border-b border-white/5">
          <div className="marketing-packages-orb marketing-packages-orb-a" aria-hidden />
          <div className="marketing-packages-orb marketing-packages-orb-b" aria-hidden />
          <div className="mx-auto max-w-6xl px-5 pb-16 pt-14 text-center lg:px-8 lg:pb-20 lg:pt-20">
            <MarketingBackLink />
            <p className="inline-flex items-center gap-2 rounded-full border border-fuchsia-500/25 bg-fuchsia-500/10 px-4 py-1.5 text-xs font-bold uppercase tracking-[0.18em] text-fuchsia-300">
              <Sparkles className="h-3.5 w-3.5" />
              Package &amp; pricing
            </p>
            <h1 className="mx-auto mt-6 max-w-3xl text-4xl font-extrabold leading-[1.08] tracking-tight sm:text-5xl lg:text-6xl">
              Simple plans for{" "}
              <span className="bg-gradient-to-r from-fuchsia-300 via-violet-300 to-cyan-300 bg-clip-text text-transparent">
                every stage
              </span>{" "}
              of growth
            </h1>
            <p className="mx-auto mt-6 max-w-2xl text-base leading-relaxed text-slate-400 sm:text-lg">
              Start lean with Starter, scale with Growth, or unlock every module on Business.
              Pay monthly in BDT — upgrade when your orders and team are ready.
            </p>
            <div className="mt-10 flex flex-wrap items-center justify-center gap-4">
              <MarketingAppCta large>
                Start free — open app
                <ArrowRight className="h-5 w-5" />
              </MarketingAppCta>
            </div>
            <div className="mt-12 grid gap-3 sm:mx-auto sm:max-w-3xl sm:grid-cols-3">
              {[
                { icon: Zap, label: "No hidden fees", sub: "Clear BDT pricing" },
                { icon: Shield, label: "Cancel anytime", sub: "No long lock-in" },
                { icon: Sparkles, label: "Upgrade easy", sub: "Switch plan in settings" },
              ].map((item) => (
                <div
                  key={item.label}
                  className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/[0.03] px-4 py-3 text-left"
                >
                  <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-500/15 text-violet-300">
                    <item.icon className="h-5 w-5" />
                  </div>
                  <div>
                    <p className="text-sm font-bold text-white">{item.label}</p>
                    <p className="text-xs text-slate-500">{item.sub}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Plans */}
        <section className="py-16 lg:py-24">
          <div className="mx-auto max-w-6xl px-5 lg:px-8">
            <MarketingPackageCards />
            <p className="mt-10 text-center text-xs text-slate-500">
              Need multiple brands or warehouses?{" "}
              <a
                href="mailto:support@youraiseller.com"
                className="font-semibold text-cyan-400 hover:text-cyan-300"
              >
                Contact us
              </a>{" "}
              for custom Business+ pricing.
            </p>
          </div>
        </section>

        {/* Compare strip */}
        <section className="border-y border-white/5 bg-white/[0.02] py-14 lg:py-16">
          <div className="mx-auto max-w-6xl px-5 lg:px-8">
            <h2 className="text-center text-2xl font-extrabold tracking-tight sm:text-3xl">
              What you get at a glance
            </h2>
            <div className="mt-10 overflow-hidden rounded-2xl border border-white/10">
              <table className="w-full text-left text-sm">
                <thead>
                  <tr className="border-b border-white/10 bg-white/[0.04]">
                    <th className="px-4 py-3 font-bold text-slate-400 sm:px-6">Module</th>
                    <th className="px-3 py-3 text-center font-bold text-slate-300">Starter</th>
                    <th className="px-3 py-3 text-center font-bold text-violet-300">Growth</th>
                    <th className="px-3 py-3 text-center font-bold text-amber-300">Business</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {[
                    ["Orders & web list", true, true, true],
                    ["Inventory basics", true, true, true],
                    ["SMS notifications", true, true, true],
                    ["WooCommerce sync", false, true, true],
                    ["Auto Call Center", false, true, true],
                    ["Courier integrations", false, true, true],
                    ["Founder dashboard", false, false, true],
                    ["HRM & automation", false, false, true],
                  ].map(([label, s, g, b]) => (
                    <tr key={label as string} className="bg-white/[0.01]">
                      <td className="px-4 py-3.5 font-medium text-slate-300 sm:px-6">
                        {label as string}
                      </td>
                      {[s, g, b].map((on, i) => (
                        <td key={i} className="px-3 py-3.5 text-center">
                          <span
                            className={
                              on
                                ? "inline-flex h-6 w-6 items-center justify-center rounded-full bg-emerald-500/15 text-xs font-bold text-emerald-400"
                                : "text-slate-600"
                            }
                          >
                            {on ? "✓" : "—"}
                          </span>
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </section>

        {/* FAQ */}
        <section className="py-16 lg:py-24">
          <div className="mx-auto max-w-3xl px-5 lg:px-8">
            <p className="text-center text-xs font-bold uppercase tracking-[0.2em] text-cyan-400">
              FAQ
            </p>
            <h2 className="mt-3 text-center text-2xl font-extrabold sm:text-3xl">
              Common questions
            </h2>
            <div className="mt-10 space-y-3">
              {MARKETING_PACKAGE_FAQ.map((item) => (
                <details
                  key={item.q}
                  className="group rounded-2xl border border-white/8 bg-white/[0.03] open:bg-white/[0.05]"
                >
                  <summary className="cursor-pointer list-none px-5 py-4 text-sm font-bold text-white marker:content-none sm:px-6 sm:text-base">
                    {item.q}
                  </summary>
                  <p className="border-t border-white/5 px-5 pb-4 pt-3 text-sm leading-relaxed text-slate-400 sm:px-6">
                    {item.a}
                  </p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* CTA */}
        <section className="border-t border-white/5 pb-20 pt-4 lg:pb-28">
          <div className="mx-auto max-w-3xl px-5 text-center lg:px-8">
            <div className="overflow-hidden rounded-[2rem] border border-fuchsia-500/20 bg-gradient-to-br from-fuchsia-600/15 via-slate-900 to-violet-600/15 p-10 sm:p-14">
              <h2 className="text-2xl font-extrabold tracking-tight sm:text-3xl">
                Ready to pick your package?
              </h2>
              <p className="mx-auto mt-4 max-w-md text-slate-300">
                Sign in, choose your plan, and start managing orders, stock and courier from one
                dashboard today.
              </p>
              <div className="mt-8">
                <MarketingAppCta large>
                  Open YourAI Seller
                  <ArrowRight className="h-5 w-5" />
                </MarketingAppCta>
              </div>
            </div>
          </div>
        </section>
      </main>
    </MarketingSiteShell>
  );
}
