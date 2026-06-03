"use client";

import { useEffect, useRef, useState, type RefObject } from "react";
import Link from "next/link";
import { motion } from "framer-motion";
import clsx from "clsx";
import {
  AlertTriangle,
  Ban,
  Calendar,
  CalendarRange,
  CheckCircle2,
  ClipboardList,
  Clock,
  CreditCard,
  Crown,
  Globe,
  Package,
  PauseCircle,
  PhoneOff,
  RotateCcw,
  SearchX,
  ThumbsUp,
  TrendingUp,
  Truck,
  Wallet,
  Warehouse,
} from "lucide-react";
import {
  buildFounderApprovedOrderSummary,
  buildFounderOverview,
  buildFounderWebOrderSummary,
  DEFAULT_FOUNDER_DATE_FILTER,
  formatFounderCount,
  formatFounderCurrency,
  getFounderDatePresetLabel,
  getFounderDateRangeLabel,
  getFounderOrdersInReview,
  isFounderPresetFilter,
  type FounderApprovedSummaryItem,
  type FounderDateFilter,
  type FounderDatePreset,
  type FounderWebSummaryItem,
} from "@/lib/dashboard-stats";
import type { WebOrderTabKey } from "@/lib/web-order-tabs";
import type { OrderStatus } from "@/lib/orders-store";
import { resolveWebDisplayStatus } from "@/lib/order-edit";
import { statusColors } from "@/lib/mock-web-orders";

const QUICK_PRESETS: FounderDatePreset[] = ["today", "yesterday", "30d"];
const MORE_PRESETS: FounderDatePreset[] = ["7d", "all"];

const STAT_ACCENTS = [
  {
    icon: Package,
    bar: "bg-indigo-500",
    iconBg: "bg-indigo-500/10 text-indigo-600",
    ring: "ring-indigo-100",
  },
  {
    icon: Wallet,
    bar: "bg-rose-500",
    iconBg: "bg-rose-500/10 text-rose-600",
    ring: "ring-rose-100",
  },
  {
    icon: Warehouse,
    bar: "bg-amber-500",
    iconBg: "bg-amber-500/10 text-amber-600",
    ring: "ring-amber-100",
  },
  {
    icon: TrendingUp,
    bar: "bg-teal-500",
    iconBg: "bg-teal-500/10 text-teal-600",
    ring: "ring-teal-100",
  },
] as const;

const APPROVED_STATUS_ICONS: Record<OrderStatus, typeof Clock> = {
  pending: Clock,
  rts: Package,
  shipped: Truck,
  delivered: CheckCircle2,
  pending_return: RotateCcw,
  returned: RotateCcw,
  partial: AlertTriangle,
  cancelled: Ban,
  pending_cancel: AlertTriangle,
  preorder: Calendar,
  lost: SearchX,
};

const APPROVED_CARD_STYLES: Record<
  OrderStatus,
  { surface: string; icon: string; count: string }
> = {
  pending: {
    surface: "from-amber-50/90 to-yellow-50/40 border-amber-100/80 hover:border-amber-200",
    icon: "bg-amber-500/15 text-amber-600",
    count: "text-amber-700",
  },
  rts: {
    surface: "from-sky-50/90 to-blue-50/40 border-sky-100/80 hover:border-sky-200",
    icon: "bg-sky-500/15 text-sky-600",
    count: "text-sky-700",
  },
  shipped: {
    surface: "from-indigo-50/90 to-violet-50/40 border-indigo-100/80 hover:border-indigo-200",
    icon: "bg-indigo-500/15 text-indigo-600",
    count: "text-indigo-700",
  },
  delivered: {
    surface: "from-emerald-50/90 to-teal-50/40 border-emerald-100/80 hover:border-emerald-200",
    icon: "bg-emerald-500/15 text-emerald-600",
    count: "text-emerald-700",
  },
  pending_return: {
    surface: "from-orange-50/90 to-amber-50/40 border-orange-100/80 hover:border-orange-200",
    icon: "bg-orange-500/15 text-orange-600",
    count: "text-orange-700",
  },
  returned: {
    surface: "from-rose-50/90 to-red-50/40 border-rose-100/80 hover:border-rose-200",
    icon: "bg-rose-500/15 text-rose-600",
    count: "text-rose-700",
  },
  partial: {
    surface: "from-violet-50/90 to-purple-50/40 border-violet-100/80 hover:border-violet-200",
    icon: "bg-violet-500/15 text-violet-600",
    count: "text-violet-700",
  },
  cancelled: {
    surface: "from-slate-50/90 to-stone-50/40 border-slate-200/80 hover:border-slate-300",
    icon: "bg-slate-400/15 text-slate-500",
    count: "text-slate-600",
  },
  pending_cancel: {
    surface: "from-pink-50/90 to-rose-50/40 border-pink-100/80 hover:border-pink-200",
    icon: "bg-pink-500/15 text-pink-600",
    count: "text-pink-700",
  },
  preorder: {
    surface: "from-cyan-50/90 to-sky-50/40 border-cyan-100/80 hover:border-cyan-200",
    icon: "bg-cyan-500/15 text-cyan-600",
    count: "text-cyan-700",
  },
  lost: {
    surface: "from-red-50/90 to-orange-50/40 border-red-100/80 hover:border-red-200",
    icon: "bg-red-500/15 text-red-600",
    count: "text-red-700",
  },
};

