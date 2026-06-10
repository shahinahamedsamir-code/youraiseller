"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  AD_PLATFORM_LABELS,
  CHART_GROUP_LABELS,
  EXPENSE_PAID_FROM_GROUPS,
  addExpense,
  formatBdt,
  getAccountBalance,
  listExpensePaidFromAssets,
  type AdPlatform,
  type ExpenseCategory,
} from "@/lib/accounting-store";
import { useAccountingData } from "./useAccountingData";
import { inputCls, labelCls, selectCls } from "./accounting-ui";

type ExpenseFormProps = {
  mode?: "general" | "ad";
  onSaved?: () => void;
  onCancel?: () => void;
  className?: string;
};

const AD_PLATFORMS = Object.keys(AD_PLATFORM_LABELS) as AdPlatform[];

function guessCategory(name: string): ExpenseCategory {
  const n = name.toLowerCase();
  if (n.includes("ad") || n.includes("meta") || n.includes("marketing")) return "ad";
  if (n.includes("courier")) return "courier";
  if (n.includes("salary") || n.includes("wage")) return "salary";
  if (n.includes("rent")) return "rent";
  if (n.includes("utility") || n.includes("bill")) return "utility";
  if (n.includes("inventory") || n.includes("stock")) return "inventory";
  return "general";
}

function toInputDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function todayInputDate() {
  return toInputDate(new Date());
}

