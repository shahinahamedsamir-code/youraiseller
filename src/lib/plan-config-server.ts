import { promises as fs } from "fs";
import path from "path";
import type { PlanConfig } from "./plan-config-types";
import {
  DEFAULT_PLAN_CONFIG,
  DEFAULT_PLAN_DEFINITIONS,
  normalizePlanConfig,
} from "./plan-config-utils";

const DATA_FILE = path.join(process.cwd(), "data", "platform", "plan-config.json");

export {
  DEFAULT_PLAN_CONFIG,
  DEFAULT_PLAN_DEFINITIONS,
  normalizePlanConfig,
  getPlanDefinition,
  planFeaturesFromConfig,
  PLAN_PRESETS,
  countEnabledFeatures,
} from "./plan-config-utils";

export async function loadPlanConfig(): Promise<PlanConfig> {
  try {
    const raw = await fs.readFile(DATA_FILE, "utf-8");
    return normalizePlanConfig(JSON.parse(raw));
  } catch {
    return {
      ...DEFAULT_PLAN_CONFIG,
      plans: DEFAULT_PLAN_DEFINITIONS.map((p) => ({
        ...p,
        features: { ...p.features },
      })),
    };
  }
}

export async function savePlanConfig(config: PlanConfig): Promise<PlanConfig> {
  const next = normalizePlanConfig(config);
  next.updatedAt = new Date().toISOString();
  await fs.mkdir(path.dirname(DATA_FILE), { recursive: true });
  await fs.writeFile(DATA_FILE, JSON.stringify(next, null, 2), "utf-8");
  return next;
}
