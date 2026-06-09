"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import clsx from "clsx";
import { Search, Wallet, BookOpen, Info, ArrowRightLeft, Plus, Package } from "lucide-react";
import { AccountTransferModal } from "./AccountTransferModal";
import {
  ACCOUNT_SECTION_HINTS,
  ACCOUNT_SECTION_LABELS,
  ACCOUNT_SECTION_ORDER,
  ACCOUNT_TYPE_LABELS,
  formatBdt,
  getAccountBalance,
  CHART_GROUP_LABELS,
  getFixedAssetCategoryBookValue,
  listFixedAssetChartAccounts,
  listVisiblePaymentAccounts,
  PAYMENT_METHOD_KEY_LABELS,
  resolveAccountSectionType,
  type AccountType,
  type AccountingAccount,
  type AccountingData,
  type ChartAccount,
} from "@/lib/accounting-store";
import { useAccountingData } from "./useAccountingData";

function matchesSearch(account: AccountingAccount, q: string): boolean {
  if (!q) return true;
  const methodLabel = account.paymentMethodKey
    ? PAYMENT_METHOD_KEY_LABELS[account.paymentMethodKey].toLowerCase()
    : "";
  return (
    account.name.toLowerCase().includes(q) ||
    ACCOUNT_TYPE_LABELS[account.type].toLowerCase().includes(q) ||
    methodLabel.includes(q)
  );
}

function matchesFixedAssetSearch(row: ChartAccount, q: string): boolean {
  if (!q) return true;
  return (
    row.name.toLowerCase().includes(q) ||
    CHART_GROUP_LABELS.asset_fixed.toLowerCase().includes(q) ||
    (row.description ?? "").toLowerCase().includes(q)
  );
}

export function AccountListPanel() {
  const { data, refresh } = useAccountingData();
  const [search, setSearch] = useState("");
  const [transferOpen, setTransferOpen] = useState(false);
  const [transferFromId, setTransferFromId] = useState<string | undefined>();

  const q = search.toLowerCase().trim();

  const sections = useMemo(() => {
    const visible = listVisiblePaymentAccounts(data);
    return ACCOUNT_SECTION_ORDER.map((type) => ({
      type,
      accounts: visible.filter(
        (a) => resolveAccountSectionType(a) === type && matchesSearch(a, q)
      ),
    })).filter((s) => s.accounts.length > 0);
  }, [data, q]);

  const fixedAssetRows = useMemo(
    () => listFixedAssetChartAccounts(data).filter((row) => matchesFixedAssetSearch(row, q)),
    [data, q]
  );

  const totalShown =
    sections.reduce((n, s) => n + s.accounts.length, 0) + fixedAssetRows.length;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-slate-900">
            <Wallet className="h-7 w-7 text-indigo-500" />
            Accounts
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Mobile banking, bank, cash &amp; fixed asset balances — grouped by type
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setTransferFromId(undefined);
              setTransferOpen(true);
            }}
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700"
          >
            <ArrowRightLeft className="h-4 w-4" /> Transfer
          </button>
          <Link
            href="/dashboard/accounting/chart-of-accounts"
            className="flex items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-4 py-2.5 text-sm font-bold text-indigo-700 hover:bg-indigo-100"
          >
            <BookOpen className="h-4 w-4" /> Chart Of Account
          </Link>
        </div>
      </div>

      <div className="yai-panel overflow-hidden">
        <div className="border-b border-slate-100 bg-slate-50/80 px-4 py-3">
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-400"
              placeholder="Search accounts..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {totalShown === 0 ? (
          <div className="px-4 py-12 text-center text-slate-500">
            <p className="text-sm font-medium">No accounts found.</p>
            <p className="mt-1 text-xs text-slate-400">
              <Link
                href="/dashboard/accounting/chart-of-accounts"
                className="font-bold text-indigo-600 underline"
              >
                Add accounts in Chart Of Account
              </Link>
            </p>
          </div>
        ) : (
          <>
            {sections.map((section) => (
              <AccountSection
                key={section.type}
                type={section.type}
                accounts={section.accounts}
                onTransferFrom={(id) => {
                  setTransferFromId(id);
                  setTransferOpen(true);
                }}
              />
            ))}
            {fixedAssetRows.length > 0 && (
              <FixedAssetsSection rows={fixedAssetRows} data={data} />
            )}
          </>
        )}
      </div>

      <AccountTransferModal
        open={transferOpen}
        onClose={() => setTransferOpen(false)}
        onSaved={refresh}
        defaultFromAccountId={transferFromId}
      />
    </div>
  );
}

