"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import clsx from "clsx";
import { AlertCircle, CheckCircle2, MessageSquare } from "lucide-react";
import { smsNav } from "@/lib/sms-nav";
import { SmsBalanceBar } from "@/components/integration/sms/SmsBalanceBar";
import { useSmsAccount } from "@/components/integration/sms/useSmsAccount";

export function SmsIntegrationShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const {
    account,
    setAccount,
    systemEnabled,
    selfRechargeEnabled,
    smsPriceTaka,
    loading,
  } = useSmsAccount();
  const [feedback, setFeedback] = useState<{
    type: "ok" | "err";
    text: string;
  } | null>(null);

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-600 via-cyan-600 to-indigo-600 p-5 text-white shadow-lg shadow-teal-200/40 sm:p-6">
        <div className="pointer-events-none absolute -right-10 -top-10 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-8 left-1/3 h-32 w-32 rounded-full bg-cyan-300/20 blur-2xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div className="flex items-start gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur-sm">
              <MessageSquare className="h-6 w-6" />
            </div>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-[0.18em] text-teal-100">
                Integration
              </p>
              <h1 className="text-xl font-extrabold sm:text-2xl">SMS Integration</h1>
              <p className="mt-1 max-w-xl text-sm text-teal-50/90">
                Recharge balance, unlimited SMS by credits, auto triggers &amp; log
              </p>
            </div>
          </div>
        </div>
      </div>

      <SmsBalanceBar
        balance={account.balance}
        smsPriceTaka={smsPriceTaka}
        systemEnabled={systemEnabled}
        selfRechargeEnabled={selfRechargeEnabled}
        loading={loading}
        onRechargeSuccess={(next, message) => {
          setAccount(next);
          setFeedback({ type: "ok", text: message });
        }}
        onRechargeError={(text) => setFeedback({ type: "err", text })}
      />

      {feedback ? (
        <div
          className={clsx(
            "flex items-start gap-2 rounded-xl px-4 py-3 text-sm font-medium",
            feedback.type === "ok"
              ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
              : "bg-rose-50 text-rose-800 ring-1 ring-rose-200"
          )}
        >
          {feedback.type === "ok" ? (
            <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          )}
          {feedback.text}
        </div>
      ) : null}

      <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
        <nav className="yai-panel shrink-0 p-2 lg:w-[220px] xl:w-[240px]">
          <p className="px-3 pb-2 pt-1 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            SMS menu
          </p>
          <ul className="space-y-1">
            {smsNav.map((item) => {
              const Icon = item.icon;
              const active =
                pathname === item.href ||
                (item.href !== "/dashboard/integration/sms" &&
                  pathname.startsWith(item.href));

              return (
                <li key={item.href}>
                  <Link
                    href={item.href}
                    className={clsx(
                      "group flex items-start gap-3 rounded-xl px-3 py-2.5 transition",
                      active
                        ? "bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-md shadow-teal-200/50"
                        : "text-slate-600 hover:bg-teal-50 hover:text-teal-900"
                    )}
                  >
                    <Icon
                      className={clsx(
                        "mt-0.5 h-4 w-4 shrink-0",
                        active ? "text-white" : "text-teal-500 group-hover:text-teal-600"
                      )}
                    />
                    <span>
                      <span className="block text-sm font-bold leading-tight">
                        {item.label}
                      </span>
                      <span
                        className={clsx(
                          "mt-0.5 block text-[11px] font-medium",
                          active ? "text-teal-50/90" : "text-slate-400"
                        )}
                      >
                        {item.description}
                      </span>
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </nav>

        <div className="min-w-0 flex-1">{children}</div>
      </div>
    </div>
  );
}
