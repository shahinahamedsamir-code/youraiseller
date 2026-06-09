"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import {
  Ban,
  ChevronDown,
  ChevronRight,
  Coins,
  ExternalLink,
  Landmark,
  MoreVertical,
  Pencil,
  Plus,
  Receipt,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import {
  ASSET_STATUS_LABELS,
  assetBookValue,
  assetRealizedProfitLoss,
  cancelAsset,
  deleteAsset,
  formatBdt,
  getChartAssetLabelForAccount,
  getChartFixedAssetLabel,
  type AccountingAsset,
  type AssetStatus,
} from "@/lib/accounting-store";
import {
  assetTransactionsHref,
  buildLedgerTransactions,
  filterLedgerByAsset,
  LEDGER_KIND_LABELS,
} from "@/lib/accounting-transactions";
import { useAccountingData } from "./useAccountingData";
import { AssetModal } from "./AssetModal";
import { SellAssetModal } from "./SellAssetModal";
import { CancelAssetModal } from "./CancelAssetModal";
import { paginateSlice } from "@/components/ui/TablePagination";

type StatusFilter = "all" | AssetStatus;

const ROW_OPTIONS = [10, 25, 50, 100] as const;

const FILTER_SELECT =
  "h-9 min-w-[7.5rem] shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100";

const TH =
  "whitespace-nowrap px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wide text-white";
const TD = "whitespace-nowrap px-4 py-3.5 text-sm text-slate-700";

type MenuAnchor = { id: string; top: number; left: number };

