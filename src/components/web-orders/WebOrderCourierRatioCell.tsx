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

  const overallCourier = useMemo(() => {
    if (activeCouriers.length === 0) return null;
    const totalOrders = activeCouriers.reduce((s, c) => s + c.total, 0);
    const totalSuccess = activeCouriers.reduce((s, c) => s + c.delivered, 0);
    const rate = totalOrders > 0 ? Math.round((totalSuccess / totalOrders) * 100) : 0;
    return { total: totalOrders, success: totalSuccess, rate };
  }, [activeCouriers]);

  if (!digits) {
    return <span className="text-xs text-slate-400">—</span>;
  }

  return (
    <>
      <button
        ref={rootRef}
        type="button"
        onClick={() => setModalOpen(true)}
        className="group flex w-full items-center gap-2 rounded-lg border border-transparent px-1 py-0.5 text-left transition hover:border-violet-200 hover:bg-violet-50/50"
        title="Click for details"
      >
        <div className="relative shrink-0">
          <WebOrderSuccessRing percent={ringPercent} size={48} />
        </div>
        <div className="min-w-0 text-[10px] leading-tight text-slate-600">
          <p>
            <span className="font-bold text-slate-800">Success:</span>{" "}
            {stats.total === 0 ? (
              <span className="font-semibold text-violet-600">New</span>
            ) : (
              <span className={clsx("font-extrabold", rateTone(stats.successPct))}>
                {stats.successPct}%
              </span>
            )}
          </p>
          <p>
            <span className="font-bold text-slate-800">Order:</span>{" "}
            {stats.success}/{stats.total}
          </p>
          <p>
            <span className="font-bold text-slate-800">Rating:</span> {stats.rating}
          </p>

          {(checking || overallCourier || activeCouriers.length > 0) && (
            <div className="mt-1 space-y-0.5 border-t border-slate-100 pt-1">
              {checking && activeCouriers.length === 0 ? (
                <p className="text-slate-400">Checking couriers…</p>
              ) : (
                <>
                  {overallCourier && (
                    <p className="truncate font-semibold">
                      <span className="font-bold text-slate-800">Overall:</span>{" "}
                      <span className={clsx("font-extrabold", rateTone(overallCourier.rate))}>
                        {overallCourier.rate}%
                      </span>{" "}
                      <span className="text-slate-400">({overallCourier.total})</span>
                    </p>
                  )}
                  {activeCouriers.map((c) => (
                    <p key={c.name} className="truncate">
                      <span className="font-bold text-slate-800">{c.name}:</span>{" "}
                      <span className={clsx("font-semibold", rateTone(c.successRate))}>
                        {c.successRate}%
                      </span>{" "}
                      <span className="text-slate-400">({c.total})</span>
                    </p>
                  ))}
                </>
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
