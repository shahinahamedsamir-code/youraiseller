"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import {
  RefreshCw,
  UserPlus,
  Loader2,
  AlertCircle,
  Sparkles,
  Wand2,
  History,
  Shield,
  ScanSearch,
  Truck,
  BarChart3,
} from "lucide-react";
import type { CourierCheckResult, CourierStat } from "@/lib/hoorin-courier";
import { normalizePhoneForApi } from "@/lib/hoorin-courier";
import type { Order } from "@/lib/orders-store";
import { CustomerOrderHistoryModal } from "@/components/orders/CustomerOrderHistoryModal";

type Props = {
  phone: string;
  localOrders: Order[];
  onFillInfo?: (order: Order) => void;
  embedded?: boolean;
};

type HistoryView =
  | "all"
  | "delivered"
  | "pending"
  | "rts"
  | "shipped"
  | "preorder"
  | "partial"
  | "returned"
  | "cancelled"
  | "pending_cancel"
  | "lost"
  | "web_cancel"
  | null;

type RecordBucketView = Exclude<HistoryView, null | "all">;

type RecordBucketDef = {
  view: RecordBucketView;
  label: string;
  dotClass: string;
  valueClass: string;
};

type RecordStatusRow = {
  view: Exclude<HistoryView, null>;
  label: string;
  count: number;
  dotClass: string;
  valueClass: string;
};

type CourierTheme = {
  badge: string;
  bar: string;
  ring: string;
  tint: string;
};

const COURIER_THEMES: Record<string, CourierTheme> = {
  Overall: {
    badge: "from-emerald-500 to-teal-500",
    bar: "bg-emerald-500",
    ring: "text-emerald-500",
    tint: "from-emerald-50/80 to-white",
  },
  Pathao: {
    badge: "from-orange-400 to-rose-500",
    bar: "bg-orange-500",
    ring: "text-orange-500",
    tint: "from-orange-50/70 to-white",
  },
  RedX: {
    badge: "from-rose-500 to-red-500",
    bar: "bg-rose-500",
    ring: "text-rose-500",
    tint: "from-rose-50/70 to-white",
  },
  Steadfast: {
    badge: "from-violet-500 to-indigo-600",
    bar: "bg-violet-500",
    ring: "text-violet-500",
    tint: "from-violet-50/70 to-white",
  },
  Carrybee: {
    badge: "from-amber-400 to-orange-500",
    bar: "bg-amber-500",
    ring: "text-amber-500",
    tint: "from-amber-50/70 to-white",
  },
  Paperfly: {
    badge: "from-cyan-400 to-blue-500",
    bar: "bg-cyan-500",
    ring: "text-cyan-500",
    tint: "from-cyan-50/70 to-white",
  },
};

const DEFAULT_THEME: CourierTheme = {
  badge: "from-slate-500 to-slate-600",
  bar: "bg-slate-400",
  ring: "text-slate-400",
  tint: "from-slate-50 to-white",
};

const COURIER_LOAD_STEPS = [
  {
    icon: Shield,
    title: "Verifying customer…",
    hint: "Validating phone & order footprint",
  },
  {
    icon: ScanSearch,
    title: "Fraud risk scanning…",
    hint: "Cross-checking cancel & return signals",
  },
  {
    icon: Truck,
    title: "Courier history lookup…",
    hint: "Pathao · RedX · Steadfast · more",
  },
  {
    icon: BarChart3,
    title: "Scaling success ratio…",
    hint: "Building delivery scorecard",
  },
] as const;