export function AssetListPanel() {
  const { data, refresh } = useAccountingData();
  const menuRef = useRef<HTMLDivElement>(null);

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [chartFilter, setChartFilter] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<MenuAnchor | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editAsset, setEditAsset] = useState<AccountingAsset | null>(null);
  const [sellAsset, setSellAsset] = useState<AccountingAsset | null>(null);
  const [cancelTarget, setCancelTarget] = useState<AccountingAsset | null>(null);
  const [cancelError, setCancelError] = useState("");
  const [cancelSaving, setCancelSaving] = useState(false);

  const fixedChartAccounts = useMemo(
    () =>
      [...(data.chartAccounts ?? [])]
        .filter((c) => c.group === "asset_fixed" && c.active)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [data.chartAccounts]
  );

  const assetTxnsMap = useMemo(() => {
    const all = buildLedgerTransactions(data);
    return new Map(data.assets.map((a) => [a.id, filterLedgerByAsset(all, a.id)]));
  }, [data]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return [...data.assets]
      .filter((a) => {
        if (statusFilter !== "all" && a.status !== statusFilter) return false;
        if (chartFilter && a.chartAccountId !== chartFilter) return false;
        if (!q) return true;
        return (
          a.name.toLowerCase().includes(q) ||
          getChartFixedAssetLabel(a).toLowerCase().includes(q) ||
          (a.note ?? "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const aBook = assetBookValue(a);
        const bBook = assetBookValue(b);
        if (a.status !== b.status) {
          if (a.status === "active") return -1;
          if (b.status === "active") return 1;
        }
        if (aBook !== bBook) return bBook - aBook;
        return a.name.localeCompare(b.name);
      });
  }, [data.assets, search, statusFilter, chartFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const paged = paginateSlice(filtered, safePage, rowsPerPage);

  const totalBookValue = data.assets
    .filter((a) => a.status === "active")
    .reduce((s, a) => s + assetBookValue(a), 0);
  const totalPurchase = filtered.reduce((s, a) => s + a.purchaseValue, 0);
  const totalRealizedPl = filtered.reduce((s, a) => s + (assetRealizedProfitLoss(a) ?? 0), 0);
  const activeCount = filtered.filter((a) => a.status === "active").length;

  const menuAsset = useMemo(
    () => (menuAnchor ? data.assets.find((a) => a.id === menuAnchor.id) : undefined),
    [menuAnchor, data.assets]
  );

  useEffect(() => {
    if (!menuAnchor) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuAnchor(null);
    };
    const onScroll = () => setMenuAnchor(null);
    document.addEventListener("mousedown", close);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [menuAnchor]);

  const hasFilters = statusFilter !== "all" || chartFilter !== "";

  const openAdd = () => {
    setEditAsset(null);
    setModalOpen(true);
  };

  const openEdit = (a: AccountingAsset) => {
    setEditAsset(a);
    setModalOpen(true);
    setMenuAnchor(null);
  };

  const openSell = (a: AccountingAsset) => {
    setSellAsset(a);
    setMenuAnchor(null);
  };

  const openCancel = (a: AccountingAsset) => {
    setCancelTarget(a);
    setCancelError("");
    setMenuAnchor(null);
  };

  const openActionMenu = (a: AccountingAsset, button: HTMLButtonElement) => {
    const rect = button.getBoundingClientRect();
    setMenuAnchor({ id: a.id, top: rect.bottom + 4, left: Math.max(8, rect.right - 160) });
  };

  const handleCancelConfirm = () => {
    if (!cancelTarget) return;
    setCancelSaving(true);
    setCancelError("");
    const result = cancelAsset(cancelTarget.id);
    setCancelSaving(false);
    if (!result.ok) {
      setCancelError(result.message);
      return;
    }
    setCancelTarget(null);
    refresh();
  };

  const handleDelete = (a: AccountingAsset) => {
    if (a.status !== "cancelled") {
      alert("Cancel this asset first before deleting.");
      return;
    }
    if (confirm(`Permanently delete "${a.name}"?`)) {
      deleteAsset(a.id);
      refresh();
    }
    setMenuAnchor(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-slate-900">
            <Landmark className="h-7 w-7 text-amber-500" />
            Assets
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Equipment, stock value & property — book value{" "}
            <span className="font-bold text-amber-700">{formatBdt(totalBookValue)}</span>
            <span className="mx-1.5 text-slate-300">·</span>
            <Link
              href="/dashboard/accounting/transactions?filter=asset"
              className="font-semibold text-[#2563eb] hover:underline"
            >
              View in Transaction
            </Link>
          </p>
        </div>
        <button
          type="button"
          onClick={openAdd}
          className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-bold text-white shadow-md hover:bg-teal-700"
        >
          <Plus className="h-4 w-4" /> Add Asset
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-3 py-2.5 sm:px-4">
          <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
            <SlidersHorizontal className="h-3.5 w-3.5" />
            Filters
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <select
              className={FILTER_SELECT}
              value={chartFilter}
              onChange={(e) => { setChartFilter(e.target.value); setPage(1); }}
            >
              <option value="">Category</option>
              {fixedChartAccounts.map((c) => (
                <option key={c.id} value={c.id}>{c.name}</option>
              ))}
            </select>
            <select
              className={FILTER_SELECT}
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value as StatusFilter); setPage(1); }}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="sold">Sold</option>
              <option value="cancelled">Cancelled</option>
            </select>
            {hasFilters && (
              <button
                type="button"
                onClick={() => { setStatusFilter("all"); setChartFilter(""); setPage(1); }}
                className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </button>
            )}
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-3 py-3 sm:px-4">
          <p className="text-sm text-slate-500">
            <span className="font-bold text-slate-800">{filtered.length}</span> entries
            <span className="mx-1.5 text-slate-300">·</span>
            <span className="font-bold text-slate-800">{activeCount}</span> active
            <span className="mx-1.5 text-slate-300">·</span>
            <span className="font-bold text-slate-800">{formatBdt(totalPurchase)}</span> purchase
            {totalRealizedPl !== 0 && (
              <>
                <span className="mx-1.5 text-slate-300">·</span>
                <span className={clsx("font-bold", totalRealizedPl >= 0 ? "text-emerald-700" : "text-rose-700")}>
                  {totalRealizedPl >= 0 ? "+" : ""}{formatBdt(totalRealizedPl)} P/L
                </span>
              </>
            )}
          </p>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
              Show
              <select
                value={rowsPerPage}
                onChange={(e) => { setRowsPerPage(Number(e.target.value)); setPage(1); }}
                className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm font-bold text-slate-800 outline-none focus:border-blue-400"
              >
                {ROW_OPTIONS.map((n) => (
                  <option key={n} value={n}>{n}</option>
                ))}
              </select>
            </label>
            <div className="relative w-full min-w-[180px] sm:w-52">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="h-9 w-full rounded-lg border border-slate-200 py-0 pl-9 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                placeholder="Search assets..."
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px]">
            <thead>
              <tr className="bg-[#2b4c7e]">
                <th className={clsx(TH, "w-8")} />
                <th className={TH}>Name</th>
                <th className={TH}>Category</th>
                <th className={TH}>Paid From</th>
                <th className={TH}>Purchase</th>
                <th className={TH}>Book Value</th>
                <th className={TH}>P / L</th>
                <th className={TH}>Date</th>
                <th className={TH}>Status</th>
                <th className={clsx(TH, "text-center")}>Action</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((a, idx) => {
                const book = assetBookValue(a);
                const expanded = expandedId === a.id;
                const ledgerTxns = assetTxnsMap.get(a.id) ?? [];
                const hasHistory = ledgerTxns.length > 0 || (a.sales?.length ?? 0) > 0 || !!a.expenseId;
                const soldPct = a.purchaseValue > 0 ? Math.min(100, Math.round((a.soldAmount / a.purchaseValue) * 100)) : 0;
                const pl = assetRealizedProfitLoss(a);

                return (
                  <Fragment key={a.id}>
                    <tr className={clsx("border-b border-slate-100", idx % 2 === 0 ? "bg-white" : "bg-slate-50/60")}>
                      <td className={TD}>
                        {hasHistory ? (
                          <button type="button" onClick={() => setExpandedId(expanded ? null : a.id)} className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700">
                            {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                          </button>
                        ) : null}
                      </td>
                      <td className={TD}>
                        <p className="font-semibold text-slate-800">{a.name}</p>
                        {a.soldAmount > 0 && a.status === "active" && (
                          <div className="mt-1.5 max-w-[160px]">
                            <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                              <div className="h-full rounded-full bg-amber-500" style={{ width: `${soldPct}%` }} />
                            </div>
                            <p className="mt-0.5 text-[10px] text-slate-500">Sold {formatBdt(a.soldAmount)} ({soldPct}%)</p>
                          </div>
                        )}
                        {a.note && <p className="max-w-[200px] truncate text-xs text-slate-500">{a.note}</p>}
                      </td>
                      <td className={TD}>{getChartFixedAssetLabel(a)}</td>
                      <td className={TD}>{a.accountId ? getChartAssetLabelForAccount(a.accountId) : "—"}</td>
                      <td className={TD}>{formatBdt(a.purchaseValue)}</td>
                      <td className={clsx(TD, "font-bold text-amber-700")}>
                        {a.status === "cancelled" ? "—" : book > 0 ? formatBdt(book) : "—"}
                      </td>
                      <td className={TD}>
                        {pl == null ? (
                          "—"
                        ) : (
                          <span
                            className={clsx(
                              "inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold",
                              pl >= 0 ? "bg-emerald-100 text-emerald-700" : "bg-rose-100 text-rose-700"
                            )}
                          >
                            {pl >= 0 ? "Profit" : "Loss"} {pl >= 0 ? "+" : ""}
                            {formatBdt(pl)}
                          </span>
                        )}
                      </td>
                      <td className={TD}>{a.purchaseDate}</td>
                      <td className={TD}>
                        <span className={clsx(
                          "inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold",
                          a.status === "sold" ? "bg-emerald-100 text-emerald-700"
                            : a.status === "cancelled" ? "bg-slate-200 text-slate-600"
                              : "bg-amber-100 text-amber-800"
                        )}>
                          {ASSET_STATUS_LABELS[a.status]}
                        </span>
                      </td>
                      <td className={clsx(TD, "text-center")}>
                        <div className="flex items-center justify-center gap-1">
                          {a.status === "active" && book > 0 && (
                            <button type="button" onClick={() => openSell(a)} className="inline-flex items-center gap-1 rounded-lg bg-amber-50 px-2 py-1.5 text-xs font-bold text-amber-800 hover:bg-amber-100">
                              <Coins className="h-3.5 w-3.5" />
                              Sell
                            </button>
                          )}
                          <button type="button" onClick={(e) => openActionMenu(a, e.currentTarget)} className="inline-flex rounded-lg p-2 text-slate-500 hover:bg-slate-100" aria-label="Actions">
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expanded && hasHistory && (
                      <tr className="bg-slate-50/80">
                        <td colSpan={10} className="px-4 py-3">
                          {pl != null && (
                            <div className="mb-3 flex flex-wrap gap-4 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm">
                              <div>
                                <p className="text-xs text-slate-500">Purchase</p>
                                <p className="font-bold text-slate-800">{formatBdt(a.purchaseValue)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500">Total Sale</p>
                                <p className="font-bold text-emerald-700">{formatBdt(a.soldAmount)}</p>
                              </div>
                              <div>
                                <p className="text-xs text-slate-500">{pl >= 0 ? "Profit" : "Loss"}</p>
                                <p className={clsx("font-bold", pl >= 0 ? "text-emerald-700" : "text-rose-700")}>
                                  {pl >= 0 ? "+" : ""}{formatBdt(pl)}
                                </p>
                              </div>
                            </div>
                          )}
                          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                              Transactions ({ledgerTxns.length})
                            </p>
                            <Link href={assetTransactionsHref(a.id)} className="inline-flex items-center gap-1 text-xs font-bold text-[#2563eb] hover:underline">
                              Open in Transaction page
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          </div>
                          {ledgerTxns.length > 0 && (
                            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-400">
                                    <th className="px-3 py-2">Txn No.</th>
                                    <th className="px-3 py-2">Type</th>
                                    <th className="px-3 py-2">Date</th>
                                    <th className="px-3 py-2">Account</th>
                                    <th className="px-3 py-2">Amount</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {ledgerTxns.map((txn) => (
                                    <tr key={txn.id} className="border-b border-slate-50">
                                      <td className="px-3 py-2 font-semibold text-[#2563eb]">{txn.txnNumber}</td>
                                      <td className="px-3 py-2">{LEDGER_KIND_LABELS[txn.kind]}</td>
                                      <td className="px-3 py-2">{txn.date}{txn.time ? ` · ${txn.time}` : ""}</td>
                                      <td className="px-3 py-2">{txn.accountLabel}</td>
                                      <td className={clsx("px-3 py-2 font-semibold", txn.direction === "in" ? "text-emerald-700" : "text-rose-700")}>
                                        {txn.direction === "in" ? "+" : "−"}{formatBdt(txn.amount)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          )}
                        </td>
                      </tr>
                    )}
                  </Fragment>
                );
              })}
              {paged.length === 0 && (
                <tr>
                  <td colSpan={10} className="px-4 py-12 text-center text-slate-500">
                    No assets recorded yet.
                    <button type="button" onClick={openAdd} className="ml-2 font-bold text-teal-600 hover:underline">
                      Add your first asset
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3">
            <p className="text-sm text-slate-500">Page {safePage} of {totalPages}</p>
            <div className="flex gap-2">
              <button type="button" disabled={safePage <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 disabled:opacity-40">Previous</button>
              <button type="button" disabled={safePage >= totalPages} onClick={() => setPage((p) => Math.min(totalPages, p + 1))} className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 disabled:opacity-40">Next</button>
            </div>
          </div>
        )}
      </div>

      <AssetModal open={modalOpen} edit={editAsset} onClose={() => { setModalOpen(false); setEditAsset(null); }} onSaved={refresh} />
      <SellAssetModal asset={sellAsset} open={!!sellAsset} onClose={() => setSellAsset(null)} onSaved={refresh} />
      <CancelAssetModal
        asset={cancelTarget}
        open={!!cancelTarget}
        onClose={() => { setCancelTarget(null); setCancelError(""); }}
        onConfirm={handleCancelConfirm}
        saving={cancelSaving}
        error={cancelError}
      />

      {menuAnchor && menuAsset && typeof document !== "undefined" && createPortal(
        <div ref={menuRef} style={{ top: menuAnchor.top, left: menuAnchor.left }} className="fixed z-[200] w-40 rounded-xl border border-slate-200 bg-white py-1 shadow-xl">
          {menuAsset.status !== "cancelled" && (
            <button type="button" onClick={() => openEdit(menuAsset)} className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50">
              <Pencil className="h-4 w-4" /> Edit
            </button>
          )}
          <Link href={assetTransactionsHref(menuAsset.id)} onClick={() => setMenuAnchor(null)} className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium text-[#2563eb] hover:bg-blue-50">
            <Receipt className="h-4 w-4" /> Transactions
          </Link>
          {menuAsset.status === "active" && assetBookValue(menuAsset) > 0 && (
            <button type="button" onClick={() => openSell(menuAsset)} className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium text-amber-800 hover:bg-amber-50">
              <Coins className="h-4 w-4" /> Sell
            </button>
          )}
          {menuAsset.status !== "cancelled" && (
            <button type="button" onClick={() => openCancel(menuAsset)} className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50">
              <Ban className="h-4 w-4" /> Cancel
            </button>
          )}
          {menuAsset.status === "cancelled" && (
            <button type="button" onClick={() => handleDelete(menuAsset)} className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50">
              <Trash2 className="h-4 w-4" /> Delete
            </button>
          )}
        </div>,
        document.body
      )}
    </div>
  );
}
