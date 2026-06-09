"use client";

import { useMemo, useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import clsx from "clsx";
import {
  BookOpen,
  Info,
  MoreVertical,
  Pencil,
  Plus,
  Trash2,
} from "lucide-react";
import {
  CHART_ASSET_GROUPS,
  canDeleteChartAccount,
  deleteChartAccount,
  getAccountBalance,
  updateChartAccount,
  type ChartAccount,
  type ChartAccountGroup,
} from "@/lib/accounting-store";
import { useAccountingData } from "./useAccountingData";
import { ChartAccountModal, type ChartAccountFormState } from "./ChartAccountModal";

type TabKey = "expense" | "income" | "liability" | "asset";

export function ChartOfAccountsPanel() {
  const searchParams = useSearchParams();
  const { data, refresh } = useAccountingData();
  const chartAccounts = useMemo(() => data.chartAccounts ?? [], [data.chartAccounts]);

  const [tab, setTab] = useState<TabKey>("asset");
  const [menuId, setMenuId] = useState<string | null>(null);
  const [form, setForm] = useState<ChartAccountFormState | null>(null);
  const [editId, setEditId] = useState<string | null>(null);
  const [actionError, setActionError] = useState("");

  useEffect(() => {
    const t = searchParams.get("tab");
    if (t === "expense" || t === "income" || t === "liability" || t === "asset") {
      setTab(t);
    }
  }, [searchParams]);

  const countByGroup = (group: ChartAccountGroup) =>
    chartAccounts.filter((c) => c.group === group).length;

  const expenseCount = countByGroup("expense");
  const incomeCount = countByGroup("income");
  const liabilityCount = countByGroup("liability");
  const assetCount = chartAccounts.filter((c) => CHART_ASSET_GROUPS.includes(c.group)).length;

  const sortRows = (group: ChartAccountGroup) =>
    chartAccounts
      .filter((c) => c.group === group)
      .sort((a, b) => a.name.localeCompare(b.name));

  const expenseRows = useMemo(() => sortRows("expense"), [chartAccounts]);
  const incomeRows = useMemo(() => sortRows("income"), [chartAccounts]);
  const liabilityRows = useMemo(() => sortRows("liability"), [chartAccounts]);
  const bankRows = useMemo(() => sortRows("asset_bank"), [chartAccounts]);
  const mobileBankingRows = useMemo(
    () => sortRows("asset_mobile_banking"),
    [chartAccounts]
  );
  const cashRows = useMemo(() => sortRows("asset_cash"), [chartAccounts]);
  const fixedAssetRows = useMemo(() => sortRows("asset_fixed"), [chartAccounts]);

  const openAdd = (group: ChartAccountGroup) => {
    setEditId(null);
    setForm({
      group,
      name: "",
      code: group === "asset_cash" ? "1001" : "",
      description: "",
    });
    setMenuId(null);
  };

  const openEdit = (row: ChartAccount) => {
    setEditId(row.id);
    setForm({
      group: row.group,
      name: row.name,
      code: row.code ?? "",
      description: row.description ?? "",
    });
    setMenuId(null);
  };

  const closeForm = () => {
    setForm(null);
    setEditId(null);
  };

  const toggleActive = (row: ChartAccount) => {
    updateChartAccount(row.id, { active: !row.active });
    setMenuId(null);
    refresh();
  };

  const handleDelete = (row: ChartAccount) => {
    setActionError("");
    const block = canDeleteChartAccount(row.id);
    if (!block.ok) {
      setActionError(block.message);
      setMenuId(null);
      return;
    }
    if (!confirm(`Remove "${row.name}" from chart of accounts?`)) return;
    const result = deleteChartAccount(row.id);
    if (!result.ok) {
      setActionError(result.message);
      setMenuId(null);
      return;
    }
    setMenuId(null);
    refresh();
  };

  const groupProps = {
    menuId,
    setMenuId,
    onEdit: openEdit,
    onToggle: toggleActive,
    onDelete: handleDelete,
  };

  return (
    <div className="space-y-4">
      <div>
        <h1 className="flex items-center gap-2 text-2xl font-extrabold text-slate-900">
          <BookOpen className="h-7 w-7 text-indigo-500" />
          Chart Of Account
        </h1>
        <p className="mt-0.5 text-sm text-slate-500">
          Expense, income, liabilities, bank &amp; assets — add account names in one place
        </p>
      </div>

      {actionError && (
        <div className="rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900">
          {actionError}
        </div>
      )}

      <div className="yai-panel overflow-hidden">
        <div className="flex flex-wrap gap-1 border-b border-slate-200 bg-white px-2 pt-2">
          <TabButton
            active={tab === "expense"}
            label={`EXPENSE (${expenseCount})`}
            onClick={() => setTab("expense")}
          />
          <TabButton
            active={tab === "income"}
            label={`INCOME (${incomeCount})`}
            onClick={() => setTab("income")}
          />
          <TabButton
            active={tab === "liability"}
            label={`LIABILITIES (${liabilityCount})`}
            onClick={() => setTab("liability")}
          />
          <TabButton
            active={tab === "asset"}
            label={`ASSET (${assetCount})`}
            onClick={() => setTab("asset")}
          />
        </div>

        {tab === "expense" && (
          <AccountGroup
            title="Expense Accounts"
            hint="Names appear when you record a new expense"
            rows={expenseRows}
            onAdd={() => openAdd("expense")}
            {...groupProps}
          />
        )}

        {tab === "income" && (
          <AccountGroup
            title="Income Accounts"
            hint="Names appear when you record income"
            rows={incomeRows}
            onAdd={() => openAdd("income")}
            {...groupProps}
          />
        )}

        {tab === "liability" && (
          <AccountGroup
            title="Liability Accounts"
            hint="Loans, payables & credit — used when adding liabilities"
            rows={liabilityRows}
            onAdd={() => openAdd("liability")}
            {...groupProps}
          />
        )}

        {tab === "asset" && (
          <>
            <AccountGroup
              title="Bank"
              hint="Bank accounts for payments & balances"
              rows={bankRows}
              onAdd={() => openAdd("asset_bank")}
              {...groupProps}
            />
            <AccountGroup
              title="Mobile Banking"
              hint="bKash, Nagad, Rocket & other mobile wallets"
              rows={mobileBankingRows}
              onAdd={() => openAdd("asset_mobile_banking")}
              {...groupProps}
            />
            <AccountGroup
              title="Cash"
              hint="Cash not yet deposited in the bank"
              rows={cashRows}
              onAdd={() => openAdd("asset_cash")}
              showCode
              {...groupProps}
            />
            <AccountGroup
              title="Fixed Assets"
              hint="Equipment, vehicles, stock value — used when adding assets"
              rows={fixedAssetRows}
              onAdd={() => openAdd("asset_fixed")}
              {...groupProps}
            />
          </>
        )}
      </div>

      <ChartAccountModal
        open={form != null}
        form={form}
        editId={editId}
        onClose={closeForm}
        onChange={setForm}
        onSaved={refresh}
      />
    </div>
  );
}

function TabButton({
  active,
  label,
  onClick,
}: {
  active: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={clsx(
        "px-4 py-3 text-xs font-extrabold tracking-wide sm:text-sm",
        active
          ? "border-b-2 border-indigo-600 text-indigo-700"
          : "text-slate-500 hover:text-slate-800"
      )}
    >
      {label}
    </button>
  );
}

function AccountGroup({
  title,
  hint,
  rows,
  onAdd,
  menuId,
  setMenuId,
  onEdit,
  onToggle,
  onDelete,
  showCode = false,
}: {
  title: string;
  hint: string;
  rows: ChartAccount[];
  onAdd: () => void;
  menuId: string | null;
  setMenuId: (id: string | null) => void;
  onEdit: (row: ChartAccount) => void;
  onToggle: (row: ChartAccount) => void;
  onDelete: (row: ChartAccount) => void;
  showCode?: boolean;
}) {
  return (
    <div className="border-b border-slate-100 last:border-b-0">
      <div className="flex items-center justify-between bg-sky-50/90 px-4 py-3">
        <div className="flex items-center gap-2">
          <span className="font-bold text-slate-800">{title}</span>
          <span title={hint} className="text-slate-400">
            <Info className="h-4 w-4" />
          </span>
        </div>
        <button
          type="button"
          onClick={onAdd}
          className="flex items-center gap-1 rounded-lg px-2 py-1 text-sm font-bold text-indigo-600 hover:bg-indigo-50"
        >
          <Plus className="h-4 w-4" /> Add New
        </button>
      </div>

      {rows.length === 0 ? (
        <p className="px-4 py-6 text-sm text-slate-500">No accounts yet — click Add New.</p>
      ) : (
        <ul>
          {rows.map((row) => (
            <li
              key={row.id}
              className="flex items-start justify-between gap-3 border-t border-slate-50 px-4 py-4 hover:bg-slate-50/50"
            >
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  {showCode && row.code && (
                    <span className="rounded bg-slate-100 px-2 py-0.5 text-xs font-bold text-slate-600">
                      {row.code}
                    </span>
                  )}
                  <span className="font-semibold text-slate-800">{row.name}</span>
                  <span
                    className={clsx(
                      "rounded-full px-2 py-0.5 text-xs font-bold",
                      row.active ? "bg-teal-100 text-teal-700" : "bg-slate-100 text-slate-500"
                    )}
                  >
                    {row.active ? "Active" : "Inactive"}
                  </span>
                </div>
                {row.description && (
                  <p className="mt-1 text-sm text-slate-500">{row.description}</p>
                )}
              </div>

              <div className="relative shrink-0">
                <button
                  type="button"
                  onClick={() => setMenuId(menuId === row.id ? null : row.id)}
                  className="rounded-lg p-2 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                  aria-label="Actions"
                >
                  <MoreVertical className="h-4 w-4" />
                </button>
                {menuId === row.id && (
                  <div className="absolute right-0 z-50 mt-1 w-44 rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
                    <button
                      type="button"
                      onClick={() => onEdit(row)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      <Pencil className="h-3.5 w-3.5" /> Edit
                    </button>
                    <button
                      type="button"
                      onClick={() => onToggle(row)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50"
                    >
                      {row.active ? "Deactivate" : "Activate"}
                    </button>
                    <button
                      type="button"
                      onClick={() => onDelete(row)}
                      className="flex w-full items-center gap-2 px-3 py-2 text-sm text-rose-600 hover:bg-rose-50"
                    >
                      <Trash2 className="h-3.5 w-3.5" /> Remove
                    </button>
                    {row.linkedAccountId && getAccountBalance(row.linkedAccountId) !== 0 && (
                      <p className="px-3 py-2 text-[11px] leading-snug text-amber-700">
                        Clear balance before removing
                      </p>
                    )}
                  </div>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
