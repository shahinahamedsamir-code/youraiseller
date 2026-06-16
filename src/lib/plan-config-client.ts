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

function configTime(config: PlanConfig): number {
  const t = Date.parse(config.updatedAt);
  return Number.isNaN(t) ? 0 : t;
}

function newestPlanConfig(a: PlanConfig, b: PlanConfig): PlanConfig {
  return configTime(a) >= configTime(b) ? a : b;
}

/** Persist to localStorage; optionally notify listeners after explicit saves only. */
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
  const local = loadPlanConfigLocal();
  try {
    const res = await fetch("/api/dev-admin/plans", { cache: "no-store" });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.config) return local;
    const config = newestPlanConfig(local, normalizePlanConfig(json.config));
    cacheLocal(config);
    return config;
  } catch {
    return local;
  }
}

export async function fetchPublicPlanConfig(): Promise<PlanConfig> {
  const local = loadPlanConfigLocal();
  try {
    const res = await fetch("/api/plans", { cache: "no-store" });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.config) return local;
    const config = newestPlanConfig(local, normalizePlanConfig(json.config));
    cacheLocal(config);
    return config;
  } catch {
    return local;
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
