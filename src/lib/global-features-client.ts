"use client";

import { DEFAULT_FEATURES, normalizeStoredFeatures, type FeatureKey } from "./features";
import { GLOBAL_FEATURES_KEY } from "./feature-storage";

export const GLOBAL_FEATURES_SERVER_UPDATED = "youraiseller-global-features-server-updated";

function cacheLocal(features: Record<FeatureKey, boolean>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(GLOBAL_FEATURES_KEY, JSON.stringify(features));
}

export async function fetchGlobalFeaturesFromServer(): Promise<Record<FeatureKey, boolean>> {
  try {
    const res = await fetch("/api/platform/global-features", { cache: "no-store" });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.features) {
      return loadGlobalFeaturesLocal();
    }
    const features = normalizeStoredFeatures(json.features);
    cacheLocal(features);
    return features;
  } catch {
    return loadGlobalFeaturesLocal();
  }
}

export function loadGlobalFeaturesLocal(): Record<FeatureKey, boolean> {
  if (typeof window === "undefined") return { ...DEFAULT_FEATURES };
  try {
    const raw = localStorage.getItem(GLOBAL_FEATURES_KEY);
    if (!raw) return { ...DEFAULT_FEATURES };
    return normalizeStoredFeatures(JSON.parse(raw));
  } catch {
    return { ...DEFAULT_FEATURES };
  }
}

export async function saveGlobalFeaturesToServer(
  features: Record<FeatureKey, boolean>
): Promise<{ ok: boolean; error?: string; features?: Record<FeatureKey, boolean> }> {
  const res = await fetch("/api/platform/global-features", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ features }),
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) return { ok: false, error: json.error ?? "Save failed" };
  const next = normalizeStoredFeatures(json.features);
  cacheLocal(next);
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event(GLOBAL_FEATURES_SERVER_UPDATED));
  }
  return { ok: true, features: next };
}
