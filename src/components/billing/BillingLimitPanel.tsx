"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import clsx from "clsx";
import {
  BadgeDollarSign,
  CalendarClock,
  CreditCard,
  Download,
  ExternalLink,
  Loader2,
  MessageSquare,
  Phone,
  Package,
  RefreshCw,
  ShoppingBag,
  Users,
  Wallet,
  Zap,
} from "lucide-react";
import { AutoCallRechargeModal } from "@/components/integration/auto-call/AutoCallRechargeModal";
import { useAutoCallAccount } from "@/components/integration/auto-call/useAutoCallAccount";
import { SmsRechargeModal } from "@/components/integration/sms/SmsRechargeModal";
import { useSmsAccount } from "@/components/integration/sms/useSmsAccount";
import { PlanRenewPayModal } from "@/components/renew/PlanRenewPayModal";
import { useFeatures } from "@/context/FeatureContext";
import {
  refreshCurrentSessionUser,
  type DevUser,
} from "@/lib/dev-users";
import {
  PAYMENT_KIND_LABELS,
  type PaymentHistoryEntry,
  type PaymentHistoryKind,
} from "@/lib/payment-history-types";
import { fetchPublicPlanConfig, loadPlanConfigLocal } from "@/lib/plan-config-client";
import { isWebOrder, parseOrderTime, periodStartTime } from "@/lib/plan-limits";
import { IncreaseOrderLimitModal } from "@/components/billing/IncreaseOrderLimitModal";
import type { PlanId } from "@/lib/plan-config-types";
import type { PlanConfig } from "@/lib/plan-config-types";
import {
  extraOrderSurchargeTaka,
  renewalMonthlyPriceTaka,
} from "@/lib/subscription-pricing";
import { daysUntilPlanExpiry } from "@/lib/subscription-period";
import { formatSmsBdt } from "@/lib/sms-types";
import { formatAutoCallBdt } from "@/lib/auto-call-store";
import { loadProducts } from "@/lib/inventory-store";
import { loadOrders } from "@/lib/orders-store";
import { loadTeamUsers, TEAM_USERS_UPDATED } from "@/lib/team-users-store";

type KindFilter = "all" | PaymentHistoryKind;
type StatusFilter = "all" | PaymentHistoryEntry["status"];

const PLAN_USAGE_LIMITS: Record<
  PlanId,
  { products: number; orders: number; users: number }
> = {
  basic: { products: 500, orders: 500, users: 3 },
  pro: { products: 2000, orders: 2000, users: 5 },
  enterprise: { products: 10000, orders: 10000, users: 20 },
};

const KIND_FILTERS: { id: KindFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "plan_renewal", label: "Plan" },
  { id: "sms_recharge", label: "SMS" },
  { id: "auto_call_recharge", label: "Auto Call" },
];

const STATUS_FILTERS: { id: StatusFilter; label: string }[] = [
  { id: "all", label: "All status" },
  { id: "completed", label: "Success" },
  { id: "pending", label: "Pending" },
  { id: "failed", label: "Failed" },
];

