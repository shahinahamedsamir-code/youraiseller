"use client";

import { useEffect, useMemo, useState } from "react";
import {
  CATEGORY_LABELS,
  FEATURE_LIST,
  cascadeFeatures,
  getChildFeatures,
  isParentFeature,
  applyParentCascade,
  type FeatureDef,
  type FeatureKey,
} from "@/lib/features";
import { loadGlobalFeatures, GLOBAL_FEATURES_UPDATED } from "@/lib/feature-storage";
import clsx from "clsx";
import { ChevronRight } from "lucide-react";

type UserFeatureEditorProps = {
  features: Record<FeatureKey, boolean>;
  onChange: (features: Record<FeatureKey, boolean>) => void;
  compact?: boolean;
  planMode?: boolean;
  visibleKeys?: Set<FeatureKey> | null;
};

const CATEGORY_MAIN_PARENT: Partial<Record<FeatureDef["category"], FeatureKey>> = {
  orders: "approved_orders",
  web_orders: "web_orders",
  extras: "settings",
};

function Toggle({
  on,
  onChange,
  disabled = false,
  size = "sm",
}: {
  on: boolean;
  onChange: () => void;
  disabled?: boolean;
  size?: "sm" | "md";
}) {
  return (
    <button
      type="button"
      onClick={onChange}
      disabled={disabled}
      className={clsx(
        "relative shrink-0 rounded-full transition",
        size === "md" ? "h-7 w-12" : "h-6 w-10",
        on ? "bg-emerald-500" : "bg-slate-600",
        disabled && "cursor-not-allowed opacity-50"
      )}
      aria-pressed={on}
    >
      <span
        className={clsx(
          "absolute top-0.5 rounded-full bg-white shadow transition",
          size === "md" ? "h-6 w-6" : "h-5 w-5",
          on ? (size === "md" ? "left-5" : "left-4") : "left-0.5"
        )}
      />
    </button>
  );
}

function featuresInCategory(cat: FeatureDef["category"]): FeatureDef[] {
  return FEATURE_LIST.filter((f) => f.category === cat);
}

function topLevelInCategory(cat: FeatureDef["category"]): FeatureDef[] {
  return featuresInCategory(cat).filter((f) => !f.parent);
}

/** Parent ON → all children ON. Parent OFF → all children OFF. */
function setParentCascade(
  next: Record<FeatureKey, boolean>,
  parentKey: FeatureKey,
  on: boolean
): void {
  Object.assign(next, applyParentCascade(next, parentKey, on));
}