function toDisplayDate(iso: string): string {
  const [y, m, d] = iso.split("-").map(Number);
  if (!y || !m || !d) {
    return new Date().toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  }
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

export function ExpenseForm({
  mode = "general",
  onSaved,
  onCancel,
  className,
}: ExpenseFormProps) {
  const { data } = useAccountingData();

  const paidFromAssets = useMemo(() => listExpensePaidFromAssets(data), [data]);

  const expenseCategories = useMemo(
    () =>
      [...(data.chartAccounts ?? [])]
        .filter((c) => c.group === "expense" && c.active)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [data.chartAccounts]
  );

  const defaultCategoryName = useMemo(() => {
    if (mode === "ad") {
      return (
        expenseCategories.find(
          (c) =>
            c.name.toLowerCase().includes("ad") || c.name.toLowerCase().includes("meta")
        )?.name ??
        expenseCategories[0]?.name ??
        ""
      );
    }
    return expenseCategories[0]?.name ?? "";
  }, [expenseCategories, mode]);

  const [accountId, setAccountId] = useState("");
  const [expenseCategory, setExpenseCategory] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(todayInputDate);
  const [vendor, setVendor] = useState("");
  const [adPlatform, setAdPlatform] = useState<AdPlatform>("facebook");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (paidFromAssets.length === 0) {
      setAccountId("");
      return;
    }
    if (!paidFromAssets.some((a) => a.accountId === accountId)) {
      setAccountId(paidFromAssets[0].accountId);
    }
  }, [paidFromAssets, accountId]);

  useEffect(() => {
    if (expenseCategories.length === 0) {
      setExpenseCategory("");
      return;
    }
    if (!expenseCategory || !expenseCategories.some((c) => c.name === expenseCategory)) {
      setExpenseCategory(defaultCategoryName);
    }
  }, [expenseCategories, expenseCategory, defaultCategoryName]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!accountId || !expenseCategory || !amount) return;

    const balance = getAccountBalance(accountId);
    if (Number(amount) > balance + 0.005) {
      const accountLabel =
        paidFromAssets.find((a) => a.accountId === accountId)?.chartName ?? "this account";
      setError(`Insufficient balance in ${accountLabel}. Available ${formatBdt(balance)}`);
      return;
    }
    setError(null);

    const pickedCategory = mode === "ad" ? "ad" : guessCategory(expenseCategory);

    addExpense({
      title: expenseCategory,
      expenseTo: expenseCategory,
      amount: Number(amount),
      date: toDisplayDate(date),
      category: pickedCategory,
      accountId,
      vendor: vendor.trim() || undefined,
      adPlatform:
        mode === "ad" || pickedCategory === "ad" ? adPlatform : undefined,
      reference: reference.trim() || undefined,
      note: note.trim() || undefined,
      status: "approved",
    });

    setSaved(true);
    setAmount("");
    setDate(todayInputDate());
    setVendor("");
    setReference("");
    setNote("");
    setExpenseCategory(defaultCategoryName);
    setTimeout(() => {
      setSaved(false);
      onSaved?.();
    }, 500);
  };

  const canSave =
    paidFromAssets.length > 0 && expenseCategories.length > 0 && accountId && expenseCategory;

  return (
    <form
      onSubmit={handleSubmit}
      className={className ?? "glass-card max-w-2xl rounded-2xl p-6"}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelCls()}>Expense Account</label>
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
            <p className="text-sm text-amber-700">
              No asset accounts yet.{" "}
              <Link
                href="/dashboard/accounting/chart-of-accounts"
                className="font-bold underline"
              >
                Add Bank / Cash / Mobile Banking in Chart Of Account
              </Link>
            </p>
          )}
        </div>

        <div>
          <label className={labelCls()}>Amount (৳)</label>
          <input
            className={inputCls()}
            type="number"
            min={1}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            required
          />
        </div>
        <div>
          <label className={labelCls()}>Date</label>
          <input
            type="date"
            className={inputCls()}
            value={date}
            onChange={(e) => setDate(e.target.value)}
            required
          />
        </div>

        <div>
          <label className={labelCls()}>Category</label>
          {expenseCategories.length > 0 ? (
            <select
              className={selectCls()}
              value={expenseCategory}
              onChange={(e) => setExpenseCategory(e.target.value)}
              required
            >
              <option value="">Select expense category</option>
              {expenseCategories.map((c) => (
                <option key={c.id} value={c.name}>
                  {c.name}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-sm text-amber-700">
              No expense categories.{" "}
              <Link
                href="/dashboard/accounting/chart-of-accounts"
                className="font-bold underline"
              >
                Add in Chart Of Account
              </Link>
            </p>
          )}
        </div>

        {mode === "ad" ? (
          <div>
            <label className={labelCls()}>Ad Platform</label>
            <select
              className={selectCls()}
              value={adPlatform}
              onChange={(e) => setAdPlatform(e.target.value as AdPlatform)}
            >
              {AD_PLATFORMS.map((p) => (
                <option key={p} value={p}>
                  {AD_PLATFORM_LABELS[p]}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div>
            <label className={labelCls()}>Vendor / Payee</label>
            <input
              className={inputCls()}
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              placeholder="Optional"
            />
          </div>
        )}

        <div>
          <label className={labelCls()}>Invoice Number</label>
          <input
            className={inputCls()}
            value={reference}
            onChange={(e) => setReference(e.target.value)}
            placeholder="e.g. INV-2026-001 (auto if empty)"
          />
        </div>
        {mode === "ad" && (
          <div>
            <label className={labelCls()}>Vendor / Payee</label>
            <input
              className={inputCls()}
              value={vendor}
              onChange={(e) => setVendor(e.target.value)}
              placeholder="Optional"
            />
          </div>
        )}

        <div className={mode === "general" ? "sm:col-span-2" : ""}>
          <label className={labelCls()}>Note</label>
          <textarea
            className={inputCls()}
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>

      {error && (
        <p className="mt-4 rounded-lg bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
          {error}
        </p>
      )}

      <div className="mt-6 flex gap-2">
        <button
          type="submit"
          disabled={saved || !canSave}
          className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-60"
        >
          {saved ? "Saved!" : "Save Expense"}
        </button>
        {onCancel && (
          <button
            type="button"
            onClick={onCancel}
            className="rounded-xl border border-slate-200 px-5 py-2.5 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            Cancel
          </button>
        )}
      </div>
    </form>
  );
}
