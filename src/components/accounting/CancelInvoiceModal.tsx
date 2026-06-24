"use client";

import { useEffect, useState } from "react";
import { AlertCircle, CheckCircle2, X, XCircle } from "lucide-react";
import clsx from "clsx";
import { formatBdt, invoiceDueBalance, invoiceNetCollected, type AccountingInvoice } from "@/lib/accounting-store";
import { cancelInvoice } from "@/lib/invoice-cancel";

type Props = {
  invoice: AccountingInvoice | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
};

export function CancelInvoiceModal({ invoice, open, onClose, onSaved }: Props) {
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setReason("");
    setError("");
    setSaving(false);
  }, [open, invoice]);

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

  if (!open || !invoice) return null;

  const handleCancel = () => {
    setError("");
    if (!reason.trim()) {
      setError("Cancel reason is required.");
      return;
    }
    setSaving(true);
    const result = cancelInvoice(invoice.id, { reason });
    setSaving(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onSaved();
    onClose();
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
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(event) => event.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-rose-100 bg-rose-50 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Cancel Invoice</h2>
            <p className="text-xs text-slate-500">
              {invoice.invoiceNumber} · {invoice.customerName}
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

        <div className="space-y-4 p-5">
          <div className="grid gap-2 rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">Total</span>
              <span className="font-bold text-slate-900">{formatBdt(invoice.amount)}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">Collected</span>
              <span className="font-bold text-emerald-700">{formatBdt(invoiceNetCollected(invoice))}</span>
            </div>
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">Due</span>
              <span className="font-bold text-amber-700">{formatBdt(invoiceDueBalance(invoice))}</span>
            </div>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold uppercase tracking-wide text-slate-500">
              Cancel Reason <span className="text-rose-600">*</span>
            </label>
            <textarea
              value={reason}
              onChange={(event) => {
                setReason(event.target.value);
                setError("");
              }}
              rows={3}
              className="w-full resize-none rounded-xl border border-slate-200 px-3 py-2 text-sm outline-none focus:border-rose-300 focus:ring-2 focus:ring-rose-100"
              placeholder="Wrong invoice, duplicate invoice, order cancelled..."
            />
          </div>

          <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            This marks the invoice as cancelled and removes it from collected/due totals. It does
            not delete the invoice.
          </p>

          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
              {error}
            </p>
          )}
        </div>

        <div className="flex gap-2 border-t border-slate-100 p-5">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50 disabled:opacity-60"
          >
            Keep Invoice
          </button>
          <button
            type="button"
            onClick={handleCancel}
            disabled={saving || !reason.trim()}
            className={clsx(
              "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white",
              "bg-rose-600 hover:bg-rose-700 disabled:opacity-60"
            )}
          >
            {saving ? (
              <CheckCircle2 className="h-4 w-4" />
            ) : (
              <XCircle className="h-4 w-4" />
            )}
            {saving ? "Cancelling..." : "Cancel Invoice"}
          </button>
        </div>
      </div>
    </div>
  );
}
