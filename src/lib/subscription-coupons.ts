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

const STORAGE_KEY = "youraiseller-subscription-coupons";

export const DEFAULT_SUBSCRIPTION_COUPONS: SubscriptionCoupon[] = [
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

export const SUBSCRIPTION_COUPONS: SubscriptionCoupon[] = DEFAULT_SUBSCRIPTION_COUPONS;

export function normalizeCouponCode(raw: string): string {
  return raw.trim().toUpperCase().replace(/\s+/g, "");
}

export function normalizeSubscriptionCoupon(raw: unknown): SubscriptionCoupon | null {
  if (!raw || typeof raw !== "object") return null;
  const r = raw as Partial<SubscriptionCoupon>;
  const code = normalizeCouponCode(String(r.code ?? ""));
  if (!code) return null;
  const discountType = r.discountType === "fixed" ? "fixed" : "percent";
  const discountValue = Math.max(0, Number(r.discountValue) || 0);
  if (discountValue <= 0) return null;
  const plans = Array.isArray(r.plans)
    ? r.plans.filter((p): p is PlanId =>
        p === "basic" || p === "pro" || p === "enterprise"
      )
    : undefined;
  return {
    code,
    label: String(r.label ?? code).trim() || code,
    discountType,
    discountValue: Math.round(discountValue * 100) / 100,
    active: r.active !== false,
    minMonths:
      Number.isFinite(Number(r.minMonths)) && Number(r.minMonths) > 1
        ? Math.floor(Number(r.minMonths))
        : undefined,
    plans: plans?.length ? plans : undefined,
  };
}

export function normalizeSubscriptionCoupons(raw: unknown): SubscriptionCoupon[] {
  const rows = Array.isArray(raw) ? raw : DEFAULT_SUBSCRIPTION_COUPONS;
  const byCode = new Map<string, SubscriptionCoupon>();
  for (const row of rows) {
    const coupon = normalizeSubscriptionCoupon(row);
    if (coupon) byCode.set(coupon.code, coupon);
  }
  return Array.from(byCode.values());
}

export function loadSubscriptionCouponsLocal(): SubscriptionCoupon[] {
  if (typeof window === "undefined") return DEFAULT_SUBSCRIPTION_COUPONS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return DEFAULT_SUBSCRIPTION_COUPONS;
    return normalizeSubscriptionCoupons(JSON.parse(raw));
  } catch {
    return DEFAULT_SUBSCRIPTION_COUPONS;
  }
}

export function saveSubscriptionCouponsLocal(coupons: SubscriptionCoupon[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(normalizeSubscriptionCoupons(coupons)));
}

export async function fetchPublicSubscriptionCoupons(): Promise<SubscriptionCoupon[]> {
  try {
    const res = await fetch("/api/coupons", { cache: "no-store" });
    const json = await res.json().catch(() => null);
    if (!res.ok || !json?.coupons) return loadSubscriptionCouponsLocal();
    const coupons = normalizeSubscriptionCoupons(json.coupons);
    saveSubscriptionCouponsLocal(coupons);
    return coupons;
  } catch {
    return loadSubscriptionCouponsLocal();
  }
}

export function findSubscriptionCoupon(
  code: string,
  coupons: SubscriptionCoupon[] = loadSubscriptionCouponsLocal()
): SubscriptionCoupon | undefined {
  const normalized = normalizeCouponCode(code);
  if (!normalized) return undefined;
  return coupons.find(
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
  ctx: { planId: PlanId; months: number; subtotalTaka: number },
  coupons?: SubscriptionCoupon[]
):
  | {
      ok: true;
      coupon: SubscriptionCoupon;
      discountTaka: number;
      totalTaka: number;
    }
  | { ok: false; error: string } {
  const coupon = findSubscriptionCoupon(code, coupons);
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
