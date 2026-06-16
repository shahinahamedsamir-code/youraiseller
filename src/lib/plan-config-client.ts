"use client";

import type { FeatureKey } from "./features";
import {
  DEFAULT_PLAN_CONFIG,
  normalizePlanConfig,
  planFeaturesFromConfig,
  getPlanDefinition,
  countEnabledFeatures,
} from "./plan-config-utils";
import type { PlanConfig, PlanDefinition, PlanId } from "./plan-config-types";

export const PLAN_CONFIG_UPDATED = "youraiseller-plan-config-updated";

const STORAGE_KEY = "youraiseller-plan-config";

function cacheLocal(config: PlanConfig): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
}

/** Persist to localStorage; optionally notify listeners (after explicit saves only). */
export function savePlanConfigLocal(config: PlanConfig, notify = true): void {
  cacheLocal(config);
  if (notify && typeof window !== "undefined") {
    window.dispatchEvent(new Event(PLAN_CONFIG_UPDATED));
  }
}

export function loadPlanConfigLocal(): PlanConfig {
  if (typeof window === "undefined") return DEFAULT_PLAN_CONFIG;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_PLAN_CONFIG;
    return normalizePlanConfig(JSON.parse(raw));
  } catch {
    return DEFAULT_PLAN_CONFIG;
  }
}

export async function fetchPlanConfigFromServer(): Promise<PlanConfig> {
  try {
    const res = await fetch("/api/dev-admin/plans", { cache: "no-store" });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.config) {
      return loadPlanConfigLocal();
    }
    const config = normalizePlanConfig(json.config);
    // Cache only — do not dispatch; listeners would re-fetch and loop.
    cacheLocal(config);
    return config;
  } catch {
    return loadPlanConfigLocal();
  }
}

export async function fetchPublicPlanConfig(): Promise<PlanConfig> {
  try {
    const res = await fetch("/api/plans", { cache: "no-store" });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.config) {
      return loadPlanConfigLocal();
    }
    const config = normalizePlanConfig(json.config);
    cacheLocal(config);
    return config;
  } catch {
    return loadPlanConfigLocal();
  }
}

export async function savePlanConfigToServer(config: PlanConfig): Promise<{
  ok: boolean;
  error?: string;
  config?: PlanConfig;
}> {
  const res = await fetch("/api/dev-admin/plans", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ config }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: json.error ?? "Save failed" };
  const next = normalizePlanConfig(json.config);
  savePlanConfigLocal(next, true);
  return { ok: true, config: next };
}

export function getPlanFeaturesFromLocal(plan: PlanId): Record<FeatureKey, boolean> {
  return planFeaturesFromConfig(loadPlanConfigLocal(), plan);
}

export function getPlanDefinitionLocal(plan: PlanId): PlanDefinition {
  return getPlanDefinition(loadPlanConfigLocal(), plan);
}

export function listActivePlansLocal(): PlanDefinition[] {
  return loadPlanConfigLocal()
    .plans.filter((p) => p.active)
    .sort((a, b) => a.sortOrder - b.sortOrder);
}

export { countEnabledFeatures as countPlanEnabledFeatures };
