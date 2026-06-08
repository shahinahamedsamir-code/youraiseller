"use client";

import { useState } from "react";
import clsx from "clsx";
import { Coins, Loader2, Phone, PhoneCall, Plus, Power, Signal } from "lucide-react";
import type { AutoCallAccount } from "@/lib/auto-call-types";
import { formatAutoCallBdt, formatAutoCallTaka } from "@/lib/auto-call-store";
import { AutoCallRechargeModal } from "@/components/integration/auto-call/AutoCallRechargeModal";

type Props = {
  balanceTaka: number;
  callPriceTaka?: number;
  defaultDid?: string | null;
  systemEnabled?: boolean;
  serviceEnabled?: boolean;
  selfRechargeEnabled?: boolean;
  providerConfigured?: boolean;
  loading?: boolean;
  togglingService?: boolean;
  onServiceToggle?: (enabled: boolean) => void;
  onRechargeSuccess?: (account: AutoCallAccount, message: string) => void;
  onRechargeError?: (message: string) => void;
};

export function AutoCallWalletBar({
  balanceTaka,
  callPriceTaka = 1,
  defaultDid,
  systemEnabled = true,
  serviceEnabled = false,
  selfRechargeEnabled = false,
  providerConfigured = false,
  loading,
  togglingService = false,
  onServiceToggle,
  onRechargeSuccess,
  onRechargeError,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);

  const showRecharge =
    systemEnabled && selfRechargeEnabled && onRechargeSuccess && onRechargeError;

  return (
    <>
      <div
        className={clsx(
          "overflow-hidden rounded-2xl border shadow-sm",
          systemEnabled
            ? "border-violet-100/80 bg-white shadow-violet-100/40"
            : "border-rose-200 bg-rose-50/50"
        )}
      >
        {!systemEnabled ? (
          <div className="border-b border-rose-100 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-800">
            Call service is temporarily unavailable. Please contact support if this continues.
          </div>
        ) : null}

        {systemEnabled && !serviceEnabled ? (
          <div className="border-b border-amber-100 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-900">
            Auto Call is off. Turn it on below when you are ready to send calls.
          </div>
        ) : null}

        <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:gap-5 lg:p-4 xl:p-5">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-violet-600 to-indigo-600 text-white shadow-md shadow-violet-200/50">
              <PhoneCall className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-violet-600">
                Order verification
              </p>
              <h1 className="text-lg font-extrabold leading-tight text-slate-900">Auto Call</h1>
              <p className="mt-0.5 truncate text-xs text-slate-500 sm:whitespace-normal">
                Customer presses <strong className="text-slate-700">Key 1</strong> to confirm or{" "}
                <strong className="text-slate-700">Key 2</strong> to cancel
              </p>
            </div>
          </div>

          <div className="hidden h-11 w-px shrink-0 bg-slate-200 lg:block" />

          <div className="flex flex-wrap items-center gap-3 lg:shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-50 text-violet-700 ring-1 ring-violet-100">
                <Coins className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  Call balance
                </p>
                <p className="text-xl font-extrabold tabular-nums leading-tight text-slate-900">
                  {loading ? "…" : formatAutoCallBdt(balanceTaka)}
                </p>
                <p className="text-[11px] text-slate-500">
                  {formatAutoCallTaka(callPriceTaka)} BDT/call
                </p>
              </div>
            </div>

            {showRecharge ? (
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-violet-200/40 transition hover:from-violet-700 hover:to-indigo-700"
              >
                <Plus className="h-4 w-4" />
                Recharge
              </button>
            ) : null}

            {onServiceToggle ? (
              <button
                type="button"
                disabled={!systemEnabled || loading || togglingService}
                onClick={() => onServiceToggle(!serviceEnabled)}
                className={clsx(
                  "inline-flex items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold shadow-md transition disabled:cursor-not-allowed disabled:opacity-60",
                  serviceEnabled
                    ? "bg-emerald-600 text-white shadow-emerald-200/40 hover:bg-emerald-700"
                    : "bg-slate-700 text-white shadow-slate-200/40 hover:bg-slate-800"
                )}
              >
                {togglingService ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <Power className="h-4 w-4" />
                )}
                {serviceEnabled ? "ON" : "OFF"}
              </button>
            ) : null}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 border-t border-slate-100 bg-slate-50/70 px-4 py-2.5">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
            <Signal
              className={clsx(
                "h-3 w-3",
                systemEnabled && serviceEnabled ? "text-emerald-500" : "text-slate-400"
              )}
            />
            {!systemEnabled
              ? "Platform paused"
              : serviceEnabled
                ? "Auto Call on"
                : "Auto Call off"}
          </span>
          {defaultDid ? (
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-2.5 py-1 text-[11px] font-semibold text-slate-600 ring-1 ring-slate-200">
              <Phone className="h-3 w-3 text-violet-500" />
              Caller:{" "}
              <span className="tabular-nums text-slate-800">{loading ? "…" : defaultDid}</span>
            </span>
          ) : null}
          {!providerConfigured && systemEnabled ? (
            <span className="text-[11px] font-medium text-amber-700">
              Finish voice setup in Setup tab
            </span>
          ) : null}
          {loading ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              Updating…
            </span>
          ) : null}
        </div>
      </div>

      {showRecharge ? (
        <AutoCallRechargeModal
          open={modalOpen}
          balanceTaka={balanceTaka}
          callPriceTaka={callPriceTaka}
          onClose={() => setModalOpen(false)}
          onSuccess={onRechargeSuccess}
          onError={onRechargeError}
        />
      ) : null}
    </>
  );
}
