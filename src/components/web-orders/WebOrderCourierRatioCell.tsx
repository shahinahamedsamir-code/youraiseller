"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { normalizePhoneForApi } from "@/lib/hoorin-courier";
import type { CourierCheckResult } from "@/lib/hoorin-courier";
import { fetchCourierCheck, peekCourierCheck } from "@/lib/courier-check-client";
import { findOrdersByPhone } from "@/lib/orders-store";
import { WebOrderSuccessRing } from "@/components/web-orders/WebOrderSuccessRing";
import { CourierRatioModal } from "@/components/web-orders/CourierRatioModal";

type Props = {
  phone: string;
};

export function WebOrderCourierRatioCell({ phone }: Props) {
  const rootRef = useRef<HTMLButtonElement>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const digits = normalizePhoneForApi(phone);
  const localOrders = useMemo(() => findOrdersByPhone(phone), [phone]);
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

  const activeCouriers = (data?.couriers ?? []).filter((c) => c.total > 0);
  const courierTotal = activeCouriers.reduce((s, c) => s + c.total, 0);
  const courierSuccess = activeCouriers.reduce((s, c) => s + c.delivered, 0);
  const hasCourierData = courierTotal > 0;

  const successPct = hasCourierData
    ? Math.round((courierSuccess / courierTotal) * 100)
    : 0;
  const orderDisplay = hasCourierData
    ? `${courierSuccess}/${courierTotal}`
    : checking
      ? "..."
      : "0/0";

  const tail = parseInt((digits ?? "").slice(-2), 10);
  const base = Number.isNaN(tail) ? 72 : 68 + (tail % 25);
  const rating = Math.min(99, Math.round(base * 0.35 + successPct * 0.65));

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
          <WebOrderSuccessRing percent={successPct} size={48} />
        </div>
        <div className="min-w-0 text-[10px] leading-tight text-slate-600">
          <p>
            <span className="font-bold text-slate-800">Success:</span>{" "}
            {checking && !hasCourierData ? (
              <span className="text-slate-400">…</span>
            ) : (
              <span className={clsx("font-extrabold", rateTone(successPct))}>
                {successPct}%
              </span>
            )}
          </p>
          <p>
            <span className="font-bold text-slate-800">Order:</span>{" "}
            {orderDisplay}
          </p>
          <p>
            <span className="font-bold text-slate-800">Rating:</span> {rating}
          </p>
        </div>
      </button>

      <CourierRatioModal
        open={modalOpen}
        phone={phone}
        localOrders={localOrders}
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
