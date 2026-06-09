"use client";

import { useEffect, useMemo, useState } from "react";
import { Download, Printer, Wallet, X } from "lucide-react";
import clsx from "clsx";
import {
  formatBdt,
  getInvoiceById,
  INVOICE_STATUS_LABELS,
  invoiceDueBalance,
  type AccountingInvoice,
} from "@/lib/accounting-store";
import { canPayInvoiceDue } from "@/lib/order-payment";
import {
  invoicePaymentSummary,
  openSmartInvoicePrint,
  renderSmartInvoicePreviewHtml,
} from "@/lib/order-invoice";
import { PayInvoiceDueModal } from "./PayInvoiceDueModal";

type Props = {
  invoice: AccountingInvoice | null;
  open: boolean;
  onClose: () => void;
  onUpdated?: () => void;
};

export function SmartInvoiceModal({ invoice, open, onClose, onUpdated }: Props) {
  const [liveInvoice, setLiveInvoice] = useState<AccountingInvoice | null>(invoice);
  const [payDueOpen, setPayDueOpen] = useState(false);

  useEffect(() => {
    if (invoice) {
      setLiveInvoice(getInvoiceById(invoice.id) ?? invoice);
    } else {
      setLiveInvoice(null);
    }
  }, [invoice, open]);

  const previewHtml = useMemo(() => {
    if (!liveInvoice) return null;
    return renderSmartInvoicePreviewHtml(liveInvoice.orderId);
  }, [liveInvoice]);

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

  if (!open || !liveInvoice) return null;

  const due = invoiceDueBalance(liveInvoice);
  const canPay = canPayInvoiceDue(liveInvoice.id);
  const payments = liveInvoice.payments ?? [];

  const handlePrint = () => {
    openSmartInvoicePrint(liveInvoice.orderId);
  };

  const handleDownload = () => {
    const html = renderSmartInvoicePreviewHtml(liveInvoice.orderId);
    if (!html) return;
    const blob = new Blob([html], { type: "text/html;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${liveInvoice.invoiceNumber}.html`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const refreshInvoice = () => {
    const fresh = getInvoiceById(liveInvoice.id);
    if (fresh) setLiveInvoice(fresh);
    onUpdated?.();
  };

  return (
    <>
      <div
        className="fixed inset-0 z-[130] flex items-center justify-center p-3 sm:p-6"
        role="dialog"
        aria-modal="true"
      >
        <button
          type="button"
          aria-label="Close"
          className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
          onClick={onClose}
        />
        <div
          className="relative flex h-[92vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-b border-slate-100 bg-slate-50 px-4 py-3 sm:px-5">
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h2 className="text-lg font-bold text-slate-900">Smart Invoice</h2>
                <span
                  className={clsx(
                    "inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold",
                    liveInvoice.status === "paid"
                      ? "bg-emerald-100 text-emerald-700"
                      : liveInvoice.status === "partial"
                        ? "bg-amber-100 text-amber-800"
                        : "bg-slate-100 text-slate-600"
                  )}
                >
                  {INVOICE_STATUS_LABELS[liveInvoice.status]}
                </span>
              </div>
              <p className="text-xs text-slate-500">
                {liveInvoice.invoiceNumber} · {liveInvoice.customerName}
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              {due > 0 && canPay.ok && (
                <button
                  type="button"
                  onClick={() => setPayDueOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-3 py-2 text-xs font-bold text-white hover:bg-amber-600"
                >
                  <Wallet className="h-4 w-4" />
                  Pay Due {formatBdt(due)}
                </button>
              )}
              <button
                type="button"
                onClick={handleDownload}
                className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
              >
                <Download className="h-4 w-4" />
                Download
              </button>
              <button
                type="button"
                onClick={handlePrint}
                className="inline-flex items-center gap-1.5 rounded-lg bg-[#2563eb] px-3 py-2 text-xs font-bold text-white hover:bg-[#1d4ed8]"
              >
                <Printer className="h-4 w-4" />
                Print
              </button>
              <button
                type="button"
                onClick={onClose}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-200/60"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </div>

          <div className="shrink-0 border-b border-slate-100 bg-white px-4 py-3 sm:px-5">
            <div className="flex flex-wrap gap-4 text-sm">
              <div>
                <p className="text-xs text-slate-500">Order total</p>
                <p className="font-bold text-slate-900">{formatBdt(liveInvoice.amount)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Collected</p>
                <p className="font-bold text-emerald-700">{formatBdt(liveInvoice.paidAmount)}</p>
              </div>
              <div>
                <p className="text-xs text-slate-500">Due remaining</p>
                <p className={clsx("font-bold", due > 0 ? "text-amber-700" : "text-emerald-700")}>
                  {formatBdt(due)}
                </p>
              </div>
            </div>

            {payments.length > 0 && (
              <div className="mt-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3">
                <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                  Payment history
                </p>
                <ul className="mt-2 space-y-1.5">
                  {payments.map((p, i) => (
                    <li
                      key={i}
                      className="flex flex-wrap items-center justify-between gap-2 text-xs text-slate-700"
                    >
                      <span>
                        <span
                          className={clsx(
                            "mr-1.5 inline-flex rounded px-1.5 py-0.5 font-bold",
                            p.type === "advance"
                              ? "bg-violet-100 text-violet-700"
                              : "bg-sky-100 text-sky-700"
                          )}
                        >
                          {p.type === "advance" ? "Advance" : "Due"}
                        </span>
                        {p.methodLabel} · {p.date}
                        {p.discount ? ` · Disc −${formatBdt(p.discount)}` : ""}
                      </span>
                      <span className="font-bold text-slate-900">{formatBdt(p.amount)}</span>
                    </li>
                  ))}
                </ul>
                {due > 0 && (
                  <p className="mt-2 border-t border-slate-200/80 pt-2 text-xs text-slate-500">
                    {invoicePaymentSummary(liveInvoice)}
                  </p>
                )}
              </div>
            )}

            {due > 0 && !canPay.ok && (
              <p className="mt-2 text-xs text-amber-700">{canPay.message}</p>
            )}
          </div>

          <div className="min-h-0 flex-1 bg-slate-100 p-3 sm:p-4">
            {previewHtml ? (
              <iframe
                title={`Invoice ${liveInvoice.invoiceNumber}`}
                srcDoc={previewHtml}
                className="h-full w-full rounded-xl border border-slate-200 bg-white shadow-inner"
              />
            ) : (
              <div className="flex h-full items-center justify-center text-sm text-slate-500">
                Could not load invoice preview.
              </div>
            )}
          </div>
        </div>
      </div>

      <PayInvoiceDueModal
        invoice={liveInvoice}
        open={payDueOpen}
        onClose={() => setPayDueOpen(false)}
        onSaved={() => {
          refreshInvoice();
          setPayDueOpen(false);
        }}
      />
    </>
  );
}
