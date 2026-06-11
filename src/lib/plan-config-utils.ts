import { DEFAULT_FEATURES, FEATURE_LIST, normalizeStoredFeatures, type FeatureKey } from "./features";
import type { PlanConfig, PlanDefinition, PlanId } from "./plan-config-types";

function buildFeatures(
  overrides: Partial<Record<FeatureKey, boolean>>
): Record<FeatureKey, boolean> {
  return { ...DEFAULT_FEATURES, ...overrides };
}

export const DEFAULT_PLAN_DEFINITIONS: PlanDefinition[] = [
  {
    id: "basic",
    name: "Starter",
    tagline: "New shop — orders, web list & basic inventory",
    priceLabel: "৳1,999/mo",
    badgeClass: "bg-slate-600 text-slate-100 ring-slate-500/40",
    sortOrder: 1,
    active: true,
    features: buildFeatures({
      founder_dashboard: false,
      meta_ads: false,
      hrm: false,
      automation: false,
      accounting: false,
      woocommerce: false,
      additional_sites: false,
      auto_call_center: false,
      auto_call_integration: false,
      preorders: false,
      super_edit: false,
      inv_smart_restock: false,
      inv_dashboard: false,
      shopify_integration: false,
      courier_integration: false,
    }),
  },
  {
    id: "pro",
    name: "Growth",
    tagline: "Scaling brand — WooCommerce, Auto Call & integrations",
    priceLabel: "৳4,999/mo",
    badgeClass: "bg-violet-600 text-white ring-violet-400/40",
    sortOrder: 2,
    active: true,
    features: buildFeatures({
      founder_dashboard: false,
      hrm: false,
      automation: false,
      additional_sites: false,
    }),
  },
  {
    id: "enterprise",
    name: "Business",
    tagline: "Full power — every module, founder view & automation",
    priceLabel: "৳9,999/mo",
    badgeClass: "bg-amber-500 text-slate-900 ring-amber-400/50",
    sortOrder: 3,
    active: true,
    features: { ...DEFAULT_FEATURES },
  },
];

export const DEFAULT_PLAN_CONFIG: PlanConfig = {
  plans: DEFAULT_PLAN_DEFINITIONS.map((p) => ({
    ...p,
    features: { ...p.features },
  })),
  updatedAt: new Date().toISOString(),
};

function hasFeatureOverrides(raw: unknown): boolean {
  return !!raw && typeof raw === "object" && Object.keys(raw).length > 0;
}

function normalizeFeatures(raw: unknown): Record<FeatureKey, boolean> {
  const base = { ...DEFAULT_FEATURES };
  if (!hasFeatureOverrides(raw)) return base;
  return normalizeStoredFeatures(raw);
}

function normalizePlan(raw: unknown, fallback: PlanDefinition): PlanDefinition {
  if (!raw || typeof raw !== "object") {
    return { ...fallback, features: { ...fallback.features } };
  }
  const r = raw as Partial<PlanDefinition>;
  return {
    id: fallback.id,
    name: typeof r.name === "string" && r.name.trim() ? r.name.trim() : fallback.name,
    tagline:
      typeof r.tagline === "string" && r.tagline.trim() ? r.tagline.trim() : fallback.tagline,
    priceLabel:
      typeof r.priceLabel === "string" && r.priceLabel.trim()
        ? r.priceLabel.trim()
        : fallback.priceLabel,
    badgeClass:
      typeof r.badgeClass === "string" && r.badgeClass.trim()
        ? r.badgeClass.trim()
        : fallback.badgeClass,
    sortOrder:
      typeof r.sortOrder === "number" && Number.isFinite(r.sortOrder)
        ? r.sortOrder
        : fallback.sortOrder,
    active: r.active !== false,
    features: hasFeatureOverrides(r.features)
      ? normalizeFeatures(r.features)
      : { ...fallback.features },
  };
}

export function normalizePlanConfig(raw: unknown): PlanConfig {
  if (!raw || typeof raw !== "object") return { ...DEFAULT_PLAN_CONFIG };

  const r = raw as Partial<PlanConfig>;
  const byId = new Map<PlanId, PlanDefinition>();

  if (Array.isArray(r.plans)) {
    for (const row of r.plans) {
      const id = (row as Partial<PlanDefinition>)?.id;
      const fallback = DEFAULT_PLAN_DEFINITIONS.find((p) => p.id === id);
      if (fallback) byId.set(fallback.id, normalizePlan(row, fallback));
    }
  }

  for (const fallback of DEFAULT_PLAN_DEFINITIONS) {
    if (!byId.has(fallback.id)) {
      byId.set(fallback.id, { ...fallback, features: { ...fallback.features } });
    }
  }

  return {
    plans: DEFAULT_PLAN_DEFINITIONS.map((d) => byId.get(d.id)!),
    updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : new Date().toISOString(),
  };
}

export function getPlanDefinition(
  config: PlanConfig,
  planId: PlanId
): PlanDefinition {
  return (
    config.plans.find((p) => p.id === planId) ??
    DEFAULT_PLAN_DEFINITIONS.find((p) => p.id === planId)!
  );
}

export function planFeaturesFromConfig(
  config: PlanConfig,
  planId: PlanId
): Record<FeatureKey, boolean> {
  return { ...getPlanDefinition(config, planId).features };
}

/** Legacy static presets — same as default config */
export const PLAN_PRESETS: Record<PlanId, Record<FeatureKey, boolean>> = {
  basic: { ...DEFAULT_PLAN_DEFINITIONS[0].features },
  pro: { ...DEFAULT_PLAN_DEFINITIONS[1].features },
  enterprise: { ...DEFAULT_PLAN_DEFINITIONS[2].features },
};

export function countEnabledFeatures(features: Record<FeatureKey, boolean>): number {
  return FEATURE_LIST.filter((f) => features[f.key]).length;
}
