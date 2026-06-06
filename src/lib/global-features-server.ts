import { promises as fs } from "fs";
import path from "path";
import {
  DEFAULT_FEATURES,
  normalizeStoredFeatures,
  type FeatureKey,
} from "./features";

const DATA_FILE = path.join(process.cwd(), "data", "platform", "global-features.json");

export type GlobalFeaturesConfig = {
  features: Record<FeatureKey, boolean>;
  updatedAt: string;
};

export function normalizeGlobalFeaturesConfig(raw: unknown): GlobalFeaturesConfig {
  if (!raw || typeof raw !== "object") {
    return { features: { ...DEFAULT_FEATURES }, updatedAt: new Date().toISOString() };
  }
  const r = raw as Partial<GlobalFeaturesConfig>;
  return {
    features: normalizeStoredFeatures(r.features),
    updatedAt: typeof r.updatedAt === "string" ? r.updatedAt : new Date().toISOString(),
  };
}

export async function loadGlobalFeaturesConfig(): Promise<GlobalFeaturesConfig> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    return normalizeGlobalFeaturesConfig(JSON.parse(raw));
  } catch {
    return { features: { ...DEFAULT_FEATURES }, updatedAt: new Date().toISOString() };
  }
}

export async function saveGlobalFeaturesConfig(
  features: Record<FeatureKey, boolean>
): Promise<GlobalFeaturesConfig> {
  const next: GlobalFeaturesConfig = {
    features: normalizeStoredFeatures(features),
    updatedAt: new Date().toISOString(),
  };
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(next, null, 2), "utf-8");
  return next;
}
