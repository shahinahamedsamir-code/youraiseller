"use client";

import { useState } from "react";
import clsx from "clsx";
import { Coins, Loader2, Plus } from "lucide-react";
import type { SmsAccount } from "@/lib/sms-types";
import { SmsRechargeModal } from "@/components/integration/sms/SmsRechargeModal";

type Props = {
  balance: number;
  smsPriceTaka?: number;
  systemEnabled?: boolean;
  selfRechargeEnabled?: boolean;
  compact?: boolean;
  loading?: boolean;
  onRechargeSuccess?: (account: SmsAccount, message: string) => void;
  onRechargeError?: (message: string) => void;
};

export function SmsBalanceBar({
  balance,
  smsPriceTaka = 1,
  systemEnabled = true,
  selfRechargeEnabled = false,
  compact,
  loading,
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
          "rounded-xl border border-teal-100 bg-gradient-to-r from-teal-50/80 via-white to-cyan-50/50",
          compact ? "px-4 py-3" : "px-4 py-4 sm:px-5",
          !systemEnabled && "border-rose-200 bg-rose-50/50"
        )}
      >
        {!systemEnabled ? (
          <p className="mb-3 rounded-lg bg-rose-100 px-3 py-2 text-sm font-semibold text-rose-800">
            SMS system is off — admin has disabled sending.
          </p>
        ) : null}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
              <Coins className="h-5 w-5" />
            </span>
            <div>
              <p className="text-[11px] font-bold uppercase tracking-wide text-slate-500">
                SMS Balance
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
              Add SMS Balance
            </button>
          ) : null}
        </div>

        {!compact ? (
          <p className="mt-3 text-[11px] font-medium text-slate-500">
            ৳{smsPriceTaka}/SMS · bKash দিয়ে self recharge · balance শেষ হলে send বন্ধ
          </p>
        ) : null}

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
