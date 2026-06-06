"use client";

import clsx from "clsx";
import { Check, Sparkles } from "lucide-react";
import { FEATURE_LIST } from "@/lib/features";
import type { PlanDefinition, PlanId } from "@/lib/plan-config-types";
import { countPlanEnabledFeatures } from "@/lib/plan-config-client";

type Props = {
  plans: PlanDefinition[];
  selected: PlanId;
  onSelect: (plan: PlanId) => void;
  /** When true, changing plan resets features to package defaults */
  showFeatureCount?: boolean;
};

export function PlanSelectorCards({
  plans,
  selected,
  onSelect,
  showFeatureCount = true,
}: Props) {
  const activePlans = plans.filter((p) => p.active).sort((a, b) => a.sortOrder - b.sortOrder);

  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {activePlans.map((plan) => {
        const isSelected = selected === plan.id;
        const enabled = countPlanEnabledFeatures(plan.features);
        const isTop = plan.id === "enterprise";

        return (
          <button
            key={plan.id}
            type="button"
            onClick={() => onSelect(plan.id)}
            className={clsx(
              "relative rounded-2xl border p-4 text-left transition",
              isSelected
                ? "border-orange-500 bg-orange-500/10 ring-2 ring-orange-500/50"
                : "border-slate-700 bg-slate-900/60 hover:border-slate-500 hover:bg-slate-800/80"
            )}
          >
            {isTop ? (
              <span className="absolute -top-2.5 right-3 flex items-center gap-1 rounded-full bg-amber-500 px-2 py-0.5 text-[10px] font-bold text-slate-900">
                <Sparkles className="h-3 w-3" />
                Full
              </span>
            ) : null}
            {isSelected ? (
              <span className="absolute left-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-orange-500 text-white">
                <Check className="h-3 w-3" />
              </span>
            ) : null}
            <div className={clsx("mb-2", isSelected && "pl-7")}>
              <span
                className={clsx(
                  "inline-block rounded-full px-2.5 py-0.5 text-xs font-bold ring-1",
                  plan.badgeClass
                )}
              >
                {plan.name}
              </span>
            </div>
            <p className="text-sm font-medium text-white">{plan.tagline}</p>
            <p className="mt-2 text-lg font-bold text-orange-300">{plan.priceLabel}</p>
            {showFeatureCount ? (
              <p className="mt-2 text-xs text-slate-400">
                <span className="font-semibold text-emerald-400">{enabled}</span> /{" "}
                {FEATURE_LIST.length} features
              </p>
            ) : null}
            <p className="mt-1 font-mono text-[10px] uppercase text-slate-600">{plan.id}</p>
          </button>
        );
      })}
    </div>
  );
}