const STATUS_ICONS: Record<WebOrderTabKey, typeof Clock> = {
  processing: Clock,
  incomplete: AlertTriangle,
  good_no_response: ThumbsUp,
  no_response: PhoneOff,
  advance_payment: CreditCard,
  on_hold: PauseCircle,
  complete: CheckCircle2,
  cancel: Ban,
  all: Globe,
};

const STATUS_CARD_STYLES: Record<
  WebOrderTabKey,
  { surface: string; icon: string; count: string }
> = {
  processing: {
    surface: "from-blue-50/90 to-indigo-50/40 border-blue-100/80 hover:border-blue-200",
    icon: "bg-blue-500/15 text-blue-600",
    count: "text-blue-700",
  },
  incomplete: {
    surface: "from-orange-50/90 to-amber-50/40 border-orange-100/80 hover:border-orange-200",
    icon: "bg-orange-500/15 text-orange-600",
    count: "text-orange-700",
  },
  good_no_response: {
    surface: "from-violet-50/90 to-purple-50/40 border-violet-100/80 hover:border-violet-200",
    icon: "bg-violet-500/15 text-violet-600",
    count: "text-violet-700",
  },
  no_response: {
    surface: "from-rose-50/90 to-pink-50/40 border-rose-100/80 hover:border-rose-200",
    icon: "bg-rose-500/15 text-rose-600",
    count: "text-rose-700",
  },
  advance_payment: {
    surface: "from-emerald-50/90 to-teal-50/40 border-emerald-100/80 hover:border-emerald-200",
    icon: "bg-emerald-500/15 text-emerald-600",
    count: "text-emerald-700",
  },
  on_hold: {
    surface: "from-slate-50/90 to-zinc-50/40 border-slate-200/80 hover:border-slate-300",
    icon: "bg-slate-500/15 text-slate-600",
    count: "text-slate-700",
  },
  complete: {
    surface: "from-teal-50/90 to-cyan-50/40 border-teal-100/80 hover:border-teal-200",
    icon: "bg-teal-500/15 text-teal-600",
    count: "text-teal-700",
  },
  cancel: {
    surface: "from-slate-50/90 to-stone-50/40 border-slate-200/80 hover:border-slate-300",
    icon: "bg-slate-400/15 text-slate-500",
    count: "text-slate-600",
  },
  all: {
    surface: "from-indigo-50/90 to-violet-50/40 border-indigo-100/80 hover:border-indigo-200",
    icon: "bg-indigo-500/15 text-indigo-600",
    count: "text-indigo-700",
  },
};