export function UserFeatureEditor({
  features,
  onChange,
  compact = false,
  planMode = false,
  visibleKeys = null,
}: UserFeatureEditorProps) {
  const [globalFeatures, setGlobalFeatures] = useState(loadGlobalFeatures);

  useEffect(() => {
    if (planMode) return;
    const reload = () => setGlobalFeatures(loadGlobalFeatures());
    window.addEventListener(GLOBAL_FEATURES_UPDATED, reload);
    return () => window.removeEventListener(GLOBAL_FEATURES_UPDATED, reload);
  }, [planMode]);

  const showKey = (key: FeatureKey) => !visibleKeys || visibleKeys.has(key);

  const grouped = useMemo(
    () =>
      FEATURE_LIST.reduce(
        (acc, f) => {
          if (visibleKeys && !visibleKeys.has(f.key) && !(f.parent && visibleKeys.has(f.parent))) {
            return acc;
          }
          if (!acc[f.category]) acc[f.category] = [];
          acc[f.category].push(f);
          return acc;
        },
        {} as Record<FeatureDef["category"], FeatureDef[]>
      ),
    [visibleKeys]
  );

  const isGloballyOff = (key: FeatureKey) => !planMode && !globalFeatures[key];

  const isEffectiveOn = (key: FeatureKey) =>
    features[key] && (planMode || globalFeatures[key]);

  const applyChange = (next: Record<FeatureKey, boolean>) => {
    onChange(cascadeFeatures(next));
  };

  const toggleKey = (key: FeatureKey) => {
    if (isGloballyOff(key)) return;
    const next = { ...features };
    if (isParentFeature(key)) {
      setParentCascade(next, key, !features[key]);
    } else {
      next[key] = !features[key];
    }
    applyChange(next);
  };

  const toggleCategoryHeader = (cat: FeatureDef["category"]) => {
    const mainParent = CATEGORY_MAIN_PARENT[cat];
    const next = { ...features };

    if (mainParent && !isGloballyOff(mainParent)) {
      const children = getChildFeatures(mainParent);
      const parentOn = features[mainParent];
      const allChildrenOn =
        children.length === 0 || children.every((c) => features[c.key]);
      // Parent already ON but children still OFF (old data) → one click enables all
      const turnOn = !parentOn || !allChildrenOn;
      setParentCascade(next, mainParent, turnOn);
      applyChange(next);
      return;
    }

    const toggleable = featuresInCategory(cat).filter((f) => !isGloballyOff(f.key));
    const allOn =
      toggleable.length > 0 && toggleable.every((f) => features[f.key]);
    toggleable.forEach((f) => {
      next[f.key] = !allOn;
    });
    applyChange(next);
  };

  const categoryHeaderOn = (cat: FeatureDef["category"]) => {
    const mainParent = CATEGORY_MAIN_PARENT[cat];
    if (mainParent) return features[mainParent];
    const toggleable = featuresInCategory(cat);
    return toggleable.length > 0 && toggleable.every((f) => features[f.key]);
  };

  const categoryHeaderDisabled = (cat: FeatureDef["category"]) => {
    const mainParent = CATEGORY_MAIN_PARENT[cat];
    if (mainParent) return isGloballyOff(mainParent);
    return featuresInCategory(cat).every((f) => isGloballyOff(f.key));
  };

  const categoryHeaderHint = (cat: FeatureDef["category"]) => {
    const mainParent = CATEGORY_MAIN_PARENT[cat];
    if (!mainParent) return null;
    return FEATURE_LIST.find((f) => f.key === mainParent)?.label ?? null;
  };

  const enabled = FEATURE_LIST.filter((f) => isEffectiveOn(f.key)).length;

  const renderFeatureRow = (
    f: FeatureDef,
    opts?: { indent?: boolean; disabled?: boolean; forcedOff?: boolean }
  ) => {
    if (!showKey(f.key)) return null;
    const globallyOff = isGloballyOff(f.key);
    const disabled = opts?.disabled || globallyOff;
    const shownOn = opts?.forcedOff ? false : features[f.key];

    return (
      <div
        key={f.key}
        className={clsx(
          "flex items-center justify-between gap-3 px-3 py-2",
          globallyOff && "opacity-60",
          opts?.indent && "bg-slate-900/20"
        )}
      >
        <span className="flex items-center gap-1.5 text-slate-300">
          {opts?.indent ? (
            <ChevronRight className="h-3.5 w-3.5 shrink-0 text-slate-600" />
          ) : null}
          {f.label}
          {globallyOff && (
            <span className="ml-1 text-[10px] font-bold uppercase text-rose-400">
              (Global off)
            </span>
          )}
        </span>
        <Toggle
          on={shownOn}
          disabled={disabled}
          onChange={() => !disabled && toggleKey(f.key)}
        />
      </div>
    );
  };

  const renderParentBlock = (f: FeatureDef) => {
    if (!showKey(f.key)) return null;
    const children = getChildFeatures(f.key).filter((c) => showKey(c.key));
    const parentOn = features[f.key];

    return (
      <div key={f.key} className="border-t border-slate-700/40 first:border-t-0">
        <div className="flex items-center justify-between gap-3 bg-slate-800/40 px-3 py-2">
          <div>
            <span className="font-medium text-slate-200">{f.label}</span>
            <span className="ml-2 text-[10px] text-slate-500">
              {children.length} sub-features
            </span>
          </div>
          <Toggle
            on={parentOn}
            disabled={isGloballyOff(f.key)}
            onChange={() => toggleKey(f.key)}
          />
        </div>
        <div className="divide-y divide-slate-700/40 border-l-2 border-orange-500/30">
          {children.map((c) =>
            renderFeatureRow(c, {
              indent: true,
              disabled: !parentOn || isGloballyOff(c.key),
              forcedOff: !parentOn,
            })
          )}
        </div>
        {!parentOn && (
          <p className="px-3 py-1.5 text-[10px] text-amber-400/80">
            Parent OFF — turn parent ON to edit sub-features
          </p>
        )}
      </div>
    );
  };

  const renderCategoryBody = (cat: FeatureDef["category"]) => {
    const mainParent = CATEGORY_MAIN_PARENT[cat];

    if (mainParent) {
      const mainOn = features[mainParent];
      const mainChildren = getChildFeatures(mainParent);
      const standalone = topLevelInCategory(cat).filter((f) => f.key !== mainParent);

      return (
        <>
          {mainChildren.length > 0 ? (
            <div className="divide-y divide-slate-700/40 border-l-2 border-orange-500/30">
              {mainChildren.map((c) =>
                renderFeatureRow(c, {
                  indent: true,
                  disabled: !mainOn || isGloballyOff(c.key),
                  forcedOff: !mainOn,
                })
              )}
            </div>
          ) : null}
          {!mainOn && mainChildren.length > 0 ? (
            <p className="px-3 py-1.5 text-[10px] text-amber-400/80">
              Parent OFF — use header toggle to enable sub-features
            </p>
          ) : null}
          {standalone.map((f) =>
            isParentFeature(f.key) ? renderParentBlock(f) : renderFeatureRow(f)
          )}
        </>
      );
    }

    return topLevelInCategory(cat).map((f) =>
      isParentFeature(f.key) ? renderParentBlock(f) : renderFeatureRow(f)
    );
  };

  return (
    <div className="space-y-3">
      <p className="text-xs text-slate-400">
        <strong className="text-emerald-400">{enabled}</strong> / {FEATURE_LIST.length}{" "}
        features {planMode ? "included in this package" : "enabled for this user"}
      </p>
      {(Object.keys(grouped) as FeatureDef["category"][])
        .filter((cat) => grouped[cat]?.length)
        .map((cat) => {
        const hint = categoryHeaderHint(cat);
        return (
          <div
            key={cat}
            className={clsx(
              "overflow-hidden rounded-xl border border-slate-700",
              compact ? "text-xs" : "text-sm"
            )}
          >
            <div className="flex items-center justify-between gap-3 border-b border-slate-700 bg-slate-800/80 px-3 py-2.5">
              <div>
                <p className="font-semibold text-orange-300">{CATEGORY_LABELS[cat]}</p>
                {hint ? (
                  <p className="text-[10px] text-slate-500">Parent: {hint}</p>
                ) : (
                  <p className="text-[10px] text-slate-500">Toggle all in section</p>
                )}
              </div>
              <Toggle
                size="md"
                on={categoryHeaderOn(cat)}
                disabled={categoryHeaderDisabled(cat)}
                onChange={() => toggleCategoryHeader(cat)}
              />
            </div>
            <div className="divide-y divide-slate-700/60">{renderCategoryBody(cat)}</div>
          </div>
        );
      })}
    </div>
  );
}
