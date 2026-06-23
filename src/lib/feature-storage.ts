import {
  DEFAULT_FEATURES,
  FEATURE_LIST,
  normalizeStoredFeatures,
  type FeatureKey,
} from "./features";

export const GLOBAL_FEATURES_UPDATED = "youraiseller-global-features-updated";
export const SESSION_FEATURES_UPDATED = "youraiseller-session-features-updated";

export const GLOBAL_FEATURES_KEY = "youraiseller-global-features";
export const SESSION_FEATURES_KEY = "youraiseller-features";
export const SESSION_USER_KEY = "youraiseller-session-user";

export function loadStoredFeatures(storageKey: string): Record<FeatureKey, boolean> {
  if (typeof window === "undefined") return { ...DEFAULT_FEATURES };
  try {
    const raw =
      storageKey === SESSION_FEATURES_KEY
        ? localStorage.getItem(SESSION_FEATURES_KEY)
        : localStorage.getItem(storageKey);
    if (!raw) return { ...DEFAULT_FEATURES };
    return normalizeStoredFeatures(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_FEATURES };
  }
}

/** User entitlements AND global admin switches — both must be ON. */
export function mergeEffectiveFeatures(
  userFeatures: Record<FeatureKey, boolean>,
  globalFeatures: Record<FeatureKey, boolean>
): Record<FeatureKey, boolean> {
  const merged = { ...DEFAULT_FEATURES };
  for (const f of FEATURE_LIST) {
    merged[f.key] =
      (userFeatures[f.key] ?? true) && (globalFeatures[f.key] ?? true);
  }
  return merged;
}

export function loadGlobalFeatures(): Record<FeatureKey, boolean> {
  return loadStoredFeatures(GLOBAL_FEATURES_KEY);
}

export function loadSessionUserFeatures(): Record<FeatureKey, boolean> {
  return loadStoredFeatures(SESSION_FEATURES_KEY);
}

export function getEffectiveSessionFeatures(): Record<FeatureKey, boolean> {
  return mergeEffectiveFeatures(
    loadSessionUserFeatures(),
    loadGlobalFeatures()
  );
}

export function countEffectiveFeatures(
  userFeatures: Record<FeatureKey, boolean>
): number {
  const effective = mergeEffectiveFeatures(userFeatures, loadGlobalFeatures());
  return FEATURE_LIST.filter((f) => effective[f.key]).length;
}

export function saveStoredFeatures(
  storageKey: string,
  features: Record<FeatureKey, boolean>
) {
  if (typeof window === "undefined") return;
  const json = JSON.stringify(features);
  if (storageKey === SESSION_FEATURES_KEY) {
    // Only write + emit when the value actually changed. getSessionUser() calls
    // this on every invocation, and a FeatureContext listener reacts to the
    // event by calling getSessionUser() again — without this guard that mutual
    // call recursed forever (RangeError: Maximum call stack size exceeded),
    // freezing any page that reads the session often (e.g. the Web Order List).
    if (localStorage.getItem(SESSION_FEATURES_KEY) === json) return;
    localStorage.setItem(storageKey, json);
    if (localStorage.getItem(SESSION_USER_KEY)) {
      localStorage.setItem(SESSION_FEATURES_KEY, json);
    }
    window.dispatchEvent(new Event(SESSION_FEATURES_UPDATED));
  } else if (storageKey === GLOBAL_FEATURES_KEY) {
    if (localStorage.getItem(GLOBAL_FEATURES_KEY) === json) return;
    localStorage.setItem(storageKey, json);
    window.dispatchEvent(new Event(GLOBAL_FEATURES_UPDATED));
  } else {
    localStorage.setItem(storageKey, json);
  }
}