function AccountSection({
  type,
  accounts,
  onTransferFrom,
}: {
  type: AccountType;
  accounts: AccountingAccount[];
  onTransferFrom: (accountId: string) => void;
}) {
  const sectionTotal = accounts.reduce((s, a) => s + getAccountBalance(a.id), 0);
  const headerBg =
    type === "mobile_wallet"
      ? "bg-rose-50/90"
      : type === "bank"
        ? "bg-sky-50/90"
        : "bg-emerald-50/90";

  return (
    <div className="border-b border-slate-100 last:border-b-0">
      <div className={clsx("flex flex-wrap items-center justify-between gap-2 px-4 py-3", headerBg)}>
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-800">{ACCOUNT_SECTION_LABELS[type]}</span>
          <span title={ACCOUNT_SECTION_HINTS[type]} className="text-slate-400">
            <Info className="h-4 w-4" />
          </span>
          <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-bold text-slate-600">
            {accounts.length}
          </span>
        </div>
        <span className="text-sm font-bold text-indigo-700">{formatBdt(sectionTotal)}</span>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-500">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Balance</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {accounts.map((a) => (
              <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-800">{a.name}</p>
                  {a.paymentMethodKey && (
                    <p className="mt-0.5 text-xs font-medium text-indigo-600">
                      {PAYMENT_METHOD_KEY_LABELS[a.paymentMethodKey]}
                    </p>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">{ACCOUNT_TYPE_LABELS[a.type]}</td>
                <td className="px-4 py-3 font-bold text-indigo-600">
                  {formatBdt(getAccountBalance(a.id))}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={clsx(
                      "rounded-full px-2 py-0.5 text-xs font-bold",
                      a.active ? "bg-teal-100 text-teal-700" : "bg-slate-100 text-slate-500"
                    )}
                  >
                    {a.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  {a.active && (
                    <button
                      type="button"
                      onClick={() => onTransferFrom(a.id)}
                      className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 px-2.5 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-50"
                    >
                      <ArrowRightLeft className="h-3.5 w-3.5" />
                      Transfer
                    </button>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function FixedAssetsSection({
  rows,
  data,
}: {
  rows: ChartAccount[];
  data: AccountingData;
}) {
  const sectionTotal = rows.reduce(
    (s, row) => s + getFixedAssetCategoryBookValue(row.id, data),
    0
  );

  return (
    <div className="border-b border-slate-100 last:border-b-0">
      <div className="flex flex-wrap items-center justify-between gap-2 bg-amber-50/90 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-800">Fixed Assets</span>
          <span
            title="Equipment, vehicles, property — book value from Assets module"
            className="text-slate-400"
          >
            <Info className="h-4 w-4" />
          </span>
          <span className="rounded-full bg-white/80 px-2 py-0.5 text-xs font-bold text-slate-600">
            {rows.length}
          </span>
        </div>
        <div className="flex items-center gap-3">
          <span className="text-sm font-bold text-indigo-700">{formatBdt(sectionTotal)}</span>
          <Link
            href="/dashboard/accounting/chart-of-accounts?tab=asset"
            className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-bold text-indigo-600 hover:bg-indigo-50"
          >
            <Plus className="h-4 w-4" /> Add New
          </Link>
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full min-w-[560px] text-sm">
          <thead>
            <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-500">
              <th className="px-4 py-3">Name</th>
              <th className="px-4 py-3">Type</th>
              <th className="px-4 py-3">Balance</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3 text-right">Action</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50/50">
                <td className="px-4 py-3">
                  <p className="font-semibold text-slate-800">{row.name}</p>
                  {row.description && (
                    <p className="mt-0.5 text-xs text-slate-500">{row.description}</p>
                  )}
                </td>
                <td className="px-4 py-3 text-slate-600">{CHART_GROUP_LABELS.asset_fixed}</td>
                <td className="px-4 py-3 font-bold text-indigo-600">
                  {formatBdt(getFixedAssetCategoryBookValue(row.id, data))}
                </td>
                <td className="px-4 py-3">
                  <span
                    className={clsx(
                      "rounded-full px-2 py-0.5 text-xs font-bold",
                      row.active ? "bg-teal-100 text-teal-700" : "bg-slate-100 text-slate-500"
                    )}
                  >
                    {row.active ? "Active" : "Inactive"}
                  </span>
                </td>
                <td className="px-4 py-3 text-right">
                  <Link
                    href="/dashboard/accounting/assets"
                    className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 px-2.5 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-50"
                  >
                    <Package className="h-3.5 w-3.5" />
                    Assets
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
