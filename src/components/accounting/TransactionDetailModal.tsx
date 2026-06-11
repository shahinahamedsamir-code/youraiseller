"use client";

import { useEffect } from "react";
import clsx from "clsx";
import { X } from "lucide-react";
import { formatBdt } from "@/lib/accounting-store";
import {
  LEDGER_KIND_LABELS,
  ledgerKindSummary,
  type LedgerTransaction,
} from "@/lib/accounting-transactions";

type Props = {
  txn: LedgerTransaction | null;
  open: boolean;
  onClose: () => void;
};

export function TransactionDetailModal({ txn, open, onClose }: Props) {
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

  if (!open || !txn) return null;

  const rows: { label: string; value: string }[] = [
    { label: "Transaction No.", value: txn.txnNumber },
    { label: "Type", value: LEDGER_KIND_LABELS[txn.kind] },
    { label: "Date", value: txn.time ? `${txn.date} · ${txn.time}` : txn.date },
    { label: "Received (cash)", value: formatBdt(txn.amount) },
    { label: "Account", value: txn.accountLabel },
    {
      label: "Recorded by",
      value: `${txn.recordedByName} (${txn.recordedByRoleLabel})`,
    },
  ];

  if ((txn.discountAmount ?? 0) > 0) {
    rows.push({ label: "Discount", value: `−${formatBdt(txn.discountAmount!)}` });
    rows.push({
      label: "Due cleared",
      value: formatBdt(txn.amount + txn.discountAmount!),
    });
  }
  if (txn.counterpartyLabel) rows.push({ label: "Party", value: txn.counterpartyLabel });
  if (txn.customerName) rows.push({ label: "Customer", value: txn.customerName });
  if (txn.customerPhone) rows.push({ label: "Phone", value: txn.customerPhone });
  if (txn.orderRef) rows.push({ label: "Order", value: txn.orderRef });
  if (txn.invoiceRef) rows.push({ label: "Invoice", value: txn.invoiceRef });
  if (txn.methodLabel) rows.push({ label: "Payment method", value: txn.methodLabel });
  if (txn.reference) rows.push({ label: "Reference", value: txn.reference });
  if (txn.liabilityRef) rows.push({ label: "Liability", value: txn.liabilityRef });
  if (txn.assetRef) rows.push({ label: "Asset", value: txn.assetRef });
  if (txn.status) rows.push({ label: "Status", value: txn.status });
  if (txn.note) rows.push({ label: "Note", value: txn.note });

  return (
    <div
      className="fixed inset-0 z-[125] flex items-center justify-center p-4"
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
          <div>
            <h2 className="text-lg font-bold text-slate-900">Transaction Details</h2>
            <p className="text-xs text-slate-500">{txn.txnNumber}</p>
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
          <div
            className={clsx(
              "rounded-xl px-4 py-3 text-sm font-medium",
              txn.direction === "in"
                ? "bg-emerald-50 text-emerald-800"
                : txn.direction === "out"
                  ? "bg-rose-50 text-rose-800"
                  : "bg-indigo-50 text-indigo-800"
            )}
          >
            {ledgerKindSummary(txn.kind, txn)}
          </div>

          <div className="space-y-2">
            {rows.map((row) => (
              <div
                key={row.label}
                className="flex justify-between gap-3 border-b border-slate-50 py-2 text-sm"
              >
                <span className="text-slate-500">{row.label}</span>
                <span className="max-w-[60%] text-right font-semibold text-slate-800">
                  {row.value}
                </span>
              </div>
            ))}
          </div>

          <p className="text-xs text-slate-400">
            {txn.direction === "in"
              ? "Money received into your account."
              : txn.direction === "out"
                ? "Money paid out from your account."
                : "Internal move — not counted as profit or loss."}
          </p>
        </div>
      </div>
    </div>
  );
}
