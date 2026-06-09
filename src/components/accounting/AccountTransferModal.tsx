"use client";

import { useEffect, useMemo, useState } from "react";
import { ArrowRightLeft, X } from "lucide-react";
import clsx from "clsx";
import {
  ACCOUNT_TYPE_LABELS,
  formatBdt,
  getAccountBalance,
  recordAccountTransfer,
  resolveAccountSectionType,
  type AccountingAccount,
} from "@/lib/accounting-store";
import { useAccountingData } from "./useAccountingData";
import { inputCls, labelCls, selectCls } from "./accounting-ui";

type Props = {
  open: boolean;
  onClose: () => void;
  onSaved: () => void;
  defaultFromAccountId?: string;
  defaultToAccountId?: string;
};

function accountOptionLabel(a: AccountingAccount): string {
  const section = resolveAccountSectionType(a);
  return `${a.name} (${ACCOUNT_TYPE_LABELS[section]}) · ${formatBdt(getAccountBalance(a.id))}`;
}

export function AccountTransferModal({
  open,
  onClose,
  onSaved,
  defaultFromAccountId,
  defaultToAccountId,
}: Props) {
  const { data } = useAccountingData();
  const accounts = useMemo(
    () => data.accounts.filter((a) => a.active).sort((a, b) => a.name.localeCompare(b.name)),
    [data.accounts]
  );

  const [fromAccountId, setFromAccountId] = useState("");
  const [toAccountId, setToAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [fee, setFee] = useState("0");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) return;
    setFromAccountId(defaultFromAccountId ?? accounts[0]?.id ?? "");
    setToAccountId(
      defaultToAccountId ??
        accounts.find((a) => a.id !== (defaultFromAccountId ?? accounts[0]?.id))?.id ??
        ""
    );
    setAmount("");
    setFee("0");
    setReference("");
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
  }, [open, defaultFromAccountId, defaultToAccountId, accounts, onClose]);

  if (!open) return null;

  const fromBalance = fromAccountId ? getAccountBalance(fromAccountId) : 0;
  const amountNum = Number(amount) || 0;
  const feeNum = Math.max(0, Number(fee) || 0);
  const totalDebit = amountNum + feeNum;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSaving(true);
    const result = recordAccountTransfer({
      fromAccountId,
      toAccountId,
      amount: amountNum,
      fee: feeNum,
      reference,
      note,
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
            <h2 className="text-lg font-bold text-slate-900">Account Transfer</h2>
            <p className="text-xs text-slate-500">
              Move money between bKash, bank, cash &amp; other accounts
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
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls()}>From account</label>
              <select
                className={selectCls()}
                value={fromAccountId}
                onChange={(e) => setFromAccountId(e.target.value)}
                required
              >
                {accounts.length === 0 && <option value="">No accounts</option>}
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>
                    {accountOptionLabel(a)}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls()}>To account</label>
              <select
                className={selectCls()}
                value={toAccountId}
                onChange={(e) => setToAccountId(e.target.value)}
                required
              >
                {accounts.length === 0 && <option value="">No accounts</option>}
                {accounts
                  .filter((a) => a.id !== fromAccountId)
                  .map((a) => (
                    <option key={a.id} value={a.id}>
                      {accountOptionLabel(a)}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          {fromAccountId && (
            <p className="rounded-lg bg-indigo-50 px-3 py-2 text-xs font-medium text-indigo-800">
              Available in source account:{" "}
              <span className="font-bold">{formatBdt(fromBalance)}</span>
            </p>
          )}

          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls()}>Transfer amount (৳)</label>
              <input
                className={inputCls()}
                type="number"
                min={0}
                step="0.01"
                value={amount}
                onChange={(e) => setAmount(e.target.value)}
                placeholder="e.g. 5000"
                required
              />
            </div>
            <div>
              <label className={labelCls()}>Fee (৳) — optional</label>
              <input
                className={inputCls()}
                type="number"
                min={0}
                step="0.01"
                value={fee}
                onChange={(e) => setFee(e.target.value)}
                placeholder="0"
              />
            </div>
          </div>

          {feeNum > 0 && amountNum > 0 && (
            <p className="rounded-lg bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800">
              Source will be debited {formatBdt(totalDebit)} (transfer {formatBdt(amountNum)} + fee{" "}
              {formatBdt(feeNum)})
            </p>
          )}

          <div>
            <label className={labelCls()}>Reference (optional)</label>
            <input
              className={inputCls()}
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Trx ID, bank ref, etc."
            />
          </div>

          <div>
            <label className={labelCls()}>Note (optional)</label>
            <input
              className={inputCls()}
              value={note}
              onChange={(e) => setNote(e.target.value)}
              placeholder="e.g. Daily bKash cash-out to bank"
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
              disabled={saving || accounts.length < 2}
              className={clsx(
                "flex flex-1 items-center justify-center gap-2 rounded-xl px-4 py-2.5 text-sm font-bold text-white",
                "bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60"
              )}
            >
              <ArrowRightLeft className="h-4 w-4" />
              {saving ? "Saving..." : "Transfer"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
