import type { PlanId } from "./plan-config-types";

export type SubscriptionCoupon = {
  code: string;
  label: string;
  discountType: "percent" | "fixed";
  discountValue: number;
  active?: boolean;
  minMonths?: number;
  plans?: PlanId[];
};

export const SUBSCRIPTION_COUPONS: SubscriptionCoupon[] = [
  {
    code: "WELCOME10",
    label: "10% off renewal",
    discountType: "percent",
    discountValue: 10,
  },
  {
    code: "SAVE1000",
    label: "৳1,000 off",
    discountType: "fixed",
    discountValue: 1000,
    minMonths: 1,
  },
  {
    code: "YAI25",
    label: "25% off any plan",
    discountType: "percent",
    discountValue: 25,
  },
];

export function normalizeCouponCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export function findSubscriptionCoupon(code: string): SubscriptionCoupon | undefined {
  const normalized = normalizeCouponCode(code);
  if (!normalized) return undefined;
  return SUBSCRIPTION_COUPONS.find(
    (c) => c.active !== false && normalizeCouponCode(c.code) === normalized
  );
}

export function calcCouponDiscountTaka(
  subtotalTaka: number,
  coupon: SubscriptionCoupon
): number {
  if (subtotalTaka <= 0) return 0;
  let discount =
    coupon.discountType === "percent"
      ? Math.round((subtotalTaka * coupon.discountValue) / 100)
      : coupon.discountValue;
  discount = Math.max(0, Math.min(subtotalTaka, discount));
  return Math.round(discount * 100) / 100;
}

export function validateSubscriptionCoupon(
  code: string,
  ctx: { planId: PlanId; months: number; subtotalTaka: number }
):
  | {
      ok: true;
      coupon: SubscriptionCoupon;
      discountTaka: number;
      totalTaka: number;
    }
  | { ok: false; error: string } {
  const coupon = findSubscriptionCoupon(code);
  if (!coupon) {
    return { ok: false, error: "Invalid or expired coupon code." };
  }
  if (coupon.plans?.length && !coupon.plans.includes(ctx.planId)) {
    return { ok: false, error: "This coupon does not apply to your plan." };
  }
  if (coupon.minMonths && ctx.months < coupon.minMonths) {
    return {
      ok: false,
      error: `Coupon requires at least ${coupon.minMonths} month${coupon.minMonths > 1 ? "s" : ""}.`,
    };
  }
  const discountTaka = calcCouponDiscountTaka(ctx.subtotalTaka, coupon);
  if (discountTaka <= 0) {
    return { ok: false, error: "Coupon could not be applied to this amount." };
  }
  const totalTaka = Math.max(
    0,
    Math.round((ctx.subtotalTaka - discountTaka) * 100) / 100
  );
  return { ok: true, coupon, discountTaka, totalTaka };
}
