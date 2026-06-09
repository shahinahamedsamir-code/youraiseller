"use client";

import { useEffect, useMemo, useState } from "react";
import { Banknote, X } from "lucide-react";
import clsx from "clsx";
import {
  CHART_GROUP_LABELS,
  EXPENSE_PAID_FROM_GROUPS,
  formatBdt,
  getChartLiabilityLabel,
  liabilityOutstanding,
  listExpensePaidFromAssets,
  recordLiabilityPayment,
  type AccountingLiability,
} from "@/lib/accounting-store";
import { useAccountingData } from "./useAccountingData";
import { inputCls, labelCls, selectCls } from "./accounting-ui";

type Props = {
  liability: AccountingLiability | null;
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
};

function toInputDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

export function PayLiabilityModal({ liability, open, onClose, onSaved }: Props) {
  const { data } = useAccountingData();
  const paidFromAssets = useMemo(() => listExpensePaidFromAssets(data), [data]);

  const [accountId, setAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(toInputDate(new Date()));
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const outstanding = liability ? liabilityOutstanding(liability) : 0;

  useEffect(() => {
    if (!open || !liability) return;
    setAccountId(
      liability.accountId && paidFromAssets.some((a) => a.accountId === liability.accountId)
        ? liability.accountId
        : paidFromAssets[0]?.accountId ?? ""
    );
    setAmount("");
    setDate(toInputDate(new Date()));
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
  }, [open, liability, onClose, paidFromAssets]);

  if (!open || !liability) return null;

  const amountNum = Math.max(0, Number(amount) || 0);
  const remaining = Math.max(0, outstanding - amountNum);
  const isPartial = amountNum > 0 && amountNum < outstanding - 0.001;
  const isFull = amountNum >= outstanding - 0.001 && outstanding > 0;

  const setQuickAmount = (value: number) => {
    setAmount(String(Math.min(Math.max(0, value), outstanding)));
    setError("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    if (amountNum <= 0) {
      setError("Enter a valid amount");
      return;
    }
    if (amountNum > outstanding + 0.001) {
      setError(`Amount exceeds outstanding ${formatBdt(outstanding)}`);
      return;
    }

    setSaving(true);

    const [y, m, d] = date.split("-").map(Number);
    const displayDate =
      y && m && d
        ? new Date(y, m - 1, d).toLocaleDateString("en-GB", {
            day: "2-digit",
            month: "short",
            year: "numeric",
          })
        : undefined;

    const result = recordLiabilityPayment(liability.id, {
      accountId,
      amount: amountNum,
      note,
      date: displayDate,
    });

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
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-teal-600 text-white">
              <Banknote className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Pay Liability</h2>
              <p className="text-xs text-slate-500">Full or partial payment</p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-slate-400 hover:bg-slate-200/60 hover:text-slate-700"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Creditor</span>
              <span className="font-semibold text-slate-800">{liability.name}</span>
            </div>
            <div className="mt-2 flex justify-between">
              <span className="text-slate-500">Liability Account</span>
              <span className="font-semibold text-slate-800">
                {getChartLiabilityLabel(liability)}
              </span>
            </div>
            <div className="mt-2 flex justify-between">
              <span className="text-slate-500">Outstanding</span>
              <span className="font-bold text-rose-600">{formatBdt(outstanding)}</span>
            </div>
            {liability.paidAmount > 0 && (
              <div className="mt-2 flex justify-between text-xs">
                <span className="text-slate-400">Already paid</span>
                <span className="font-medium text-slate-600">
                  {formatBdt(liability.paidAmount)} of {formatBdt(liability.amount)}
                </span>
              </div>
            )}
          </div>

          <div>
            <label className={labelCls()}>Pay From (Asset)</label>
            {paidFromAssets.length > 0 ? (
              <select
                className={selectCls()}
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                required
              >
                {EXPENSE_PAID_FROM_GROUPS.map((group) => {
                  const items = paidFromAssets.filter((a) => a.group === group);
                  if (items.length === 0) return null;
                  return (
                    <optgroup key={group} label={CHART_GROUP_LABELS[group]}>
                      {items.map((item) => (
                        <option key={item.accountId} value={item.accountId}>
                          {item.chartName}
                        </option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
            ) : (
              <p className="text-sm text-amber-700">No asset accounts available.</p>
            )}
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className={labelCls()}>Payment Amount (৳)</label>
              <span className="text-xs text-slate-400">Partial allowed</span>
            </div>
            <input
              className={inputCls()}
              type="number"
              min={1}
              step={1}
              value={amount}
              onChange={(e) => {
                setAmount(e.target.value);
                setError("");
              }}
              placeholder={`Up to ${outstanding}`}
              required
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setQuickAmount(outstanding)}
                className={clsx(
                  "rounded-lg px-2.5 py-1 text-xs font-bold transition",
                  isFull
                    ? "bg-teal-600 text-white"
                    : "bg-slate-100 text-slate-700 hover:bg-slate-200"
                )}
              >
                Pay Full {formatBdt(outstanding)}
              </button>
              {outstanding > 1 && (
                <button
                  type="button"
                  onClick={() => setQuickAmount(Math.floor(outstanding / 2))}
                  className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-200"
                >
                  Pay Half
                </button>
              )}
            </div>
            {amountNum > 0 && (
              <p className="mt-2 text-xs text-slate-500">
                {isPartial ? (
                  <>
                    Partial payment — remaining after this:{" "}
                    <span className="font-bold text-amber-700">{formatBdt(remaining)}</span>
                  </>
                ) : (
                  <>This will fully clear the outstanding balance.</>
                )}
              </p>
            )}
          </div>

          <div>
            <label className={labelCls()}>Payment Date</label>
            <input
              type="date"
              className={inputCls()}
              value={date}
              onChange={(e) => setDate(e.target.value)}
              required
            />
          </div>

          <div>
            <label className={labelCls()}>Note</label>
            <input
              className={inputCls()}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="Optional"
            />
          </div>

          {error && (
            <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">
              {error}
            </p>
          )}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving || !accountId || paidFromAssets.length === 0 || amountNum <= 0}
              className="flex-1 rounded-xl bg-teal-600 py-2.5 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-60"
            >
              {saving
                ? "Processing…"
                : isPartial
                  ? "Record Partial Payment"
                  : "Record Full Payment"}
            </button>
            <button
              type="button"
              onClick={onClose}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              Close
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
