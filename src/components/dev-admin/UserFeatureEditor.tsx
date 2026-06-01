"use client";

import { useEffect, useState } from "react";
import {
  CATEGORY_LABELS,
  FEATURE_LIST,
  type FeatureDef,
  type FeatureKey,
} from "@/lib/features";
import { loadGlobalFeatures, GLOBAL_FEATURES_UPDATED } from "@/lib/feature-storage";
import clsx from "clsx";

type UserFeatureEditorProps = {
  features: Record<FeatureKey, boolean>;
  onChange: (features: Record<FeatureKey, boolean>) => void;
  compact?: boolean;
};

function Toggle({
  on,
  onChange,
  disabled = false,
}: {
  on: boolean;
  onChange: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={clsx(
        "relative h-6 w-10 shrink-0 rounded-full transition",
        on ? "bg-emerald-500" : "bg-slate-600",
        disabled && "cursor-not-allowed opacity-50"
      )}
      aria-pressed={on}
    >
      <span
        className={clsx(
          "absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition",
          on ? "left-4" : "left-0.5"
        )}
      />
    </button>
  );
}

export function UserFeatureEditor({
  features,
  onChange,
  compact = false,
}: UserFeatureEditorProps) {
  const [globalFeatures, setGlobalFeatures] = useState(loadGlobalFeatures);

  useEffect(() => {
    const reload = () => setGlobalFeatures(loadGlobalFeatures());
    window.addEventListener(GLOBAL_FEATURES_UPDATED, reload);
    return () => window.removeEventListener(GLOBAL_FEATURES_UPDATED, reload);
  }, []);

  const grouped = FEATURE_LIST.reduce(
    (acc, f) => {
      if (!acc[f.category]) acc[f.category] = [];
      acc[f.category].push(f);
      return acc;
    },
    {} as Record<FeatureDef["category"], FeatureDef[]>
  );

  const toggle = (key: FeatureKey) => {
    const next = { ...features, [key]: !features[key] };
    if (key === "web_orders" && !next[key]) {
      FEATURE_LIST.filter(
        (f) => f.category === "web_orders" && f.key !== "web_orders"
      ).forEach((f) => {
        next[f.key] = false;
      });
    }
    onChange(next);
  };

  const enabled = FEATURE_LIST.filter(
    (f) => features[f.key] && globalFeatures[f.key]
  ).length;

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400">
        <strong className="text-emerald-400">{enabled}</strong> / {FEATURE_LIST.length}{" "}
        features enabled for this user
      </p>
      {(Object.keys(grouped) as FeatureDef["category"][]).map((cat) => (
        <div
          key={cat}
          className={clsx(
            "rounded-xl border border-slate-700",
            compact ? "text-xs" : "text-sm"
          )}
        >
          <div className="border-b border-slate-700 bg-slate-800/80 px-3 py-2 font-semibold text-orange-300">
            {CATEGORY_LABELS[cat]}
          </div>
          <div className="divide-y divide-slate-700/60">
            {grouped[cat].map((f) => {
              const globallyOff = !globalFeatures[f.key];
              return (
              <div
                key={f.key}
                className={clsx(
                  "flex items-center justify-between gap-3 px-3 py-2",
                  globallyOff && "opacity-60"
                )}
              >
                <span className="text-slate-300">
                  {f.label}
                  {globallyOff && (
                    <span className="ml-2 text-[10px] font-bold uppercase text-rose-400">
                      (Global off)
                    </span>
                  )}
                </span>
                  <Toggle
                    on={features[f.key]}
                    disabled={globallyOff}
                    onChange={() => !globallyOff && toggle(f.key)}
                  />
              </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}
