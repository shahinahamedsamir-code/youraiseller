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
  RefreshCw,
  Wallet,
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
import type { PlanId } from "@/lib/plan-config-types";
import type { PlanConfig } from "@/lib/plan-config-types";
import { renewalMonthlyPriceTaka } from "@/lib/subscription-pricing";
import { formatSmsBdt } from "@/lib/sms-types";
import { formatAutoCallBdt } from "@/lib/auto-call-store";

type KindFilter = "all" | PaymentHistoryKind;
type StatusFilter = "all" | PaymentHistoryEntry["status"];

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
      .join(" · ") || "Plan renewal";
  }
  if (row.kind === "sms_recharge") return row.smsCount ? `${row.smsCount} SMS` : "SMS recharge";
  if (row.kind === "auto_call_recharge") {
    return row.callMinutes ? `${row.callMinutes} calls` : "Auto Call recharge";
  }
  return row.note ?? "-";
}

export function BillingLimitPanel() {
  const { isEnabled } = useFeatures();
  const sms = useSmsAccount();
  const autoCall = useAutoCallAccount();
  const [user, setUser] = useState<DevUser | null>(null);
  const [renewOpen, setRenewOpen] = useState(false);
  const [smsOpen, setSmsOpen] = useState(false);
  const [autoCallOpen, setAutoCallOpen] = useState(false);
  const [entries, setEntries] = useState<PaymentHistoryEntry[]>([]);
  const [planConfig, setPlanConfig] = useState<PlanConfig>(() => loadPlanConfigLocal());
  const [historyLoading, setHistoryLoading] = useState(true);
  const [kind, setKind] = useState<KindFilter>("all");
  const [status, setStatus] = useState<StatusFilter>("all");
  const [message, setMessage] = useState<{ type: "ok" | "err"; text: string } | null>(null);

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
    refreshCurrentSessionUser().then((u) => setUser(u ?? null));
    fetchPublicPlanConfig().then(setPlanConfig);
  }, []);

  useEffect(() => {
    loadHistory();
  }, [loadHistory]);

  const planPrice = useMemo(() => {
    if (!user) return 0;
    const planId = user.plan as PlanId;
    const plan = planConfig.plans.find((p) => p.id === planId);
    return renewalMonthlyPriceTaka(planId, plan?.priceLabel ?? "", user.customRenewalPriceTaka);
  }, [planConfig, user]);

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

      <section className="grid gap-4 xl:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">Current plan</p>
              <h2 className="mt-2 text-xl font-extrabold text-slate-900">
                {user?.plan ? user.plan.toUpperCase() : "Loading"}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                Expires: {user?.planExpiresAt ?? "-"}
              </p>
            </div>
            <div className="rounded-xl bg-indigo-50 p-3 text-indigo-600">
              <CreditCard className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-5 flex items-end justify-between gap-3">
            <div>
              <p className="text-xs font-semibold text-slate-500">Renew price/month</p>
              <p className="text-lg font-extrabold text-slate-900">{formatSmsBdt(planPrice)}</p>
            </div>
            <button
              type="button"
              disabled={!user}
              onClick={() => setRenewOpen(true)}
              className="rounded-xl bg-[#E2136E] px-4 py-2.5 text-sm font-extrabold text-white hover:bg-[#c91062] disabled:opacity-50"
            >
              Renew plan
            </button>
          </div>
        </div>

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">SMS limit</p>
              <h2 className="mt-2 text-xl font-extrabold text-slate-900">
                {sms.account.balance.toLocaleString("en-BD")} SMS
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {formatSmsBdt(sms.smsPriceTaka)}/SMS · {sms.systemEnabled ? "Service on" : "Service off"}
              </p>
            </div>
            <div className="rounded-xl bg-teal-50 p-3 text-teal-600">
              <MessageSquare className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-5 flex items-center justify-between gap-3">
            <Link
              href="/dashboard/integration/sms"
              className="text-xs font-bold text-slate-500 hover:text-teal-700"
            >
              SMS settings
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

        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-xs font-extrabold uppercase tracking-wide text-slate-400">Auto Call limit</p>
              <h2 className="mt-2 text-xl font-extrabold text-slate-900">
                {formatAutoCallBdt(autoCall.account.balanceTaka)}
              </h2>
              <p className="mt-1 text-xs text-slate-500">
                {formatSmsBdt(autoCall.callPriceTaka)}/call · {autoCall.systemEnabled ? "Service on" : "Service off"}
              </p>
            </div>
            <div className="rounded-xl bg-violet-50 p-3 text-violet-600">
              <Phone className="h-5 w-5" />
            </div>
          </div>
          <div className="mt-5 flex items-center justify-between gap-3">
            <Link
              href="/dashboard/integration/auto-call"
              className="text-xs font-bold text-slate-500 hover:text-violet-700"
            >
              Auto Call settings
            </Link>
            <button
              type="button"
              disabled={!isEnabled("auto_call_integration") || !autoCall.selfRechargeEnabled}
              onClick={() => setAutoCallOpen(true)}
              className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-extrabold text-white hover:bg-violet-700 disabled:opacity-50"
            >
              Add call
            </button>
          </div>
        </div>
      </section>

      <section className="grid gap-4 lg:grid-cols-3">
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <Wallet className="h-5 w-5 text-emerald-600" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Paid total</p>
              <p className="text-xl font-extrabold text-slate-900">{formatSmsBdt(completedTotal)}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <CalendarClock className="h-5 w-5 text-amber-600" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Transactions</p>
              <p className="text-xl font-extrabold text-slate-900">{entries.length}</p>
            </div>
          </div>
        </div>
        <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
          <div className="flex items-center gap-3">
            <BadgeDollarSign className="h-5 w-5 text-indigo-600" />
            <div>
              <p className="text-xs font-bold uppercase tracking-wide text-slate-400">Gateway</p>
              <p className="text-xl font-extrabold text-slate-900">PayStation</p>
            </div>
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
        <div className="flex flex-col gap-3 border-b border-slate-100 p-4 lg:flex-row lg:items-center lg:justify-between">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Transactions</h2>
            <p className="text-xs text-slate-500">Plan, SMS and Auto Call payment history</p>
          </div>
          <div className="flex flex-wrap gap-2">
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
            {STATUS_FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                onClick={() => setStatus(f.id)}
                className={clsx(
                  "rounded-xl px-3 py-1.5 text-xs font-bold transition",
                  status === f.id ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-600 hover:bg-slate-200"
                )}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
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

      {user ? (
        <PlanRenewPayModal
          open={renewOpen}
          user={user}
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
