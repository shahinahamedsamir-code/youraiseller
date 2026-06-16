"use client";

import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useState } from "react";
import clsx from "clsx";
import { AlertCircle, CheckCircle2, Download, ExternalLink } from "lucide-react";
import { getAutoCallBasePath, getAutoCallNav } from "@/lib/auto-call-nav";
import { setAutoCallServiceEnabled } from "@/lib/auto-call-store";
import { AutoCallWalletBar } from "@/components/integration/auto-call/AutoCallWalletBar";
import { useAutoCallAccount } from "@/components/integration/auto-call/useAutoCallAccount";

type AutoCallShellVariant = "center" | "integration";

export function AutoCallIntegrationShell({
  children,
  variant = "integration",
}: {
  children: React.ReactNode;
  variant?: AutoCallShellVariant;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const nav = getAutoCallNav(variant);
  const basePath = getAutoCallBasePath(variant);
  const {
    account,
    setAccount,
    systemEnabled,
    selfRechargeEnabled,
    callPriceTaka,
    defaultDid,
    providerConfigured,
    loading,
    reload,
  } = useAutoCallAccount();
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
    if (!payment || kind !== "auto_call_recharge") return;

    if (payment === "success") {
      setFeedback({
        type: "ok",
        text: `PayStation payment successful${invoice ? ` · ${invoice}` : ""}. Auto Call balance updated.`,
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
    const result = await setAutoCallServiceEnabled(enabled);
    setTogglingService(false);
    if (!result.ok || !result.account) {
      setFeedback({ type: "err", text: result.error ?? "Could not update Auto Call status" });
      return;
    }
    setAccount(result.account);
    setFeedback({
      type: "ok",
      text: result.message ?? (enabled ? "Auto Call turned on" : "Auto Call turned off"),
    });
  };

  return (
    <div className="space-y-5">
      <AutoCallWalletBar
        balanceTaka={account.balanceTaka}
        callPriceTaka={callPriceTaka}
        defaultDid={defaultDid}
        systemEnabled={systemEnabled}
        serviceEnabled={account.serviceEnabled}
        selfRechargeEnabled={selfRechargeEnabled}
        providerConfigured={providerConfigured}
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
        aria-label="Auto Call sections"
        className="rounded-2xl border border-violet-100/80 bg-gradient-to-r from-violet-50/60 via-white to-indigo-50/40 p-2 shadow-sm shadow-violet-100/40"
      >
        <div
          className={clsx(
            "grid grid-cols-2 gap-1.5 sm:grid-cols-3",
            variant === "integration" ? "lg:grid-cols-5" : "lg:grid-cols-3"
          )}
        >
          {nav.map((item) => {
            const Icon = item.icon;
            const active =
              item.href === basePath
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
                    ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-200/50"
                    : "bg-white/70 text-slate-600 ring-1 ring-slate-200/70 hover:bg-violet-50 hover:text-violet-900 hover:ring-violet-200"
                )}
              >
                <span
                  className={clsx(
                    "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg transition sm:h-8 sm:w-8",
                    active
                      ? "bg-white/15 text-white"
                      : "bg-violet-100 text-violet-600 group-hover:bg-violet-200 group-hover:text-violet-700"
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
