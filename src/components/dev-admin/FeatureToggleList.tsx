"use client";

import { useFeatures } from "@/context/FeatureContext";
import {
  CATEGORY_LABELS,
  FEATURE_LIST,
  type FeatureDef,
} from "@/lib/features";
import clsx from "clsx";

function Toggle({ on, onChange }: { on: boolean; onChange: () => void }) {
  return (
    <button
      type="button"
      onClick={onChange}
      className={clsx(
        "relative h-7 w-12 shrink-0 rounded-full transition",
        on ? "bg-emerald-500" : "bg-slate-600"
      )}
      aria-pressed={on}
    >
      <span
        className={clsx(
          "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition",
          on ? "left-5" : "left-0.5"
        )}
      />
    </button>
  );
}

export function FeatureToggleList() {
  const { features, toggle, enabledCount, totalCount } = useFeatures();

  const grouped = FEATURE_LIST.reduce(
    (acc, f) => {
      if (!acc[f.category]) acc[f.category] = [];
      acc[f.category].push(f);
      return acc;
    },
    {} as Record<FeatureDef["category"], FeatureDef[]>
  );

  return (
    <div className="space-y-6">
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
        <strong>{enabledCount}</strong> of <strong>{totalCount}</strong> features
        enabled globally — turning OFF here hides the module for every user panel
      </div>

      {(Object.keys(grouped) as FeatureDef["category"][]).map((cat) => (
        <div
          key={cat}
          className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-800/50"
        >
          <div className="border-b border-slate-700 bg-slate-800 px-4 py-3">
            <h3 className="font-bold text-orange-300">{CATEGORY_LABELS[cat]}</h3>
          </div>
          <div className="divide-y divide-slate-700/80">
            {grouped[cat].map((f) => (
              <div
                key={f.key}
                className="flex items-center justify-between gap-4 px-4 py-3.5"
              >
                <div>
                  <p className="font-medium text-white">{f.label}</p>
                  <p className="text-xs text-slate-500">{f.description}</p>
                  <code className="mt-1 inline-block rounded bg-slate-900 px-1.5 py-0.5 text-[10px] text-slate-400">
                    {f.key}
                  </code>
                </div>
                <Toggle on={features[f.key]} onChange={() => toggle(f.key)} />
              </div>
            ))}
          </div>
        </div>
      ))}
    </div>
  );
}
