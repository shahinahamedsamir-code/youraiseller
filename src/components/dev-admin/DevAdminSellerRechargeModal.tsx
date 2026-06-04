"use client";

import { useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { Coins, Loader2, Wallet, X } from "lucide-react";
import type { SellerSmsSummary } from "@/lib/sms-admin-server";
import { formatSmsBdt } from "@/lib/sms-types";

export type AdminRechargeMode = "taka" | "credits";

type Props = {
  open: boolean;
  mode: AdminRechargeMode;
  seller: SellerSmsSummary | null;
  smsPriceTaka: number;
  submitting?: boolean;
  onClose: () => void;
  onSubmit: (value: number) => void;
};

export function DevAdminSellerRechargeModal({
  open,
  mode,
  seller,
  smsPriceTaka,
  submitting,
  onClose,
  onSubmit,
}: Props) {
  const [mounted, setMounted] = useState(false);
  const [value, setValue] = useState(mode === "taka" ? 500 : 50);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    setValue(mode === "taka" ? 500 : 50);
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !submitting) onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, mode, onClose, submitting]);

  const smsPreview = useMemo(() => {
    if (mode !== "taka") return null;
    const taka = Math.max(0, Math.floor(value) || 0);
    if (taka <= 0 || smsPriceTaka <= 0) return 0;
    return Math.floor(taka / smsPriceTaka);
  }, [mode, value, smsPriceTaka]);

  if (!open || !mounted || !seller) return null;

  const isTaka = mode === "taka";
  const Icon = isTaka ? Wallet : Coins;
  const title = isTaka ? "Recharge (BDT)" : "Add SMS credits";
  const label = isTaka ? "Amount (BDT)" : "SMS credits (count)";

  return createPortal(
    <div className="fixed inset-0 z-[240] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-slate-950/70 backdrop-blur-sm"
        onClick={() => !submitting && onClose()}
      />
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-orange-500/20 bg-slate-900 shadow-2xl ring-1 ring-slate-800">
        <div className="flex items-start justify-between gap-3 border-b border-slate-800 bg-slate-950/80 px-5 py-4">
          <div className="flex items-center gap-3">
            <div
              className={clsx(
                "flex h-10 w-10 items-center justify-center rounded-xl",
                isTaka ? "bg-teal-500/20 text-teal-300" : "bg-orange-500/20 text-orange-300"
              )}
            >
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white">{title}</h2>
              <p className="text-xs text-slate-400">{seller.company}</p>
            </div>
          </div>
          <button
            type="button"
            disabled={submitting}
            onClick={onClose}
            className="rounded-lg border border-slate-700 p-2 text-slate-400 hover:bg-slate-800 disabled:opacity-50"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-5">
          <div className="rounded-xl border border-slate-800 bg-slate-950/50 px-4 py-3 text-sm">
            <p className="font-bold text-white">{seller.company}</p>
            <p className="text-xs text-slate-500">{seller.email}</p>
            <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-400">
              <span>
                Balance:{" "}
                <strong className="text-teal-300">{seller.balance} SMS</strong>
              </span>
              <span>
                Loaded:{" "}
                <strong className="text-white">
                  {formatSmsBdt(seller.walletTaka)}
                </strong>
              </span>
            </p>
          </div>

          <label className="block">
            <span className="mb-1.5 block text-xs font-bold uppercase text-slate-500">
              {label}
            </span>
            <input
              type="number"
              min={1}
              step={isTaka ? 1 : 1}
              value={value}
              onChange={(e) => setValue(Number(e.target.value))}
              className="w-full rounded-xl border border-slate-700 bg-slate-950 px-4 py-2.5 text-sm font-semibold text-white outline-none focus:border-orange-500 focus:ring-2 focus:ring-orange-500/20"
            />
          </label>

          {isTaka ? (
            <p className="text-sm text-slate-400">
              ≈{" "}
              <strong className="text-teal-300">{smsPreview ?? 0} SMS</strong> at BDT{" "}
              {smsPriceTaka}/SMS
            </p>
          ) : null}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              disabled={submitting}
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-700 px-4 py-2.5 text-sm font-bold text-slate-300 hover:bg-slate-800 disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={submitting || !Number.isFinite(value) || value <= 0}
              onClick={() => onSubmit(Math.floor(value))}
              className={clsx(
                "inline-flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white disabled:opacity-50",
                isTaka ? "bg-teal-600 hover:bg-teal-500" : "bg-orange-500 hover:bg-orange-400"
              )}
            >
              {submitting ? <Loader2 className="h-4 w-4 animate-spin" /> : null}
              {isTaka ? "Confirm recharge" : "Add credits"}
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}
