"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CHART_GROUP_LABELS,
  EXPENSE_PAID_FROM_GROUPS,
  addAsset,
  guessAssetCategoryFromChart,
  listExpensePaidFromAssets,
  updateAsset,
  type AccountingAsset,
  type AssetCategory,
} from "@/lib/accounting-store";
import { useAccountingData } from "./useAccountingData";
import { inputCls, labelCls, selectCls } from "./accounting-ui";

const CHART_ASSETS_HREF = "/dashboard/accounting/chart-of-accounts?tab=asset";

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
  if (!y || !m || !d) return iso;
  return new Date(y, m - 1, d).toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function parseDisplayToInput(label?: string): string {
  if (!label) return "";
  const t = Date.parse(label);
  if (Number.isNaN(t)) return "";
  return toInputDate(new Date(t));
}

export type AssetFormProps = {
  edit?: AccountingAsset | null;
  onSaved?: () => void;
  onCancel?: () => void;
  className?: string;
};

export function AssetForm({ edit, onSaved, onCancel, className }: AssetFormProps) {
  const { data } = useAccountingData();

  const fixedAssetAccounts = useMemo(
    () =>
      [...(data.chartAccounts ?? [])]
        .filter((c) => c.group === "asset_fixed" && c.active)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [data.chartAccounts]
  );

  const paidFromAssets = useMemo(() => listExpensePaidFromAssets(data), [data]);

  const [chartAccountId, setChartAccountId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [name, setName] = useState("");
  const [purchaseValue, setPurchaseValue] = useState("");
  const [currentValue, setCurrentValue] = useState("");
  const [purchaseDate, setPurchaseDate] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (edit) {
      setChartAccountId(edit.chartAccountId ?? "");
      setAccountId(edit.accountId ?? "");
      setName(edit.name);
      setPurchaseValue(String(edit.purchaseValue));
      setCurrentValue(String(edit.currentValue));
      setPurchaseDate(parseDisplayToInput(edit.purchaseDate));
      setNote(edit.note ?? "");
      return;
    }
    setChartAccountId(fixedAssetAccounts[0]?.id ?? "");
    setAccountId(paidFromAssets[0]?.accountId ?? "");
    setName("");
    setPurchaseValue("");
    setCurrentValue("");
    setPurchaseDate(todayInputDate());
    setNote("");
  }, [edit, fixedAssetAccounts, paidFromAssets]);

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
    if (!edit && purchaseValue && !currentValue) {
      setCurrentValue(purchaseValue);
    }
  }, [purchaseValue, currentValue, edit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chartAccountId || !name.trim()) return;

    const purchase = Number(purchaseValue) || 0;
    const current = Number(currentValue) || purchase;
    if (purchase <= 0) return;

    const chart = fixedAssetAccounts.find((c) => c.id === chartAccountId);
    const category: AssetCategory = chart
      ? guessAssetCategoryFromChart(chart.name)
      : edit?.category ?? "other";

    setSaving(true);
    const displayDate = purchaseDate ? toDisplayDate(purchaseDate) : toDisplayDate(todayInputDate());
    const payload = {
      name: name.trim(),
      chartAccountId,
      accountId: accountId || undefined,
      category,
      purchaseValue: purchase,
      currentValue: current,
      soldAmount: edit?.soldAmount ?? 0,
      purchaseDate: displayDate,
      createdDate: edit?.createdDate ?? displayDate,
      status: edit?.status ?? ("active" as const),
      note: note.trim() || undefined,
      sales: edit?.sales,
      expenseId: edit?.expenseId,
    };

    if (edit) updateAsset(edit.id, payload);
    else addAsset(payload);

    setSaving(false);
    onSaved?.();
  };

  const purchaseNum = Number(purchaseValue) || 0;
  const canSave =
    fixedAssetAccounts.length > 0 &&
    chartAccountId &&
    name.trim() &&
    purchaseNum > 0 &&
    paidFromAssets.length > 0 &&
    !!accountId;

  return (
    <form onSubmit={handleSubmit} className={className ?? "space-y-4"}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelCls()}>Category</label>
          {fixedAssetAccounts.length > 0 ? (
            <>
              <select
                className={selectCls()}
                value={chartAccountId}
                onChange={(e) => setChartAccountId(e.target.value)}
                required
              >
                <option value="">Select asset category</option>
                {fixedAssetAccounts.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
              <p className="mt-1 text-xs text-slate-400">
                New category?{" "}
                <Link href={CHART_ASSETS_HREF} className="font-bold text-[#2563eb] hover:underline">
                  Add in Chart Of Account → Assets
                </Link>
              </p>
            </>
          ) : (
            <p className="text-sm text-amber-700">
              No asset categories yet.{" "}
              <Link href={CHART_ASSETS_HREF} className="font-bold underline">
                Add in Chart Of Account → Assets
              </Link>
            </p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label className={labelCls()}>Paid From (Account)</label>
          {paidFromAssets.length > 0 ? (
            <>
              <select
                className={selectCls()}
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                required
                disabled={!!edit?.expenseId}
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
              <p className="mt-1 text-xs text-slate-400">
                {edit?.expenseId
                  ? "Purchase account is locked after recording"
                  : "Purchase amount will be deducted from this account"}
              </p>
            </>
          ) : (
            <p className="text-sm text-amber-700">
              No asset accounts yet.{" "}
              <Link
                href="/dashboard/accounting/chart-of-accounts"
                className="font-bold underline"
              >
                Add Bank / Cash in Chart Of Account
              </Link>
            </p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label className={labelCls()}>Asset Name</label>
          <input
            className={inputCls()}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Delivery Van, Packaging Machine"
            required
          />
        </div>

        <div>
          <label className={labelCls()}>Purchase Value (৳)</label>
          <input
            className={inputCls()}
            type="number"
            min={1}
            value={purchaseValue}
            onChange={(e) => setPurchaseValue(e.target.value)}
            required
            disabled={!!edit?.expenseId}
          />
        </div>

        <div>
          <label className={labelCls()}>Current Book Value (৳)</label>
          <input
            className={inputCls()}
            type="number"
            min={0}
            value={currentValue}
            onChange={(e) => setCurrentValue(e.target.value)}
            placeholder="Same as purchase if new"
          />
        </div>

        <div>
          <label className={labelCls()}>Purchase Date</label>
          <input
            type="date"
            className={inputCls()}
            value={purchaseDate}
            onChange={(e) => setPurchaseDate(e.target.value)}
          />
        </div>

        <div className="sm:col-span-2">
          <label className={labelCls()}>Note</label>
          <textarea
            className={inputCls()}
            rows={2}
            value={note}
            onChange={(e) => setNote(e.target.value)}
            placeholder="Optional"
          />
        </div>
      </div>

      <div className="flex gap-2 pt-2">
        <button
          type="submit"
          disabled={saving || !canSave}
          className="rounded-xl bg-teal-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-teal-700 disabled:opacity-60"
        >
          {saving ? "Saving…" : edit ? "Update Asset" : "Save Asset"}
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
