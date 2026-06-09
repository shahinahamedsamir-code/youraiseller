"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, X } from "lucide-react";
import clsx from "clsx";
import {
  defaultAccountIdForPaymentItem,
  advanceAmountPending,
  orderAmountDue,
  ORDER_PAYMENT_METHOD_LABELS,
  PAYMENT_TYPE_LABELS,
  recordPaymentApproval,
  type PaymentApprovalItem,
} from "@/lib/order-payment";
import { formatAdvancePaymentSummary } from "@/lib/orders-store";
import { useAccountingData } from "./useAccountingData";
import { inputCls, labelCls, selectCls } from "./accounting-ui";
import { formatBdt } from "@/lib/accounting-store";

type Props = {
  item: PaymentApprovalItem | null;
  open: boolean;
  onClose: () => void;
  onSaved: (result?: { invoiceId: string }) => void;
};

function calcReceived(due: number, discount: number): number {
  return Math.max(0, due - Math.max(0, discount));
}

export function RecordOrderPaymentModal({ item, open, onClose, onSaved }: Props) {
  const { data } = useAccountingData();
  const accounts = useMemo(() => data.accounts.filter((a) => a.active), [data.accounts]);

  const [accountId, setAccountId] = useState("");
  const [discount, setDiscount] = useState("0");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const order = item?.order;
  const isAdvance = item?.type === "advance";

  useEffect(() => {
    if (!open || !item || !order) return;
    const due = isAdvance ? advanceAmountPending(order) : orderAmountDue(order);
    setAccountId(defaultAccountIdForPaymentItem(item) ?? accounts[0]?.id ?? "");
    setDiscount("0");
    setAmount(String(due));
    const advanceNote = formatAdvancePaymentSummary(order.advancePayment);
    setNote(isAdvance && advanceNote ? advanceNote : "");
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
  }, [open, item, order, isAdvance, onClose, accounts]);

  if (!open || !item || !order) return null;

  const due = isAdvance ? advanceAmountPending(order) : orderAmountDue(order);
  const discountNum = Math.max(0, Number(discount) || 0);
  const amountNum = Number(amount) || 0;
  const receivedAfterDiscount = calcReceived(due, discountNum);

  const handleDiscountChange = (value: string) => {
    setDiscount(value);
    const d = Math.max(0, Number(value) || 0);
    setAmount(String(calcReceived(due, d)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    const result = recordPaymentApproval(item, {
      accountId,
      amount: amountNum,
      discount: isAdvance ? 0 : discountNum,
      note,
    });
    setSaving(false);
    if (!result.ok) {
      setError(result.message);
      return;
    }
    onSaved({ invoiceId: result.invoiceId });
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
        onClick={onClose}
      />
      <div
        className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4">
          <div>
            <h2 className="text-lg font-bold text-slate-900">
              Approve {PAYMENT_TYPE_LABELS[item.type]}
            </h2>
            <p className="text-xs text-slate-500">
              {order.invoiceNumber ?? order.id} · {order.customerName}
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
            {isAdvance ? (
              <>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Grand total</span>
                  <span className="font-bold text-slate-800">{formatBdt(order.total)}</span>
                </div>
                <div className="mt-2 flex justify-between gap-2 border-t border-slate-200/80 pt-2">
                  <span className="font-semibold text-slate-700">Advance to approve</span>
                  <span className="font-extrabold text-amber-700">{formatBdt(due)}</span>
                </div>
                {order.advancePayment && (
                  <p className="mt-2 text-xs text-slate-500">
                    Customer paid via: {formatAdvancePaymentSummary(order.advancePayment)}
                  </p>
                )}
              </>
            ) : (
              <>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Order total</span>
                  <span className="font-bold text-slate-800">{formatBdt(order.total)}</span>
                </div>
                {(order.advancePaymentCollectedAmount ?? order.advance ?? 0) > 0 && (
                  <div className="mt-1 flex justify-between gap-2">
                    <span className="text-slate-500">Advance paid</span>
                    <span className="font-semibold text-emerald-700">
                      −{formatBdt(order.advancePaymentCollectedAmount ?? order.advance ?? 0)}
                    </span>
                  </div>
                )}
                <div className="mt-2 flex justify-between gap-2 border-t border-slate-200/80 pt-2">
                  <span className="font-semibold text-slate-700">Due on delivery</span>
                  <span className="font-extrabold text-slate-900">{formatBdt(due)}</span>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Order payment: {ORDER_PAYMENT_METHOD_LABELS[order.paymentMethod]}
                </p>
              </>
            )}
          </div>

          <div className={clsx("grid gap-4", !isAdvance && "sm:grid-cols-2")}>
            {!isAdvance && (
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
            )}
            <div className={isAdvance ? "" : ""}>
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

          {!isAdvance && discountNum > 0 && (
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
              {saving ? "Saving..." : "Approve & Save"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
