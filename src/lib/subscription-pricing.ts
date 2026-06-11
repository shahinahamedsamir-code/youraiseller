import type { PlanId } from "./plan-config-types";

const FALLBACK_PLAN_PRICE: Record<PlanId, number> = {
  basic: 1999,
  pro: 4999,
  enterprise: 9999,
};

/** Parse ৳9,999/mo → 9999 */
export function parsePlanPriceTaka(priceLabel: string): number {
  const digits = priceLabel.replace(/[^\d]/g, "");
  const n = Number(digits);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

export function planMonthlyPriceTaka(planId: PlanId, priceLabel: string): number {
  const parsed = parsePlanPriceTaka(priceLabel);
  return parsed > 0 ? parsed : FALLBACK_PLAN_PRICE[planId];
}

export function calcSubscriptionRenewTotal(
  monthlyTaka: number,
  months: number
): number {
  const m = Math.max(1, Math.floor(months) || 1);
  return Math.round(monthlyTaka * m * 100) / 100;
}
