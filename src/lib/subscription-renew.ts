import { getSessionUser, type DevUser } from "./dev-users";
import { fetchPublicPlanConfig, loadPlanConfigLocal } from "./plan-config-client";
import { getPlanDefinition } from "./plan-config-utils";
import type { PlanConfig } from "./plan-config-types";
import {
  findSubscriptionCoupon,
  validateSubscriptionCoupon,
  type SubscriptionCoupon,
} from "./subscription-coupons";
import {
  calcSubscriptionRenewTotal,
  planMonthlyPriceTaka,
} from "./subscription-pricing";

export type SubscriptionRenewQuote = {
  planId: DevUser["plan"];
  planName: string;
  priceLabel: string;
  monthlyTaka: number;
  months: number;
  subtotalTaka: number;
  discountTaka: number;
  totalTaka: number;
  coupon?: SubscriptionCoupon;
  couponCode?: string;
};

export function subscriptionRenewQuote(
  user: DevUser,
  months = 1,
  couponCode?: string,
  config: PlanConfig = loadPlanConfigLocal()
): SubscriptionRenewQuote {
  const plan = getPlanDefinition(config, user.plan);
  const monthlyTaka = planMonthlyPriceTaka(user.plan, plan.priceLabel);
  const monthCount = Math.max(1, Math.floor(months) || 1);
  const subtotalTaka = calcSubscriptionRenewTotal(monthlyTaka, monthCount);

  const base: SubscriptionRenewQuote = {
    planId: user.plan,
    planName: plan.name,
    priceLabel: plan.priceLabel,
    monthlyTaka,
    months: monthCount,
    subtotalTaka,
    discountTaka: 0,
    totalTaka: subtotalTaka,
  };

  const code = couponCode?.trim();
  if (!code) return base;

  const result = validateSubscriptionCoupon(code, {
    planId: user.plan,
    months: monthCount,
    subtotalTaka,
  });
  if (!result.ok) return base;

  return {
    ...base,
    discountTaka: result.discountTaka,
    totalTaka: result.totalTaka,
    coupon: result.coupon,
    couponCode: result.coupon.code,
  };
}

export function applySubscriptionCoupon(
  user: DevUser,
  months: number,
  couponCode: string,
  config: PlanConfig = loadPlanConfigLocal()
):
  | { ok: true; quote: SubscriptionRenewQuote }
  | { ok: false; error: string } {
  const plan = getPlanDefinition(config, user.plan);
  const monthlyTaka = planMonthlyPriceTaka(user.plan, plan.priceLabel);
  const monthCount = Math.max(1, Math.floor(months) || 1);
  const subtotalTaka = calcSubscriptionRenewTotal(monthlyTaka, monthCount);

  const result = validateSubscriptionCoupon(couponCode, {
    planId: user.plan,
    months: monthCount,
    subtotalTaka,
  });
  if (!result.ok) return result;

  return {
    ok: true,
    quote: {
      planId: user.plan,
      planName: plan.name,
      priceLabel: plan.priceLabel,
      monthlyTaka,
      months: monthCount,
      subtotalTaka,
      discountTaka: result.discountTaka,
      totalTaka: result.totalTaka,
      coupon: result.coupon,
      couponCode: result.coupon.code,
    },
  };
}

/**
 * Self-renew expired plan through PayStation Hosted Checkout.
 * The server creates the payment link and verifies the callback before activation.
 */
export async function startSubscriptionRenewPayment(
  userId: string,
  months = 1,
  couponCode?: string
): Promise<
  | { ok: true; paymentUrl: string; invoiceNumber: string; totalTaka: number }
  | { ok: false; error: string }
> {
  const sessionUser = getSessionUser();
  if (!sessionUser || sessionUser.id !== userId) {
    return { ok: false, error: "Session expired — sign in again." };
  }
  if (sessionUser.status !== "expired") {
    return { ok: false, error: "Only expired accounts can pay to renew here." };
  }

  const config = await fetchPublicPlanConfig();
  const quote = subscriptionRenewQuote(sessionUser, months, couponCode, config);
  if (quote.totalTaka <= 0) {
    return { ok: false, error: "Could not calculate plan price." };
  }

  if (couponCode?.trim()) {
    const coupon = findSubscriptionCoupon(couponCode);
    if (!coupon) {
      return { ok: false, error: "Coupon is no longer valid." };
    }
    const check = validateSubscriptionCoupon(couponCode, {
      planId: sessionUser.plan,
      months: quote.months,
      subtotalTaka: quote.subtotalTaka,
    });
    if (!check.ok) return check;
    if (check.totalTaka !== quote.totalTaka) {
      return { ok: false, error: "Coupon could not be applied. Try again." };
    }
  }

  try {
    const res = await fetch("/api/paystation/initiate", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        months: quote.months,
        couponCode: quote.couponCode,
        userId: sessionUser.id,
      }),
    });
    const data = (await res.json()) as {
      paymentUrl?: string;
      invoiceNumber?: string;
      amountTaka?: number;
      error?: string;
    };
    if (!res.ok || !data.paymentUrl || !data.invoiceNumber) {
      return { ok: false, error: data.error || "Could not start PayStation payment." };
    }
    return {
      ok: true,
      paymentUrl: data.paymentUrl,
      invoiceNumber: data.invoiceNumber,
      totalTaka: Number(data.amountTaka) || quote.totalTaka,
    };
  } catch {
    return { ok: false, error: "Could not connect to PayStation. Try again." };
  }
}