function FounderDateFilter({
  dateFilter,
  onChange,
  customOpen,
  setCustomOpen,
  customRef,
}: {
  dateFilter: FounderDateFilter;
  onChange: (filter: FounderDateFilter) => void;
  customOpen: boolean;
  setCustomOpen: (open: boolean) => void;
  customRef: RefObject<HTMLDivElement>;
}) {
  const singleDate = dateFilter.mode === "single" ? dateFilter.date : "";
  const rangeFrom = dateFilter.mode === "range" ? dateFilter.from : "";
  const rangeTo = dateFilter.mode === "range" ? dateFilter.to : "";

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="inline-flex items-center gap-1.5 rounded-full bg-white/80 px-3 py-1 text-xs font-semibold text-slate-600 ring-1 ring-slate-200/80">
        <Calendar className="h-3.5 w-3.5 text-teal-600" />
        {getFounderDateRangeLabel(dateFilter)}
      </span>
      <div className="flex flex-wrap items-center gap-1 rounded-xl bg-slate-100/80 p-1 ring-1 ring-slate-200/60">
        {QUICK_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => {
              onChange({ mode: "preset", preset });
              setCustomOpen(false);
            }}
            className={clsx(
              "rounded-lg px-3 py-1.5 text-sm font-bold transition",
              isFounderPresetFilter(dateFilter, preset)
                ? "bg-white text-teal-700 shadow-sm ring-1 ring-teal-100"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            {getFounderDatePresetLabel(preset)}
          </button>
        ))}
        {MORE_PRESETS.map((preset) => (
          <button
            key={preset}
            type="button"
            onClick={() => {
              onChange({ mode: "preset", preset });
              setCustomOpen(false);
            }}
            className={clsx(
              "rounded-lg px-3 py-1.5 text-sm font-bold transition",
              isFounderPresetFilter(dateFilter, preset)
                ? "bg-white text-teal-700 shadow-sm ring-1 ring-teal-100"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            {getFounderDatePresetLabel(preset)}
          </button>
        ))}
        <div ref={customRef} className="relative">
          <button
            type="button"
            onClick={() => setCustomOpen(!customOpen)}
            aria-label="Custom date"
            className={clsx(
              "inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-sm font-bold transition",
              dateFilter.mode !== "preset"
                ? "bg-white text-teal-700 shadow-sm ring-1 ring-teal-100"
                : "text-slate-500 hover:bg-white hover:text-slate-700"
            )}
          >
            <CalendarRange className="h-4 w-4" />
            Custom
          </button>
          {customOpen && (
            <div className="absolute right-0 z-30 mt-1 w-[min(100vw-2rem,320px)] overflow-hidden rounded-xl border border-slate-200 bg-white p-4 shadow-xl">
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Single date
              </p>
              <input
                type="date"
                value={singleDate}
                onChange={(e) => {
                  const date = e.target.value;
                  if (!date) return;
                  onChange({ mode: "single", date });
                }}
                className="mt-1.5 w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
              />
              <p className="mt-4 text-[10px] font-bold uppercase tracking-wide text-slate-400">
                Date range
              </p>
              <div className="mt-1.5 grid grid-cols-2 gap-2">
                <label className="block space-y-1">
                  <span className="text-[10px] font-semibold text-slate-500">From</span>
                  <input
                    type="date"
                    value={rangeFrom}
                    onChange={(e) => {
                      const from = e.target.value;
                      onChange({ mode: "range", from, to: rangeTo || from });
                    }}
                    className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                  />
                </label>
                <label className="block space-y-1">
                  <span className="text-[10px] font-semibold text-slate-500">To</span>
                  <input
                    type="date"
                    value={rangeTo}
                    min={rangeFrom || undefined}
                    onChange={(e) => {
                      const to = e.target.value;
                      onChange({ mode: "range", from: rangeFrom || to, to });
                    }}
                    className="w-full rounded-lg border border-slate-200 px-2 py-2 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
                  />
                </label>
              </div>
              <button
                type="button"
                onClick={() => {
                  onChange(DEFAULT_FOUNDER_DATE_FILTER);
                  setCustomOpen(false);
                }}
                className="mt-4 w-full rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600 transition hover:bg-slate-50"
              >
                Reset to 30D
              </button>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

function FounderStatCard({
  label,
  value,
  index,
}: {
  label: string;
  value: string;
  index: number;
}) {
  const accent = STAT_ACCENTS[index] ?? STAT_ACCENTS[0];
  const Icon = accent.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 14 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.06, duration: 0.35 }}
      className={clsx(
        "yai-panel group relative min-w-0 overflow-hidden p-4 transition hover:-translate-y-0.5 hover:shadow-xl md:p-5",
        `ring-1 ${accent.ring}`
      )}
    >
      <div className={clsx("absolute left-0 top-0 h-full w-1", accent.bar)} />
      <div className="flex items-start justify-between gap-3 pl-2">
        <div className="min-w-0">
          <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
            {label}
          </p>
          <p className="mt-2 truncate text-xl font-extrabold tracking-tight text-slate-900 md:text-2xl">
            {value}
          </p>
        </div>
        <div
          className={clsx(
            "flex h-11 w-11 shrink-0 items-center justify-center rounded-2xl",
            accent.iconBg
          )}
        >
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </motion.div>
  );
}

function ApprovedStatusCard({
  item,
  index,
}: {
  item: FounderApprovedSummaryItem;
  index: number;
}) {
  const Icon = APPROVED_STATUS_ICONS[item.key];
  const style = APPROVED_CARD_STYLES[item.key];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
    >
      <Link
        href="/dashboard/orders/approved/list"
        className={clsx(
          "group flex h-full flex-col rounded-2xl border bg-gradient-to-br p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
          style.surface
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div
            className={clsx(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
              style.icon
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
          <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 ring-1 ring-white/80">
            Approved
          </span>
        </div>
        <p className={clsx("mt-3 text-3xl font-extrabold tabular-nums", style.count)}>
          {formatFounderCount(item.count)}
        </p>
        <p className="mt-1 text-xs font-semibold leading-snug text-slate-600 group-hover:text-slate-800">
          {item.label}
        </p>
      </Link>
    </motion.div>
  );
}

function WebStatusCard({ item, index }: { item: FounderWebSummaryItem; index: number }) {
  const Icon = STATUS_ICONS[item.key];
  const style = STATUS_CARD_STYLES[item.key];

  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      transition={{ delay: index * 0.04, duration: 0.3 }}
    >
      <Link
        href={`/dashboard/orders/web?tab=${item.key}`}
        className={clsx(
          "group flex h-full flex-col rounded-2xl border bg-gradient-to-br p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md",
          style.surface
        )}
      >
        <div className="flex items-start justify-between gap-2">
          <div
            className={clsx(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
              style.icon
            )}
          >
            <Icon className="h-4 w-4" />
          </div>
          <span className="rounded-full bg-white/70 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-slate-500 ring-1 ring-white/80">
            Web
          </span>
        </div>
        <p className={clsx("mt-3 text-3xl font-extrabold tabular-nums", style.count)}>
          {formatFounderCount(item.count)}
        </p>
        <p className="mt-1 text-xs font-semibold leading-snug text-slate-600 group-hover:text-slate-800">
          {item.label}
        </p>
      </Link>
    </motion.div>
  );
}

export function FounderDashboard() {
  const [dateFilter, setDateFilter] = useState<FounderDateFilter>(
    DEFAULT_FOUNDER_DATE_FILTER
  );
  const [customOpen, setCustomOpen] = useState(false);
  const [overview, setOverview] = useState(() =>
    buildFounderOverview(DEFAULT_FOUNDER_DATE_FILTER)
  );
  const [webSummary, setWebSummary] = useState(() =>
    buildFounderWebOrderSummary(DEFAULT_FOUNDER_DATE_FILTER)
  );
  const [approvedSummary, setApprovedSummary] = useState(() =>
    buildFounderApprovedOrderSummary(DEFAULT_FOUNDER_DATE_FILTER)
  );
  const [reviewOrders, setReviewOrders] = useState(() =>
    getFounderOrdersInReview(DEFAULT_FOUNDER_DATE_FILTER)
  );
  const customRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const refresh = () => {
      setOverview(buildFounderOverview(dateFilter));
      setWebSummary(buildFounderWebOrderSummary(dateFilter));
      setApprovedSummary(buildFounderApprovedOrderSummary(dateFilter));
      setReviewOrders(getFounderOrdersInReview(dateFilter));
    };
    refresh();
    window.addEventListener("youraiseller-data-updated", refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("youraiseller-data-updated", refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [dateFilter]);

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (customRef.current && !customRef.current.contains(e.target as Node)) {
        setCustomOpen(false);
      }
    };
    if (customOpen) document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [customOpen]);

  const statCards = [
    { label: "Total Orders", value: formatFounderCount(overview.totalOrders) },
    {
      label: "Total Order Value",
      value: formatFounderCurrency(overview.totalOrderValue),
    },
    {
      label: "Total Products in Stock",
      value: formatFounderCount(overview.totalProductsInStock),
    },
    { label: "Total Profit", value: formatFounderCurrency(overview.totalProfit) },
  ];

  const webTotal = webSummary.reduce((sum, item) => sum + item.count, 0);
  const approvedTotal = approvedSummary.reduce((sum, item) => sum + item.count, 0);
  const dateRangeLabel = overview.dateRangeLabel;

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-amber-100/80 bg-gradient-to-r from-amber-50/50 via-white to-violet-50/40 px-5 py-4 shadow-sm ring-1 ring-amber-100/60">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-400 to-orange-500 text-white shadow-lg shadow-amber-200/60">
            <Crown className="h-5 w-5" />
          </div>
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Founder Dashboard</h2>
            <p className="text-xs text-slate-500">
              Filters apply to overview & summaries · {dateRangeLabel}
            </p>
          </div>
        </div>
        <FounderDateFilter
          dateFilter={dateFilter}
          onChange={setDateFilter}
          customOpen={customOpen}
          setCustomOpen={setCustomOpen}
          customRef={customRef}
        />
      </div>

      <section className="yai-panel relative overflow-hidden p-6">
        <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-amber-200/30 blur-3xl" />
        <div className="pointer-events-none absolute -left-10 bottom-0 h-32 w-32 rounded-full bg-violet-200/25 blur-3xl" />
        <div className="relative mb-5">
          <h2 className="text-lg font-extrabold text-slate-900">Overview</h2>
          <p className="text-xs text-slate-500">
            {overview.dateLabel} · {dateRangeLabel}
          </p>
        </div>
        <div className="relative grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {statCards.map((card, i) => (
            <FounderStatCard key={card.label} {...card} index={i} />
          ))}
        </div>
      </section>

      <section className="yai-panel p-6">
        <div className="mb-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-md shadow-violet-200">
            <ClipboardList className="h-4 w-4" />
          </div>
          <div>
            <h3 className="font-extrabold text-slate-900">Orders In Review</h3>
            <p className="text-xs text-slate-500">
              Website orders needing attention · {dateRangeLabel}
            </p>
          </div>
        </div>
        {reviewOrders.length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/60 px-6 py-10 text-center">
            <div className="flex h-12 w-12 items-center justify-center rounded-full bg-white text-slate-300 shadow-sm ring-1 ring-slate-100">
              <ClipboardList className="h-6 w-6" />
            </div>
            <p className="mt-3 text-sm font-semibold text-slate-500">No orders in review</p>
            <p className="mt-1 max-w-sm text-xs text-slate-400">
              Incomplete, no response, or on-hold web orders will appear here.
            </p>
          </div>
        ) : (
          <ul className="divide-y divide-slate-100 overflow-hidden rounded-2xl border border-slate-200/80 bg-white">
            {reviewOrders.map((order) => {
              const ws = resolveWebDisplayStatus(order);
              return (
                <li key={order.id}>
                  <Link
                    href={`/dashboard/orders/web/view/${encodeURIComponent(order.id)}`}
                    className="flex flex-wrap items-center justify-between gap-3 px-4 py-3 transition hover:bg-violet-50/40"
                  >
                    <div>
                      <p className="font-semibold text-slate-800">
                        {order.customerName || "Unnamed customer"}
                      </p>
                      <p className="text-xs text-slate-500">
                        #{order.id}
                        {order.phone ? ` · ${order.phone}` : ""}
                      </p>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={clsx(
                          "rounded-full px-2.5 py-1 text-[11px] font-bold capitalize",
                          statusColors[ws]
                        )}
                      >
                        {ws.replace(/_/g, " ")}
                      </span>
                      <p className="font-bold tabular-nums text-slate-800">
                        {formatFounderCurrency(order.total)}
                      </p>
                    </div>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      <section className="group relative overflow-hidden rounded-2xl border border-violet-100/80 bg-gradient-to-br from-white via-white to-violet-50/40 p-6 shadow-sm ring-1 ring-violet-100/60 transition hover:shadow-md">
        <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-violet-200/25 blur-3xl" />
        <div className="relative mb-5 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-200">
              <ClipboardList className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Approved Orders Summary
              </h3>
              <p className="text-xs text-slate-500">
                Approved order list statuses · approved date · {dateRangeLabel}
              </p>
            </div>
          </div>
          <div className="rounded-full bg-white/80 px-3 py-1.5 text-xs font-bold text-slate-600 ring-1 ring-violet-100">
            {formatFounderCount(approvedTotal)} tracked
          </div>
        </div>
        <div className="relative grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {approvedSummary.map((item, i) => (
            <ApprovedStatusCard key={item.key} item={item} index={i} />
        ))}
      </div>
      </section>

      <section className="group relative overflow-hidden rounded-2xl border border-cyan-100/80 bg-gradient-to-br from-white via-white to-cyan-50/40 p-6 shadow-sm ring-1 ring-cyan-100/60 transition hover:shadow-md">
        <div className="pointer-events-none absolute -right-12 -top-12 h-36 w-36 rounded-full bg-cyan-200/25 blur-3xl" />
        <div className="relative mb-5 flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500 to-teal-600 text-white shadow-lg shadow-cyan-200">
              <Globe className="h-4 w-4" />
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900">
                Total Web Orders Summary
              </h3>
              <p className="text-xs text-slate-500">
                Website order statuses · web order date · {dateRangeLabel}
              </p>
            </div>
          </div>
          <div className="rounded-full bg-white/80 px-3 py-1.5 text-xs font-bold text-slate-600 ring-1 ring-cyan-100">
            {formatFounderCount(webTotal)} tracked
          </div>
        </div>
        <div className="relative grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {webSummary.map((item, i) => (
            <WebStatusCard key={item.key} item={item} index={i} />
          ))}
      </div>
      </section>
    </div>
  );
}
