"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { Coins, Loader2, X } from "lucide-react";
import { formatAutoCallBdt, formatAutoCallTaka, selfRechargeAutoCallViaBkash } from "@/lib/auto-call-store";
import type { AutoCallAccount } from "@/lib/auto-call-types";

type Props = {
  open: boolean;
  balanceTaka: number;
  callPriceTaka: number;
  onClose: () => void;
  onSuccess: (account: AutoCallAccount, message: string) => void;
  onError: (message: string) => void;
};

export function AutoCallRechargeModal({
  open,
  balanceTaka,
  callPriceTaka,
  onClose,
  onSuccess,
  onError,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [callMinutes, setCallMinutes] = useState(10);
  const [paying, setPaying] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setCallMinutes(10);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !paying) onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose, paying]);

  const totalTaka = useMemo(() => {
    const minutes = Math.max(1, Math.floor(callMinutes) || 1);
    return Math.round(minutes * callPriceTaka * 100) / 100;
  }, [callMinutes, callPriceTaka]);

  const handlePay = async () => {
    setPaying(true);
    const res = await selfRechargeAutoCallViaBkash(Math.floor(callMinutes) || 1);
    setPaying(false);
    if (!res.ok || !res.account) {
      onError(res.error ?? "Payment failed");
      return;
    }
    onSuccess(res.account, res.message ?? "Recharge successful");
    onClose();
  };

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[240] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm"
        onClick={() => !paying && onClose()}
      />
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
        <div className="flex items-start justify-between gap-3 border-b border-violet-100 bg-gradient-to-r from-violet-50 to-indigo-50/50 px-5 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
              <Coins className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">Add call balance</h2>
              <p className="text-xs text-slate-500">
                Current balance:{" "}
                <strong className="text-slate-800">{formatAutoCallBdt(balanceTaka)}</strong>
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
              Number of calls to buy
            </span>
            <input
              type="number"
              min={1}
              value={callMinutes}
              onChange={(e) => setCallMinutes(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
          </label>

          <p className="text-base font-extrabold text-slate-900">
            Total Amount:{" "}
            <span className="text-rose-600">{formatAutoCallBdt(totalTaka)}</span>
          </p>
          <p className="text-[11px] text-slate-500">
            {formatAutoCallTaka(callPriceTaka)} BDT per call
          </p>

          <button
            type="button"
            disabled={paying || callMinutes < 1}
            onClick={() => void handlePay()}
            className={clsx(
              "flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3.5 text-sm font-extrabold text-white shadow-md transition disabled:opacity-60",
              "bg-[#E2136E] hover:bg-[#c91062]"
            )}
          >
            {paying ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
            Pay with bKash
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
