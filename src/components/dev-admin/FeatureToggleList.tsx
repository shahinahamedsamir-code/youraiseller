"use client";

import { useFeatures } from "@/context/FeatureContext";
import {
  FEATURE_LIST,
  getChildFeatures,
  isParentFeature,
  type FeatureDef,
} from "@/lib/features";
import { ChevronRight } from "lucide-react";
import clsx from "clsx";

function Toggle({
  on,
  onChange,
  disabled,
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
        "relative h-7 w-12 shrink-0 rounded-full transition",
        on ? "bg-emerald-500" : "bg-slate-600",
        disabled && "cursor-not-allowed opacity-40"
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

function FeatureRow({
  f,
  on,
  onToggle,
  disabled,
  childCount,
}: {
  f: FeatureDef;
  on: boolean;
  onToggle: () => void;
  disabled?: boolean;
  childCount?: number;
}) {
  return (
    <div
      className={clsx(
        "flex items-center justify-between gap-4 px-4 py-3.5",
        disabled && "opacity-50"
      )}
    >
      <div>
        <p className="flex items-center gap-2 font-medium text-white">
          {f.label}
          {childCount ? (
            <span className="rounded-full bg-orange-500/20 px-2 py-0.5 text-[10px] font-bold text-orange-300">
              {childCount} sub-features
            </span>
          ) : null}
        </p>
        <p className="text-xs text-slate-500">{f.description}</p>
        <code className="mt-1 inline-block rounded bg-slate-900 px-1.5 py-0.5 text-[10px] text-slate-400">
          {f.key}
        </code>
      </div>
      <Toggle on={on} onChange={onToggle} disabled={disabled} />
    </div>
  );
}

export function FeatureToggleList() {
  const { features, toggle, enabledCount, totalCount } = useFeatures();

  const topLevel = FEATURE_LIST.filter((f) => !f.parent);

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-emerald-500/30 bg-emerald-500/10 px-4 py-3 text-sm text-emerald-300">
        <strong>{enabledCount}</strong> of <strong>{totalCount}</strong> features
        enabled globally — turning OFF a <strong>parent</strong> hides it and all its
        sub-features for every user panel
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-800/50 divide-y divide-slate-700/80">
        {topLevel.map((f) => {
          const parent = isParentFeature(f.key);
          const children = parent ? getChildFeatures(f.key) : [];
          const parentOn = features[f.key];

          if (!parent) {
            return (
              <FeatureRow
                key={f.key}
                f={f}
                on={features[f.key]}
                onToggle={() => toggle(f.key)}
              />
            );
          }

          return (
            <div key={f.key} className="bg-slate-800/30">
              {/* Parent header row */}
              <div className="bg-slate-800/80">
                <FeatureRow
                  f={f}
                  on={parentOn}
                  onToggle={() => toggle(f.key)}
                  childCount={children.length}
                />
              </div>
              {/* Children */}
              <div className="divide-y divide-slate-700/60 border-l-2 border-orange-500/40 bg-slate-900/30 pl-2">
                {children.map((c) => (
                  <div key={c.key} className="flex items-stretch">
                    <ChevronRight className="mt-4 ml-1 h-4 w-4 shrink-0 text-slate-600" />
                    <div className="flex-1">
                      <FeatureRow
                        f={c}
                        on={parentOn && features[c.key]}
                        onToggle={() => toggle(c.key)}
                        disabled={!parentOn}
                      />
                    </div>
                  </div>
                ))}
                {!parentOn && (
                  <p className="px-4 py-2 text-[11px] text-amber-400/80">
                    Parent is OFF — all sub-features are hidden. Turn the parent ON to
                    edit them individually.
                  </p>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
