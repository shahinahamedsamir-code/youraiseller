"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Plus, Save, Tag, Trash2 } from "lucide-react";
import {
  normalizeCouponCode,
  normalizeSubscriptionCoupons,
  type SubscriptionCoupon,
} from "@/lib/subscription-coupons";
import type { PlanId } from "@/lib/plan-config-types";

const PLAN_OPTIONS: { id: PlanId; label: string }[] = [
  { id: "basic", label: "Basic" },
  { id: "pro", label: "Pro" },
  { id: "enterprise", label: "Enterprise" },
];

function emptyCoupon(): SubscriptionCoupon {
  return {
    code: "",
    label: "",
    discountType: "percent",
    discountValue: 10,
    active: true,
  };
}

function planChecked(coupon: SubscriptionCoupon, plan: PlanId): boolean {
  return !coupon.plans?.length || coupon.plans.includes(plan);
}

export function CouponControlPanel() {
  const [coupons, setCoupons] = useState<SubscriptionCoupon[]>([]);
  const [draft, setDraft] = useState<SubscriptionCoupon>(() => emptyCoupon());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState<{ type: "ok" | "err"; text: string } | null>(null);

  const activeCount = useMemo(
    () => coupons.filter((coupon) => coupon.active !== false).length,
    [coupons]
  );

  const load = async () => {
    setLoading(true);
    setMsg(null);
    try {
      const res = await fetch("/api/dev-admin/coupons", { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Could not load coupons");
      setCoupons(normalizeSubscriptionCoupons(json.coupons ?? []));
    } catch (e) {
      setMsg({ type: "err", text: e instanceof Error ? e.message : "Could not load coupons" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async (nextCoupons = coupons) => {
    setSaving(true);
    setMsg(null);
    try {
      const normalized = normalizeSubscriptionCoupons(nextCoupons);
      const res = await fetch("/api/dev-admin/coupons", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ coupons: normalized }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Save failed");
      setCoupons(normalizeSubscriptionCoupons(json.coupons ?? normalized));
      setMsg({ type: "ok", text: "Coupons saved. Renew checkout will use updated coupons." });
    } catch (e) {
      setMsg({ type: "err", text: e instanceof Error ? e.message : "Save failed" });
    } finally {
      setSaving(false);
    }
  };

  const addCoupon = () => {
    const code = normalizeCouponCode(draft.code);
    if (!code) {
      setMsg({ type: "err", text: "Coupon code is required." });
      return;
    }
    if (coupons.some((coupon) => normalizeCouponCode(coupon.code) === code)) {
      setMsg({ type: "err", text: "This coupon code already exists." });
      return;
    }
    const next = normalizeSubscriptionCoupons([
      {
        ...draft,
        code,
        label: draft.label.trim() || code,
      },
      ...coupons,
    ]);
    setCoupons(next);
    setDraft(emptyCoupon());
    void save(next);
  };

  const patchCoupon = (code: string, patch: Partial<SubscriptionCoupon>) => {
    setCoupons((prev) =>
      prev.map((coupon) =>
        coupon.code === code ? { ...coupon, ...patch, code: normalizeCouponCode(patch.code ?? coupon.code) } : coupon
      )
    );
  };

  const togglePlan = (coupon: SubscriptionCoupon, plan: PlanId) => {
    const all = PLAN_OPTIONS.map((p) => p.id);
    const current = coupon.plans?.length ? coupon.plans : all;
    const next = current.includes(plan)
      ? current.filter((p) => p !== plan)
      : [...current, plan];
    patchCoupon(coupon.code, {
      plans: next.length === all.length ? undefined : next,
    });
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-white">
            <Tag className="h-6 w-6 text-orange-400" />
            Coupon Control
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Create renewal coupons for plan payments. Active coupons work in the renew modal.
          </p>
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() => save()}
          className="inline-flex items-center gap-2 rounded-xl bg-orange-500 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-orange-600 disabled:opacity-60"
        >
          <Save className="h-4 w-4" />
          Save coupons
        </button>
      </div>

      {msg ? (
        <p
          className={clsx(
            "rounded-xl px-4 py-3 text-sm font-semibold ring-1",
            msg.type === "ok"
              ? "bg-emerald-500/10 text-emerald-200 ring-emerald-500/30"
              : "bg-rose-500/10 text-rose-200 ring-rose-500/30"
          )}
        >
          {msg.text}
        </p>
      ) : null}

      <section className="grid gap-3 md:grid-cols-3">
        <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Total</p>
          <p className="mt-2 text-2xl font-extrabold text-white">{coupons.length}</p>
        </div>
        <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Active</p>
          <p className="mt-2 text-2xl font-extrabold text-emerald-300">{activeCount}</p>
        </div>
        <div className="rounded-2xl border border-slate-700 bg-slate-800/60 p-4">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">Applies to</p>
          <p className="mt-2 text-2xl font-extrabold text-white">Renewals</p>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-700 bg-slate-900 p-4">
        <h2 className="text-lg font-extrabold text-white">Add coupon</h2>
        <div className="mt-4 grid gap-3 lg:grid-cols-6">
          <input
            value={draft.code}
            onChange={(e) => setDraft((d) => ({ ...d, code: e.target.value.toUpperCase() }))}
            placeholder="CODE"
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm font-bold uppercase text-white outline-none focus:border-orange-400"
          />
          <input
            value={draft.label}
            onChange={(e) => setDraft((d) => ({ ...d, label: e.target.value }))}
            placeholder="Label"
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm text-white outline-none focus:border-orange-400 lg:col-span-2"
          />
          <select
            value={draft.discountType}
            onChange={(e) =>
              setDraft((d) => ({
                ...d,
                discountType: e.target.value === "fixed" ? "fixed" : "percent",
              }))
            }
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-orange-400"
          >
            <option value="percent">Percent</option>
            <option value="fixed">Fixed BDT</option>
          </select>
          <input
            type="number"
            min={1}
            value={draft.discountValue}
            onChange={(e) => setDraft((d) => ({ ...d, discountValue: Number(e.target.value) }))}
            className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2.5 text-sm font-bold text-white outline-none focus:border-orange-400"
          />
          <button
            type="button"
            onClick={addCoupon}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-extrabold text-slate-950 hover:bg-emerald-400"
          >
            <Plus className="h-4 w-4" />
            Add
          </button>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-700 bg-slate-900">
        <div className="border-b border-slate-700 px-4 py-3">
          <h2 className="text-lg font-extrabold text-white">Coupons</h2>
        </div>
        {loading ? (
          <p className="p-8 text-center text-sm text-slate-500">Loading coupons...</p>
        ) : coupons.length === 0 ? (
          <p className="p-8 text-center text-sm text-slate-500">No coupons yet.</p>
        ) : (
          <div className="divide-y divide-slate-800">
            {coupons.map((coupon) => (
              <div key={coupon.code} className="grid gap-3 p-4 xl:grid-cols-12 xl:items-center">
                <input
                  value={coupon.code}
                  onChange={(e) => patchCoupon(coupon.code, { code: e.target.value })}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-bold uppercase text-white outline-none focus:border-orange-400 xl:col-span-2"
                />
                <input
                  value={coupon.label}
                  onChange={(e) => patchCoupon(coupon.code, { label: e.target.value })}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm text-white outline-none focus:border-orange-400 xl:col-span-2"
                />
                <select
                  value={coupon.discountType}
                  onChange={(e) =>
                    patchCoupon(coupon.code, {
                      discountType: e.target.value === "fixed" ? "fixed" : "percent",
                    })
                  }
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-bold text-white outline-none focus:border-orange-400"
                >
                  <option value="percent">Percent</option>
                  <option value="fixed">Fixed</option>
                </select>
                <input
                  type="number"
                  min={1}
                  value={coupon.discountValue}
                  onChange={(e) => patchCoupon(coupon.code, { discountValue: Number(e.target.value) })}
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-bold text-white outline-none focus:border-orange-400"
                />
                <input
                  type="number"
                  min={1}
                  placeholder="Min months"
                  value={coupon.minMonths ?? ""}
                  onChange={(e) =>
                    patchCoupon(coupon.code, {
                      minMonths: e.target.value ? Number(e.target.value) : undefined,
                    })
                  }
                  className="rounded-xl border border-slate-700 bg-slate-950 px-3 py-2 text-sm font-bold text-white outline-none focus:border-orange-400"
                />
                <div className="flex flex-wrap gap-1.5 xl:col-span-3">
                  {PLAN_OPTIONS.map((plan) => (
                    <button
                      key={plan.id}
                      type="button"
                      onClick={() => togglePlan(coupon, plan.id)}
                      className={clsx(
                        "rounded-lg px-2.5 py-1.5 text-xs font-bold",
                        planChecked(coupon, plan.id)
                          ? "bg-orange-500/20 text-orange-200 ring-1 ring-orange-500/40"
                          : "bg-slate-800 text-slate-500"
                      )}
                    >
                      {plan.label}
                    </button>
                  ))}
                </div>
                <div className="flex items-center justify-end gap-2 xl:col-span-2">
                  <button
                    type="button"
                    onClick={() => patchCoupon(coupon.code, { active: coupon.active === false })}
                    className={clsx(
                      "rounded-xl px-3 py-2 text-xs font-extrabold",
                      coupon.active === false
                        ? "bg-slate-800 text-slate-400"
                        : "bg-emerald-500/15 text-emerald-300"
                    )}
                  >
                    {coupon.active === false ? "Off" : "On"}
                  </button>
                  <button
                    type="button"
                    onClick={() => setCoupons((prev) => prev.filter((c) => c.code !== coupon.code))}
                    className="rounded-xl border border-rose-500/30 p-2 text-rose-300 hover:bg-rose-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
