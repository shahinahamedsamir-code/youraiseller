"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import {
  CHART_GROUP_LABELS,
  EXPENSE_PAID_FROM_GROUPS,
  LIABILITY_TYPE_LABELS,
  addLiability,
  guessLiabilityTypeFromChart,
  liabilityReceivesFunds,
  listExpensePaidFromAssets,
  updateLiability,
  type AccountingLiability,
  type LiabilityType,
} from "@/lib/accounting-store";
import { useAccountingData } from "./useAccountingData";
import { inputCls, labelCls, selectCls } from "./accounting-ui";

const TYPES = Object.keys(LIABILITY_TYPE_LABELS) as LiabilityType[];

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

export type LiabilityFormProps = {
  edit?: AccountingLiability | null;
  onSaved?: () => void;
  onCancel?: () => void;
  className?: string;
};

export function LiabilityForm({ edit, onSaved, onCancel, className }: LiabilityFormProps) {
  const { data } = useAccountingData();

  const liabilityAccounts = useMemo(
    () =>
      [...(data.chartAccounts ?? [])]
        .filter((c) => c.group === "liability" && c.active)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [data.chartAccounts]
  );

  const receivedInAssets = useMemo(() => listExpensePaidFromAssets(data), [data]);

  const [chartAccountId, setChartAccountId] = useState("");
  const [accountId, setAccountId] = useState("");
  const [name, setName] = useState("");
  const [type, setType] = useState<LiabilityType>("supplier_payable");
  const [amount, setAmount] = useState("");
  const [paidAmount, setPaidAmount] = useState("");
  const [dueDate, setDueDate] = useState("");
  const [note, setNote] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (edit) {
      setChartAccountId(edit.chartAccountId ?? "");
      setAccountId(edit.accountId ?? "");
      setName(edit.name);
      setType(edit.type);
      setAmount(String(edit.amount));
      setPaidAmount(String(edit.paidAmount));
      setDueDate(parseDisplayToInput(edit.dueDate));
      setNote(edit.note ?? "");
      return;
    }
    setChartAccountId(liabilityAccounts[0]?.id ?? "");
    setAccountId(receivedInAssets[0]?.accountId ?? "");
    setName("");
    setType("supplier_payable");
    setAmount("");
    setPaidAmount("0");
    setDueDate("");
    setNote("");
  }, [edit, liabilityAccounts, receivedInAssets]);

  useEffect(() => {
    if (receivedInAssets.length === 0) {
      setAccountId("");
      return;
    }
    if (!receivedInAssets.some((a) => a.accountId === accountId)) {
      setAccountId(receivedInAssets[0].accountId);
    }
  }, [receivedInAssets, accountId]);

  useEffect(() => {
    if (!chartAccountId) return;
    const chart = liabilityAccounts.find((c) => c.id === chartAccountId);
    if (!chart) return;
    if (!edit) setType(guessLiabilityTypeFromChart(chart.name));
  }, [chartAccountId, liabilityAccounts, edit]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!chartAccountId || !name.trim()) return;

    const total = Number(amount) || 0;
    const paid = Math.max(0, Number(paidAmount) || 0);
    if (total <= 0) return;
    if (paid > total) return;

    setSaving(true);
    const payload = {
      name: name.trim(),
      chartAccountId,
      accountId: accountId || undefined,
      type,
      amount: total,
      paidAmount: paid,
      dueDate: dueDate ? toDisplayDate(dueDate) : undefined,
      createdDate: edit?.createdDate ?? toDisplayDate(todayInputDate()),
      status: (paid >= total ? "paid" : "active") as AccountingLiability["status"],
      note: note.trim() || undefined,
      payments: edit?.payments,
    };

    if (edit) {
      updateLiability(edit.id, {
        ...payload,
        incomeId: edit.incomeId,
      });
    } else addLiability(payload);

    setSaving(false);
    onSaved?.();
  };

  const totalNum = Number(amount) || 0;
  const paidNum = Math.max(0, Number(paidAmount) || 0);
  const needsReceivedAccount = liabilityReceivesFunds(type);
  const canSave =
    liabilityAccounts.length > 0 &&
    chartAccountId &&
    name.trim() &&
    totalNum > 0 &&
    paidNum <= totalNum &&
    (!needsReceivedAccount || (receivedInAssets.length > 0 && !!accountId));

  return (
    <form onSubmit={handleSubmit} className={className ?? "space-y-4"}>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="sm:col-span-2">
          <label className={labelCls()}>Liability Account</label>
          {liabilityAccounts.length > 0 ? (
            <select
              className={selectCls()}
              value={chartAccountId}
              onChange={(e) => setChartAccountId(e.target.value)}
              required
            >
              <option value="">Select from Chart of Accounts</option>
              {liabilityAccounts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          ) : (
            <p className="text-sm text-amber-700">
              No liability accounts yet.{" "}
              <Link
                href="/dashboard/accounting/chart-of-accounts"
                className="font-bold underline"
              >
                Add in Chart Of Account
              </Link>
            </p>
          )}
        </div>

        <div className="sm:col-span-2">
          <label className={labelCls()}>Received In (Account)</label>
          {receivedInAssets.length > 0 ? (
            <>
              <select
                className={selectCls()}
                value={accountId}
                onChange={(e) => setAccountId(e.target.value)}
                required={needsReceivedAccount}
              >
                <option value="">
                  {needsReceivedAccount
                    ? "Select Bank / bKash / Cash"
                    : "Optional — not needed for supplier credit"}
                </option>
                {EXPENSE_PAID_FROM_GROUPS.map((group) => {
                  const items = receivedInAssets.filter((a) => a.group === group);
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
                {needsReceivedAccount
                  ? "Loan / credit money will be added to this account"
                  : "Only select if cash was received into an account"}
              </p>
            </>
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

        <div className="sm:col-span-2">
          <label className={labelCls()}>Creditor / Payee</label>
          <input
            className={inputCls()}
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Fabrics BD, City Bank"
            required
          />
        </div>

        <div>
          <label className={labelCls()}>Type</label>
          <select
            className={selectCls()}
            value={type}
            onChange={(e) => setType(e.target.value as LiabilityType)}
          >
            {TYPES.map((t) => (
              <option key={t} value={t}>
                {LIABILITY_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className={labelCls()}>Total Amount (৳)</label>
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
          <label className={labelCls()}>Already Paid (৳)</label>
          <input
            className={inputCls()}
            type="number"
            min={0}
            value={paidAmount}
            onChange={(e) => setPaidAmount(e.target.value)}
            placeholder="0"
          />
          <p className="mt-1 text-xs text-slate-400">
            Opening balance only — use Pay for new payments
          </p>
        </div>

        <div>
          <label className={labelCls()}>Due Date</label>
          <input
            type="date"
            className={inputCls()}
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
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
          {saving ? "Saving…" : edit ? "Update Liability" : "Save Liability"}
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
