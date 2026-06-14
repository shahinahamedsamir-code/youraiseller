import clsx from "clsx";
import { Check, MessageCircle } from "lucide-react";
import {
  MARKETING_PACKAGES,
  type MarketingPackage,
} from "@/lib/marketing-packages-content";
import type { FeatureKey } from "@/lib/features";
import { supportWhatsAppHref } from "@/lib/support-contact";

export function MarketingPackageCards({
  packages = MARKETING_PACKAGES,
  planFeaturesById = {},
}: {
  packages?: MarketingPackage[];
  planFeaturesById?: Partial<Record<string, Record<FeatureKey, boolean>>>;
}) {
  return (
    <div className="grid items-stretch gap-4 sm:gap-6 lg:grid-cols-2 xl:grid-cols-4 lg:gap-5">
      {packages.map((pkg) => {
        const Icon = pkg.icon;
        const features = planFeaturesById[pkg.id];
        const visibleHighlights = pkg.highlights.filter((item) =>
          item.featureKey ? features?.[item.featureKey] !== false : true
        );
        return (
          <article
            key={pkg.id}
            className={clsx(
              "marketing-package-card mkt-card relative flex min-h-[31rem] flex-col rounded-2xl border border-white/8 p-5 pt-10 shadow-2xl shadow-black/10 backdrop-blur-sm sm:rounded-[1.75rem] sm:p-7 sm:pt-10",
              pkg.popular && "border-violet-500/30 lg:-translate-y-4"
            )}
          >
            {pkg.popular && (
              <div className="absolute -top-4 left-1/2 z-10 -translate-x-1/2">
                <span className="whitespace-nowrap rounded-full bg-gradient-to-r from-violet-500 to-cyan-500 px-4 py-1 text-[11px] font-extrabold uppercase tracking-wider text-white shadow-lg shadow-violet-500/30">
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

            <h3 className="mkt-text text-xl font-extrabold">{pkg.name}</h3>
            <p className="mkt-text-muted mt-2 min-h-[3.5rem] text-sm leading-relaxed sm:min-h-[4.5rem]">
              {pkg.tagline}
            </p>

            <div className="mkt-border-b mt-6 flex items-end gap-1 border-b pb-6">
              <span className="mkt-text text-4xl font-extrabold tracking-tight">{pkg.price}</span>
              <span className="mkt-text-subtle mb-1.5 text-sm font-medium">{pkg.period}</span>
            </div>

            <ul className="mt-6 flex flex-1 flex-col gap-3">
              {visibleHighlights.map((item) => (
                <li key={item.label} className="mkt-text-soft flex items-start gap-2.5 text-sm">
                  <span
                    className={clsx(
                      "mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-gradient-to-br",
                      pkg.accent
                    )}
                  >
                    <Check className="h-3 w-3 text-white" strokeWidth={3} />
                  </span>
                  <span>{item.label}</span>
                </li>
              ))}
              {visibleHighlights.length === 0 && (
                <li className="mkt-text-subtle rounded-2xl border border-dashed border-white/10 px-4 py-3 text-sm">
                  Ei package-e ekhono kono module on nei.
                </li>
              )}
            </ul>

            <div className="mt-6 flex justify-center">
              <a
                href={supportWhatsAppHref(
                  `Hi, ami ${pkg.name} package (${pkg.price}${pkg.period}) niye details jante chai.`
                )}
                target="_blank"
                rel="noopener noreferrer"
                className={clsx(
                  "inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold transition hover:brightness-110",
                  pkg.popular
                    ? "border-violet-400/30 bg-violet-500/10 text-violet-200"
                    : "border-white/10 bg-white/5 text-slate-200"
                )}
              >
                <MessageCircle className="h-3.5 w-3.5" />
                {pkg.cta}
              </a>
            </div>
          </article>
        );
      })}
    </div>
  );
}
