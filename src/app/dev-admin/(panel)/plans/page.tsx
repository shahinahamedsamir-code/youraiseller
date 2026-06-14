"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import {
  Layers,
  Save,
  RotateCcw,
  CheckCircle2,
  AlertCircle,
  Sparkles,
} from "lucide-react";
import type { PlanConfig, PlanDefinition, PlanId } from "@/lib/plan-config-types";
import { FEATURE_LIST } from "@/lib/features";
import {
  fetchPlanConfigFromServer,
  loadPlanConfigLocal,
  savePlanConfigToServer,
  countPlanEnabledFeatures,
  PLAN_CONFIG_UPDATED,
} from "@/lib/plan-config-client";
import { UserFeatureEditor } from "@/components/dev-admin/UserFeatureEditor";

const inputClass =
  "w-full rounded-xl border border-slate-600 bg-slate-900 px-3 py-2 text-sm text-white outline-none focus:border-orange-500";

export default function DevPlansPage() {
  const [config, setConfig] = useState<PlanConfig | null>(null);
  const [activePlanId, setActivePlanId] = useState<PlanId>("basic");
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const load = useCallback(async () => {
    const next = await fetchPlanConfigFromServer();
    setConfig(next);
  }, []);

  useEffect(() => {
    load();
    const onUpdate = () => setConfig(loadPlanConfigLocal());
    window.addEventListener(PLAN_CONFIG_UPDATED, onUpdate);
    return () => window.removeEventListener(PLAN_CONFIG_UPDATED, onUpdate);
  }, [load]);

  const activePlan = useMemo(
    () => config?.plans.find((p) => p.id === activePlanId),
    [config, activePlanId]
  );

  const updateActivePlan = (patch: Partial<PlanDefinition>) => {
    if (!config || !activePlan) return;
    setConfig({
      ...config,
      plans: config.plans.map((p) =>
        p.id === activePlanId ? { ...p, ...patch, features: patch.features ?? p.features } : p
      ),
    });
    setMessage(null);
  };

  const handleSave = async () => {
    if (!config) return;
    setSaving(true);
    setMessage(null);
    const result = await savePlanConfigToServer(config);
    setSaving(false);
    if (result.ok && result.config) {
      setConfig(result.config);
      setMessage({ type: "ok", text: "Plan packages saved. New users will get updated defaults." });
    } else {
      setMessage({ type: "err", text: result.error ?? "Save failed" });
    }
  };

  const resetPlan = () => {
    if (!config) return;
    fetchPlanConfigFromServer().then((fresh) => {
      const original = fresh.plans.find((p) => p.id === activePlanId);
      if (!original) return;
      updateActivePlan({
        name: original.name,
        tagline: original.tagline,
        priceLabel: original.priceLabel,
        active: original.active,
        features: { ...original.features },
      });
    });
  };

  if (!config) {
    return (
      <div className="flex min-h-[40vh] items-center justify-center text-slate-400">
        Loading plan packages…
      </div>
    );
  }

  return (
    <div className="max-w-5xl">
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-bold text-white">
            <Layers className="h-7 w-7 text-orange-400" />
            Plan Packages
          </h1>
          <p className="mt-1 max-w-xl text-sm text-slate-400">
            Define Starter, Growth &amp; Business packages. Toggle any feature on or off per plan.
            Users inherit their plan — you can still override per customer in Software Users.
          </p>
        </div>
        <button
          type="button"
          onClick={handleSave}
          disabled={saving}
          className="flex items-center gap-2 rounded-xl bg-orange-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-orange-500 disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          {saving ? "Saving…" : "Save all plans"}
        </button>
      </div>

      {message ? (
        <div
          className={clsx(
            "mb-4 flex items-center gap-2 rounded-xl px-4 py-3 text-sm",
            message.type === "ok"
              ? "border border-emerald-500/30 bg-emerald-500/10 text-emerald-300"
              : "border border-rose-500/30 bg-rose-500/10 text-rose-300"
          )}
        >
          {message.type === "ok" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          {message.text}
        </div>
      ) : null}

      {/* Overview cards */}
      <div className="mb-6 grid gap-3 sm:grid-cols-3">
        {config.plans
          .slice()
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map((plan) => {
            const enabled = countPlanEnabledFeatures(plan.features);
            const selected = plan.id === activePlanId;
            return (
              <button
                key={plan.id}
                type="button"
                onClick={() => setActivePlanId(plan.id)}
                className={clsx(
                  "rounded-2xl border p-4 text-left transition",
                  selected
                    ? "border-orange-500 bg-orange-500/10 ring-1 ring-orange-500/40"
                    : "border-slate-700 bg-slate-800/50 hover:border-slate-500"
                )}
              >
                <div className="flex items-center justify-between gap-2">
                  <span
                    className={clsx(
                      "rounded-full px-2.5 py-0.5 text-xs font-bold ring-1",
                      plan.badgeClass
                    )}
                  >
                    {plan.name}
                  </span>
                  {plan.id === "enterprise" ? (
                    <Sparkles className="h-4 w-4 text-amber-400" />
                  ) : null}
                </div>
                <p className="mt-2 text-2xl font-bold text-white">
                  {enabled}
                  <span className="text-sm font-normal text-slate-500">
                    {" "}
                    / {FEATURE_LIST.length}
                  </span>
                </p>
                <p className="text-xs text-slate-400">features included</p>
                <p className="mt-2 text-sm font-semibold text-orange-300">{plan.priceLabel}</p>
              </button>
            );
          })}
      </div>

      {activePlan ? (
        <div className="rounded-2xl border border-slate-700 bg-slate-800/40 p-5 sm:p-6">
          <div className="mb-5 flex flex-wrap items-center justify-between gap-3 border-b border-slate-700 pb-4">
            <div>
              <h2 className="text-lg font-bold text-white">
                Edit: {activePlan.name}{" "}
                <span className="font-mono text-sm font-normal text-slate-500">
                  ({activePlan.id})
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                {countPlanEnabledFeatures(activePlan.features)} features on in this package
              </p>
            </div>
            <button
              type="button"
              onClick={resetPlan}
              className="flex items-center gap-1.5 rounded-lg border border-slate-600 px-3 py-1.5 text-xs text-slate-400 hover:text-white"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Reload from server
            </button>
          </div>

          <div className="mb-6 grid gap-4 sm:grid-cols-3">
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                Display name
              </label>
              <input
                value={activePlan.name}
                onChange={(e) => updateActivePlan({ name: e.target.value })}
                className={inputClass}
                placeholder="Starter"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                Price label
              </label>
              <input
                value={activePlan.priceLabel}
                onChange={(e) => updateActivePlan({ priceLabel: e.target.value })}
                className={inputClass}
                placeholder="৳1,999/mo"
              />
            </div>
            <div className="flex items-end">
              <label className="flex cursor-pointer items-center gap-2 rounded-xl border border-slate-600 bg-slate-900 px-3 py-2.5 text-sm text-slate-300">
                <input
                  type="checkbox"
                  checked={activePlan.active}
                  onChange={(e) => updateActivePlan({ active: e.target.checked })}
                  className="rounded border-slate-600"
                />
                Available for new signups
              </label>
            </div>
            <div className="sm:col-span-3">
              <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
                Tagline (shown when picking plan)
              </label>
              <input
                value={activePlan.tagline}
                onChange={(e) => updateActivePlan({ tagline: e.target.value })}
                className={inputClass}
                placeholder="Short description for sales"
              />
            </div>
          </div>

          <div className="mb-3 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() =>
                updateActivePlan({
                  features: Object.fromEntries(
                    FEATURE_LIST.map((f) => [f.key, true])
                  ) as PlanDefinition["features"],
                })
              }
              className="rounded-lg bg-emerald-600/20 px-3 py-1.5 text-xs font-semibold text-emerald-300"
            >
              Enable all
            </button>
            <button
              type="button"
              onClick={() =>
                updateActivePlan({
                  features: Object.fromEntries(
                    FEATURE_LIST.map((f) => [f.key, false])
                  ) as PlanDefinition["features"],
                })
              }
              className="rounded-lg bg-slate-700 px-3 py-1.5 text-xs font-semibold text-slate-300"
            >
              Disable all
            </button>
          </div>

          <UserFeatureEditor
            planMode
            features={activePlan.features}
            onChange={(features) => updateActivePlan({ features })}
          />
        </div>
      ) : null}
    </div>
  );
}
