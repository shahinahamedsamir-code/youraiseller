"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import clsx from "clsx";
import {
  formatBdt,
  getInvoiceById,
  invoiceDueBalance,
  type AccountingInvoice,
} from "@/lib/accounting-store";
import { getOrder } from "@/lib/orders-store";
import { orderAmountDue, recordInvoiceDuePayment } from "@/lib/order-payment";
import { useAccountingData } from "./useAccountingData";
import { inputCls, labelCls, selectCls } from "./accounting-ui";

type Props = {
  invoice: AccountingInvoice | null;
  open: boolean;
  onClose: () => void;
  onSaved: (result: { invoiceId: string }) => void;
};

function calcReceived(due: number, discount: number): number {
  return Math.max(0, due - Math.max(0, discount));
}

export function PayInvoiceDueModal({ invoice, open, onClose, onSaved }: Props) {
  const { data } = useAccountingData();
  const accounts = useMemo(() => data.accounts.filter((a) => a.active), [data.accounts]);

  const [accountId, setAccountId] = useState("");
  const [discount, setDiscount] = useState("0");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const order = invoice ? getOrder(invoice.orderId) : undefined;
  const due = invoice ? Math.min(invoiceDueBalance(invoice), order ? orderAmountDue(order) : invoiceDueBalance(invoice)) : 0;

  useEffect(() => {
    if (!open || !invoice) return;
    setAccountId(accounts[0]?.id ?? "");
    setDiscount("0");
    setAmount(String(due));
    setNote("");
    setError("");
    setSaving(false);
    document.body.style.overflow = "hidden";
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.body.style.overflow = "";
      document.removeEventListener("keydown", onKey);
    };
  }, [open, invoice, due, onClose, accounts]);

  if (!open || !invoice || !order) return null;

  const discountNum = Math.max(0, Number(discount) || 0);
  const amountNum = Number(amount) || 0;
  const receivedAfterDiscount = calcReceived(due, discountNum);
  const advancePaid = invoice.advanceAmount ?? order.advancePaymentCollectedAmount ?? order.advance ?? 0;

  const handleDiscountChange = (value: string) => {
    setDiscount(value);
    const d = Math.max(0, Number(value) || 0);
    setAmount(String(calcReceived(due, d)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    const result = recordInvoiceDuePayment(invoice.id, {
      accountId,
      amount: amountNum,
      discount: discountNum,
      note,
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onSaved({ invoiceId: getInvoiceById(invoice.id)?.id ?? invoice.id });
    onClose();
  };

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
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">Pay Due Balance</h2>
            <p className="text-xs text-slate-500">
              {invoice.invoiceNumber} · {invoice.customerName}
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-200/60"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 p-5">
          <div className="rounded-xl border border-slate-100 bg-slate-50/80 p-3 text-sm">
            <div className="flex justify-between gap-2">
              <span className="text-slate-500">Order total</span>
              <span className="font-bold text-slate-800">{formatBdt(invoice.amount)}</span>
            </div>
            {advancePaid > 0 && (
              <div className="mt-1 flex justify-between gap-2">
                <span className="text-slate-500">Advance paid</span>
                <span className="font-semibold text-emerald-700">−{formatBdt(advancePaid)}</span>
              </div>
            )}
            <div className="mt-2 flex justify-between gap-2 border-t border-slate-200/80 pt-2">
              <span className="font-semibold text-slate-700">Due to collect</span>
              <span className="font-extrabold text-amber-700">{formatBdt(due)}</span>
            </div>
          </div>

          {(invoice.payments ?? []).length > 0 && (
            <div className="rounded-xl border border-violet-100 bg-violet-50/50 p-3">
              <p className="text-xs font-bold uppercase tracking-wide text-violet-700">
                Payment history
              </p>
              <ul className="mt-2 space-y-1.5">
                {(invoice.payments ?? []).map((p, i) => (
                  <li key={i} className="flex justify-between gap-2 text-xs text-slate-700">
                    <span>
                      {p.type === "advance" ? "Advance" : "Due payment"} · {p.methodLabel} ·{" "}
                      {p.date}
                    </span>
                    <span className="font-bold text-slate-900">{formatBdt(p.amount)}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls()}>Discount (৳) — optional</label>
              <input
                className={inputCls()}
                type="number"
                min={0}
                max={due}
                step="0.01"
                value={discount}
                onChange={(e) => handleDiscountChange(e.target.value)}
                placeholder="0"
              />
            </div>
            <div>
              <label className={labelCls()}>Received Amount (৳)</label>
              <input
                className={inputCls()}
                type="number"
                min={0}
                max={due}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                required
              />
            </div>
          </div>

          {discountNum > 0 && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
              Due {formatBdt(due)} − Discount {formatBdt(discountNum)} = Receive{" "}
              <span className="font-bold">{formatBdt(receivedAfterDiscount)}</span>
            </p>
          )}

          <div>
            <label className={labelCls()}>Payment Method / Received In</label>
            <select
              className={selectCls()}
              value={accountId}
              onChange={(e) => setAccountId(e.target.value)}
              required
            >
              {accounts.length === 0 && <option value="">No accounts — add in Chart Of Account</option>}
              {accounts.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                  {a.type === "cash" ? " (Cash)" : a.type === "bank" ? " (Bank)" : " (Wallet)"}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className={labelCls()}>Note (optional)</label>
            <input
              className={inputCls()}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Transaction ID, reference, etc."
            />
          </div>

          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-600 hover:bg-slate-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || accounts.length === 0}
              className={clsx(
                "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white",
                "bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60"
              )}
            >
              <CheckCircle2 className="h-4 w-4" />
              {saving ? "Saving..." : "Record Due Payment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
