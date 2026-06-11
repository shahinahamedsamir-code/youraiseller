import {
  activateUser,
  applyUserToSession,
  getSessionUser,
  type DevUser,
} from "./dev-users";
import { loadPlanConfigLocal } from "./plan-config-client";
import { getPlanDefinition } from "./plan-config-utils";
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
  couponCode?: string
): SubscriptionRenewQuote {
  const config = loadPlanConfigLocal();
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
  couponCode: string
):
  | { ok: true; quote: SubscriptionRenewQuote }
  | { ok: false; error: string } {
  const config = loadPlanConfigLocal();
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
 * Self-renew expired plan — bKash gateway hooks here.
 * Until live gateway: mock success when user confirms Pay with bKash.
 */
export async function renewSubscriptionViaBkash(
  userId: string,
  months = 1,
  couponCode?: string
): Promise<
  | { ok: true; user: DevUser; totalTaka: number; message: string }
  | { ok: false; error: string }
> {
  const sessionUser = getSessionUser();
  if (!sessionUser || sessionUser.id !== userId) {
    return { ok: false, error: "Session expired — sign in again." };
  }
  if (sessionUser.status !== "expired") {
    return { ok: false, error: "Only expired accounts can pay to renew here." };
  }

  const quote = subscriptionRenewQuote(sessionUser, months, couponCode);
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

  // TODO: bKash Checkout API — create payment session, verify callback.
  await new Promise((r) => setTimeout(r, 900));

  try {
    await fetch("/api/payments/record", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        kind: "plan_renewal",
        amountTaka: quote.totalTaka,
        method: "bkash",
        userId: sessionUser.id,
        userEmail: sessionUser.email,
        userName: sessionUser.name,
        company: sessionUser.company,
        planId: quote.planId,
        months: quote.months,
        couponCode: quote.couponCode,
        discountTaka: quote.discountTaka,
      }),
    });
  } catch {
    /* history is best-effort */
  }

  const activated = activateUser(userId, quote.months);
  if (!activated) {
    return { ok: false, error: "Could not renew account." };
  }

  applyUserToSession(activated);

  const discountNote =
    quote.discountTaka > 0 && quote.coupon
      ? ` · ${quote.coupon.code} saved ${quote.discountTaka.toLocaleString("en-BD")} BDT`
      : "";

  return {
    ok: true,
    user: activated,
    totalTaka: quote.totalTaka,
    message: `bKash payment successful · ${quote.planName} renewed for ${quote.months} month${quote.months > 1 ? "s" : ""}${discountNote}`,
  };
}
