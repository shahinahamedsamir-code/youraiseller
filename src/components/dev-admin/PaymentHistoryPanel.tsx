"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { CreditCard, List, Loader2, RefreshCw, Scale, Wallet } from "lucide-react";
import { PaymentBalanceReportPanel } from "@/components/dev-admin/PaymentBalanceReportPanel";
import {
  PAYMENT_KIND_LABELS,
  type PaymentHistoryEntry,
  type PaymentHistoryKind,
} from "@/lib/payment-history-types";
import { formatSmsBdt } from "@/lib/sms-types";
import { SearchField } from "@/components/ui/SearchField";

type KindFilter = "all" | PaymentHistoryKind;
type Tab = "transactions" | "balance";

type Totals = {
  count: number;
  totalTaka: number;
  planTaka: number;
  smsTaka: number;
  autoCallTaka: number;
  planCount?: number;
  smsCount?: number;
  autoCallCount?: number;
};

const FILTERS: { id: KindFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "plan_renewal", label: "Plan" },
  { id: "sms_recharge", label: "SMS" },
  { id: "auto_call_recharge", label: "Auto Call" },
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

function paymentDetails(row: PaymentHistoryEntry): string {
  if (row.kind === "plan_renewal") {
    const parts = [
      row.planId ? `Plan: ${row.planId}` : null,
      row.months ? `${row.months} mo` : null,
      row.couponCode ? `Coupon ${row.couponCode}` : null,
      row.discountTaka ? `-${formatSmsBdt(row.discountTaka)}` : null,
    ].filter(Boolean);
    return parts.join(" · ") || "Subscription renew";
  }
  if (row.kind === "sms_recharge") {
    return row.smsCount ? `${row.smsCount} SMS` : row.note ?? "SMS balance";
  }
  if (row.kind === "auto_call_recharge") {
    return row.callMinutes ? `${row.callMinutes} min` : row.note ?? "Call balance";
  }
  return row.note ?? "—";
}

