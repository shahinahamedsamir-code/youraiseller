"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { Coins, Loader2, X } from "lucide-react";
import { selfRechargeViaPayStation } from "@/lib/sms-store";
import { formatSmsBdt, type SmsAccount } from "@/lib/sms-types";

const DEFAULT_SMS_RECHARGE_COUNT = 100;

type Props = {
  open: boolean;
  balance: number;
  smsPriceTaka: number;
  onClose: () => void;
  onSuccess: (account: SmsAccount, message: string) => void;
  onError: (message: string) => void;
};

export function SmsRechargeModal({
  open,
  balance,
  smsPriceTaka,
  onClose,
  onError,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [smsCount, setSmsCount] = useState(DEFAULT_SMS_RECHARGE_COUNT);
  const [paying, setPaying] = useState(false);
  const closeRef = useRef(onClose);
  const payingRef = useRef(paying);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    closeRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    payingRef.current = paying;
  }, [paying]);

  useEffect(() => {
    if (!open) return;
    setSmsCount(DEFAULT_SMS_RECHARGE_COUNT);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !payingRef.current) closeRef.current();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open]);

  const totalTaka = useMemo(() => {
    const count = Math.max(1, Math.floor(smsCount) || 1);
    return Math.round(count * smsPriceTaka * 100) / 100;
  }, [smsCount, smsPriceTaka]);

  const handlePay = async () => {
    setPaying(true);
    const res = await selfRechargeViaPayStation(Math.floor(smsCount) || 1);
    setPaying(false);
    if (!res.ok || !res.paymentUrl) {
      onError(res.error ?? "Payment failed");
      return;
    }
    window.location.href = res.paymentUrl;
  };

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[240] flex items-end justify-center md:items-center md:p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm"
        onClick={() => !paying && onClose()}
      />
      <div className="relative max-h-[min(92dvh,28rem)] w-full overflow-y-auto rounded-t-2xl bg-white shadow-2xl ring-1 ring-slate-200 md:max-h-none md:max-w-md md:rounded-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-teal-100 bg-gradient-to-r from-teal-50 to-cyan-50/50 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
              <Coins className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">Add SMS Balance</h2>
              <p className="text-xs text-slate-500">
                Current balance:{" "}
                <strong className="text-slate-800">
                  {balance.toLocaleString("en-BD")} SMS
                </strong>
              </p>
            </div>
          </div>
          <button
            type="button"
            disabled={paying}
            onClick={onClose}
            className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-white disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <label className="block">
            <span className="mb-1.5 block text-xs font-semibold text-slate-500">
              Number of SMS
            </span>
            <input
              type="number"
              min={1}
              value={smsCount}
              onChange={(e) => setSmsCount(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
            />
          </label>

          <p className="text-base font-extrabold text-slate-900">
            Total Amount:{" "}
            <span className="text-rose-600">{formatSmsBdt(totalTaka)}</span>
          </p>
          <p className="text-[11px] text-slate-500">
            BDT {smsPriceTaka}/SMS · PayStation hosted checkout
          </p>

          <button
            type="button"
            disabled={paying || smsCount < 1}
            onClick={handlePay}
            className={clsx(
              "flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-extrabold text-white shadow-md transition disabled:opacity-60",
              "bg-[#E2136E] hover:bg-[#c91062]"
            )}
          >
            {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Pay with PayStation
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
