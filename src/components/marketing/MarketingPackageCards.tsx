import Link from "next/link";
import clsx from "clsx";
import { ArrowRight, Check } from "lucide-react";
import { getAppBaseUrl } from "@/lib/app-hosts";
import { MARKETING_PACKAGES } from "@/lib/marketing-packages-content";

export function MarketingPackageCards() {
  const loginUrl = `${getAppBaseUrl()}/login`;

  return (
    <div className="grid items-stretch gap-6 lg:grid-cols-3 lg:gap-5">
      {MARKETING_PACKAGES.map((pkg) => {
        const Icon = pkg.icon;
        return (
          <article
            key={pkg.id}
            className={clsx(
              "marketing-package-card relative flex flex-col rounded-[1.75rem] border bg-gradient-to-b from-white/[0.06] to-white/[0.02] p-6 backdrop-blur-sm sm:p-7",
              pkg.popular
                ? "border-violet-400/30 shadow-2xl lg:-translate-y-2 lg:scale-[1.02]"
                : "border-white/10",
              pkg.glow
            )}
          >
            {pkg.popular && (
              <div className="absolute -top-3.5 left-1/2 -translate-x-1/2">
                <span className="rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 px-4 py-1 text-[11px] font-extrabold uppercase tracking-wider text-white shadow-lg shadow-violet-500/30">
                  Most popular
                </span>
              </div>
            )}

            <div
              className={clsx(
                "mb-5 flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br text-white shadow-lg ring-1",
                pkg.accent,
                pkg.ring
              )}
            >
              <Icon className="h-6 w-6" />
            </div>

            <h3 className="text-xl font-extrabold text-white">{pkg.name}</h3>
            <p className="mt-2 min-h-[2.75rem] text-sm leading-relaxed text-slate-400">
              {pkg.tagline}
            </p>

            <div className="mt-6 flex items-end gap-1 border-b border-white/8 pb-6">
              <span className="text-4xl font-extrabold tracking-tight text-white">
                {pkg.price}
              </span>
              <span className="mb-1.5 text-sm font-medium text-slate-500">{pkg.period}</span>
            </div>

            <ul className="mt-6 flex flex-1 flex-col gap-3">
              {pkg.highlights.map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-slate-300">
                  <span
                    className={clsx(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br",
                      pkg.accent
                    )}
                  >
                    <Check className="h-3 w-3 text-white" strokeWidth={3} />
                  </span>
                  <span>{item}</span>
                </li>
              ))}
            </ul>

            <Link
              href={loginUrl}
              className={clsx(
                "marketing-cta mt-8 inline-flex w-full items-center justify-center gap-2 rounded-2xl py-3.5 text-sm font-bold text-white transition hover:scale-[1.02]",
                pkg.popular
                  ? "bg-gradient-to-r from-violet-500 via-indigo-500 to-cyan-500 shadow-lg shadow-violet-500/25"
                  : "border border-white/15 bg-white/5 hover:bg-white/10"
              )}
            >
              {pkg.cta}
              <ArrowRight className="h-4 w-4" />
            </Link>
          </article>
        );
      })}
    </div>
  );
}
