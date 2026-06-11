"use client";

import { useEffect, useMemo, useState } from "react";
import { CheckCircle2, Circle, X } from "lucide-react";
import clsx from "clsx";
import { updateInvoiceDeliveryCharge } from "@/lib/order-delivery-expense";
import {
  advanceAmountPending,
  orderAmountDue,
  ORDER_PAYMENT_METHOD_LABELS,
  PAYMENT_TYPE_LABELS,
  recordPaymentApproval,
  type PaymentApprovalItem,
} from "@/lib/order-payment";
import { formatAdvancePaymentSummary } from "@/lib/orders-store";
import { useAccountingData } from "./useAccountingData";
import { inputCls, labelCls } from "./accounting-ui";
import {
  formatBdt,
  getDefaultPaymentReceiveAccountId,
  setDefaultPaymentReceiveAccount,
  type AccountType,
} from "@/lib/accounting-store";

type Props = {
  item: PaymentApprovalItem | null;
  open: boolean;
  onClose: () => void;
  onSaved: (result?: { invoiceId?: string }) => void;
};

function calcReceived(due: number, discount: number): number {
  return Math.max(0, due - Math.max(0, discount));
}

function accountTypeSuffix(type: AccountType): string {
  if (type === "cash") return "Cash";
  if (type === "bank") return "Bank";
  return "Wallet";
}

