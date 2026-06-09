"use client";

import { useEffect, useMemo, useState } from "react";
import { AlertCircle, CheckCircle2, X } from "lucide-react";
import clsx from "clsx";
import { formatBdt } from "@/lib/accounting-store";
import {
  defaultAccountIdForPaymentItem,
  PAYMENT_TYPE_LABELS,
  paymentItemKey,
  recordBulkPaymentApprovals,
  type PaymentApprovalItem,
} from "@/lib/order-payment";
import { useAccountingData } from "./useAccountingData";

type Props = {
  items: PaymentApprovalItem[];
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
};

export function BulkApprovePaymentModal({ items, open, onClose, onSaved }: Props) {
  const { data } = useAccountingData();
  const accounts = useMemo(() => data.accounts.filter((a) => a.active), [data.accounts]);
  const [saving, setSaving] = useState(false);
  const [result, setResult] = useState<ReturnType<typeof recordBulkPaymentApprovals> | null>(
    null
  );

  const total = useMemo(() => items.reduce((s, i) => s + i.amount, 0), [items]);

  useEffect(() => {
    if (!open) return;
    setResult(null);
    setSaving(false);
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !saving) onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose, saving]);

  if (!open || items.length === 0) return null;

  const accountName = (item: PaymentApprovalItem) => {
    const id = defaultAccountIdForPaymentItem(item) ?? accounts[0]?.id;
    return accounts.find((a) => a.id === id)?.name ?? "—";
  };

  const handleApprove = () => {
    if (accounts.length === 0) return;
    setSaving(true);
    const res = recordBulkPaymentApprovals(items);
    setSaving(false);
    setResult(res);
    if (res.ok > 0) onSaved();
    if (res.failed.length === 0) onClose();
  };

  const done = result !== null;

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
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Bulk Approve Payments</h2>
            <p className="text-xs text-slate-500">
              {items.length} payment{items.length > 1 ? "s" : ""} · {formatBdt(total)} total
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            disabled={saving}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-200/60 disabled:opacity-50"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {!done ? (
            <>
              <p className="mb-3 text-sm text-slate-600">
                Each payment will be approved at full pending amount and saved to the matching
                account (bKash, cash, bank, etc.) based on how the customer paid.
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
                      <p className="text-xs text-slate-500">
                        {PAYMENT_TYPE_LABELS[item.type]} → {accountName(item)}
                      </p>
                    </div>
                    <span className="shrink-0 font-bold text-slate-900">
                      {formatBdt(item.amount)}
                    </span>
                  </li>
                ))}
              </ul>
              {accounts.length === 0 && (
                <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
                  Add at least one active account in Chart Of Account first.
                </p>
              )}
            </>
          ) : (
            <div className="space-y-3">
              {result!.ok > 0 && (
                <p className="flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm font-medium text-emerald-800">
                  <CheckCircle2 className="h-4 w-4 shrink-0" />
                  {result!.ok} payment{result!.ok > 1 ? "s" : ""} approved successfully.
                </p>
              )}
              {result!.failed.length > 0 && (
                <div className="rounded-lg bg-amber-50 px-3 py-2">
                  <p className="flex items-center gap-2 text-sm font-bold text-amber-900">
                    <AlertCircle className="h-4 w-4 shrink-0" />
                    {result!.failed.length} could not be approved
                  </p>
                  <ul className="mt-2 space-y-1 text-xs text-amber-800">
                    {result!.failed.map((f) => (
                      <li key={f.key}>
                        <span className="font-semibold">{f.label}</span>: {f.message}
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
              onClick={handleApprove}
              disabled={saving || accounts.length === 0}
              className={clsx(
                "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white",
                "bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60"
              )}
            >
              <CheckCircle2 className="h-4 w-4" />
              {saving ? "Approving..." : `Approve ${items.length}`}
            </button>
          ) : result!.failed.length > 0 ? (
            <button
              type="button"
              onClick={() => {
                onClose();
              }}
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
