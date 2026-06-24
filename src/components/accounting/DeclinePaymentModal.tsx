"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, X, XCircle } from "lucide-react";
import clsx from "clsx";
import { formatBdt } from "@/lib/accounting-store";
import {
  declineBulkPaymentApprovals,
  PAYMENT_TYPE_LABELS,
  paymentItemKey,
  type PaymentApprovalItem,
  type BulkPaymentApprovalResult,
} from "@/lib/order-payment";

type Props = {
  items: PaymentApprovalItem[];
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
};

export function DeclinePaymentModal({ items, open, onClose, onSaved }: Props) {
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<BulkPaymentApprovalResult | null>(null);

  const total = useMemo(() => items.reduce((sum, item) => sum + item.amount, 0), [items]);
  const done = result !== null;

  useEffect(() => {
    if (!open) return;
    setNote("");
    setResult(null);
    setSaving(false);
  }, [open, items]);

  useEffect(() => {
    if (!open) return;
    document.body.style.overflow = "hidden";
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape" && !saving) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, saving]);

  if (!open || items.length === 0) return null;

  const handleDecline = () => {
    setSaving(true);
    const res = declineBulkPaymentApprovals(items, { note });
    setSaving(false);
    setResult(res);
    if (res.ok > 0) onSaved();
    if (res.failed.length === 0) onClose();
  };

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
    >
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm"
        onClick={() => !saving && onClose()}
      />
      <div
        className="relative flex max-h-[90vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-rose-100 bg-rose-50 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Decline Payments</h2>
            <p className="text-xs text-slate-500">
              {items.length} payment{items.length > 1 ? "s" : ""} · {formatBdt(total)} total
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-2 text-slate-400 hover:bg-white/70 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {!done ? (
            <>
              <p className="mb-3 text-sm text-slate-600">
                Declined payments will be removed from pending approvals and saved in the order
                activity log.
              </p>
              <ul className="max-h-52 space-y-2 overflow-y-auto rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                {items.map((item) => (
                  <li
                    key={paymentItemKey(item)}
                    className="flex items-center justify-between gap-2 text-sm"
                  >
                    <div className="min-w-0">
                      <p className="truncate font-semibold text-slate-800">
                        {item.order.invoiceNumber ?? item.order.id}
                      </p>
                      <p className="text-xs text-slate-500">{PAYMENT_TYPE_LABELS[item.type]}</p>
                    </div>
                    <span className="shrink-0 font-bold text-slate-900">
                      {formatBdt(item.amount)}
                    </span>
                  </li>
                ))}
              </ul>
              <div className="mt-4">
                <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
                  Reason (optional)
                </label>
                <textarea
                  value={note}
                  onChange={(event) => setNote(event.target.value)}
                  rows={3}
                  className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
                  placeholder="Wrong payment, duplicate entry, customer not paid..."
                />
              </div>
              <p className="mt-3 flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
                This action does not delete the order. It only declines this pending payment entry.
              </p>
            </>
          ) : (
            <div className="space-y-3">
              {result!.ok > 0 && (
                <p className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  {result!.ok} payment{result!.ok > 1 ? "s" : ""} declined successfully.
                </p>
              )}
              {result!.failed.length > 0 && (
                <div className="rounded-lg bg-amber-50 px-3 py-2">
                  <p className="flex items-center gap-2 text-sm font-bold text-amber-900">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {result!.failed.length} could not be declined
                  </p>
                  <ul className="mt-2 space-y-1 text-xs text-amber-800">
                    {result!.failed.map((failure) => (
                      <li key={failure.key}>
                        <span className="font-semibold">{failure.label}</span>: {failure.message}
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex gap-2 border-t border-slate-100 p-5">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          >
            {done && result!.failed.length > 0 ? "Close" : "Cancel"}
          </button>
          {!done ? (
            <button
              type="button"
              onClick={handleDecline}
              disabled={saving}
              className={clsx(
                "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white",
                "bg-rose-600 hover:bg-rose-700 disabled:opacity-60"
              )}
            >
              <XCircle className="h-4 w-4" />
              {saving ? "Declining..." : `Decline ${items.length}`}
            </button>
          ) : result!.failed.length > 0 ? (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl bg-[#2563eb] px-4 py-2.5 text-sm font-bold text-white hover:bg-[#1d4ed8]"
            >
              Done
            </button>
          ) : null}
        </div>
      </div>
    </div>
  );
}
