import clsx from "clsx";
import { Check } from "lucide-react";
import { MARKETING_PACKAGES } from "@/lib/marketing-packages-content";

export function MarketingPackageCards() {
  return (
    <div className="grid items-stretch gap-4 sm:gap-6 lg:grid-cols-3 lg:gap-5">
      {MARKETING_PACKAGES.map((pkg) => {
        const Icon = pkg.icon;
        return (
          <article
            key={pkg.id}
            className={clsx(
              "marketing-package-card mkt-card relative flex flex-col rounded-2xl p-5 backdrop-blur-sm sm:rounded-[1.75rem] sm:p-7",
              pkg.popular && "border-violet-500/30 lg:-translate-y-2 lg:scale-[1.02]"
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

            <h3 className="mkt-text text-xl font-extrabold">{pkg.name}</h3>
            <p className="mkt-text-muted mt-2 min-h-[2.75rem] text-sm leading-relaxed">
              {pkg.tagline}
            </p>

            <div className="mkt-border-b mt-6 flex items-end gap-1 border-b pb-6">
              <span className="mkt-text text-4xl font-extrabold tracking-tight">{pkg.price}</span>
              <span className="mkt-text-subtle mb-1.5 text-sm font-medium">{pkg.period}</span>
            </div>

            <ul className="mt-6 flex flex-1 flex-col gap-3">
              {pkg.highlights.map((item) => (
                <li key={item} className="mkt-text-soft flex items-start gap-2.5 text-sm">
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
          </article>
        );
      })}
    </div>
  );
}
