import type { FeatureKey } from "./features";
import type { DevUser } from "./dev-users";
import {
  PLAN_PRESETS,
  countEnabledFeatures,
  normalizePlanConfig,
  planFeaturesFromConfig,
} from "./plan-config-utils";

export { PLAN_PRESETS, countEnabledFeatures };

const STORAGE_KEY = "youraiseller-plan-config";

/** Reads cached plan config in browser; falls back to static defaults on server. */
export function getPlanFeatures(plan: DevUser["plan"]): Record<FeatureKey, boolean> {
  if (typeof window !== "undefined") {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        return planFeaturesFromConfig(normalizePlanConfig(JSON.parse(raw)), plan);
      }
    } catch {
      /* use fallback */
    }
  }
  return { ...PLAN_PRESETS[plan] };
}
