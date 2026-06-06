"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X, XCircle } from "lucide-react";
import clsx from "clsx";
import type { Order } from "@/lib/orders-store";
import {
  CANCEL_REASON_OPTIONS,
  CANCEL_STOCK_OPTIONS,
  cancelApprovedOrder,
  isValidCancelReason,
  orderHadStockReserved,
  type CancelStockHandling,
} from "@/lib/order-cancel";

type Props = {
  order: Order;
  open: boolean;
  onClose: () => void;
  onDone: () => void;
};

export function CancelOrderModal({ order, open, onClose, onDone }: Props) {
  const [reason, setReason] = useState("");
  const [note, setNote] = useState("");
  const [stockHandling, setStockHandling] =
    useState<CancelStockHandling>("automatic");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (open) {
      setReason("");
      setNote("");
      setStockHandling("automatic");
      setError("");
    }
  }, [open, order.id]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose, saving]);

  if (!open) return null;

  const stockWasReserved = orderHadStockReserved(order);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!isValidCancelReason(reason)) {
      setError("Select a cancel reason.");
      return;
    }
    setSaving(true);
    setError("");
    const result = cancelApprovedOrder({
      orderId: order.id,
      reason,
      note,
      stockHandling,
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onDone();
    onClose();
  };

  const modal = (
    <div className="fixed inset-0 z-[110] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-slate-900/40"
        aria-label="Close"
        onClick={() => !saving && onClose()}
      />
      <form
        onSubmit={handleSubmit}
        className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-bold text-slate-900">
              <XCircle className="h-5 w-5 text-rose-600" />
              Cancel Order
            </h2>
            <p className="mt-1 text-sm text-slate-600">
              Cancel order with invoice{" "}
              <strong className="text-slate-900">{order.id}</strong> and mobile
              number <strong className="text-slate-900">{order.phone}</strong>
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-100"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="space-y-4 px-5 py-4">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">
              Cancel Reason <span className="text-rose-600">*</span>
            </label>
            <select
              value={reason}
              required
              onChange={(e) => {
                setReason(e.target.value);
                setError("");
              }}
              className={clsx(
                "w-full rounded-xl border px-3 py-2.5 text-sm outline-none focus:ring-2",
                !isValidCancelReason(reason)
                  ? "border-slate-200 focus:border-indigo-400 focus:ring-indigo-100"
                  : "border-indigo-300 focus:border-indigo-400 focus:ring-indigo-100"
              )}
            >
              <option value="" disabled>
                Select cancel reason…
              </option>
              {CANCEL_REASON_OPTIONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">
              Note (optional)
            </label>
            <textarea
              value={note}
              onChange={(e) => setNote(e.target.value)}
              rows={3}
              placeholder="Add any additional notes..."
              className="w-full resize-y rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-bold text-slate-600">
              Stock handling (optional)
            </label>
            <select
              value={stockHandling}
              onChange={(e) =>
                setStockHandling(e.target.value as CancelStockHandling)
              }
              className="w-full rounded-xl border border-slate-200 px-3 py-2.5 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            >
              {CANCEL_STOCK_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
            <p className="mt-1.5 text-[11px] text-slate-500">
              {CANCEL_STOCK_OPTIONS.find((o) => o.value === stockHandling)?.hint}
              {stockHandling === "automatic" && (
                <>
                  {" "}
                  {stockWasReserved
                    ? "· Stock was reserved — will restock on submit."
                    : "· Pending only — stock usually not deducted yet."}
                </>
              )}
            </p>
          </div>

          {order.items.length > 0 && (
            <div className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-2.5 text-xs text-slate-600">
              <p className="font-bold text-slate-700">Products in this order</p>
              <ul className="mt-1 max-h-24 space-y-0.5 overflow-y-auto">
                {order.items.map((line) => (
                  <li key={line.productId}>
                    {line.qty}× {line.productName}{" "}
                    <span className="text-slate-400">({line.productCode})</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}
        </div>

        <div className="flex gap-2 border-t border-slate-100 px-5 py-4">
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Close
          </button>
          <button
            type="submit"
            disabled={saving || !isValidCancelReason(reason)}
            className={clsx(
              "flex-1 rounded-xl py-2.5 text-sm font-bold text-white shadow-md",
              "bg-rose-600 hover:bg-rose-700 disabled:opacity-60"
            )}
          >
            {saving ? "Cancelling…" : "Submit"}
          </button>
        </div>
      </form>
    </div>
  );

  return createPortal(modal, document.body);
}
