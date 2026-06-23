"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { normalizePhoneForApi } from "@/lib/hoorin-courier";
import type { CourierCheckResult } from "@/lib/hoorin-courier";
import { fetchCourierCheck, peekCourierCheck } from "@/lib/courier-check-client";
import { findOrdersByPhone } from "@/lib/orders-store";
import { getCustomerOrderStats } from "@/lib/web-customer-stats";
import { WebOrderSuccessRing } from "@/components/web-orders/WebOrderSuccessRing";
import { CourierRatioModal } from "@/components/web-orders/CourierRatioModal";

type Props = {
  phone: string;
};

function localRecord(phone: string) {
  const orders = findOrdersByPhone(phone);
  const delivered = orders.filter((o) => o.status === "delivered").length;
  const total = orders.length;
  const successRate = total > 0 ? Math.round((delivered / total) * 100) : 0;
  return { orders, total, delivered, successRate, isNew: total === 0 };
}

export function WebOrderCourierRatioCell({ phone }: Props) {
  const rootRef = useRef<HTMLButtonElement>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const digits = normalizePhoneForApi(phone);
  const local = useMemo(() => localRecord(phone), [phone]);
  const stats = useMemo(() => getCustomerOrderStats(phone), [phone]);
  const [data, setData] = useState<CourierCheckResult | null>(() =>
    digits ? peekCourierCheck(digits) : null
  );
  const [checking, setChecking] = useState(false);

  useEffect(() => {
    if (!digits) return;
    const cached = peekCourierCheck(digits);
    if (cached) {
      setData(cached);
      return;
    }
    let cancelled = false;
    setChecking(true);
    void fetchCourierCheck(digits).then((res) => {
      if (cancelled) return;
      if (res) setData(res);
      setChecking(false);
    });
    return () => {
      cancelled = true;
    };
  }, [digits]);

  const ringPercent = stats.successPct;
  const activeCouriers = (data?.couriers ?? []).filter((c) => c.total > 0);
  const barSuccess = stats.total > 0 ? (stats.success / stats.total) * 100 : 0;
  const barCancelled = stats.total > 0 ? (stats.cancelled / stats.total) * 100 : 0;

  if (!digits) {
    return <span className="text-xs text-slate-400">—</span>;
  }

  return (
    <>
      <button
        ref={rootRef}
        type="button"
        onClick={() => setModalOpen(true)}
        className="group flex w-full items-start gap-2.5 rounded-lg border border-slate-100 bg-white px-2 py-1.5 text-left shadow-sm transition hover:border-violet-200 hover:shadow-md"
        title="Click for details"
      >
        <div className="relative shrink-0 pt-0.5">
          <WebOrderSuccessRing percent={ringPercent} size={46} />
        </div>

        <div className="min-w-0 flex-1 text-[10px] leading-snug">
          {/* Success rate headline */}
          <p className={clsx("text-sm font-extrabold leading-tight", rateTone(ringPercent))}>
            {ringPercent}%
          </p>
          <p className="text-[9px] text-slate-400">Success rate</p>

          {/* Total / Success / Cancelled dots */}
          <div className="mt-1 space-y-0.5">
            <div className="flex items-center justify-between gap-1">
              <span className="flex items-center gap-1">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-sky-500" />
                <span className="text-slate-600">Total</span>
              </span>
              <span className="font-bold text-slate-800">{stats.total}</span>
            </div>
            <div className="flex items-center justify-between gap-1">
              <span className="flex items-center gap-1">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-emerald-500" />
                <span className="text-slate-600">Success</span>
              </span>
              <span className="font-bold text-emerald-700">{stats.success}</span>
            </div>
            <div className="flex items-center justify-between gap-1">
              <span className="flex items-center gap-1">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-rose-500" />
                <span className="text-slate-600">Cancelled</span>
              </span>
              <span className="font-bold text-rose-600">{stats.cancelled}</span>
            </div>
          </div>

          {/* Progress bar */}
          <div className="mt-1.5 flex h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="rounded-l-full bg-emerald-500 transition-all"
              style={{ width: `${barSuccess}%` }}
            />
            <div
              className="bg-rose-400 transition-all"
              style={{ width: `${barCancelled}%` }}
            />
          </div>

          {/* Courier breakdown */}
          {(checking || activeCouriers.length > 0) && (
            <div className="mt-1.5 space-y-0.5 border-t border-slate-100 pt-1">
              {activeCouriers.length > 0 ? (
                activeCouriers.map((c) => (
                  <div key={c.name} className="flex items-center justify-between gap-1 truncate">
                    <span className="font-semibold text-slate-700">{c.name}</span>
                    <span>
                      <span className={clsx("font-bold", rateTone(c.successRate))}>
                        {c.successRate}%
                      </span>{" "}
                      <span className="text-slate-400">({c.total})</span>
                    </span>
                  </div>
                ))
              ) : (
                <p className="text-slate-400">Checking couriers…</p>
              )}
            </div>
          )}
        </div>
      </button>

      <CourierRatioModal
        open={modalOpen}
        phone={phone}
        localOrders={local.orders}
        onClose={() => setModalOpen(false)}
      />
    </>
  );
}

function rateTone(rate: number): string {
  if (rate >= 80) return "text-emerald-600";
  if (rate >= 50) return "text-amber-600";
  return "text-rose-600";
}