function CourierCheckProgress({
  step,
  progress,
}: {
  step: number;
  progress: number;
}) {
  const current = COURIER_LOAD_STEPS[step % COURIER_LOAD_STEPS.length];
  const Icon = current.icon;

  return (
    <div className="relative h-full min-h-[132px] min-w-0 flex-1 overflow-hidden rounded-xl border border-violet-200/80 bg-gradient-to-br from-violet-50/90 via-white to-indigo-50/60 p-3.5 shadow-sm ring-1 ring-violet-100/80 sm:min-h-[148px]">
      <div className="pointer-events-none absolute -right-8 -top-8 h-24 w-24 rounded-full bg-violet-300/20 blur-2xl" />
      <div className="pointer-events-none absolute -bottom-6 -left-6 h-20 w-20 rounded-full bg-indigo-300/15 blur-2xl" />

      <div className="relative flex items-start gap-3">
        <div className="relative shrink-0">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-md shadow-violet-200/60">
            <Icon className="h-5 w-5" />
          </div>
          <span className="absolute -inset-1 animate-ping rounded-xl bg-violet-400/25" />
        </div>
        <div className="min-w-0 flex-1 pt-0.5">
          <p className="text-sm font-extrabold text-violet-900">{current.title}</p>
          <p className="mt-0.5 text-[11px] font-medium text-slate-500">{current.hint}</p>
        </div>
        <Loader2 className="h-4 w-4 shrink-0 animate-spin text-violet-500" />
      </div>

      <div className="relative mt-4">
        <div className="mb-1.5 flex items-center justify-between text-[10px] font-semibold">
          <span className="text-violet-700">Intelligence check</span>
          <span className="tabular-nums text-slate-500">{Math.round(progress)}%</span>
        </div>
        <div className="h-2 overflow-hidden rounded-full bg-violet-100/90 ring-1 ring-violet-100">
          <div
            className="relative h-full rounded-full bg-gradient-to-r from-violet-500 via-indigo-500 to-violet-500 transition-[width] duration-500 ease-out"
            style={{ width: `${progress}%` }}
          >
            <div className="absolute inset-0 animate-pulse bg-white/25" />
          </div>
        </div>
      </div>

      <div className="relative mt-3 flex flex-wrap gap-1.5">
        {COURIER_LOAD_STEPS.map((s, i) => {
          const StepIcon = s.icon;
          const activeIndex = step % COURIER_LOAD_STEPS.length;
          const active = i === activeIndex;
          const done = i < activeIndex;
          return (
            <span
              key={s.title}
              className={clsx(
                "inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[9px] font-bold ring-1 transition",
                active
                  ? "bg-violet-600 text-white ring-violet-500"
                  : done
                    ? "bg-emerald-50 text-emerald-700 ring-emerald-200"
                    : "bg-white/80 text-slate-400 ring-slate-200"
              )}
            >
              <StepIcon className="h-3 w-3" />
              {i + 1}
            </span>
          );
        })}
      </div>
    </div>
  );
}

