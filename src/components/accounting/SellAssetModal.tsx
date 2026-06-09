"use client";

import { useEffect, useMemo, useState } from "react";
import { Coins, X } from "lucide-react";
import clsx from "clsx";
import {
  CHART_GROUP_LABELS,
  EXPENSE_PAID_FROM_GROUPS,
  assetBookValue,
  formatBdt,
  getChartFixedAssetLabel,
  listExpensePaidFromAssets,
  recordAssetSale,
  type AccountingAsset,
} from "@/lib/accounting-store";
import { useAccountingData } from "./useAccountingData";
import { inputCls, labelCls, selectCls } from "./accounting-ui";

type Props = {
  asset: AccountingAsset | null;
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

export function SellAssetModal({ asset, open, onClose, onSaved }: Props) {
  const { data } = useAccountingData();
  const depositAccounts = useMemo(() => listExpensePaidFromAssets(data), [data]);

  const [accountId, setAccountId] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(toInputDate(new Date()));
  const [note, setNote] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const bookValue = asset ? assetBookValue(asset) : 0;

  useEffect(() => {
    if (!open || !asset) return;
    setAccountId(depositAccounts[0]?.accountId ?? "");
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
  }, [open, asset, onClose, depositAccounts]);

  if (!open || !asset) return null;

  const amountNum = Math.max(0, Number(amount) || 0);
  const remainingBook = Math.max(0, bookValue - Math.min(amountNum, bookValue));
  const estPl = amountNum > 0 ? amountNum - Math.min(amountNum, bookValue) : null;
  const isPartial = amountNum > 0 && amountNum < bookValue - 0.001;

  const setQuickAmount = (value: number) => {
    setAmount(String(Math.max(0, value)));
    setError("");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (amountNum <= 0) {
      setError("Enter a valid amount");
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

    const result = recordAssetSale(asset.id, {
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
    <div className="fixed inset-0 z-[125] flex items-center justify-center p-4" role="dialog" aria-modal="true">
      <button type="button" aria-label="Close" className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4">
          <div className="flex items-center gap-3">
            <span className="flex h-10 w-10 items-center justify-center rounded-xl bg-amber-500 text-white">
              <Coins className="h-5 w-5" />
            </span>
            <div>
              <h2 className="text-lg font-bold text-slate-900">Sell Asset</h2>
              <p className="text-xs text-slate-500">Full or partial sale</p>
            </div>
          </div>
          <button type="button" onClick={onClose} className="rounded-lg p-2 text-slate-400 hover:bg-slate-200/60">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-5 py-5">
          <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3 text-sm">
            <div className="flex justify-between">
              <span className="text-slate-500">Asset</span>
              <span className="font-semibold text-slate-800">{asset.name}</span>
            </div>
            <div className="mt-2 flex justify-between">
              <span className="text-slate-500">Account</span>
              <span className="font-semibold text-slate-800">{getChartFixedAssetLabel(asset)}</span>
            </div>
            <div className="mt-2 flex justify-between">
              <span className="text-slate-500">Book Value</span>
              <span className="font-bold text-amber-700">{formatBdt(bookValue)}</span>
            </div>
          </div>

          <div>
            <label className={labelCls()}>Deposit To (Account)</label>
            {depositAccounts.length > 0 ? (
              <select className={selectCls()} value={accountId} onChange={(e) => setAccountId(e.target.value)} required>
                {EXPENSE_PAID_FROM_GROUPS.map((group) => {
                  const items = depositAccounts.filter((a) => a.group === group);
                  if (items.length === 0) return null;
                  return (
                    <optgroup key={group} label={CHART_GROUP_LABELS[group]}>
                      {items.map((item) => (
                        <option key={item.accountId} value={item.accountId}>{item.chartName}</option>
                      ))}
                    </optgroup>
                  );
                })}
              </select>
            ) : (
              <p className="text-sm text-amber-700">No accounts available.</p>
            )}
          </div>

          <div>
            <div className="mb-1 flex items-center justify-between">
              <label className={labelCls()}>Sale Amount (৳)</label>
              <span className="text-xs text-slate-400">Partial allowed</span>
            </div>
            <input
              className={inputCls()}
              type="number"
              min={1}
              value={amount}
              onChange={(e) => { setAmount(e.target.value); setError(""); }}
              placeholder="Enter sale proceeds"
              required
            />
            <div className="mt-2 flex flex-wrap gap-2">
              <button type="button" onClick={() => setQuickAmount(bookValue)} className="rounded-lg bg-slate-100 px-2.5 py-1 text-xs font-bold text-slate-700 hover:bg-slate-200">
                Book Value {formatBdt(bookValue)}
              </button>
            </div>
            {amountNum > 0 && (
              <p className="mt-2 text-xs text-slate-500">
                {isPartial ? (
                  <>
                    Partial sale — remaining book value:{" "}
                    <span className="font-bold text-amber-700">{formatBdt(remainingBook)}</span>
                  </>
                ) : (
                  <>This will fully clear the remaining book value.</>
                )}
                {estPl != null && (
                  <>
                    {" "}
                    · Est. {estPl >= 0 ? "profit" : "loss"}:{" "}
                    <span className={clsx("font-bold", estPl >= 0 ? "text-emerald-700" : "text-rose-700")}>
                      {estPl >= 0 ? "+" : ""}{formatBdt(estPl)}
                    </span>
                  </>
                )}
              </p>
            )}
          </div>

          <div>
            <label className={labelCls()}>Sale Date</label>
            <input type="date" className={inputCls()} value={date} onChange={(e) => setDate(e.target.value)} required />
          </div>

          <div>
            <label className={labelCls()}>Note</label>
            <input className={inputCls()} value={note} onChange={(e) => setNote(e.target.value)} placeholder="Optional" />
          </div>

          {error && <p className="rounded-lg bg-rose-50 px-3 py-2 text-sm font-medium text-rose-700">{error}</p>}

          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={saving || !accountId || depositAccounts.length === 0 || amountNum <= 0}
              className={clsx("flex-1 rounded-xl py-2.5 text-sm font-bold text-white disabled:opacity-60", isPartial ? "bg-amber-600 hover:bg-amber-700" : "bg-teal-600 hover:bg-teal-700")}
            >
              {saving ? "Processing…" : isPartial ? "Record Partial Sale" : "Record Sale"}
            </button>
            <button type="button" onClick={onClose} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50">
              Close
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