function formatWhen(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function statusClass(status: PaymentHistoryEntry["status"]): string {
  if (status === "completed") return "bg-emerald-50 text-emerald-700 ring-emerald-200";
  if (status === "pending") return "bg-amber-50 text-amber-700 ring-amber-200";
  return "bg-rose-50 text-rose-700 ring-rose-200";
}

function paymentDetails(row: PaymentHistoryEntry): string {
  if (row.kind === "plan_renewal") {
    return [row.planId, row.months ? `${row.months} month` : null, row.couponCode]
      .filter(Boolean)
      .join(" / ") || "Plan renewal";
  }
  if (row.kind === "sms_recharge") return row.smsCount ? `${row.smsCount} SMS` : "SMS recharge";
  if (row.kind === "auto_call_recharge") {
    return row.callMinutes ? `${row.callMinutes} calls` : "Auto Call recharge";
  }
  return row.note ?? "-";
}

function percentUsed(used: number, limit: number): number {
  if (limit <= 0) return 0;
  return Math.min(100, Math.round((used / limit) * 100));
}

function usageTone(percent: number): {
  bar: string;
  text: string;
  bg: string;
} {
  if (percent >= 90) {
    return {
      bar: "from-rose-500 to-pink-500",
      text: "text-rose-700",
      bg: "bg-rose-50 ring-rose-100",
    };
  }
  if (percent >= 70) {
    return {
      bar: "from-amber-500 to-orange-500",
      text: "text-amber-700",
      bg: "bg-amber-50 ring-amber-100",
    };
  }
  return {
    bar: "from-emerald-500 to-teal-500",
    text: "text-emerald-700",
    bg: "bg-emerald-50 ring-emerald-100",
  };
}

function UsageLimitCard({
  title,
  subtitle,
  used,
  limit,
  icon: Icon,
  actionLabel,
  onAction,
}: {
  title: string;
  subtitle: string;
  used: number;
  limit: number;
  icon: typeof Package;
  actionLabel?: string;
  onAction?: () => void;
}) {
  const percent = percentUsed(used, limit);
  const tone = usageTone(percent);
  const remaining = Math.max(0, limit - used);

  return (
    <div className="flex h-full flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-300 hover:shadow-md">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-extrabold uppercase text-slate-400">
            {title}
          </p>
          <h2 className="mt-2 text-2xl font-extrabold text-slate-900">
            {percent}%
          </h2>
          <p className="mt-1 text-xs text-slate-500">{subtitle}</p>
        </div>
        <div className={clsx("rounded-xl p-3 ring-1", tone.bg)}>
          <Icon className={clsx("h-5 w-5", tone.text)} />
        </div>
      </div>
      <div className="mt-5">
        <div className="h-2.5 overflow-hidden rounded-full bg-slate-100">
          <div
            className={clsx("h-full rounded-full bg-gradient-to-r", tone.bar)}
            style={{ width: `${percent}%` }}
          />
        </div>
        <div className="mt-3 flex items-center justify-between gap-3 text-xs font-semibold">
          <span className="text-slate-500">
            {used.toLocaleString("en-BD")} of {limit.toLocaleString("en-BD")} used
          </span>
          <span className={tone.text}>
            {remaining.toLocaleString("en-BD")} left
          </span>
        </div>
      </div>
      {actionLabel && onAction ? (
        <button
          type="button"
          onClick={onAction}
          className="mt-4 inline-flex w-full items-center justify-center gap-1.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-2.5 text-xs font-extrabold text-emerald-700 transition hover:bg-emerald-100"
        >
          <Zap className="h-3.5 w-3.5" />
          {actionLabel}
        </button>
      ) : null}
    </div>
  );
}

export function BillingLimitPanel() {
  const { isEnabled } = useFeatures();
  const sms = useSmsAccount();
  const autoCall = useAutoCallAccount();
  const [user, setUser] = useState<DevUser | null>(null);
  const [renewOpen, setRenewOpen] = useState(false);
  const [renewMode, setRenewMode] = useState<"renew" | "upgrade">("renew");
  const [smsOpen, setSmsOpen] = useState(false);
  const [autoCallOpen, setAutoCallOpen] = useState(false);
  const [entries, setEntries] = useState<PaymentHistoryEntry[]>([]);
  const [planConfig, setPlanConfig] = useState<PlanConfig>(() => loadPlanConfigLocal());
  const [historyLoading, setHistoryLoading] = useState(true);
  const [kind, setKind] = useState<KindFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);
  const [usage, setUsage] = useState({
    activeProducts: 0,
    periodOrders: 0,
    activeUsers: 0,
  });
  const [increaseOpen, setIncreaseOpen] = useState(false);

  const refreshUsage = useCallback((currentUser: DevUser | null) => {
    const periodStart = periodStartTime(currentUser);
    const orders = loadOrders();
    setUsage({
      activeProducts: loadProducts().filter((product) => product.active !== false).length,
      periodOrders: orders.filter((order) => {
        if (!order.approvedAt || isWebOrder(order)) return false;
        const time = parseOrderTime(order);
        return time === null || time >= periodStart;
      }).length,
      activeUsers: loadTeamUsers().filter((teamUser) => teamUser.status === "active").length,
    });
  }, []);

  const loadHistory = useCallback(async () => {
    setHistoryLoading(true);
    try {
      const qs = new URLSearchParams();
      if (kind !== "all") qs.set("kind", kind);
      if (status !== "all") qs.set("status", status);
      const res = await fetch(`/api/payments/history?${qs.toString()}`, { cache: "no-store" });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error ?? "Could not load transactions");
      setEntries(json.entries ?? []);
    } catch (e) {
      setMessage({ type: "err", text: e instanceof Error ? e.message : "Could not load transactions" });
    } finally {
      setHistoryLoading(false);
    }
  }, [kind, status]);

  useEffect(() => {
    refreshCurrentSessionUser().then((u) => {
      const nextUser = u ?? null;
      setUser(nextUser);
      refreshUsage(nextUser);
    });
    fetchPublicPlanConfig().then(setPlanConfig);
  }, [refreshUsage]);

  useEffect(() => {
    refreshUsage(user);
    const refresh = () => refreshUsage(user);
    window.addEventListener("youraiseller-data-updated", refresh);
    window.addEventListener(TEAM_USERS_UPDATED, refresh);
    window.addEventListener("storage", refresh);
    return () => {
      window.removeEventListener("youraiseller-data-updated", refresh);
      window.removeEventListener(TEAM_USERS_UPDATED, refresh);
      window.removeEventListener("storage", refresh);
    };
  }, [refreshUsage, user]);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const planPrice = useMemo(() => {
    if (!user) return 0;
    const planId = user.plan as PlanId;
    const plan = planConfig.plans.find((p) => p.id === planId);
    const base = renewalMonthlyPriceTaka(
      planId,
      plan?.priceLabel ?? "",
      user.customRenewalPriceTaka
    );
    // Permanently-bought extra orders add a recurring monthly surcharge.
    return base + extraOrderSurchargeTaka(user.extraOrderLimit, plan?.orderRateTaka ?? 0);
  }, [planConfig, user]);

  const expiryDays = useMemo(
    () => daysUntilPlanExpiry(user?.planExpiresAt),
    [user]
  );

  const currentPlan = useMemo(() => {
    if (!user) return null;
    return planConfig.plans.find((plan) => plan.id === user.plan) ?? null;
  }, [planConfig, user]);

  // Limits come from the dev-admin plan package config; fall back to the
  // built-in defaults if the config hasn't loaded yet.
  const usageLimits =
    currentPlan?.limits ?? PLAN_USAGE_LIMITS[user?.plan ?? "basic"];

  const completedTotal = entries
    .filter((row) => row.status === "completed")
    .reduce((sum, row) => sum + row.amountTaka, 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-slate-900">Billing and Limit</h1>
          <p className="mt-1 text-sm text-slate-500">
            Plan renewal, SMS balance, Auto Call balance and every payment in one place.
          </p>
        </div>
        <button
          type="button"
          onClick={() => {
            sms.reload();
            autoCall.reload();
            loadHistory();
            refreshUsage(user);
          }}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          <RefreshCw className="h-4 w-4" />
          Refresh
        </button>
      </div>

      {message ? (
        <div
          className={clsx(
            "rounded-xl px-4 py-3 text-sm font-semibold ring-1",
            message.type === "ok"
              ? "bg-emerald-50 text-emerald-800 ring-emerald-200"
              : "bg-rose-50 text-rose-800 ring-rose-200"
          )}
        >
          {message.text}
        </div>
      ) : null}

      <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-extrabold uppercase text-indigo-600">Plan capacity</p>
            <h2 className="mt-1 text-lg font-extrabold text-slate-900">Usage limits</h2>
            <p className="mt-0.5 text-xs text-slate-500">
              Products, monthly orders and active seats included in {currentPlan?.name ?? user?.plan?.toUpperCase() ?? "your plan"}.
            </p>
          </div>
          <button
            type="button"
            onClick={() => {
              setRenewMode("upgrade");
              setRenewOpen(true);
            }}
            disabled={!user}
            className="inline-flex items-center justify-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-xs font-extrabold text-indigo-700 transition hover:bg-indigo-100 disabled:opacity-50"
          >
            <Zap className="h-3.5 w-3.5" />
            Upgrade capacity
          </button>
        </div>
        <div className="grid gap-3 md:grid-cols-3">
          <UsageLimitCard
            title="Products active"
            subtitle="Active products in inventory"
            used={usage.activeProducts}
            limit={usageLimits.products}
            icon={Package}
          />
          <UsageLimitCard
            title="Orders"
            subtitle="Approved orders this month"
            used={usage.periodOrders}
            limit={usageLimits.orders}
            icon={ShoppingBag}
            actionLabel="Increase order limit"
            onAction={() => setIncreaseOpen(true)}
          />
          <UsageLimitCard
            title="Users"
            subtitle="Active team seats"
            used={usage.activeUsers}
            limit={usageLimits.users}
            icon={Users}
          />
        </div>
      </section>

      <section>
        <div className="mb-3">
          <p className="text-xs font-extrabold uppercase text-indigo-600">Account & services</p>
          <h2 className="mt-1 text-lg font-extrabold text-slate-900">Plan and balances</h2>
        </div>
        <div className="grid gap-4 lg:grid-cols-3">
          <div className="flex min-h-[230px] flex-col overflow-hidden rounded-2xl border border-indigo-200 bg-indigo-50/60 p-5 shadow-sm">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="text-xs font-extrabold uppercase text-indigo-600">Current plan</p>
                <h2 className="mt-2 text-2xl font-extrabold text-slate-900">
                  {user?.plan ? user.plan.toUpperCase() : "Loading"}
                </h2>
                <p className="mt-1 text-xs text-slate-500">Expires: {user?.planExpiresAt ?? "-"}</p>
              </div>
              <div className="rounded-xl bg-white p-3 text-indigo-600 ring-1 ring-indigo-100">
                <CreditCard className="h-5 w-5" />
              </div>
            </div>
            {expiryDays !== null ? (
              <span
                className={clsx(
                  "mt-3 inline-flex w-fit items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-extrabold ring-1",
                  expiryDays <= 2
                    ? "bg-rose-50 text-rose-700 ring-rose-200"
                    : expiryDays <= 7
                      ? "bg-amber-50 text-amber-700 ring-amber-200"
                      : "bg-emerald-50 text-emerald-700 ring-emerald-200"
                )}
              >
                <CalendarClock className="h-3 w-3" />
                {expiryDays < 0
                  ? `Expired ${Math.abs(expiryDays)} day${Math.abs(expiryDays) === 1 ? "" : "s"} ago`
                  : expiryDays === 0
                    ? "Expires today"
                    : `${expiryDays} day${expiryDays === 1 ? "" : "s"} left`}
              </span>
            ) : null}
            <div className="mt-auto flex flex-col gap-3 border-t border-indigo-100 pt-4 sm:flex-row sm:items-end sm:justify-between">
              <div>
                <p className="text-xs font-semibold text-slate-500">Renewal per month</p>
                <p className="mt-1 text-xl font-extrabold text-slate-900">{formatSmsBdt(planPrice)}</p>
              </div>
              <div className="flex gap-2">
                <button
                  type="button"
                  disabled={!user}
                  onClick={() => {
                    setRenewMode("upgrade");
                    setRenewOpen(true);
                  }}
                  className="flex-1 rounded-xl border border-indigo-200 bg-white px-4 py-2.5 text-sm font-extrabold text-indigo-700 hover:bg-indigo-100 disabled:opacity-50"
                >
                  Upgrade
                </button>
                <button
                  type="button"
                  disabled={!user}
                  onClick={() => {
                    setRenewMode("renew");
                    setRenewOpen(true);
                  }}
                  className="flex-1 rounded-xl bg-[#E2136E] px-4 py-2.5 text-sm font-extrabold text-white hover:bg-[#c91062] disabled:opacity-50"
                >
                  Renew
                </button>
              </div>
            </div>
          </div>

          <div className="flex min-h-[230px] flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-teal-200 hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-extrabold uppercase text-slate-400">SMS balance</p>
                  <span className={clsx("rounded-full px-2 py-0.5 text-[10px] font-extrabold", sms.systemEnabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500")}>
                    {sms.systemEnabled ? "Active" : "Off"}
                  </span>
                </div>
                <h2 className="mt-2 text-2xl font-extrabold text-slate-900">{sms.account.balance.toLocaleString("en-BD")} SMS</h2>
                <p className="mt-1 text-xs text-slate-500">{formatSmsBdt(sms.smsPriceTaka)} per message</p>
              </div>
              <div className="rounded-xl bg-teal-50 p-3 text-teal-600 ring-1 ring-teal-100">
                <MessageSquare className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <Link href="/dashboard/integration/sms" className="text-xs font-bold text-slate-500 hover:text-teal-700">
                Manage settings
              </Link>
              <button
                type="button"
                disabled={!isEnabled("sms") || !sms.selfRechargeEnabled}
                onClick={() => setSmsOpen(true)}
                className="rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-teal-700 disabled:opacity-50"
              >
                Add SMS
              </button>
            </div>
          </div>

          <div className="flex min-h-[230px] flex-col rounded-2xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-violet-200 hover:shadow-md">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="text-xs font-extrabold uppercase text-slate-400">Auto Call balance</p>
                  <span className={clsx("rounded-full px-2 py-0.5 text-[10px] font-extrabold", autoCall.systemEnabled ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-500")}>
                    {autoCall.systemEnabled ? "Active" : "Off"}
                  </span>
                </div>
                <h2 className="mt-2 text-2xl font-extrabold text-slate-900">{formatAutoCallBdt(autoCall.account.balanceTaka)}</h2>
                <p className="mt-1 text-xs text-slate-500">{formatSmsBdt(autoCall.callPriceTaka)} per call</p>
              </div>
              <div className="rounded-xl bg-violet-50 p-3 text-violet-600 ring-1 ring-violet-100">
                <Phone className="h-5 w-5" />
              </div>
            </div>
            <div className="mt-auto flex items-center justify-between gap-3 border-t border-slate-100 pt-4">
              <Link href="/dashboard/integration/auto-call" className="text-xs font-bold text-slate-500 hover:text-violet-700">
                Manage settings
              </Link>
              <button
                type="button"
                disabled={!isEnabled("auto_call_integration") || !autoCall.selfRechargeEnabled}
                onClick={() => setAutoCallOpen(true)}
                className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-violet-700 disabled:opacity-50"
              >
                Add balance
              </button>
            </div>
          </div>
        </div>
      </section>
      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="grid md:grid-cols-3 md:divide-x md:divide-slate-100">
          <div className="flex items-center gap-3 p-4 sm:p-5">
            <div className="rounded-xl bg-emerald-50 p-2.5 text-emerald-600"><Wallet className="h-5 w-5" /></div>
            <div>
              <p className="text-xs font-bold uppercase text-slate-400">Paid total</p>
              <p className="mt-0.5 text-xl font-extrabold text-slate-900">{formatSmsBdt(completedTotal)}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 border-t border-slate-100 p-4 sm:p-5 md:border-t-0">
            <div className="rounded-xl bg-amber-50 p-2.5 text-amber-600"><CalendarClock className="h-5 w-5" /></div>
            <div>
              <p className="text-xs font-bold uppercase text-slate-400">Transactions</p>
              <p className="mt-0.5 text-xl font-extrabold text-slate-900">{entries.length}</p>
            </div>
          </div>
          <div className="flex items-center gap-3 border-t border-slate-100 p-4 sm:p-5 md:border-t-0">
            <div className="rounded-xl bg-indigo-50 p-2.5 text-indigo-600"><BadgeDollarSign className="h-5 w-5" /></div>
            <div>
              <p className="text-xs font-bold uppercase text-slate-400">Payment gateway</p>
              <p className="mt-0.5 text-xl font-extrabold text-slate-900">PayStation</p>
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Transactions</h2>
            <p className="text-xs text-slate-500">Plan, SMS and Auto Call payment history</p>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            {KIND_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setKind(f.id)}
                className={clsx(
                  "rounded-xl px-3 py-1.5 text-xs font-bold transition",
                  kind === f.id ? "bg-indigo-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {f.label}
              </button>
            ))}
            <select
              value={status}
              onChange={(event) => setStatus(event.target.value as StatusFilter)}
              aria-label="Filter transactions by status"
              className="h-9 rounded-xl border border-slate-200 bg-white px-3 text-xs font-bold text-slate-700 outline-none focus:border-indigo-400"
            >
              {STATUS_FILTERS.map((filter) => (
                <option key={filter.id} value={filter.id}>{filter.label}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="divide-y divide-slate-100 md:hidden">
          {historyLoading ? (
            <div className="px-4 py-12 text-center text-slate-400">
              <Loader2 className="mx-auto h-5 w-5 animate-spin" />
            </div>
          ) : entries.length === 0 ? (
            <div className="px-4 py-12 text-center text-sm text-slate-400">No billing transactions yet.</div>
          ) : (
            entries.map((row) => (
              <article key={row.id} className="space-y-3 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="text-sm font-extrabold text-slate-900">{PAYMENT_KIND_LABELS[row.kind]}</p>
                    <p className="mt-1 text-xs text-slate-500">{formatWhen(row.createdAt)}</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-extrabold text-slate-900">{formatSmsBdt(row.amountTaka)}</p>
                    <span className={clsx("mt-1 inline-flex rounded-full px-2 py-0.5 text-[10px] font-extrabold uppercase ring-1", statusClass(row.status))}>
                      {row.status}
                    </span>
                  </div>
                </div>
                <div className="rounded-xl bg-slate-50 p-3 text-xs text-slate-500">
                  <p>{paymentDetails(row)}</p>
                  {row.invoiceNumber ? <p className="mt-1 break-all font-semibold text-slate-700">{row.invoiceNumber}</p> : null}
                </div>
                {row.invoiceNumber ? (
                  <div className="flex gap-2">
                    <a
                      href={`/api/payments/receipt?invoice=${encodeURIComponent(row.invoiceNumber)}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600"
                    >
                      <ExternalLink className="h-3.5 w-3.5" /> View
                    </a>
                    <a
                      href={`/api/payments/receipt?invoice=${encodeURIComponent(row.invoiceNumber)}&download=1`}
                      className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-xs font-bold text-slate-600"
                    >
                      <Download className="h-3.5 w-3.5" /> Download
                    </a>
                  </div>
                ) : null}
              </article>
            ))
          )}
        </div>

        <div className="hidden overflow-x-auto md:block">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-bold uppercase text-slate-500">
              <tr>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Invoice / TRX</th>
                <th className="px-4 py-3">Details</th>
                <th className="px-4 py-3">Receipt</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {historyLoading ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </td>
                </tr>
              ) : entries.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-400">
                    No billing transactions yet.
                  </td>
                </tr>
              ) : (
                entries.map((row) => (
                  <tr key={row.id} className="hover:bg-slate-50/70">
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-500">
                      {formatWhen(row.createdAt)}
                    </td>
                    <td className="px-4 py-3 font-bold text-slate-800">
                      {PAYMENT_KIND_LABELS[row.kind]}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-extrabold text-slate-900">
                      {formatSmsBdt(row.amountTaka)}
                    </td>
                    <td className="px-4 py-3">
                      <span className={clsx("rounded-full px-2.5 py-0.5 text-[11px] font-extrabold uppercase ring-1", statusClass(row.status))}>
                        {row.status}
                      </span>
                    </td>
                    <td className="max-w-[14rem] px-4 py-3 text-xs text-slate-500">
                      <p className="break-all">{row.invoiceNumber || "-"}</p>
                      <p className="break-all">{row.transactionId || ""}</p>
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-500">{paymentDetails(row)}</td>
                    <td className="px-4 py-3">
                      {row.invoiceNumber ? (
                        <div className="flex gap-1.5">
                          <a
                            href={`/api/payments/receipt?invoice=${encodeURIComponent(row.invoiceNumber)}`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            title="View receipt"
                          >
                            <ExternalLink className="h-4 w-4" />
                          </a>
                          <a
                            href={`/api/payments/receipt?invoice=${encodeURIComponent(row.invoiceNumber)}&download=1`}
                            className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-100 hover:text-slate-900"
                            title="Download receipt"
                          >
                            <Download className="h-4 w-4" />
                          </a>
                        </div>
                      ) : (
                        <span className="text-xs text-slate-400">-</span>
                      )}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>

      {increaseOpen ? (
        <IncreaseOrderLimitModal onClose={() => setIncreaseOpen(false)} />
      ) : null}
      {user ? (
        <PlanRenewPayModal
          open={renewOpen}
          user={user}
          mode={renewMode}
          onClose={() => setRenewOpen(false)}
          onSuccess={(next, text) => {
            setUser(next);
            setMessage({ type: "ok", text });
          }}
          onError={(text) => setMessage({ type: "err", text })}
        />
      ) : null}
      <SmsRechargeModal
        open={smsOpen}
        balance={sms.account.balance}
        smsPriceTaka={sms.smsPriceTaka}
        onClose={() => setSmsOpen(false)}
        onSuccess={(next, text) => {
          sms.setAccount(next);
          setMessage({ type: "ok", text });
        }}
        onError={(text) => setMessage({ type: "err", text })}
      />
      <AutoCallRechargeModal
        open={autoCallOpen}
        balanceTaka={autoCall.account.balanceTaka}
        callPriceTaka={autoCall.callPriceTaka}
        onClose={() => setAutoCallOpen(false)}
        onSuccess={(next, text) => {
          autoCall.setAccount(next);
          setMessage({ type: "ok", text });
        }}
        onError={(text) => setMessage({ type: "err", text })}
      />
    </div>
  );
}
