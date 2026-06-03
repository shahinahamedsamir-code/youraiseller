"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import { Loader2 } from "lucide-react";
import type { CourierCheckResult } from "@/lib/hoorin-courier";
import { normalizePhoneForApi } from "@/lib/hoorin-courier";
import { findOrdersByPhone } from "@/lib/orders-store";
import { WebOrderSuccessRing } from "@/components/web-orders/WebOrderSuccessRing";
import { CourierRatioModal } from "@/components/web-orders/CourierRatioModal";

type Props = {
  phone: string;
};

const courierCache = new Map<string, CourierCheckResult>();
const inflight = new Map<string, Promise<CourierCheckResult | null>>();

async function fetchCourierStats(phone: string): Promise<CourierCheckResult | null> {
  const cached = courierCache.get(phone);
  if (cached) return cached;

  const pending = inflight.get(phone);
  if (pending) return pending;

  const promise = (async () => {
    try {
      const res = await fetch(
        `/api/courier-check?phone=${encodeURIComponent(phone)}`,
        { cache: "no-store" }
      );
      const json = await res.json();
      if (!res.ok) return null;
      const data: CourierCheckResult = {
        overall: json.overall,
        couriers: json.couriers ?? [],
      };
      courierCache.set(phone, data);
      return data;
    } catch {
      return null;
    } finally {
      inflight.delete(phone);
    }
  })();

  inflight.set(phone, promise);
  return promise;
}

function localRecord(phone: string) {
  const orders = findOrdersByPhone(phone);
  const delivered = orders.filter((o) => o.status === "delivered").length;
  const total = orders.length;
  const successRate = total > 0 ? Math.round((delivered / total) * 100) : 0;
  return { orders, total, delivered, successRate, isNew: total === 0 };
}

export function WebOrderCourierRatioCell({ phone }: Props) {
  const rootRef = useRef<HTMLButtonElement>(null);
  const [visible, setVisible] = useState(false);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<CourierCheckResult | null>(null);
  const [modalOpen, setModalOpen] = useState(false);

  const digits = normalizePhoneForApi(phone);
  const local = useMemo(() => localRecord(phone), [phone]);

  useEffect(() => {
    const el = rootRef.current;
    if (!el || !digits) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting) setVisible(true);
      },
      { rootMargin: "80px" }
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, [digits]);

  useEffect(() => {
    if (!visible || !digits) return;

    const cached = courierCache.get(digits);
    if (cached) {
      setData(cached);
      return;
    }

    let cancelled = false;
    setLoading(true);
    fetchCourierStats(digits).then((result) => {
      if (cancelled) return;
      setData(result);
      setLoading(false);
    });

    return () => {
      cancelled = true;
    };
  }, [visible, digits]);

  const courierRate = data?.overall.successRate;
  const ringPercent =
    courierRate != null ? courierRate : local.isNew ? 0 : local.successRate;
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
        title="View courier delivery ratio"
      >
        <div className="relative shrink-0">
          <WebOrderSuccessRing percent={ringPercent} size={48} />
          {loading && !data ? (
            <span className="absolute inset-0 flex items-center justify-center rounded-full bg-white/70">
              <Loader2 className="h-4 w-4 animate-spin text-violet-500" />
            </span>
          ) : null}
        </div>
        <div className="min-w-0 text-[10px] leading-tight text-slate-600">
          <p>
            <span className="font-bold text-slate-800">Courier:</span>{" "}
            {loading && !data ? (
              <span className="text-violet-600">Checking…</span>
            ) : courierRate != null ? (
              <span className={clsx("font-extrabold", rateTone(courierRate))}>
                {courierRate}%
              </span>
            ) : (
              <span className="text-slate-400">—</span>
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
          ) : data && data.overall.total === 0 ? (
            <p className="text-slate-400">No courier history</p>
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
