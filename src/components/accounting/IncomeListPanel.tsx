"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Plus, Search, Trash2, ArrowDownLeft } from "lucide-react";
import {
  INCOME_SOURCE_LABELS,
  addIncome,
  deleteIncome,
  formatBdt,
  getAccountById,
  type IncomeSource,
} from "@/lib/accounting-store";
import { useAccountingData } from "./useAccountingData";
import { inputCls, labelCls, selectCls } from "./accounting-ui";

const SOURCES = Object.keys(INCOME_SOURCE_LABELS) as IncomeSource[];

export function IncomeListPanel() {
  const { data, refresh } = useAccountingData();
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);

  const incomeAccounts = useMemo(
    () => (data.chartAccounts ?? []).filter((c) => c.group === "income" && c.active),
    [data.chartAccounts]
  );

  const [incomeAccount, setIncomeAccount] = useState("");
  const [title, setTitle] = useState("");
  const [amount, setAmount] = useState("");
  const [date, setDate] = useState(
    new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" })
  );
  const [source, setSource] = useState<IncomeSource>("manual");
  const [accountId, setAccountId] = useState(data.accounts.find((a) => a.active)?.id ?? "");
  const [reference, setReference] = useState("");
  const [note, setNote] = useState("");

  const accounts = useMemo(() => data.accounts.filter((a) => a.active), [data.accounts]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return data.income
      .filter(
        (i) =>
          !q ||
          i.title.toLowerCase().includes(q) ||
          (i.reference ?? "").toLowerCase().includes(q)
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [data.income, search]);

  const total = filtered.reduce((s, i) => s + i.amount, 0);

  const resolvedTitle =
    incomeAccount === "__custom__" ? title.trim() : incomeAccount || title.trim();

  const handleSave = () => {
    if (!resolvedTitle || !amount || !accountId) return;
    addIncome({
      title: resolvedTitle,
      amount: Number(amount),
      date,
      source,
      accountId,
      reference: reference.trim() || undefined,
      note: note.trim() || undefined,
    });
    setTitle("");
    setAmount("");
    setReference("");
    setNote("");
    setShowForm(false);
    refresh();
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-slate-900">
            <ArrowDownLeft className="h-7 w-7 text-teal-500" />
            Income
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Order payments & manual income — {formatBdt(total)} in current view
          </p>
        </div>
        <button
          type="button"
          onClick={() => setShowForm(true)}
          className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-bold text-white shadow-md hover:bg-teal-700"
        >
          <Plus className="h-4 w-4" /> Add Income
        </button>
      </div>

      {showForm && (
        <div className="glass-card rounded-2xl p-5">
          <h3 className="mb-4 font-bold text-slate-800">New Income</h3>
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <label className={labelCls()}>Income Account</label>
              {incomeAccounts.length > 0 ? (
                <select
                  className={selectCls()}
                  value={incomeAccount}
                  onChange={(e) => setIncomeAccount(e.target.value)}
                >
                  <option value="">Select from Chart of Accounts</option>
                  {incomeAccounts.map((c) => (
                    <option key={c.id} value={c.name}>{c.name}</option>
                  ))}
                  <option value="__custom__">Other (type manually)</option>
                </select>
              ) : (
                <p className="text-sm text-amber-700">
                  No income names yet.{" "}
                  <Link href="/dashboard/accounting/chart-of-accounts" className="font-bold underline">
                    Add in Chart Of Account
                  </Link>
                </p>
              )}
              {(incomeAccount === "__custom__" || incomeAccounts.length === 0) && (
                <input
                  className={`${inputCls()} mt-2`}
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="e.g. Order payment WO-1042"
                />
              )}
            </div>
            <div>
              <label className={labelCls()}>Amount (৳)</label>
              <input className={inputCls()} type="number" min={1} value={amount} onChange={(e) => setAmount(e.target.value)} />
            </div>
            <div>
              <label className={labelCls()}>Date</label>
              <input className={inputCls()} value={date} onChange={(e) => setDate(e.target.value)} />
            </div>
            <div>
              <label className={labelCls()}>Source</label>
              <select className={selectCls()} value={source} onChange={(e) => setSource(e.target.value as IncomeSource)}>
                {SOURCES.map((s) => (
                  <option key={s} value={s}>{INCOME_SOURCE_LABELS[s]}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls()}>Received In</label>
              <select className={selectCls()} value={accountId} onChange={(e) => setAccountId(e.target.value)}>
                {accounts.map((a) => (
                  <option key={a.id} value={a.id}>{a.name}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls()}>Reference</label>
              <input className={inputCls()} value={reference} onChange={(e) => setReference(e.target.value)} placeholder="Order / invoice no." />
            </div>
          </div>
          <div className="mt-4 flex gap-2">
            <button type="button" onClick={handleSave} className="rounded-xl bg-teal-600 px-4 py-2 text-sm font-bold text-white hover:bg-teal-700">
              Save Income
            </button>
            <button type="button" onClick={() => setShowForm(false)} className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-600">
              Cancel
            </button>
          </div>
        </div>
      )}

      <div className="yai-panel overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-400"
              placeholder="Search income..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full min-w-[720px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-500">
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Title</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Account</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3" />
              </tr>
            </thead>
            <tbody>
              {filtered.map((i) => (
                <tr key={i.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                  <td className="px-4 py-3 text-slate-600">{i.date}</td>
                  <td className="px-4 py-3">
                    <p className="font-semibold text-slate-800">{i.title}</p>
                    {i.reference && <p className="text-xs text-slate-500">Ref: {i.reference}</p>}
                  </td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-teal-100 px-2 py-0.5 text-xs font-bold text-teal-700">
                      {INCOME_SOURCE_LABELS[i.source]}
                    </span>
                  </td>
                  <td className="px-4 py-3 text-slate-600">{getAccountById(i.accountId)?.name ?? "—"}</td>
                  <td className="px-4 py-3 font-bold text-teal-600">+{formatBdt(i.amount)}</td>
                  <td className="px-4 py-3">
                    <button
                      type="button"
                      onClick={() => {
                        if (confirm("Delete this income entry?")) {
                          deleteIncome(i.id);
                          refresh();
                        }
                      }}
                      className="rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-slate-500">
                    No income recorded yet.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
