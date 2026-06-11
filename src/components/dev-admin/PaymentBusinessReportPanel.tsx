"use client";

import { useCallback, useEffect, useState } from "react";
import clsx from "clsx";
import {
  BarChart3,
  Building2,
  Loader2,
  RefreshCw,
  TrendingUp,
  Users,
  Wallet,
} from "lucide-react";
import type {
  PaymentBusinessReport,
  PaymentReportPeriod,
} from "@/lib/payment-business-report";
import { formatSmsBdt } from "@/lib/sms-types";

const PERIODS: { id: PaymentReportPeriod; label: string }[] = [
  { id: "today", label: "Today" },
  { id: "7d", label: "7 days" },
  { id: "30d", label: "30 days" },
  { id: "all", label: "All time" },
];

type Props = {
  onRefresh?: () => void;
};

export function PaymentBusinessReportPanel({ onRefresh }: Props) {
  const [report, setReport] = useState<PaymentBusinessReport | null>(null);
  const [period, setPeriod] = useState<PaymentReportPeriod>("30d");
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch(
        `/api/dev-admin/payments?report=1&period=${period}`,
        { cache: "no-store" }
      );
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Report load failed");
      setReport(json.businessReport ?? null);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Report load failed");
    } finally {
      setLoading(false);
    }
  }, [period]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRefresh = () => {
    load();
    onRefresh?.();
  };

  if (loading && !report) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-slate-700/80 bg-slate-800/40 px-6 py-16 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        Building business report…
      </div>
    );
  }

  if (!report) {
    return (
      <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
        {msg || "Could not load business report"}
      </p>
    );
  }

  const maxMonth = Math.max(...report.monthly.map((m) => m.totalTaka), 1);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap gap-2">
          {PERIODS.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPeriod(p.id)}
              className={clsx(
                "rounded-xl px-3 py-1.5 text-xs font-bold transition",
                period === p.id
                  ? "bg-orange-500/25 text-orange-200 ring-1 ring-orange-500/40"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
        <button
          type="button"
          onClick={handleRefresh}
          disabled={loading}
          className="inline-flex items-center gap-2 rounded-xl border border-slate-600 px-3 py-1.5 text-xs font-bold text-slate-300 hover:bg-slate-800 disabled:opacity-60"
        >
          <RefreshCw className={clsx("h-3.5 w-3.5", loading && "animate-spin")} />
          Refresh report
        </button>
      </div>

      {msg ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {msg}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Revenue",
            value: formatSmsBdt(report.revenue.totalTaka),
            sub: `${report.revenue.paymentCount} payments · ${report.revenue.uniqueCustomers} customers`,
            icon: TrendingUp,
          },
          {
            label: "bKash collected",
            value: formatSmsBdt(report.revenue.bkashTaka),
            sub: `Admin load ${formatSmsBdt(report.revenue.adminTaka)}`,
            icon: Wallet,
          },
          {
            label: "Avg payment",
            value: formatSmsBdt(report.revenue.avgPaymentTaka),
            sub:
              report.revenue.discountTaka > 0
                ? `Coupons -${formatSmsBdt(report.revenue.discountTaka)}`
                : "No coupon discounts",
            icon: BarChart3,
          },
          {
            label: "Active sellers",
            value: String(report.users.active),
            sub: `${report.users.total} accounts · ${report.users.expired} expired`,
            icon: Users,
          },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-slate-700/80 bg-slate-800/50 px-4 py-4"
          >
            <div className="flex items-center gap-2 text-slate-400">
              <card.icon className="h-4 w-4 text-orange-400" />
              <p className="text-xs font-semibold uppercase tracking-wide">
                {card.label}
              </p>
            </div>
            <p className="mt-2 text-xl font-extrabold text-white">{card.value}</p>
            <p className="mt-1 text-[11px] text-slate-500">{card.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-700/80 bg-slate-800/40 p-5">
          <h3 className="flex items-center gap-2 font-bold text-white">
            <BarChart3 className="h-4 w-4 text-orange-400" />
            Revenue by product
          </h3>
          <dl className="mt-4 space-y-3 text-sm">
            {[
              { label: "Plan renewals", value: report.revenue.planTaka, color: "bg-amber-400" },
              { label: "SMS recharge", value: report.revenue.smsTaka, color: "bg-teal-400" },
              {
                label: "Auto Call recharge",
                value: report.revenue.autoCallTaka,
                color: "bg-violet-400",
              },
            ].map((row) => {
              const pct =
                report.revenue.totalTaka > 0
                  ? Math.round((row.value / report.revenue.totalTaka) * 100)
                  : 0;
              return (
                <div key={row.label}>
                  <div className="mb-1 flex justify-between text-slate-400">
                    <span>{row.label}</span>
                    <span className="font-bold text-white">
                      {formatSmsBdt(row.value)}{" "}
                      <span className="text-slate-500">({pct}%)</span>
                    </span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-slate-900">
                    <div
                      className={clsx("h-full rounded-full", row.color)}
                      style={{ width: `${Math.max(pct, row.value > 0 ? 4 : 0)}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </dl>
        </div>

        <div className="rounded-2xl border border-slate-700/80 bg-slate-800/40 p-5">
          <h3 className="flex items-center gap-2 font-bold text-white">
            <Users className="h-4 w-4 text-orange-400" />
            Seller accounts
          </h3>
          <div className="mt-4 grid grid-cols-2 gap-3 text-sm">
            {[
              { label: "Active", value: report.users.active, tone: "text-emerald-300" },
              { label: "Deactive", value: report.users.inactive, tone: "text-orange-300" },
              { label: "Expired", value: report.users.expired, tone: "text-slate-300" },
              { label: "Pending", value: report.users.pending, tone: "text-amber-300" },
            ].map((row) => (
              <div
                key={row.label}
                className="rounded-xl border border-slate-700/60 bg-slate-900/50 px-3 py-3"
              >
                <p className="text-xs text-slate-500">{row.label}</p>
                <p className={clsx("text-2xl font-extrabold", row.tone)}>{row.value}</p>
              </div>
            ))}
          </div>
          <p className="mt-4 text-xs text-slate-500">
            Plans — Starter {report.users.byPlan.basic} · Growth {report.users.byPlan.pro} ·
            Business {report.users.byPlan.enterprise}
          </p>
        </div>
      </div>

      <div className="rounded-2xl border border-slate-700/80 bg-slate-800/40 p-5">
        <h3 className="flex items-center gap-2 font-bold text-white">
          <Building2 className="h-4 w-4 text-orange-400" />
          Gateway vs seller liability
        </h3>
        <div className="mt-4 grid gap-4 md:grid-cols-2">
          <div className="rounded-xl border border-slate-700/60 bg-slate-900/50 p-4">
            <p className="text-xs font-bold uppercase text-slate-500">SMS</p>
            <p className="mt-2 flex justify-between text-sm text-slate-400">
              <span>Seller SMS balance</span>
              <strong className="text-white">
                {report.liabilities.smsBalanceTotal.toLocaleString("en-BD")} SMS
              </strong>
            </p>
            <p className="mt-1 flex justify-between text-sm text-slate-400">
              <span>TeamITQAN main balance</span>
              <strong className="text-white">
                {report.liabilities.smsProviderBalance != null
                  ? `${report.liabilities.smsProviderBalance.toLocaleString("en-BD")} SMS`
                  : "—"}
              </strong>
            </p>
            {report.liabilities.smsTopUpGap != null && report.liabilities.smsTopUpGap > 0 ? (
              <p className="mt-3 text-xs font-bold text-amber-300">
                Load ~{report.liabilities.smsTopUpGap.toLocaleString("en-BD")} SMS at gateway
              </p>
            ) : (
              <p className="mt-3 text-xs font-bold text-emerald-300">SMS gateway buffer OK</p>
            )}
          </div>
          <div className="rounded-xl border border-slate-700/60 bg-slate-900/50 p-4">
            <p className="text-xs font-bold uppercase text-slate-500">Auto Call</p>
            <p className="mt-2 flex justify-between text-sm text-slate-400">
              <span>Seller call balance</span>
              <strong className="text-violet-300">
                {formatSmsBdt(report.liabilities.autoCallBalanceTaka)}
              </strong>
            </p>
            <p className="mt-1 flex justify-between text-sm text-slate-400">
              <span>TeamITQAN main API</span>
              <strong className="text-white">
                {report.liabilities.autoCallApiBalance != null
                  ? `${formatSmsBdt(report.liabilities.autoCallApiBalance)} BDT`
                  : "—"}
              </strong>
            </p>
            {report.liabilities.autoCallTopUpGap != null &&
            report.liabilities.autoCallTopUpGap > 0 ? (
              <p className="mt-3 text-xs font-bold text-amber-300">
                Load {formatSmsBdt(report.liabilities.autoCallTopUpGap)} at TeamITQAN
              </p>
            ) : (
              <p className="mt-3 text-xs font-bold text-emerald-300">Auto Call gateway buffer OK</p>
            )}
          </div>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-700/80 bg-slate-800/40 p-5">
          <h3 className="font-bold text-white">Top paying customers</h3>
          {report.topCustomers.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No payments in this period.</p>
          ) : (
            <ul className="mt-4 space-y-2">
              {report.topCustomers.map((c, i) => (
                <li
                  key={c.key}
                  className="flex items-center justify-between gap-3 rounded-xl border border-slate-700/50 bg-slate-900/40 px-3 py-2.5"
                >
                  <div className="min-w-0">
                    <p className="truncate font-semibold text-white">
                      {i + 1}. {c.label}
                    </p>
                    <p className="truncate text-xs text-slate-500">{c.email}</p>
                  </div>
                  <div className="shrink-0 text-right">
                    <p className="font-bold text-emerald-400">{formatSmsBdt(c.totalTaka)}</p>
                    <p className="text-[10px] text-slate-500">{c.payments} payments</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="rounded-2xl border border-slate-700/80 bg-slate-800/40 p-5">
          <h3 className="font-bold text-white">Monthly revenue</h3>
          {report.monthly.length === 0 ? (
            <p className="mt-4 text-sm text-slate-500">No monthly data yet.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {report.monthly.map((m) => {
                const pct = Math.round((m.totalTaka / maxMonth) * 100);
                return (
                  <li key={m.month}>
                    <div className="mb-1 flex justify-between text-sm">
                      <span className="font-semibold text-slate-300">{m.label}</span>
                      <span className="font-bold text-white">
                        {formatSmsBdt(m.totalTaka)}
                      </span>
                    </div>
                    <div className="h-2 overflow-hidden rounded-full bg-slate-900">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-orange-500 to-amber-400"
                        style={{ width: `${Math.max(pct, m.totalTaka > 0 ? 6 : 0)}%` }}
                      />
                    </div>
                    <p className="mt-1 text-[10px] text-slate-500">
                      {m.count} payments · Plan {formatSmsBdt(m.planTaka)} · SMS{" "}
                      {formatSmsBdt(m.smsTaka)} · Call {formatSmsBdt(m.autoCallTaka)}
                    </p>
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
