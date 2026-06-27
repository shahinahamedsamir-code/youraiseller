"use client";

import { useMemo, useState } from "react";
import { ArrowRight, Loader2, ShieldCheck, TrendingUp, X } from "lucide-react";
import { getSessionUser } from "@/lib/dev-users";
import {
  countPlanUsage,
  getEffectiveLimit,
  getOrderRateTaka,
  increaseOrderLimitViaPayStation,
} from "@/lib/plan-limits";

const PRESETS = [100, 200, 500, 1000];
const MIN_ORDERS = 1;
const DEFAULT_ORDERS = 100;

export function IncreaseOrderLimitModal({ onClose }: { onClose: () => void }) {
  const user = useMemo(() => getSessionUser() ?? null, []);
  const currentLimit = useMemo(() => getEffectiveLimit("orders", user), [user]);
  const used = useMemo(() => countPlanUsage(user).orders, [user]);
  const rate = useMemo(() => getOrderRateTaka(user), [user]);

  const [orders, setOrders] = useState(DEFAULT_ORDERS);
  const [temporary, setTemporary] = useState(false);
  const [paying, setPaying] = useState(false);
  const [error, setError] = useState("");

  const cost = Math.round(Math.max(0, orders) * rate * 100) / 100;
  const available = Math.max(0, currentLimit - used);

  const pay = async () => {
    if (paying || orders < MIN_ORDERS) return;
    setPaying(true);
    setError("");
    const res = await increaseOrderLimitViaPayStation(orders, temporary);
    if (!res.ok || !res.paymentUrl) {
      setError(res.error ?? "Could not start payment.");
      setPaying(false);
      return;
    }
    window.location.href = res.paymentUrl;
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-end justify-center p-0 sm:items-center sm:p-4">
      <button
        type="button"
        aria-label="Close order limit dialog"
        className="absolute inset-0 bg-slate-950/45 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="increase-order-limit-title"
        className="relative z-10 flex max-h-[94dvh] w-full max-w-lg flex-col overflow-hidden rounded-t-2xl border border-white/60 bg-white shadow-2xl sm:max-h-[calc(100vh-2rem)] sm:rounded-2xl"
      >
        <header className="flex items-start justify-between gap-4 border-b border-slate-100 px-4 py-3.5 sm:px-6 sm:py-5">
          <div className="flex min-w-0 items-start gap-3">
            <div className="hidden rounded-xl bg-emerald-50 p-2.5 text-emerald-600 ring-1 ring-emerald-100 sm:block">
              <TrendingUp className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <h3 id="increase-order-limit-title" className="text-base font-extrabold text-slate-900 sm:text-lg">
                Increase order limit
              </h3>
              <p className="mt-0.5 text-xs leading-5 text-slate-500">
                Add capacity to your current {currentLimit.toLocaleString("en-BD")} order limit.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="shrink-0 rounded-lg p-2 text-slate-400 transition hover:bg-slate-100 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </header>

        <div className="space-y-4 overflow-y-auto overscroll-contain px-4 py-4 sm:space-y-5 sm:px-6 sm:py-5">
          <div className="grid grid-cols-3 divide-x divide-slate-200 rounded-xl border border-slate-200 bg-slate-50 py-2.5 text-center sm:py-3">
            <div className="px-2">
              <p className="text-[11px] font-semibold text-slate-400">Current limit</p>
              <p className="mt-1 text-sm font-extrabold text-slate-800">{currentLimit.toLocaleString("en-BD")}</p>
            </div>
            <div className="px-2">
              <p className="text-[11px] font-semibold text-slate-400">Used</p>
              <p className="mt-1 text-sm font-extrabold text-slate-800">{used.toLocaleString("en-BD")}</p>
            </div>
            <div className="px-2">
              <p className="text-[11px] font-semibold text-slate-400">Available</p>
              <p className="mt-1 text-sm font-extrabold text-emerald-600">{available.toLocaleString("en-BD")}</p>
            </div>
          </div>

          <div>
            <div className="mb-2 flex items-center justify-between gap-3">
              <label htmlFor="additional-orders" className="text-sm font-extrabold text-slate-800">
                Additional orders
              </label>
              <span className="text-xs font-semibold text-slate-400">Minimum {MIN_ORDERS}</span>
            </div>
            <div className="relative">
              <input
                id="additional-orders"
                type="number"
                min={MIN_ORDERS}
                value={orders}
                onChange={(event) => setOrders(Math.max(0, Math.floor(Number(event.target.value) || 0)))}
                className="h-12 w-full rounded-xl border border-slate-200 bg-white px-4 pr-20 text-base font-bold text-slate-900 outline-none transition focus:border-emerald-400 focus:ring-4 focus:ring-emerald-50"
              />
              <span className="pointer-events-none absolute inset-y-0 right-4 flex items-center text-xs font-semibold text-slate-400">
                orders
              </span>
            </div>
            <div className="mt-2 grid grid-cols-2 gap-2 min-[390px]:grid-cols-4">
              {PRESETS.map((preset) => (
                <button
                  key={preset}
                  type="button"
                  onClick={() => setOrders(preset)}
                  className={`h-9 rounded-lg border text-xs font-extrabold transition ${
                    orders === preset
                      ? "border-emerald-600 bg-emerald-600 text-white shadow-sm"
                      : "border-slate-200 bg-white text-slate-600 hover:border-emerald-300 hover:bg-emerald-50"
                  }`}
                >
                  +{preset.toLocaleString("en-BD")}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-start justify-between gap-3 rounded-xl border border-slate-200 p-3.5 sm:items-center sm:gap-4 sm:p-4">
            <div>
              <p className="text-sm font-extrabold text-slate-800">Temporary boost</p>
              <p className="mt-0.5 text-[11px] leading-4 text-slate-500">
                Applies only to the current billing month. Keep off to add it permanently.
              </p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={temporary}
              onClick={() => setTemporary((value) => !value)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition ${temporary ? "bg-emerald-600" : "bg-slate-300"}`}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow-sm transition ${temporary ? "left-[22px]" : "left-0.5"}`}
              />
            </button>
          </div>

          <div className="rounded-xl border border-emerald-100 bg-emerald-50/60 p-3.5 sm:p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-bold text-emerald-700">Pay now</p>
                <p className="mt-1 text-[11px] text-slate-500">
                  {orders.toLocaleString("en-BD")} orders x {rate.toLocaleString("en-BD")} TK
                </p>
              </div>
              <p className="text-2xl font-extrabold text-emerald-700">{cost.toLocaleString("en-BD")} TK</p>
            </div>
            <div className="mt-4 space-y-2 border-t border-emerald-100 pt-3 text-xs">
              <div className="flex items-center justify-between gap-3 text-slate-500">
                <span>New order limit</span>
                <span className="font-bold text-slate-800">{(currentLimit + orders).toLocaleString("en-BD")}</span>
              </div>
              <div className="flex items-center justify-between gap-3 text-slate-500">
                <span>Limit duration</span>
                <span className="font-bold text-slate-800">{temporary ? "This month" : "Permanent"}</span>
              </div>
              {!temporary ? (
                <div className="flex items-center justify-between gap-3 text-emerald-700">
                  <span>Monthly renewal addition</span>
                  <span className="font-extrabold">+{cost.toLocaleString("en-BD")} TK</span>
                </div>
              ) : null}
            </div>
          </div>

          {error ? (
            <p role="alert" className="rounded-xl bg-rose-50 px-3 py-2.5 text-xs font-semibold text-rose-700 ring-1 ring-rose-100">
              {error}
            </p>
          ) : null}
        </div>

        <footer className="border-t border-slate-100 bg-white px-4 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-3 sm:px-6 sm:py-4">
          <div className="mb-2.5 flex items-center justify-center gap-2 text-[11px] font-semibold text-slate-400 sm:mb-3 sm:justify-start">
            <ShieldCheck className="h-4 w-4 text-emerald-600" />
            Secure checkout powered by PayStation
          </div>
          <div className="flex flex-col-reverse gap-2 sm:flex-row sm:justify-end">
            <button
              type="button"
              onClick={onClose}
              className="h-11 rounded-xl border border-slate-200 px-5 text-sm font-bold text-slate-600 transition hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={pay}
              disabled={paying || orders < MIN_ORDERS || cost <= 0}
              className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-emerald-600 px-5 text-sm font-extrabold text-white shadow-sm transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              <span>{paying ? "Starting checkout..." : `Pay ${cost.toLocaleString("en-BD")} TK`}</span>
              {!paying ? <ArrowRight className="h-4 w-4" /> : null}
            </button>
          </div>
        </footer>
      </div>
    </div>
  );
}