function sortByNewest(orders: Order[]): Order[] {
  return [...orders].sort(
    (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
  );
}

function isWebCancelOrder(o: Order): boolean {
  return (
    o.source === "web" &&
    (o.status === "cancelled" || o.webStatus === "cancelled")
  );
}

const RECORD_BUCKETS: RecordBucketDef[] = [
  {
    view: "delivered",
    label: "Delivered",
    dotClass: "bg-emerald-500",
    valueClass: "text-emerald-700",
  },
  {
    view: "pending",
    label: "Pending",
    dotClass: "bg-amber-500",
    valueClass: "text-amber-700",
  },
  {
    view: "rts",
    label: "RTS",
    dotClass: "bg-sky-500",
    valueClass: "text-sky-700",
  },
  {
    view: "shipped",
    label: "Shipped",
    dotClass: "bg-indigo-500",
    valueClass: "text-indigo-700",
  },
  {
    view: "preorder",
    label: "Preorder",
    dotClass: "bg-violet-500",
    valueClass: "text-violet-700",
  },
  {
    view: "partial",
    label: "Partial",
    dotClass: "bg-teal-500",
    valueClass: "text-teal-700",
  },
  {
    view: "returned",
    label: "Returned",
    dotClass: "bg-orange-500",
    valueClass: "text-orange-700",
  },
  {
    view: "cancelled",
    label: "Cancelled",
    dotClass: "bg-slate-400",
    valueClass: "text-slate-600",
  },
  {
    view: "pending_cancel",
    label: "Pending Cancel",
    dotClass: "bg-rose-400",
    valueClass: "text-rose-600",
  },
  {
    view: "lost",
    label: "Lost",
    dotClass: "bg-red-500",
    valueClass: "text-red-700",
  },
  {
    view: "web_cancel",
    label: "Web Cancel",
    dotClass: "bg-fuchsia-500",
    valueClass: "text-fuchsia-700",
  },
];

function categorizeRecordOrder(o: Order): RecordBucketView {
  if (isWebCancelOrder(o)) return "web_cancel";
  if (o.status === "delivered") return "delivered";
  if (o.status === "returned" || o.status === "pending_return") return "returned";
  if (o.status === "cancelled") return "cancelled";
  if (o.status === "pending_cancel") return "pending_cancel";
  if (o.status === "lost") return "lost";
  if (o.status === "preorder" || o.isPreorder) return "preorder";
  if (o.status === "partial") return "partial";
  if (o.status === "shipped") return "shipped";
  if (o.status === "rts") return "rts";
  return "pending";
}

function buildOrdersByView(orders: Order[]): Record<Exclude<HistoryView, null>, Order[]> {
  const sorted = sortByNewest(orders);
  const byView = {
    all: sorted,
  } as Record<Exclude<HistoryView, null>, Order[]>;

  for (const bucket of RECORD_BUCKETS) {
    byView[bucket.view] = [];
  }

  for (const order of sorted) {
    byView[categorizeRecordOrder(order)].push(order);
  }

  for (const bucket of RECORD_BUCKETS) {
    byView[bucket.view] = sortByNewest(byView[bucket.view]);
  }

  return byView;
}

function getTheme(name: string): CourierTheme {
  return COURIER_THEMES[name] ?? DEFAULT_THEME;
}

function rateTone(rate: number): string {
  if (rate >= 90) return "text-emerald-600";
  if (rate >= 70) return "text-amber-600";
  return "text-rose-600";
}

function DeliveryCounts({
  total,
  success,
  cancelled,
  loading,
}: {
  total: number;
  success: number;
  cancelled: number;
  loading?: boolean;
}) {
  const rows = [
    {
      label: "Total",
      value: total,
      dot: "bg-sky-500",
      valueClass: "text-slate-800",
    },
    {
      label: "Success",
      value: success,
      dot: "bg-emerald-500",
      valueClass: "text-emerald-700",
    },
    {
      label: "Cancelled",
      value: cancelled,
      dot: "bg-rose-500",
      valueClass: "text-rose-600",
    },
  ];

  return (
    <div className="space-y-1">
      {rows.map((row) => (
        <div
          key={row.label}
          className="flex items-center justify-between gap-3 text-[10px]"
        >
          <span className="flex items-center gap-1.5 font-semibold text-slate-600">
            <span className={clsx("h-1.5 w-1.5 shrink-0 rounded-full", row.dot)} />
            {row.label}
          </span>
          <span className={clsx("font-extrabold tabular-nums", row.valueClass)}>
            {loading ? "—" : row.value}
          </span>
        </div>
      ))}
    </div>
  );
}

function CourierStatCard({
  stat,
  loading,
}: {
  stat: CourierStat;
  loading?: boolean;
}) {
  const theme = getTheme(stat.name);
  const initials = stat.name.slice(0, 2).toUpperCase();

  return (
    <div
      className={clsx(
        "min-w-[118px] shrink-0 snap-start rounded-xl border border-violet-100/80 bg-gradient-to-br p-2.5 shadow-sm ring-1 ring-violet-50/80 sm:min-w-[128px] sm:p-3 lg:min-w-0 lg:flex-1 lg:shrink",
        theme.tint
      )}
    >
      <div className="flex items-center justify-between gap-1.5">
        <div className="flex min-w-0 items-center gap-1.5">
          <div
            className={clsx(
              "flex h-6 w-6 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br text-[8px] font-black text-white shadow-sm sm:h-7 sm:w-7 sm:text-[9px]",
              theme.badge
            )}
          >
            {initials}
          </div>
          <p className="truncate text-[9px] font-bold uppercase tracking-wide text-slate-600 sm:text-[10px]">
            {stat.name}
          </p>
        </div>
        {loading ? (
          <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-slate-300" />
        ) : null}
      </div>

      <p
        className={clsx(
          "mt-2 text-xs font-extrabold sm:text-sm",
          rateTone(stat.successRate)
        )}
      >
        {loading ? "—" : `${stat.successRate}%`}
      </p>
      <p className="text-[9px] font-semibold text-slate-500">Success rate</p>

      <div className="mt-2">
        <DeliveryCounts
          total={stat.total}
          success={stat.delivered}
          cancelled={stat.cancelled}
          loading={loading}
        />
      </div>

      <div className="mt-2.5 h-1.5 overflow-hidden rounded-full bg-slate-100">
        <div
          className={clsx("h-full rounded-full transition-all duration-700", theme.bar)}
          style={{
            width: loading ? "24%" : `${Math.min(stat.successRate, 100)}%`,
          }}
        />
      </div>
    </div>
  );
}

function RecordStatusBreakdown({
  rows,
  onSelect,
}: {
  rows: RecordStatusRow[];
  onSelect: (view: HistoryView) => void;
}) {
  return (
    <div className="space-y-1">
      {rows.map((row) => {
        const clickable = row.count > 0;
        return (
          <button
            key={row.view}
            type="button"
            disabled={!clickable}
            onClick={() => onSelect(row.view)}
            className={clsx(
              "flex w-full items-center justify-between gap-3 rounded-md px-0.5 text-[10px] transition",
              clickable
                ? "cursor-pointer hover:bg-violet-50/80"
                : "cursor-default opacity-80"
            )}
          >
            <span className="flex items-center gap-1.5 font-semibold text-slate-600">
              <span className={clsx("h-1.5 w-1.5 shrink-0 rounded-full", row.dotClass)} />
              {row.label}
            </span>
            <span
              className={clsx(
                "font-extrabold tabular-nums",
                row.valueClass,
                clickable && row.view !== "all" && "underline decoration-violet-300 underline-offset-2"
              )}
            >
              {row.count}
            </span>
          </button>
        );
      })}
    </div>
  );
}

function OurRecordPanel({
  isNew,
  successRate,
  delivered,
  statusRows,
  onHistory,
  onFill,
  canFill,
}: {
  isNew: boolean;
  successRate: number;
  delivered: number;
  statusRows: RecordStatusRow[];
  onHistory: (view: HistoryView) => void;
  onFill?: () => void;
  canFill: boolean;
}) {
  return (
    <div className="h-full rounded-xl border border-violet-100/90 bg-white p-3 shadow-sm ring-1 ring-violet-50">
      <div className="flex items-center gap-2">
        <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-violet-100 text-violet-600">
          <History className="h-3.5 w-3.5" />
        </div>
        <p className="text-[11px] font-extrabold text-violet-800">Our Record</p>
      </div>

      {isNew ? (
        <div className="mt-3 flex flex-col items-center rounded-xl border border-dashed border-violet-200/90 bg-violet-50/40 px-3 py-4 text-center">
          <Sparkles className="h-4 w-4 text-violet-500" />
          <p className="mt-1.5 text-[11px] font-bold text-violet-800">New customer</p>
        </div>
      ) : (
        <>
          <div className="mt-3">
            <RecordStatusBreakdown rows={statusRows} onSelect={onHistory} />
          </div>

          {delivered > 0 ? (
            <div className="mt-2">
              <div className="mb-1 flex items-center justify-between text-[10px]">
                <span className="font-semibold text-slate-500">Success rate</span>
                <span className={clsx("font-extrabold", rateTone(successRate))}>
                  {successRate}%
                </span>
              </div>
              <div className="h-1.5 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-emerald-500 transition-all duration-500"
                  style={{ width: `${successRate}%` }}
                />
              </div>
            </div>
          ) : null}
        </>
      )}

      {canFill && onFill ? (
        <button
          type="button"
          onClick={onFill}
          className="mt-2.5 flex w-full items-center justify-center gap-1 rounded-lg border border-teal-200 bg-teal-50 px-2 py-1.5 text-[11px] font-bold text-teal-800 transition hover:bg-teal-100"
        >
          <Wand2 className="h-3 w-3" />
          Fill
        </button>
      ) : null}
    </div>
  );
}

export function CourierRatioPanel({ phone, localOrders, onFillInfo, embedded }: Props) {
  const [data, setData] = useState<CourierCheckResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [historyView, setHistoryView] = useState<HistoryView>(null);
  const [loadStep, setLoadStep] = useState(0);
  const [loadProgress, setLoadProgress] = useState(8);

  const digits = normalizePhoneForApi(phone);

  const localMeta = useMemo(() => {
    const sorted = sortByNewest(localOrders);
    const ordersByView = buildOrdersByView(localOrders);
    const total = sorted.length;
    const delivered = ordersByView.delivered.length;
    const successRate =
      total > 0 ? Math.round((delivered / total) * 100) : 0;

    return {
      isNew: total === 0,
      total,
      delivered,
      successRate,
      sorted,
      ordersByView,
      last: sorted[0],
    };
  }, [localOrders]);

  const recordStatusRows = useMemo((): RecordStatusRow[] => {
    if (localMeta.isNew) return [];
    const rows: RecordStatusRow[] = [
      {
        view: "all",
        label: "Total",
        count: localMeta.total,
        dotClass: "bg-sky-500",
        valueClass: "text-slate-800",
      },
      ...RECORD_BUCKETS.map((bucket) => ({
        view: bucket.view,
        label: bucket.label,
        count: localMeta.ordersByView[bucket.view].length,
        dotClass: bucket.dotClass,
        valueClass: bucket.valueClass,
      })).filter((row) => row.count > 0),
    ];
    return rows;
  }, [localMeta]);

  const fetchStats = async (targetPhone: string) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/courier-check?phone=${encodeURIComponent(targetPhone)}`,
        { cache: "no-store" }
      );
      const json = await res.json();
      if (!res.ok) {
        setError(json?.error ?? "Could not load courier stats");
        setData(null);
        return;
      }
      setData({
        overall: json.overall,
        couriers: json.couriers ?? [],
      });
    } catch {
      setError("Network error — could not check courier ratio");
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!digits) {
      setData(null);
      setError(null);
      setLoading(false);
      setLoadProgress(8);
      return;
    }
    setLoading(true);
    setLoadStep(0);
    setLoadProgress(12);
    const t = window.setTimeout(() => fetchStats(digits), 450);
    return () => window.clearTimeout(t);
  }, [digits]);

  useEffect(() => {
    if (!loading) {
      setLoadProgress(8);
      return;
    }
    const stepTimer = window.setInterval(() => {
      setLoadStep((s) => s + 1);
    }, 1400);
    const progressTimer = window.setInterval(() => {
      setLoadProgress((p) => {
        if (p >= 92) return p;
        return Math.min(92, p + 6 + Math.random() * 10);
      });
    }, 450);
    return () => {
      window.clearInterval(stepTimer);
      window.clearInterval(progressTimer);
    };
  }, [loading]);

  useEffect(() => {
    if (!loading && data) {
      setLoadProgress(100);
      const t = window.setTimeout(() => setLoadProgress(8), 600);
      return () => window.clearTimeout(t);
    }
  }, [loading, data]);

  if (!digits) return null;

  const body = (
    <>
      <div className="relative min-w-0">
        <div className="flex w-full items-stretch gap-2 overflow-x-auto overscroll-x-contain scroll-smooth p-3 pb-2 snap-x snap-mandatory touch-pan-x [-ms-overflow-style:auto] [scrollbar-width:thin] lg:overflow-x-visible lg:snap-none lg:pb-3 [&::-webkit-scrollbar]:h-1.5 [&::-webkit-scrollbar-thumb]:rounded-full [&::-webkit-scrollbar-thumb]:bg-violet-200 [&::-webkit-scrollbar-track]:bg-transparent lg:[&::-webkit-scrollbar]:hidden">
          <div className="h-full w-[142px] shrink-0 snap-start sm:w-[156px] lg:w-auto lg:min-w-[132px] lg:flex-[1.15] lg:shrink">
            <OurRecordPanel
              isNew={localMeta.isNew}
              delivered={localMeta.delivered}
              successRate={localMeta.successRate}
              statusRows={recordStatusRows}
              onHistory={setHistoryView}
              canFill={!!localMeta.last && !!onFillInfo}
              onFill={
                localMeta.last && onFillInfo
                  ? () => onFillInfo(localMeta.last!)
                  : undefined
              }
            />
          </div>

          {loading ? (
            <div className="min-w-[200px] shrink-0 snap-start sm:min-w-[240px] lg:min-w-0 lg:flex-1 lg:shrink">
              <CourierCheckProgress step={loadStep} progress={loadProgress} />
            </div>
          ) : error ? (
            <div className="flex min-w-[200px] shrink-0 snap-start items-center gap-2 rounded-xl border border-amber-200/90 bg-amber-50 px-3 py-3 text-xs font-medium text-amber-800 lg:min-w-0 lg:flex-1">
              <AlertCircle className="h-4 w-4 shrink-0" />
              {error}
            </div>
          ) : data ? (
            <>
              <CourierStatCard stat={data.overall} />
              {data.couriers.map((c) => (
                <CourierStatCard key={c.name} stat={c} />
              ))}
              {data.couriers.length === 0 && data.overall.total === 0 && (
                <div className="flex min-w-[200px] shrink-0 snap-start items-center gap-2 rounded-xl border border-dashed border-slate-200 bg-white/80 px-3 py-3 text-xs text-slate-500 lg:min-w-0 lg:flex-1">
                  <UserPlus className="h-4 w-4 shrink-0 text-slate-400" />
                  No courier history for this number
                </div>
              )}
            </>
          ) : null}
        </div>
        <div
          className="pointer-events-none absolute inset-y-0 right-0 w-6 bg-gradient-to-l from-white via-white/80 to-transparent sm:w-8 lg:hidden"
          aria-hidden
        />
      </div>

      <CustomerOrderHistoryModal
        open={historyView === "all"}
        onClose={() => setHistoryView(null)}
        title="All Orders"
        subtitle={`Showing ${localMeta.total} order${localMeta.total === 1 ? "" : "s"} for this customer`}
        orders={localMeta.sorted}
      />
      {RECORD_BUCKETS.map((bucket) => {
        const orders = localMeta.ordersByView[bucket.view];
        const count = orders.length;
        return (
          <CustomerOrderHistoryModal
            key={bucket.view}
            open={historyView === bucket.view}
            onClose={() => setHistoryView(null)}
            title={`${bucket.label} Orders`}
            subtitle={`Showing ${count} ${bucket.label.toLowerCase()} order${count === 1 ? "" : "s"}`}
            orders={orders}
          />
        );
      })}
    </>
  );

  if (embedded) return body;

  return (
    <div className="mb-4 min-w-0 rounded-2xl border border-violet-100/80 bg-gradient-to-br from-violet-50/30 via-white to-indigo-50/20 shadow-sm ring-1 ring-violet-100/50">
      <div className="flex items-center gap-2 border-b border-violet-100/70 bg-white/70 px-3 py-2.5">
        <Sparkles className="h-3.5 w-3.5 text-violet-500" />
        <p className="text-[11px] font-bold uppercase tracking-wide text-slate-600">
          Courier delivery ratio
        </p>
        <button
          type="button"
          onClick={() => digits && fetchStats(digits)}
          disabled={loading}
          className="ml-auto inline-flex items-center gap-1 rounded-lg border border-slate-200/90 bg-white px-2 py-1 text-[10px] font-bold text-slate-500 transition hover:border-violet-200 hover:text-violet-600 disabled:opacity-50"
        >
          <RefreshCw className={clsx("h-3 w-3", loading && "animate-spin")} />
          Refresh
        </button>
      </div>
      {body}
    </div>
  );
}
