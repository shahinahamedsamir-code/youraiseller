import type { FeatureKey } from "./features";
import type { DevUser } from "./dev-users";

export type PlanId = DevUser["plan"];

export type PlanDefinition = {
  id: PlanId;
  /** Display name e.g. Starter */
  name: string;
  /** Short pitch for sales */
  tagline: string;
  /** e.g. ৳2,500/mo — display only */
  priceLabel: string;
  /** Tailwind badge classes */
  badgeClass: string;
  /** Feature defaults for this package */
  features: Record<FeatureKey, boolean>;
  sortOrder: number;
  active: boolean;
};

export type PlanConfig = {
  plans: PlanDefinition[];
  updatedAt: string;
};

export const PLAN_IDS: PlanId[] = ["basic", "pro", "enterprise"];
