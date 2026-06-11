"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Loader2, MessageSquare, Phone, Scale, Wallet } from "lucide-react";
import type { PaymentBalanceReport } from "@/lib/payment-balance-report";
import { formatAutoCallBdt } from "@/lib/auto-call-store";
import { formatSmsBdt } from "@/lib/sms-types";
import { SearchField } from "@/components/ui/SearchField";

function statusBadge(status: string) {
  const map: Record<string, string> = {
    active: "bg-emerald-500/20 text-emerald-300",
    inactive: "bg-slate-600/40 text-slate-300",
    expired: "bg-rose-500/20 text-rose-300",
    pending: "bg-amber-500/20 text-amber-300",
    rejected: "bg-slate-700 text-slate-400",
  };
  return map[status] ?? "bg-slate-700 text-slate-300";
}

export function PaymentBalanceReportPanel() {
  const [report, setReport] = useState<PaymentBalanceReport | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [search, setSearch] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setMsg("");
    try {
      const res = await fetch("/api/dev-admin/payments?balance=1", { cache: "no-store" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error ?? "Balance report load failed");
      setReport(json.balanceReport ?? null);
    } catch (e) {
      setMsg(e instanceof Error ? e.message : "Balance report load failed");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    if (!report) return [];
    const q = search.trim().toLowerCase();
    if (!q) return report.sellers;
    return report.sellers.filter((s) =>
      [s.company, s.email, s.name, s.scope, s.status]
        .filter(Boolean)
        .join(" ")
        .toLowerCase()
        .includes(q)
    );
  }, [report, search]);

  if (loading && !report) {
    return (
      <div className="flex items-center gap-2 rounded-2xl border border-slate-700/80 bg-slate-800/40 px-6 py-16 text-slate-400">
        <Loader2 className="h-5 w-5 animate-spin" />
        Loading balance report…
      </div>
    );
  }

  if (!report) {
    return (
      <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
        {msg || "Could not load balance report"}
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {msg ? (
        <p className="rounded-xl border border-rose-500/30 bg-rose-500/10 px-4 py-3 text-sm text-rose-200">
          {msg}
        </p>
      ) : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {[
          {
            label: "Seller SMS balance",
            value: `${report.sms.sellerTotal.toLocaleString("en-BD")} SMS`,
            sub: `Recharged ${formatSmsBdt(report.sms.sellerRechargedTaka)}`,
            icon: MessageSquare,
          },
          {
            label: "Gateway SMS balance",
            value:
              report.sms.providerBalance != null
                ? `${report.sms.providerBalance.toLocaleString("en-BD")} SMS`
                : "—",
            sub: report.sms.providerConfigured ? "TeamITQAN main" : "Not configured",
            icon: Wallet,
          },
          {
            label: "Seller call balance",
            value: formatAutoCallBdt(report.autoCall.sellerTotalTaka),
            sub: `Recharged ${formatAutoCallBdt(report.autoCall.sellerRechargedTaka)}`,
            icon: Phone,
          },
          {
            label: "Gateway call balance",
            value:
              report.autoCall.apiBalance != null
                ? formatAutoCallBdt(report.autoCall.apiBalance)
                : "—",
            sub: report.autoCall.providerConfigured ? "TeamITQAN main API" : "Not configured",
            icon: Scale,
          },
        ].map((card) => (
          <div
            key={card.label}
            className="rounded-2xl border border-slate-700/80 bg-slate-800/50 px-4 py-4"
          >
            <div className="flex items-center gap-2 text-slate-400">
              <card.icon className="h-4 w-4 text-orange-400" />
              <p className="text-xs font-semibold uppercase tracking-wide">{card.label}</p>
            </div>
            <p className="mt-2 text-xl font-extrabold text-white">{card.value}</p>
            <p className="mt-1 text-[11px] text-slate-500">{card.sub}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="rounded-2xl border border-slate-700/80 bg-slate-800/40 p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            SMS — sellers vs gateway
          </p>
          <div className="mt-4 space-y-2 text-sm">
            <p className="flex justify-between text-slate-400">
              <span>Seller SMS balance</span>
              <strong className="text-white">
                {report.sms.sellerTotal.toLocaleString("en-BD")} SMS
              </strong>
            </p>
            <p className="flex justify-between text-slate-400">
              <span>TeamITQAN main balance</span>
              <strong className="text-teal-300">
                {report.sms.providerBalance != null
                  ? `${report.sms.providerBalance.toLocaleString("en-BD")} SMS`
                  : "—"}
              </strong>
            </p>
            {report.sms.coveragePct != null ? (
              <p className="flex justify-between text-slate-400">
                <span>Coverage</span>
                <strong className="text-white">{report.sms.coveragePct}%</strong>
              </p>
            ) : null}
          </div>
          {report.sms.topUpGap != null && report.sms.topUpGap > 0 ? (
            <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-200">
              Top-up needed: load ~{report.sms.topUpGap.toLocaleString("en-BD")} SMS at gateway
            </p>
          ) : report.sms.providerBalance != null ? (
            <p className="mt-4 text-xs font-bold text-emerald-300">SMS gateway buffer OK</p>
          ) : null}
        </div>

        <div className="rounded-2xl border border-slate-700/80 bg-slate-800/40 p-5">
          <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
            Auto Call — sellers vs gateway
          </p>
          <div className="mt-4 space-y-2 text-sm">
            <p className="flex justify-between text-slate-400">
              <span>Seller call balance</span>
              <strong className="text-white">
                {formatAutoCallBdt(report.autoCall.sellerTotalTaka)}
              </strong>
            </p>
            <p className="flex justify-between text-slate-400">
              <span>TeamITQAN main API</span>
              <strong className="text-teal-300">
                {report.autoCall.apiBalance != null
                  ? formatAutoCallBdt(report.autoCall.apiBalance)
                  : "—"}
              </strong>
            </p>
            {report.autoCall.didBalance != null ? (
              <p className="flex justify-between text-slate-400">
                <span>DID balance</span>
                <strong className="text-violet-300">
                  {formatAutoCallBdt(report.autoCall.didBalance)}
                </strong>
              </p>
            ) : null}
            {report.autoCall.coveragePct != null ? (
              <p className="flex justify-between text-slate-400">
                <span>Coverage</span>
                <strong className="text-white">{report.autoCall.coveragePct}%</strong>
              </p>
            ) : null}
          </div>
          {report.autoCall.topUpGap != null && report.autoCall.topUpGap > 0 ? (
            <p className="mt-4 rounded-xl border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-bold text-amber-200">
              Top-up needed: load ~{formatAutoCallBdt(report.autoCall.topUpGap)} at gateway
            </p>
          ) : report.autoCall.apiBalance != null ? (
            <p className="mt-4 text-xs font-bold text-emerald-300">Auto Call gateway buffer OK</p>
          ) : null}
        </div>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-700/80 bg-slate-800/40">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-700/80 px-4 py-3">
          <h2 className="font-bold text-white">Seller balances</h2>
          <SearchField
            value={search}
            onChange={setSearch}
            placeholder="Search company, email…"
            className="w-full sm:max-w-xs"
            variant="dark"
          />
        </div>
        <div className="overflow-x-auto">
          <table className="min-w-full text-left text-sm">
            <thead>
              <tr className="border-b border-slate-700/80 bg-slate-900/60 text-[11px] font-bold uppercase tracking-wide text-slate-400">
                <th className="px-4 py-3">Business</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">SMS balance</th>
                <th className="px-3 py-3">SMS recharged</th>
                <th className="px-3 py-3">Call balance</th>
                <th className="px-3 py-3">Call recharged</th>
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
                    No sellers found
                  </td>
                </tr>
              ) : (
                filtered.map((s) => (
                  <tr
                    key={s.scope}
                    className="border-t border-slate-700/60 hover:bg-slate-800/60"
                  >
                    <td className="px-4 py-3">
                      <p className="font-semibold text-white">{s.company}</p>
                      <p className="text-xs text-slate-500">{s.email}</p>
                    </td>
                    <td className="px-3 py-3">
                      <span
                        className={clsx(
                          "rounded-full px-2.5 py-0.5 text-[11px] font-bold capitalize",
                          statusBadge(s.status)
                        )}
                      >
                        {s.status}
                      </span>
                    </td>
                    <td className="px-3 py-3 font-bold text-teal-300">
                      {s.smsBalance.toLocaleString("en-BD")} SMS
                    </td>
                    <td className="px-3 py-3 text-slate-300">
                      {formatSmsBdt(s.smsRechargedTaka)}
                    </td>
                    <td className="px-3 py-3 font-bold text-violet-300">
                      {formatAutoCallBdt(s.autoCallBalanceTaka)}
                    </td>
                    <td className="px-3 py-3 text-slate-300">
                      {formatAutoCallBdt(s.autoCallRechargedTaka)}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