export function RecordOrderPaymentModal({ item, open, onClose, onSaved }: Props) {
  const { data, refresh } = useAccountingData();
  const accounts = useMemo(() => data.accounts.filter((a) => a.active), [data.accounts]);

  const [accountId, setAccountId] = useState("");
  const [discount, setDiscount] = useState("0");
  const [amount, setAmount] = useState("");
  const [note, setNote] = useState("");
  const [deliveryCharge, setDeliveryCharge] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const order = item?.order;
  const isAdvance = item?.type === "advance";
  const isReturnExpense = item?.type === "return_delivery_expense";
  const isDelivery = item?.type === "delivery";

  useEffect(() => {
    if (!open || !item || !order) return;
    const due = isAdvance
      ? advanceAmountPending(order)
      : isReturnExpense
        ? order.shippingCharge
        : orderAmountDue(order);
    const defaultAccountId = getDefaultPaymentReceiveAccountId();
    setAccountId(
      defaultAccountId && accounts.some((a) => a.id === defaultAccountId)
        ? defaultAccountId
        : ""
    );
    setDiscount("0");
    setAmount(String(due));
    setDeliveryCharge(String(order.shippingCharge ?? 0));
    const advanceNote = formatAdvancePaymentSummary(order.advancePayment);
    setNote(
      isAdvance && advanceNote
        ? advanceNote
        : isReturnExpense
          ? "Returned order delivery charge expense"
          : ""
    );
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
  }, [open, item, order, isAdvance, isReturnExpense, onClose, accounts]);

  if (!open || !item || !order) return null;

  const due = isAdvance
    ? advanceAmountPending(order)
    : isReturnExpense
      ? order.shippingCharge
      : orderAmountDue(order);
  const discountNum = Math.max(0, Number(discount) || 0);
  const amountNum = Number(amount) || 0;
  const deliveryNum = Math.max(0, Number(deliveryCharge) || 0);
  const advancePaid = order.advancePaymentCollectedAmount ?? order.advance ?? 0;
  const grossCollected = advancePaid + amountNum;
  const netInAccount = Math.max(0, grossCollected - deliveryNum);
  const selectedAccountName = accounts.find((a) => a.id === accountId)?.name;

  const handleToggleDefault = (id: string) => {
    const wasDefault = accounts.find((a) => a.id === id)?.defaultPaymentReceive;
    setDefaultPaymentReceiveAccount(id);
    refresh();
    if (!wasDefault) {
      setAccountId(id);
    } else if (accountId === id) {
      setAccountId("");
    }
  };

  const handleDiscountChange = (value: string) => {
    setDiscount(value);
    const d = Math.max(0, Number(value) || 0);
    setAmount(String(calcReceived(due, d)));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (!accountId.trim()) {
      setError("Select Payment is required.");
      return;
    }
    if (isDelivery && deliveryNum > grossCollected + 0.001) {
      setError("Delivery charge cannot exceed total collected (advance + received).");
      return;
    }
    setSaving(true);
    const result = recordPaymentApproval(item, {
      accountId,
      amount: amountNum,
      discount: isAdvance || isReturnExpense ? 0 : discountNum,
      note,
    });
    if (!result.ok) {
      setSaving(false);
      setError(result.message);
      return;
    }
    if (isDelivery && result.invoiceId) {
      const dcResult = updateInvoiceDeliveryCharge(result.invoiceId, deliveryNum);
      if (!dcResult.ok) {
        setSaving(false);
        setError(dcResult.message);
        return;
      }
    }
    setSaving(false);
    onSaved({ invoiceId: result.invoiceId || undefined });
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
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-4 py-3">
          <div>
            <h2 className="text-base font-bold text-slate-900">
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

        <form onSubmit={handleSubmit} className="space-y-3 p-4">
          <div className="rounded-lg border border-slate-100 bg-slate-50/80 px-3 py-2 text-sm">
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
            ) : isReturnExpense ? (
              <>
                <div className="flex justify-between gap-2">
                  <span className="text-slate-500">Order status</span>
                  <span className="font-bold text-rose-700">Returned</span>
                </div>
                <div className="mt-1 flex justify-between gap-2">
                  <span className="text-slate-500">Order total</span>
                  <span className="font-semibold text-slate-700">{formatBdt(order.total)}</span>
                </div>
                <div className="mt-2 flex justify-between gap-2 border-t border-slate-200/80 pt-2">
                  <span className="font-semibold text-slate-700">Delivery charge to expense</span>
                  <span className="font-extrabold text-rose-700">{formatBdt(due)}</span>
                </div>
                <p className="mt-2 text-xs text-slate-500">
                  Approve করলে এটা Expense-এ save হবে।
                </p>
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
                <div className="mt-1.5 flex justify-between gap-2 border-t border-slate-200/80 pt-1.5">
                  <span className="font-semibold text-slate-700">Due on delivery</span>
                  <span className="font-extrabold text-slate-900">{formatBdt(due)}</span>
                </div>
                <p className="mt-1 text-[11px] text-slate-500">
                  {ORDER_PAYMENT_METHOD_LABELS[order.paymentMethod]}
                </p>
              </>
            )}
          </div>

          <div
            className={clsx(
              "grid gap-3",
              !isAdvance && !isReturnExpense && (isDelivery ? "sm:grid-cols-3" : "sm:grid-cols-2")
            )}
          >
            {!isAdvance && !isReturnExpense && (
              <div>
                <label className={labelCls()}>Discount (৳)</label>
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
            <div>
              <label className={labelCls()}>Received (৳)</label>
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
            {isDelivery && (
              <div>
                <label className={labelCls()}>Delivery (৳)</label>
                <input
                  className={inputCls()}
                  type="number"
                  min={0}
                  step="0.01"
                  max={grossCollected}
                  value={deliveryCharge}
                  onChange={(e) => setDeliveryCharge(e.target.value)}
                />
              </div>
            )}
          </div>

          {isDelivery && (
            <p className="text-sm">
              <span className="text-emerald-700">
                Receive in {selectedAccountName ?? "account"}:{" "}
                <span className="font-bold">{formatBdt(amountNum)}</span>
              </span>
              {discountNum > 0 && (
                <span className="text-amber-700">
                  {" "}
                  · Discount −{formatBdt(discountNum)} · Due cleared {formatBdt(amountNum + discountNum)}
                </span>
              )}
              {deliveryNum > 0 && (
                <span className="text-xs text-slate-500">
                  {" "}
                  · Net {formatBdt(netInAccount)} ({formatBdt(grossCollected)} − {formatBdt(deliveryNum)})
                </span>
              )}
            </p>
          )}

          <div>
            <label className={labelCls()}>
              Payment Method / Received In <span className="text-rose-600">*</span>
            </label>
            <p className="mb-2 text-xs text-slate-500">
              {accountId
                ? accounts.find((a) => a.id === accountId)?.name ?? "Selected"
                : "Select Payment — pick account below"}
            </p>
            {accounts.length === 0 ? (
              <p className="rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-500">
                No accounts — add in Chart Of Account
              </p>
            ) : (
              <div className="max-h-32 space-y-1 overflow-y-auto rounded-lg border border-slate-200 p-1.5">
                {accounts.map((a) => {
                  const selected = accountId === a.id;
                  return (
                    <div
                      key={a.id}
                      className={clsx(
                        "flex items-center gap-2 rounded-lg border px-2.5 py-2 transition",
                        selected
                          ? "border-indigo-300 bg-indigo-50"
                          : "border-slate-100 bg-white hover:bg-slate-50"
                      )}
                    >
                      <button
                        type="button"
                        onClick={() => setAccountId(a.id)}
                        className="min-w-0 flex-1 text-left text-sm"
                      >
                        <span className="font-semibold text-slate-800">{a.name}</span>
                        <span className="ml-1.5 text-xs text-slate-500">
                          ({accountTypeSuffix(a.type)})
                        </span>
                      </button>
                      <button
                        type="button"
                        onClick={() => handleToggleDefault(a.id)}
                        title={
                          a.defaultPaymentReceive
                            ? "Default — click to remove"
                            : "Set as default (auto-select next time)"
                        }
                        className="shrink-0 rounded-md p-1 hover:bg-white"
                      >
                        {a.defaultPaymentReceive ? (
                          <CheckCircle2 className="h-5 w-5 text-emerald-600" />
                        ) : (
                          <Circle className="h-5 w-5 text-slate-300" />
                        )}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
            <p className="mt-1 text-[10px] text-slate-400">
              ✓ = default auto-select
            </p>
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
              disabled={saving || accounts.length === 0 || !accountId.trim()}
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
