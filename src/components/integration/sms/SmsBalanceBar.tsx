"use client";

import { useState } from "react";
import clsx from "clsx";
import { Coins, Loader2, MessageSquare, Plus, Power, Signal } from "lucide-react";
import type { SmsAccount } from "@/lib/sms-types";
import { SmsRechargeModal } from "@/components/integration/sms/SmsRechargeModal";

type Props = {
  balance: number;
  smsPriceTaka?: number;
  systemEnabled?: boolean;
  serviceEnabled?: boolean;
  selfRechargeEnabled?: boolean;
  compact?: boolean;
  loading?: boolean;
  togglingService?: boolean;
  onServiceToggle?: (enabled: boolean) => void;
  onRechargeSuccess?: (account: SmsAccount, message: string) => void;
  onRechargeError?: (message: string) => void;
};

export function SmsBalanceBar({
  balance,
  smsPriceTaka = 1,
  systemEnabled = true,
  serviceEnabled = false,
  selfRechargeEnabled = false,
  compact,
  loading,
  togglingService = false,
  onServiceToggle,
  onRechargeSuccess,
  onRechargeError,
}: Props) {
  const [modalOpen, setModalOpen] = useState(false);

  const showRecharge =
    systemEnabled && selfRechargeEnabled && onRechargeSuccess && onRechargeError;

  if (compact) {
    return (
      <>
        <div
          className={clsx(
            "rounded-xl border border-teal-100 bg-gradient-to-r from-teal-50/80 via-white to-cyan-50/50 px-4 py-3",
            !systemEnabled && "border-rose-200 bg-rose-50/50"
          )}
        >
          {!systemEnabled ? (
            <p className="mb-3 rounded-lg bg-rose-100 px-3 py-2 text-sm font-semibold text-rose-800">
              SMS service is temporarily unavailable.
            </p>
          ) : null}

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
                <Coins className="h-5 w-5" />
              </span>
              <div>
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                  SMS balance
                </p>
                <p className="text-xl font-extrabold tabular-nums text-slate-900">
                  {loading ? "…" : balance.toLocaleString("en-BD")}
                </p>
              </div>
            </div>

            {showRecharge ? (
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-xl border border-teal-300 bg-white px-4 py-2 text-sm font-bold text-teal-700 transition hover:bg-teal-50"
              >
                <Plus className="h-4 w-4" />
                Add balance
              </button>
            ) : null}
          </div>

          {loading ? (
            <p className="mt-2 inline-flex items-center gap-1 text-[11px] text-slate-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              Loading…
            </p>
          ) : null}
        </div>

        {showRecharge ? (
          <SmsRechargeModal
            open={modalOpen}
            balance={balance}
            smsPriceTaka={smsPriceTaka}
            onClose={() => setModalOpen(false)}
            onSuccess={onRechargeSuccess}
            onError={onRechargeError}
          />
        ) : null}
      </>
    );
  }

  return (
    <>
      <div
        className={clsx(
          "overflow-hidden rounded-2xl border shadow-sm",
          systemEnabled
            ? "border-teal-100/80 bg-white shadow-teal-100/40"
            : "border-rose-200 bg-rose-50/50"
        )}
      >
        {!systemEnabled ? (
          <div className="border-b border-rose-100 bg-rose-50 px-4 py-2.5 text-sm font-semibold text-rose-800">
            SMS service is temporarily unavailable. Please contact support if this continues.
          </div>
        ) : null}

        {systemEnabled && !serviceEnabled ? (
          <div className="border-b border-amber-100 bg-amber-50 px-4 py-2.5 text-sm font-semibold text-amber-900">
            SMS is off. Turn it on below when you are ready to send messages.
          </div>
        ) : null}

        <div className="flex flex-col gap-4 p-4 lg:flex-row lg:items-center lg:gap-5 lg:p-4 xl:p-5">
          <div className="flex min-w-0 flex-1 items-center gap-3">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br from-teal-600 to-cyan-600 text-white shadow-md shadow-teal-200/50">
              <MessageSquare className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <p className="text-[10px] font-bold uppercase tracking-[0.16em] text-teal-600">
                Integration
              </p>
              <h1 className="text-lg font-extrabold leading-tight text-slate-900">
                SMS Integration
              </h1>
              <p className="mt-0.5 truncate text-xs text-slate-500 sm:whitespace-normal">
                Recharge balance, auto messages &amp; SMS history in one place
              </p>
            </div>
          </div>

          <div className="hidden h-11 w-px shrink-0 bg-slate-200 lg:block" />

          <div className="flex w-full flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-center sm:gap-3 lg:w-auto lg:shrink-0">
            <div className="flex items-center gap-2.5">
              <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-teal-50 text-teal-700 ring-1 ring-teal-100">
                <Coins className="h-5 w-5" />
              </div>
              <div>
                <p className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
                  SMS balance
                </p>
                <p className="text-xl font-extrabold tabular-nums leading-tight text-slate-900">
                  {loading ? "…" : balance.toLocaleString("en-BD")}
                </p>
                <p className="text-[11px] text-slate-500">BDT {smsPriceTaka}/SMS</p>
              </div>
            </div>

            {showRecharge ? (
              <button
                type="button"
                onClick={() => setModalOpen(true)}
                className="inline-flex w-full items-center justify-center gap-1.5 rounded-xl bg-gradient-to-r from-teal-600 to-cyan-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-teal-200/40 transition hover:from-teal-700 hover:to-cyan-600 sm:w-auto"
              >
                <Plus className="h-4 w-4" />
                Add balance
              </button>
            ) : null}

            {onServiceToggle ? (
              <button
                type="button"
                disabled={!systemEnabled || loading || togglingService}
                onClick={() => onServiceToggle(!serviceEnabled)}
                className={clsx(
                  "inline-flex w-full items-center justify-center gap-1.5 rounded-xl px-4 py-2.5 text-sm font-bold shadow-md transition disabled:cursor-not-allowed disabled:opacity-60 sm:w-auto",
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
                ? "SMS on"
                : "SMS off"}
          </span>
          <span className="text-[11px] font-medium text-slate-500">
            Self recharge via bKash · Sending stops when balance is zero
          </span>
          {loading ? (
            <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
              <Loader2 className="h-3 w-3 animate-spin" />
              Updating…
            </span>
          ) : null}
        </div>
      </div>

      {showRecharge ? (
        <SmsRechargeModal
          open={modalOpen}
          balance={balance}
          smsPriceTaka={smsPriceTaka}
          onClose={() => setModalOpen(false)}
          onSuccess={onRechargeSuccess}
          onError={onRechargeError}
        />
      ) : null}
    </>
  );
}
