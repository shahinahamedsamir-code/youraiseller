"use client";

import { useEffect } from "react";
import { Ban, X } from "lucide-react";
import { formatBdt, type AccountingLiability } from "@/lib/accounting-store";

type Props = {
  liability: AccountingLiability | null;
  open: boolean;
  onClose: () => void;
  onConfirm: () => void;
  saving?: boolean;
  error?: string;
};

export function CancelLiabilityModal({
  liability,
  open,
  onClose,
  onConfirm,
  saving = false,
  error,
}: Props) {
  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  if (!open || !liability) return null;

  const paymentCount = liability.payments?.length ?? 0;

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm"
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-rose-100 text-rose-600">
              <Ban className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Cancel Liability</h2>
              <p className="text-xs text-slate-500">{liability.name}</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-200/60"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 p-5">
          <p className="text-sm text-slate-600">
            Cancel <span className="font-bold text-slate-800">{liability.name}</span> (
            {formatBdt(liability.amount)})? This will:
          </p>
          <ul className="list-inside list-disc space-y-1 text-sm text-slate-600">
            <li>Mark the liability as cancelled</li>
            {liability.incomeId && <li>Reverse the loan receipt from your account</li>}
            {paymentCount > 0 && (
              <li>Reverse {paymentCount} payment record{paymentCount > 1 ? "s" : ""}</li>
            )}
          </ul>
          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
              {error}
            </p>
          )}
          <div className="flex gap-2 pt-1">
            <button
              type="button"
              disabled={saving}
              onClick={onConfirm}
              className="flex-1 rounded-xl bg-rose-600 py-2.5 text-sm font-bold text-white hover:bg-rose-700 disabled:opacity-60"
            >
              {saving ? "Cancelling…" : "Yes, Cancel Liability"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Keep
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
