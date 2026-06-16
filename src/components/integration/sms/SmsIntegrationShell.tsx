"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { AlertCircle, CheckCircle2, Download, ExternalLink } from "lucide-react";
import { smsIntegrationBasePath, smsNav } from "@/lib/sms-nav";
import { setSmsServiceEnabled } from "@/lib/sms-store";
import { SmsBalanceBar } from "@/components/integration/sms/SmsBalanceBar";
import { useSmsAccount } from "@/components/integration/sms/useSmsAccount";

export function SmsIntegrationShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const {
    account,
    setAccount,
    systemEnabled,
    selfRechargeEnabled,
    smsPriceTaka,
    loading,
    reload,
  } = useSmsAccount();
  const [feedback, setFeedback] = useState<{
    type: "ok" | "err";
    text: string;
    invoice?: string;
  } | null>(null);
  const [togglingService, setTogglingService] = useState(false);

  useEffect(() => {
    const payment = searchParams.get("payment");
    const kind = searchParams.get("kind");
    const invoice = searchParams.get("invoice");
    if (!payment || kind !== "sms_recharge") return;

    if (payment === "success") {
      setFeedback({
        type: "ok",
        text: `PayStation payment successful${invoice ? ` · ${invoice}` : ""}. SMS balance updated.`,
        invoice: invoice || undefined,
      });
      void reload();
    } else {
      setFeedback({
        type: "err",
        text: `PayStation payment cancelled or failed${invoice ? ` · ${invoice}` : ""}. Balance was not changed.`,
        invoice: invoice || undefined,
      });
    }

    router.replace(pathname, { scroll: false });
  }, [pathname, reload, router, searchParams]);

  const handleServiceToggle = async (enabled: boolean) => {
    setTogglingService(true);
    const result = await setSmsServiceEnabled(enabled);
    setTogglingService(false);
    if (!result.ok || !result.account) {
      setFeedback({ type: "err", text: result.error ?? "Could not update SMS status" });
      return;
    }
    setAccount(result.account);
    setFeedback({
      type: "ok",
      text: result.message ?? (enabled ? "SMS turned on" : "SMS turned off"),
    });
  };

  return (
    <div className="space-y-5">
      <SmsBalanceBar
        balance={account.balance}
        smsPriceTaka={smsPriceTaka}
        systemEnabled={systemEnabled}
        serviceEnabled={account.serviceEnabled}
        selfRechargeEnabled={selfRechargeEnabled}
        loading={loading}
        togglingService={togglingService}
        onServiceToggle={handleServiceToggle}
        onRechargeSuccess={(next, message) => {
          setAccount(next);
          setFeedback({ type: "ok", text: message });
        }}
        onRechargeError={(text) => setFeedback({ type: "err", text })}
      />

      {feedback ? (
        <div
          className={clsx(
            "flex flex-wrap items-center gap-2 rounded-xl px-4 py-3 text-sm font-medium",
            feedback.type === "ok"
              ? "bg-emerald-50 text-emerald-800 ring-1 ring-emerald-200"
              : "bg-rose-50 text-rose-800 ring-1 ring-rose-200"
          )}
        >
          {feedback.type === "ok" ? (
            <CheckCircle2 className="h-4 w-4 shrink-0" />
          ) : (
            <AlertCircle className="h-4 w-4 shrink-0" />
          )}
          <span className="min-w-0 flex-1">{feedback.text}</span>
          {feedback.type === "ok" && feedback.invoice ? (
            <span className="flex flex-wrap gap-2">
              <a
                href={`/api/payments/receipt?invoice=${encodeURIComponent(feedback.invoice)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/80 px-3 py-1.5 text-xs font-extrabold text-emerald-800 ring-1 ring-emerald-200 hover:bg-white"
              >
                <ExternalLink className="h-3.5 w-3.5" />
                View receipt
              </a>
              <a
                href={`/api/payments/receipt?invoice=${encodeURIComponent(feedback.invoice)}&download=1`}
                className="inline-flex items-center gap-1.5 rounded-lg bg-white/80 px-3 py-1.5 text-xs font-extrabold text-emerald-800 ring-1 ring-emerald-200 hover:bg-white"
              >
                <Download className="h-3.5 w-3.5" />
                Download
              </a>
            </span>
          ) : null}
        </div>
      ) : null}

      <nav
        aria-label="SMS sections"
        className="rounded-2xl border border-teal-100/80 bg-gradient-to-r from-teal-50/60 via-white to-cyan-50/40 p-2 shadow-sm shadow-teal-100/40"
      >
        <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
          {smsNav.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === smsIntegrationBasePath
                ? pathname === item.href
                : pathname === item.href || pathname.startsWith(`${item.href}/`);

            return (
              <Link
                key={item.href}
                href={item.href}
                title={item.description}
                className={clsx(
                  "group flex min-w-0 items-center gap-2 rounded-xl px-2.5 py-2 transition sm:gap-2.5 sm:px-3 sm:py-2.5",
                  active
                    ? "bg-gradient-to-r from-teal-500 to-cyan-500 text-white shadow-md shadow-teal-200/50"
                    : "bg-white/70 text-slate-600 ring-1 ring-slate-200/70 hover:bg-teal-50 hover:text-teal-900 hover:ring-teal-200"
                )}
              >
                <span
                  className={clsx(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition sm:h-8 sm:w-8",
                    active
                      ? "bg-white/15 text-white"
                      : "bg-teal-100 text-teal-600 group-hover:bg-teal-200 group-hover:text-teal-700"
                  )}
                >
                  <Icon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                </span>
                <span className="min-w-0 truncate text-xs font-extrabold leading-tight sm:text-sm">
                  {item.label}
                </span>
              </Link>
            );
          })}
        </div>
      </nav>

      <div className="min-w-0">{children}</div>
    </div>
  );
}
