"use client";

import { useMemo, useState } from "react";
import { X, Loader2, TrendingUp } from "lucide-react";
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
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl">
        <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
          <div>
            <h3 className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
              <TrendingUp className="h-5 w-5 text-emerald-600" />
              Increase Order Limit
            </h3>
            <p className="text-xs text-slate-500">
              Add more orders to your current limit of {currentLimit.toLocaleString("en-BD")}.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 transition hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <div className="grid grid-cols-3 gap-2 rounded-xl bg-slate-50 p-3 text-center text-xs">
            <div>
              <p className="text-slate-400">Current limit</p>
              <p className="font-bold text-slate-800">{currentLimit.toLocaleString("en-BD")}</p>
            </div>
            <div>
              <p className="text-slate-400">Used</p>
              <p className="font-bold text-slate-800">{used.toLocaleString("en-BD")}</p>
            </div>
            <div>
              <p className="text-slate-400">Available</p>
              <p className="font-bold text-emerald-600">{available.toLocaleString("en-BD")}</p>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
              Add orders
            </label>
            <input
              type="number"
              min={MIN_ORDERS}
              value={orders}
              onChange={(e) => setOrders(Math.max(0, Math.floor(Number(e.target.value) || 0)))}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm outline-none focus:border-emerald-300 focus:ring-2 focus:ring-emerald-100"
            />
            <p className="mt-1 text-[11px] text-slate-400">
              Enter any amount, or use a preset.
            </p>
            <div className="mt-2 grid grid-cols-4 gap-2">
              {PRESETS.map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setOrders(p)}
                  className={`rounded-lg border px-2 py-1.5 text-xs font-bold transition ${
                    orders === p
                      ? "border-emerald-500 bg-emerald-600 text-white"
                      : "border-slate-200 text-slate-600 hover:border-emerald-300"
                  }`}
                >
                  +{p}
                </button>
              ))}
            </div>
          </div>

          <label className="flex cursor-pointer items-start gap-2.5 rounded-xl border border-dashed border-slate-300 p-3">
            <input
              type="checkbox"
              checked={temporary}
              onChange={(e) => setTemporary(e.target.checked)}
              className="mt-0.5 h-4 w-4 accent-emerald-600"
            />
            <span>
              <span className="block text-sm font-bold text-slate-800">
                Temporary boost (this month only)
              </span>
              <span className="block text-[11px] text-slate-500">
                Leave off to add these orders to your plan permanently — the cost is
                then added to your monthly plan fee at every renewal.
              </span>
            </span>
          </label>

          <div className="rounded-xl bg-slate-50 p-4 text-center">
            <p className="text-xs text-slate-400">Total Cost</p>
            <p className="text-2xl font-extrabold text-emerald-600">{cost.toLocaleString("en-BD")} TK</p>
            <p className="mt-1 text-[11px] text-slate-500">
              {orders.toLocaleString("en-BD")} orders × {rate} TK · pay now
            </p>
            <p className="text-[11px] text-slate-500">
              New limit: {(currentLimit + orders).toLocaleString("en-BD")} orders
              {temporary ? " (this month only)" : " (permanent)"}
            </p>
            {!temporary ? (
              <p className="text-[11px] font-semibold text-emerald-700">
                +{cost.toLocaleString("en-BD")} TK/month added to your plan fee
              </p>
            ) : null}
            <p className="mt-1 text-[11px] text-slate-400">PayStation hosted checkout</p>
          </div>

          {error ? (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">{error}</p>
          ) : null}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={pay}
              disabled={paying || orders < MIN_ORDERS || cost <= 0}
              className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-5 py-2.5 text-sm font-bold text-white shadow-md transition hover:bg-emerald-700 disabled:cursor-not-allowed disabled:opacity-60"
            >
              {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {paying ? "Starting…" : `Pay ${cost.toLocaleString("en-BD")} TK with PayStation`}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
