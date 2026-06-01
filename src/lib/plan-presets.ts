import { DEFAULT_FEATURES, FEATURE_LIST, type FeatureKey } from "./features";
import type { DevUser } from "./dev-users";

function build(
  overrides: Partial<Record<FeatureKey, boolean>>
): Record<FeatureKey, boolean> {
  return { ...DEFAULT_FEATURES, ...overrides };
}

/** Default features per plan when creating a new user */
export const PLAN_PRESETS: Record<DevUser["plan"], Record<FeatureKey, boolean>> = {
  basic: build({
    founder_dashboard: false,
    meta_ads: false,
    hrm: false,
    automation: false,
    accounting: false,
    woocommerce: false,
    additional_sites: false,
    auto_call_center: false,
    preorders: false,
  }),
  pro: build({
    founder_dashboard: false,
    hrm: false,
    automation: false,
  }),
  enterprise: { ...DEFAULT_FEATURES },
};

export function getPlanFeatures(plan: DevUser["plan"]): Record<FeatureKey, boolean> {
  return { ...PLAN_PRESETS[plan] };
}

export function countEnabledFeatures(features: Record<FeatureKey, boolean>): number {
  return FEATURE_LIST.filter((f) => features[f.key]).length;
}