export function PaymentHistoryPanel() {
  const [entries, setEntries] = useState<PaymentHistoryEntry[]>([]);
  const [totals, setTotals] = useState<Totals | null>(null);
  const [loading, setLoading] = useState(true);
  const [kind, setKind] = useState<KindFilter>("all");
  const [search, setSearch] = useState("");
  const [msg, setMsg] = useState("");
  const [tab, setTab] = useState<Tab>("transactions");
  const [balanceKey, setBalanceKey] = useState(0);

  const load = useCallback(async () => {
    setLoading(true);
    setMsg("");
    try {
      const qs = kind === "all" ? "" : `?kind=${kind}`;
      const res = await fetch(`/api/dev-admin/payments${qs}`, { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Load failed");
      setEntries(json.entries ?? []);
      setTotals(json.totals ?? null);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Load failed");
    } finally {
      setLoading(false);
    }
  }, [kind]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return entries;
    return entries.filter((row) => {
      const blob = [
        row.userName,
        row.userEmail,
        row.company,
        row.scope,
        row.planId,
        row.couponCode,
        row.note,
        PAYMENT_KIND_LABELS[row.kind],
        row.method,
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return blob.includes(q);
    });
  }, [entries, search]);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-2xl font-extrabold text-white">Payment History</h1>
          <p className="mt-1 text-sm text-slate-400">
            Plan renewals, SMS recharge &amp; Auto Call payments
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <div className="flex rounded-xl border border-slate-700 bg-slate-900 p-1">
            <button
              type="button"
              onClick={() => setTab("transactions")}
              className={clsx(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition",
                tab === "transactions"
                  ? "bg-orange-500/25 text-orange-200"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <List className="h-3.5 w-3.5" />
              Transactions
            </button>
            <button
              type="button"
              onClick={() => setTab("balance")}
              className={clsx(
                "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition",
                tab === "balance"
                  ? "bg-orange-500/25 text-orange-200"
                  : "text-slate-400 hover:text-white"
              )}
            >
              <Scale className="h-3.5 w-3.5" />
              Balance report
            </button>
          </div>
          <button
            type="button"
            onClick={() => {
              if (tab === "transactions") load();
              else setBalanceKey((k) => k + 1);
            }}
            disabled={loading && tab === "transactions"}
            className="inline-flex items-center gap-2 rounded-xl border border-orange-500/40 bg-orange-500/10 px-4 py-2 text-sm font-bold text-orange-200 hover:bg-orange-500/20 disabled:opacity-60"
          >
            <RefreshCw
              className={clsx("h-4 w-4", loading && tab === "transactions" && "animate-spin")}
            />
            Refresh
          </button>
        </div>
      </div>

      {tab === "balance" ? (
        <PaymentBalanceReportPanel key={balanceKey} />
      ) : null}

      {tab === "transactions" && totals ? (
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
          {[
            {
              label: "Total collected",
              value: formatSmsBdt(totals.totalTaka),
              sub: `${totals.count} payment${totals.count === 1 ? "" : "s"}`,
              icon: Wallet,
            },
            {
              label: "Plan renewals",
              value: formatSmsBdt(totals.planTaka),
              sub: `${totals.planCount ?? 0} payment${(totals.planCount ?? 0) === 1 ? "" : "s"}`,
              icon: CreditCard,
            },
            {
              label: "SMS recharge",
              value: formatSmsBdt(totals.smsTaka),
              sub: `${totals.smsCount ?? 0} payment${(totals.smsCount ?? 0) === 1 ? "" : "s"}`,
              icon: Wallet,
            },
            {
              label: "Auto Call",
              value: formatSmsBdt(totals.autoCallTaka),
              sub: `${totals.autoCallCount ?? 0} payment${(totals.autoCallCount ?? 0) === 1 ? "" : "s"}`,
              icon: Wallet,
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
      ) : null}

      {tab === "transactions" ? (
      <>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap gap-2">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setKind(f.id)}
              className={clsx(
                "rounded-xl px-3 py-1.5 text-xs font-bold transition",
                kind === f.id
                  ? "bg-orange-500/25 text-orange-200 ring-1 ring-orange-500/40"
                  : "bg-slate-800 text-slate-400 hover:bg-slate-700 hover:text-white"
              )}
            >
              {f.label}
            </button>
          ))}
        </div>
        <SearchField
          value={search}
          onChange={setSearch}
          placeholder="Search user, email, company…"
          className="w-full sm:max-w-xs"
          variant="dark"
        />
      </div>

      {msg ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {msg}
        </p>
      ) : null}

      <div className="overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-800/40">
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-700/80 bg-slate-900/60 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">User</th>
                <th className="px-4 py-3">Type</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Details</th>
              </tr>
            </thead>
            <tbody>
              {loading ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    <Loader2 className="mx-auto h-5 w-5 animate-spin" />
                  </td>
                </tr>
              ) : filtered.length === 0 ? (
                <tr>
                  <td colSpan={6} className="px-4 py-12 text-center text-slate-500">
                    No payments recorded yet.
                  </td>
                </tr>
              ) : (
                filtered.map((row) => (
                  <tr
                    key={row.id}
                    className="border-t border-slate-700/60 hover:bg-slate-800/60"
                  >
                    <td className="whitespace-nowrap px-4 py-3 text-xs text-slate-400">
                      {formatWhen(row.createdAt)}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-semibold text-white">
                        {row.userName || row.company || row.scope || "—"}
                      </p>
                      <p className="text-xs text-slate-500">
                        {row.userEmail || row.scope || row.userId || "—"}
                      </p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="rounded-full bg-slate-700/80 px-2.5 py-0.5 text-[11px] font-bold text-slate-200">
                        {PAYMENT_KIND_LABELS[row.kind]}
                      </span>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 font-bold text-emerald-400">
                      {formatSmsBdt(row.amountTaka)}
                    </td>
                    <td className="px-4 py-3 text-xs uppercase text-slate-400">
                      {row.method}
                    </td>
                    <td className="px-4 py-3 text-xs text-slate-400">
                      {paymentDetails(row)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
      </>
      ) : null}
    </div>
  );
}
