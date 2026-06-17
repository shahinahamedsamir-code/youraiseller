"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import clsx from "clsx";
import {
  Search,
  Wallet,
  BookOpen,
  Info,
  ArrowRightLeft,
  Plus,
  Package,
  CheckCircle2,
  Circle,
} from "lucide-react";
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
  setDefaultPaymentReceiveAccount,
  updateAccount,
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

const ACCOUNTS_TH =
  "px-3 py-2 text-left text-[11px] font-bold uppercase tracking-wide text-slate-500";
const ACCOUNTS_TD = "px-3 py-2 text-sm text-slate-700 align-middle";

function AccountsTableHead() {
  return (
    <thead className="border-b border-slate-200 bg-slate-50/90">
      <tr>
        <th className={clsx(ACCOUNTS_TH, "w-[38%]")}>Name</th>
        <th className={clsx(ACCOUNTS_TH, "w-[18%] text-right")}>Balance</th>
        <th className={clsx(ACCOUNTS_TH, "w-[12%]")}>Status</th>
        <th className={clsx(ACCOUNTS_TH, "w-[10%] text-center")} title="Default on payment approve">
          Default
        </th>
        <th className={clsx(ACCOUNTS_TH, "w-[10%] text-center")} title="Show in POS payment methods">
          POS
        </th>
        <th className={clsx(ACCOUNTS_TH, "w-[16%] text-right")}>Action</th>
      </tr>
    </thead>
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
          <h1 className="flex items-center gap-2 text-lg font-extrabold text-slate-900">
            <Wallet className="h-5 w-5 text-indigo-500" />
            Accounts
          </h1>
          <p className="text-xs text-slate-500">
            Mobile banking, bank, cash &amp; fixed asset balances
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => {
              setTransferFromId(undefined);
              setTransferOpen(true);
            }}
            className="flex items-center gap-1.5 rounded-lg bg-indigo-600 px-3 py-1.5 text-xs font-bold text-white hover:bg-indigo-700"
          >
            <ArrowRightLeft className="h-4 w-4" /> Transfer
          </button>
          <Link
            href="/dashboard/accounting/chart-of-accounts"
            className="flex items-center gap-1.5 rounded-lg border border-indigo-200 bg-indigo-50 px-3 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
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
          <div className="overflow-x-auto">
            <table className="w-full min-w-[640px] table-fixed text-sm">
              <AccountsTableHead />
              <tbody>
                {sections.map((section) => (
                  <AccountSection
                    key={section.type}
                    type={section.type}
                    accounts={section.accounts}
                    onTransferFrom={(id) => {
                      setTransferFromId(id);
                      setTransferOpen(true);
                    }}
                    onToggleDefault={(id) => {
                      setDefaultPaymentReceiveAccount(id);
                      refresh();
                    }}
                    onTogglePos={(account) => {
                      updateAccount(account.id, { posEnabled: !account.posEnabled });
                      refresh();
                    }}
                  />
                ))}
                {fixedAssetRows.length > 0 && (
                  <FixedAssetsSection rows={fixedAssetRows} data={data} />
                )}
              </tbody>
            </table>
          </div>
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
  onToggleDefault,
  onTogglePos,
}: {
  type: AccountType;
  accounts: AccountingAccount[];
  onTransferFrom: (accountId: string) => void;
  onToggleDefault: (accountId: string) => void;
  onTogglePos: (account: AccountingAccount) => void;
}) {
  const sectionTotal = accounts.reduce((s, a) => s + getAccountBalance(a.id), 0);
  const headerBg =
    type === "mobile_wallet"
      ? "bg-rose-50/90"
      : type === "bank"
        ? "bg-sky-50/90"
        : "bg-emerald-50/90";

  return (
    <>
      <tr className={clsx("border-b border-slate-100", headerBg)}>
        <td colSpan={6} className="px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-slate-800">{ACCOUNT_SECTION_LABELS[type]}</span>
              <span title={ACCOUNT_SECTION_HINTS[type]} className="text-slate-400">
                <Info className="h-3.5 w-3.5" />
              </span>
              <span className="rounded-full bg-white/80 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                {accounts.length}
              </span>
            </div>
            <span className="text-xs font-bold text-indigo-700">{formatBdt(sectionTotal)}</span>
          </div>
        </td>
      </tr>
      {accounts.map((a) => {
        const balance = getAccountBalance(a.id);
        return (
          <tr key={a.id} className="border-b border-slate-50 hover:bg-slate-50/50">
            <td className={ACCOUNTS_TD}>
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="truncate font-semibold text-slate-800">{a.name}</span>
                {a.paymentMethodKey && (
                  <span className="shrink-0 rounded bg-indigo-50 px-1.5 py-0.5 text-[10px] font-semibold text-indigo-600">
                    {PAYMENT_METHOD_KEY_LABELS[a.paymentMethodKey]}
                  </span>
                )}
              </div>
            </td>
            <td
              className={clsx(
                ACCOUNTS_TD,
                "text-right font-bold tabular-nums",
                balance < 0 ? "text-rose-600" : "text-indigo-600"
              )}
            >
              {formatBdt(balance)}
            </td>
            <td className={ACCOUNTS_TD}>
              <span
                className={clsx(
                  "inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold",
                  a.active ? "bg-teal-100 text-teal-700" : "bg-slate-100 text-slate-500"
                )}
              >
                {a.active ? "Active" : "Inactive"}
              </span>
            </td>
            <td className={clsx(ACCOUNTS_TD, "text-center")}>
              {a.active ? (
                <button
                  type="button"
                  onClick={() => onToggleDefault(a.id)}
                  title={
                    a.defaultPaymentReceive
                      ? "Default payment receive — click to clear"
                      : "Set as default payment receive"
                  }
                  className="inline-flex items-center justify-center rounded-md p-1 hover:bg-slate-100"
                >
                  {a.defaultPaymentReceive ? (
                    <CheckCircle2 className="h-4 w-4 text-emerald-600" />
                  ) : (
                    <Circle className="h-4 w-4 text-slate-300" />
                  )}
                </button>
              ) : (
                <span className="text-slate-300">—</span>
              )}
            </td>
            <td className={clsx(ACCOUNTS_TD, "text-center")}>
              {a.active ? (
                <button
                  type="button"
                  onClick={() => onTogglePos(a)}
                  className={clsx(
                    "inline-flex rounded-lg px-2 py-1 text-[11px] font-black transition",
                    a.posEnabled
                      ? "bg-emerald-100 text-emerald-700 hover:bg-emerald-200"
                      : "bg-slate-100 text-slate-500 hover:bg-indigo-50 hover:text-indigo-700"
                  )}
                >
                  {a.posEnabled ? "Assigned" : "Assign"}
                </button>
              ) : (
                <span className="text-slate-300">—</span>
              )}
            </td>
            <td className={clsx(ACCOUNTS_TD, "text-right")}>
              {a.active && (
                <button
                  type="button"
                  onClick={() => onTransferFrom(a.id)}
                  className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 px-2 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-50"
                >
                  <ArrowRightLeft className="h-3 w-3" />
                  Transfer
                </button>
              )}
            </td>
          </tr>
        );
      })}
    </>
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
    <>
      <tr className="border-b border-slate-100 bg-amber-50/90">
        <td colSpan={6} className="px-3 py-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-1.5">
              <span className="text-sm font-bold text-slate-800">Fixed Assets</span>
              <span
                title="Equipment, vehicles, property — book value from Assets module"
                className="text-slate-400"
              >
                <Info className="h-3.5 w-3.5" />
              </span>
              <span className="rounded-full bg-white/80 px-1.5 py-0.5 text-[10px] font-bold text-slate-600">
                {rows.length}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-indigo-700">{formatBdt(sectionTotal)}</span>
              <Link
                href="/dashboard/accounting/chart-of-accounts?tab=asset"
                className="flex items-center gap-1 rounded-lg px-2 py-0.5 text-[11px] font-bold text-indigo-600 hover:bg-indigo-50"
              >
                <Plus className="h-3 w-3" /> Add New
              </Link>
            </div>
          </div>
        </td>
      </tr>
      {rows.map((row) => (
        <tr key={row.id} className="border-b border-slate-50 hover:bg-slate-50/50">
          <td className={ACCOUNTS_TD}>
            <p className="truncate font-semibold text-slate-800">{row.name}</p>
            {row.description && (
              <p className="truncate text-[11px] text-slate-500">{row.description}</p>
            )}
          </td>
          <td className={clsx(ACCOUNTS_TD, "text-right font-bold tabular-nums text-indigo-600")}>
            {formatBdt(getFixedAssetCategoryBookValue(row.id, data))}
          </td>
          <td className={ACCOUNTS_TD}>
            <span
              className={clsx(
                "inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold",
                row.active ? "bg-teal-100 text-teal-700" : "bg-slate-100 text-slate-500"
              )}
            >
              {row.active ? "Active" : "Inactive"}
            </span>
          </td>
          <td className={clsx(ACCOUNTS_TD, "text-center text-slate-300")}>—</td>
          <td className={clsx(ACCOUNTS_TD, "text-center text-slate-300")}>—</td>
          <td className={clsx(ACCOUNTS_TD, "text-right")}>
            <Link
              href="/dashboard/accounting/assets"
              className="inline-flex items-center gap-1 rounded-lg border border-indigo-200 px-2 py-1 text-[11px] font-bold text-indigo-700 hover:bg-indigo-50"
            >
              <Package className="h-3 w-3" />
              Assets
            </Link>
          </td>
        </tr>
      ))}
    </>
  );
}
