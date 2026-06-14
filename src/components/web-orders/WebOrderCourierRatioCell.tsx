"use client";

import { useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { normalizePhoneForApi } from "@/lib/hoorin-courier";
import { peekCourierCheck } from "@/lib/courier-check-client";
import { findOrdersByPhone } from "@/lib/orders-store";
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
  const data = digits ? peekCourierCheck(digits) : null;

  const courierRate = data?.overall.successRate;
  const ringPercent = local.isNew ? 0 : local.successRate;
  const topCourier = data?.couriers.find((c) => c.total > 0);

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
        title="Click to check courier delivery ratio"
      >
        <div className="relative shrink-0">
          <WebOrderSuccessRing percent={ringPercent} size={48} />
        </div>
        <div className="min-w-0 text-[10px] leading-tight text-slate-600">
          <p>
            <span className="font-bold text-slate-800">Courier:</span>{" "}
            {courierRate != null ? (
              <span className={clsx("font-extrabold", rateTone(courierRate))}>
                {courierRate}%
              </span>
            ) : (
              <span className="font-semibold text-violet-600">Click to check</span>
            )}
          </p>
          <p>
            <span className="font-bold text-slate-800">Our:</span>{" "}
            {local.isNew ? (
              <span className="font-semibold text-violet-600">New</span>
            ) : (
              <>
                {local.delivered}/{local.total} · {local.successRate}%
              </>
            )}
          </p>
          {topCourier ? (
            <p className="truncate">
              <span className="font-bold text-slate-800">{topCourier.name}:</span>{" "}
              {topCourier.successRate}%
            </p>
          ) : null}
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
  if (rate >= 90) return "text-emerald-600";
  if (rate >= 70) return "text-amber-600";
  return "text-rose-600";
}
