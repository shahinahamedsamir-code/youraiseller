"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { CheckCircle2, CreditCard, Loader2, Tag, X } from "lucide-react";
import type { DevUser } from "@/lib/dev-users";
import { formatSmsBdt } from "@/lib/sms-types";
import {
  fetchPublicPlanConfig,
  loadPlanConfigLocal,
} from "@/lib/plan-config-client";
import {
  applySubscriptionCoupon,
  startSubscriptionRenewPayment,
  subscriptionRenewQuote,
} from "@/lib/subscription-renew";
import {
  fetchPublicSubscriptionCoupons,
  loadSubscriptionCouponsLocal,
  type SubscriptionCoupon,
} from "@/lib/subscription-coupons";
import type { PlanConfig, PlanId } from "@/lib/plan-config-types";

type Props = {
  open: boolean;
  user: DevUser;
  /** renew = keep current plan; upgrade = pick any active plan. */
  mode?: "renew" | "upgrade";
  onClose: () => void;
  onSuccess: (user: DevUser, message: string) => void;
  onError: (message: string) => void;
};

export function PlanRenewPayModal({
  open,
  user,
  mode = "renew",
  onClose,
  onError,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [selectedPlanId, setSelectedPlanId] = useState<PlanId>(user.plan);
  const [months, setMonths] = useState(1);
  const [paying, setPaying] = useState(false);
  const [couponOpen, setCouponOpen] = useState(false);
  const [couponInput, setCouponInput] = useState("");
  const [appliedCoupon, setAppliedCoupon] = useState<string | undefined>();
  const [couponError, setCouponError] = useState("");
  const [planConfig, setPlanConfig] = useState<PlanConfig>(() => loadPlanConfigLocal());
  const [coupons, setCoupons] = useState<SubscriptionCoupon[]>(() =>
    loadSubscriptionCouponsLocal()
  );

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    setSelectedPlanId(user.plan);
    setMonths(1);
    setCouponOpen(false);
    setCouponInput("");
    setAppliedCoupon(undefined);
    setCouponError("");
    fetchPublicPlanConfig().then((config) => {
      if (!cancelled) setPlanConfig(config);
    });
    fetchPublicSubscriptionCoupons().then((next) => {
      if (!cancelled) setCoupons(next);
    });
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !paying) onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      cancelled = true;
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose, paying, user.plan]);

  const activePlans = useMemo(
    () =>
      planConfig.plans
        .filter((plan) => plan.active)
        .sort((a, b) => a.sortOrder - b.sortOrder),
    [planConfig]
  );

  useEffect(() => {
    if (activePlans.some((plan) => plan.id === selectedPlanId)) return;
    setSelectedPlanId(activePlans[0]?.id ?? user.plan);
  }, [activePlans, selectedPlanId, user.plan]);

  const quote = useMemo(
    () =>
      subscriptionRenewQuote(
        user,
        months,
        appliedCoupon,
        planConfig,
        coupons,
        selectedPlanId
      ),
    [user, months, appliedCoupon, planConfig, coupons, selectedPlanId]
  );

  useEffect(() => {
    if (!appliedCoupon) return;
    const result = applySubscriptionCoupon(
      user,
      months,
      appliedCoupon,
      planConfig,
      coupons,
      selectedPlanId
    );
    if (!result.ok) {
      setAppliedCoupon(undefined);
      setCouponError(result.error);
    }
  }, [user, months, appliedCoupon, planConfig, coupons, selectedPlanId]);

  const handleApplyCoupon = () => {
    setCouponError("");
    const result = applySubscriptionCoupon(
      user,
      months,
      couponInput,
      planConfig,
      coupons,
      selectedPlanId
    );
    if (!result.ok) {
      setCouponError(result.error);
      return;
    }
    setAppliedCoupon(result.quote.couponCode);
    setCouponInput(result.quote.couponCode ?? couponInput);
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(undefined);
    setCouponInput("");
    setCouponError("");
  };

  const handlePay = async () => {
    setPaying(true);
    const res = await startSubscriptionRenewPayment(
      user.id,
      months,
      appliedCoupon,
      quote.planId
    );
    setPaying(false);
    if (!res.ok) {
      onError(res.error);
      return;
    }
    window.location.href = res.paymentUrl;
  };

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[240] flex items-end justify-center md:items-center md:p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm"
        onClick={() => !paying && onClose()}
      />
      <div className="relative max-h-[min(92dvh,36rem)] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl ring-1 ring-slate-200 md:max-h-none md:max-w-md md:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 bg-gradient-to-r from-slate-700 to-slate-900 px-5 py-4 text-white">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-white/15">
              <CreditCard className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold">
                {mode === "upgrade" ? "Upgrade your plan" : "Renew your plan"}
              </h2>
              <p className="text-xs text-white/80">
                {quote.planName} · {quote.priceLabel}
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={paying}
            onClick={onClose}
            className="rounded-lg border border-white/20 p-2 text-white/80 hover:bg-white/10 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
            <p className="font-semibold text-slate-900">{user.company}</p>
            <p className="text-xs text-slate-500">{user.email}</p>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-500">
              {mode === "upgrade" ? "Choose a plan" : "Plan package"}
            </span>
            <select
              value={selectedPlanId}
              disabled={paying || mode === "renew" || user.status === "expired"}
              onChange={(e) => {
                setSelectedPlanId(e.target.value as PlanId);
                setAppliedCoupon(undefined);
                setCouponInput("");
                setCouponError("");
              }}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-100"
            >
              {activePlans.map((plan) => (
                <option key={plan.id} value={plan.id}>
                  {plan.name} - {plan.priceLabel}
                </option>
              ))}
            </select>
            {mode === "renew" ? (
              <p className="mt-1 text-[11px] text-slate-400">
                Renewing your current plan. Use Upgrade to switch to a higher plan.
              </p>
            ) : null}
          </label>

          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-500">
              Renewal period (months)
            </span>
            <select
              value={months}
              disabled={paying}
              onChange={(e) => setMonths(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
            >
              {[1, 2, 3, 6, 12].map((m) => (
                <option key={m} value={m}>
                  {m} month{m > 1 ? "s" : ""}
                </option>
              ))}
            </select>
          </label>

          <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50/60 p-3">
            {!couponOpen && !appliedCoupon ? (
              <button
                type="button"
                onClick={() => setCouponOpen(true)}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:underline"
              >
                <Tag className="h-3.5 w-3.5" />
                Have a discount coupon?
              </button>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-xs font-semibold text-slate-500">
                    Discount coupon
                  </span>
                  {appliedCoupon ? (
                    <button
                      type="button"
                      onClick={handleRemoveCoupon}
                      className="text-[11px] font-bold text-rose-600 hover:underline"
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
                <div className="flex gap-2">
                  <input
                    value={couponInput}
                    disabled={paying || Boolean(appliedCoupon)}
                    onChange={(e) => setCouponInput(e.target.value.toUpperCase())}
                    placeholder="e.g. WELCOME10"
                    className="min-w-0 flex-1 rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm font-semibold uppercase tracking-wide outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100 disabled:bg-slate-100"
                  />
                  {!appliedCoupon ? (
                    <button
                      type="button"
                      disabled={paying || !couponInput.trim()}
                      onClick={handleApplyCoupon}
                      className="shrink-0 rounded-xl bg-slate-800 px-4 py-2.5 text-xs font-bold text-white hover:bg-slate-900 disabled:opacity-50"
                    >
                      Apply
                    </button>
                  ) : null}
                </div>
                {appliedCoupon && quote.coupon ? (
                  <p className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-700">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {quote.coupon.code} applied · {quote.coupon.label}
                  </p>
                ) : null}
                {couponError ? (
                  <p className="text-xs font-semibold text-rose-600">{couponError}</p>
                ) : null}
              </div>
            )}
          </div>

          <div className="space-y-1.5 rounded-xl border border-slate-100 bg-white px-4 py-3">
            {quote.discountTaka > 0 ? (
              <>
                <div className="flex items-center justify-between text-sm text-slate-500">
                  <span>Subtotal</span>
                  <span className="line-through">{formatSmsBdt(quote.subtotalTaka)}</span>
                </div>
                <div className="flex items-center justify-between text-sm font-semibold text-emerald-700">
                  <span>Coupon discount</span>
                  <span>-{formatSmsBdt(quote.discountTaka)}</span>
                </div>
              </>
            ) : null}
            <div className="flex items-center justify-between text-base font-extrabold text-slate-900">
              <span>Total amount</span>
              <span className="text-rose-600">{formatSmsBdt(quote.totalTaka)}</span>
            </div>
          </div>

          <p className="text-[11px] text-slate-500">
            {formatSmsBdt(quote.monthlyTaka)}/month · PayStation hosted checkout
          </p>

          <button
            type="button"
            disabled={paying}
            onClick={handlePay}
            className={clsx(
              "flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-extrabold text-white shadow-md transition disabled:opacity-60",
              "bg-[#E2136E] hover:bg-[#c91062]"
            )}
          >
            {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Pay with PayStation
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
