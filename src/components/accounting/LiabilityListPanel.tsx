"use client";

import Link from "next/link";
import { Fragment, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import {
  Banknote,
  Ban,
  ChevronDown,
  ChevronRight,
  ExternalLink,
  MoreVertical,
  Pencil,
  Plus,
  Receipt,
  RotateCcw,
  Scale,
  Search,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import {
  LIABILITY_STATUS_LABELS,
  LIABILITY_TYPE_LABELS,
  cancelLiability,
  deleteLiability,
  formatBdt,
  getChartAssetLabelForAccount,
  getChartLiabilityLabel,
  liabilityOutstanding,
  type AccountingLiability,
  type LiabilityStatus,
  type LiabilityType,
} from "@/lib/accounting-store";
import { useAccountingData } from "./useAccountingData";
import { LiabilityModal } from "./LiabilityModal";
import { PayLiabilityModal } from "./PayLiabilityModal";
import { CancelLiabilityModal } from "./CancelLiabilityModal";
import { paginateSlice } from "@/components/ui/TablePagination";
import {
  buildLedgerTransactions,
  filterLedgerByLiability,
  LEDGER_KIND_LABELS,
  liabilityTransactionsHref,
} from "@/lib/accounting-transactions";

type StatusFilter = "all" | LiabilityStatus;
type TypeFilter = "all" | LiabilityType;

const ROW_OPTIONS = [10, 25, 50, 100] as const;
const TYPES = Object.keys(LIABILITY_TYPE_LABELS) as LiabilityType[];

const FILTER_SELECT =
  "h-9 min-w-[7.5rem] shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100";

const TH =
  "whitespace-nowrap px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wide text-white";
const TD = "whitespace-nowrap px-4 py-3.5 text-sm text-slate-700";

type MenuAnchor = { id: string; top: number; left: number };

export function LiabilityListPanel() {
  const { data, refresh } = useAccountingData();
  const menuRef = useRef<HTMLDivElement>(null);

  const [search, setSearch] = useState("");
  const [typeFilter, setTypeFilter] = useState<TypeFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [chartFilter, setChartFilter] = useState("");
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState<number>(10);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [menuAnchor, setMenuAnchor] = useState<MenuAnchor | null>(null);

  const [modalOpen, setModalOpen] = useState(false);
  const [editLiability, setEditLiability] = useState<AccountingLiability | null>(null);
  const [payLiability, setPayLiability] = useState<AccountingLiability | null>(null);
  const [cancelTarget, setCancelTarget] = useState<AccountingLiability | null>(null);
  const [cancelError, setCancelError] = useState("");
  const [cancelSaving, setCancelSaving] = useState(false);

  const liabilityChartAccounts = useMemo(
    () =>
      [...(data.chartAccounts ?? [])]
        .filter((c) => c.group === "liability" && c.active)
        .sort((a, b) => a.name.localeCompare(b.name)),
    [data.chartAccounts]
  );

  const liabilityTxnsMap = useMemo(() => {
    const all = buildLedgerTransactions(data);
    return new Map(data.liabilities.map((l) => [l.id, filterLedgerByLiability(all, l.id)]));
  }, [data]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return [...data.liabilities]
      .filter((l) => {
        if (typeFilter !== "all" && l.type !== typeFilter) return false;
        if (statusFilter !== "all" && l.status !== statusFilter) return false;
        if (chartFilter && l.chartAccountId !== chartFilter) return false;
        if (!q) return true;
        return (
          l.name.toLowerCase().includes(q) ||
          getChartLiabilityLabel(l).toLowerCase().includes(q) ||
          LIABILITY_TYPE_LABELS[l.type].toLowerCase().includes(q) ||
          (l.note ?? "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) => {
        const aOut = liabilityOutstanding(a);
        const bOut = liabilityOutstanding(b);
        if (a.status !== b.status) {
          if (a.status === "active") return -1;
          if (b.status === "active") return 1;
        }
        if (aOut !== bOut) return bOut - aOut;
        return b.name.localeCompare(a.name);
      });
  }, [data.liabilities, search, typeFilter, statusFilter, chartFilter]);

  const totalPages = Math.max(1, Math.ceil(filtered.length / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const paged = paginateSlice(filtered, safePage, rowsPerPage);

  const totalOutstanding = data.liabilities
    .filter((l) => l.status === "active")
    .reduce((s, l) => s + liabilityOutstanding(l), 0);
  const totalPrincipal = filtered.reduce((s, l) => s + l.amount, 0);
  const activeCount = filtered.filter((l) => l.status === "active").length;

  const menuLiability = useMemo(
    () => (menuAnchor ? data.liabilities.find((l) => l.id === menuAnchor.id) : undefined),
    [menuAnchor, data.liabilities]
  );

  useEffect(() => {
    if (!menuAnchor) return;
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setMenuAnchor(null);
      }
    };
    const onScroll = () => setMenuAnchor(null);
    document.addEventListener("mousedown", close);
    window.addEventListener("scroll", onScroll, true);
    return () => {
      document.removeEventListener("mousedown", close);
      window.removeEventListener("scroll", onScroll, true);
    };
  }, [menuAnchor]);

  const hasFilters =
    typeFilter !== "all" || statusFilter !== "all" || chartFilter !== "";

  const resetFilters = () => {
    setTypeFilter("all");
    setStatusFilter("all");
    setChartFilter("");
    setPage(1);
  };

  const openAdd = () => {
    setEditLiability(null);
    setModalOpen(true);
  };

  const openEdit = (l: AccountingLiability) => {
    setEditLiability(l);
    setModalOpen(true);
    setMenuAnchor(null);
  };

  const openPay = (l: AccountingLiability) => {
    setPayLiability(l);
    setMenuAnchor(null);
  };

  const openCancel = (l: AccountingLiability) => {
    setCancelTarget(l);
    setCancelError("");
    setMenuAnchor(null);
  };

  const openActionMenu = (l: AccountingLiability, button: HTMLButtonElement) => {
    const rect = button.getBoundingClientRect();
    setMenuAnchor({
      id: l.id,
      top: rect.bottom + 4,
      left: Math.max(8, rect.right - 160),
    });
  };

  const handleCancelConfirm = () => {
    if (!cancelTarget) return;
    setCancelSaving(true);
    setCancelError("");
    const result = cancelLiability(cancelTarget.id);
    setCancelSaving(false);
    if (!result.ok) {
      setCancelError(result.message);
      return;
    }
    setCancelTarget(null);
    refresh();
  };

  const handleDelete = (l: AccountingLiability) => {
    if (l.status !== "cancelled") {
      alert("Cancel this liability first before deleting.");
      return;
    }
    if (confirm(`Permanently delete "${l.name}"?`)) {
      deleteLiability(l.id);
      refresh();
    }
    setMenuAnchor(null);
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-slate-900">
            <Scale className="h-7 w-7 text-rose-500" />
            Liabilities
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Loans & payables — outstanding{" "}
            <span className="font-bold text-rose-600">{formatBdt(totalOutstanding)}</span>
            <span className="mx-1.5 text-slate-300">·</span>
            <Link
              href="/dashboard/accounting/transactions?filter=liability"
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
          <Plus className="h-4 w-4" /> Add Liability
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
              onChange={(e) => {
                setChartFilter(e.target.value);
                setPage(1);
              }}
            >
              <option value="">Liability Account</option>
              {liabilityChartAccounts.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>

            <select
              className={FILTER_SELECT}
              value={typeFilter}
              onChange={(e) => {
                setTypeFilter(e.target.value as TypeFilter);
                setPage(1);
              }}
            >
              <option value="all">All Types</option>
              {TYPES.map((t) => (
                <option key={t} value={t}>
                  {LIABILITY_TYPE_LABELS[t]}
                </option>
              ))}
            </select>

            <select
              className={FILTER_SELECT}
              value={statusFilter}
              onChange={(e) => {
                setStatusFilter(e.target.value as StatusFilter);
                setPage(1);
              }}
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="paid">Paid</option>
              <option value="cancelled">Cancelled</option>
            </select>

            {hasFilters && (
              <button
                type="button"
                onClick={resetFilters}
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
            <span className="font-bold text-slate-800">{formatBdt(totalPrincipal)}</span> total
          </p>

          <div className="ml-auto flex flex-wrap items-center gap-2">
            <label className="flex items-center gap-1.5 text-sm font-medium text-slate-600">
              Show
              <select
                value={rowsPerPage}
                onChange={(e) => {
                  setRowsPerPage(Number(e.target.value));
                  setPage(1);
                }}
                className="h-9 rounded-lg border border-slate-200 bg-white px-2 text-sm font-bold text-slate-800 outline-none focus:border-blue-400"
              >
                {ROW_OPTIONS.map((n) => (
                  <option key={n} value={n}>
                    {n}
                  </option>
                ))}
              </select>
            </label>

            <div className="relative w-full min-w-[180px] sm:w-52">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="h-9 w-full rounded-lg border border-slate-200 py-0 pl-9 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                placeholder="Search liabilities..."
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px]">
            <thead>
              <tr className="bg-[#2b4c7e]">
                <th className={clsx(TH, "w-8")} />
                <th className={TH}>Creditor</th>
                <th className={TH}>Liability Account</th>
                <th className={TH}>Type</th>
                <th className={TH}>Received In</th>
                <th className={TH}>Total</th>
                <th className={TH}>Outstanding</th>
                <th className={TH}>Due</th>
                <th className={TH}>Status</th>
                <th className={clsx(TH, "text-center")}>Action</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((l, idx) => {
                const out = liabilityOutstanding(l);
                const expanded = expandedId === l.id;
                const payments = l.payments ?? [];
                const ledgerTxns = liabilityTxnsMap.get(l.id) ?? [];
                const hasHistory = ledgerTxns.length > 0 || payments.length > 0 || !!l.incomeId;
                const paidPct =
                  l.amount > 0 ? Math.min(100, Math.round((l.paidAmount / l.amount) * 100)) : 0;

                return (
                  <Fragment key={l.id}>
                    <tr
                      className={clsx(
                        "border-b border-slate-100",
                        idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"
                      )}
                    >
                      <td className={TD}>
                        {hasHistory ? (
                          <button
                            type="button"
                            onClick={() => setExpandedId(expanded ? null : l.id)}
                            className="rounded p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-700"
                            title="Transactions & payments"
                          >
                            {expanded ? (
                              <ChevronDown className="h-4 w-4" />
                            ) : (
                              <ChevronRight className="h-4 w-4" />
                            )}
                          </button>
                        ) : null}
                      </td>
                      <td className={TD}>
                        <p className="font-semibold text-slate-800">{l.name}</p>
                        {l.status === "active" && l.paidAmount > 0 && (
                          <div className="mt-1.5 max-w-[160px]">
                            <div className="h-1.5 overflow-hidden rounded-full bg-slate-200">
                              <div
                                className="h-full rounded-full bg-teal-500"
                                style={{ width: `${paidPct}%` }}
                              />
                            </div>
                            <p className="mt-0.5 text-[10px] text-slate-500">
                              Paid {formatBdt(l.paidAmount)} ({paidPct}%)
                            </p>
                          </div>
                        )}
                        {l.note && (
                          <p className="max-w-[200px] truncate text-xs text-slate-500">{l.note}</p>
                        )}
                      </td>
                      <td className={TD}>{getChartLiabilityLabel(l)}</td>
                      <td className={TD}>{LIABILITY_TYPE_LABELS[l.type]}</td>
                      <td className={TD}>
                        {l.accountId ? getChartAssetLabelForAccount(l.accountId) : "—"}
                      </td>
                      <td className={TD}>{formatBdt(l.amount)}</td>
                      <td className={clsx(TD, "font-bold text-rose-600")}>
                        {l.status === "cancelled" ? "—" : out > 0 ? formatBdt(out) : "—"}
                      </td>
                      <td className={TD}>{l.dueDate ?? "—"}</td>
                      <td className={TD}>
                        <span
                          className={clsx(
                            "inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold",
                            l.status === "paid"
                              ? "bg-emerald-100 text-emerald-700"
                              : l.status === "cancelled"
                                ? "bg-slate-200 text-slate-600"
                                : "bg-amber-100 text-amber-800"
                          )}
                        >
                          {LIABILITY_STATUS_LABELS[l.status]}
                        </span>
                      </td>
                      <td className={clsx(TD, "text-center")}>
                        <div className="flex items-center justify-center gap-1">
                          {l.status === "active" && out > 0 && (
                            <button
                              type="button"
                              onClick={() => openPay(l)}
                              className="inline-flex items-center gap-1 rounded-lg bg-teal-50 px-2 py-1.5 text-xs font-bold text-teal-700 hover:bg-teal-100"
                              title="Pay liability"
                            >
                              <Banknote className="h-3.5 w-3.5" />
                              Pay
                            </button>
                          )}
                          <button
                            type="button"
                            onClick={(e) => openActionMenu(l, e.currentTarget)}
                            className="inline-flex rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                            aria-label="Actions"
                          >
                            <MoreVertical className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expanded && hasHistory && (
                      <tr key={`${l.id}-history`} className="bg-slate-50/80">
                        <td colSpan={10} className="px-4 py-3">
                          <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
                            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
                              Transactions ({ledgerTxns.length || payments.length})
                            </p>
                            <Link
                              href={liabilityTransactionsHref(l.id)}
                              className="inline-flex items-center gap-1 text-xs font-bold text-[#2563eb] hover:underline"
                            >
                              Open in Transaction page
                              <ExternalLink className="h-3 w-3" />
                            </Link>
                          </div>
                          {ledgerTxns.length > 0 ? (
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
                                      <td className="px-3 py-2 font-semibold text-[#2563eb]">
                                        {txn.txnNumber}
                                      </td>
                                      <td className="px-3 py-2">{LEDGER_KIND_LABELS[txn.kind]}</td>
                                      <td className="px-3 py-2">
                                        {txn.date}
                                        {txn.time ? ` · ${txn.time}` : ""}
                                      </td>
                                      <td className="px-3 py-2">{txn.accountLabel}</td>
                                      <td
                                        className={clsx(
                                          "px-3 py-2 font-semibold",
                                          txn.direction === "in"
                                            ? "text-emerald-700"
                                            : "text-rose-700"
                                        )}
                                      >
                                        {txn.direction === "in" ? "+" : "−"}
                                        {formatBdt(txn.amount)}
                                      </td>
                                    </tr>
                                  ))}
                                </tbody>
                              </table>
                            </div>
                          ) : (
                            <div className="overflow-x-auto rounded-xl border border-slate-200 bg-white">
                              <table className="w-full text-sm">
                                <thead>
                                  <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-400">
                                    <th className="px-3 py-2">Date</th>
                                    <th className="px-3 py-2">Time</th>
                                    <th className="px-3 py-2">Paid From</th>
                                    <th className="px-3 py-2">Amount</th>
                                    <th className="px-3 py-2">Note</th>
                                  </tr>
                                </thead>
                                <tbody>
                                  {[...payments].reverse().map((p) => (
                                    <tr key={p.id} className="border-b border-slate-50">
                                      <td className="px-3 py-2">{p.date}</td>
                                      <td className="px-3 py-2">{p.time}</td>
                                      <td className="px-3 py-2">
                                        {getChartAssetLabelForAccount(p.accountId)}
                                      </td>
                                      <td className="px-3 py-2 font-semibold text-slate-800">
                                        {formatBdt(p.amount)}
                                      </td>
                                      <td className="px-3 py-2 text-slate-500">{p.note ?? "—"}</td>
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
                    No liabilities recorded yet.
                    <button
                      type="button"
                      onClick={openAdd}
                      className="ml-2 font-bold text-teal-600 hover:underline"
                    >
                      Add your first liability
                    </button>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {totalPages > 1 && (
          <div className="flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 px-4 py-3">
            <p className="text-sm text-slate-500">
              Page {safePage} of {totalPages}
            </p>
            <div className="flex gap-2">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 disabled:opacity-40"
              >
                Previous
              </button>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border border-slate-200 px-3 py-1.5 text-sm font-medium text-slate-600 disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}
      </div>

      <LiabilityModal
        open={modalOpen}
        edit={editLiability}
        onClose={() => {
          setModalOpen(false);
          setEditLiability(null);
        }}
        onSaved={refresh}
      />

      <PayLiabilityModal
        liability={payLiability}
        open={!!payLiability}
        onClose={() => setPayLiability(null)}
        onSaved={refresh}
      />

      <CancelLiabilityModal
        liability={cancelTarget}
        open={!!cancelTarget}
        onClose={() => {
          setCancelTarget(null);
          setCancelError("");
        }}
        onConfirm={handleCancelConfirm}
        saving={cancelSaving}
        error={cancelError}
      />

      {menuAnchor &&
        menuLiability &&
        typeof document !== "undefined" &&
        createPortal(
          <div
            ref={menuRef}
            style={{ top: menuAnchor.top, left: menuAnchor.left }}
            className="fixed z-[200] w-40 rounded-xl border border-slate-200 bg-white py-1 shadow-xl"
          >
            {menuLiability.status !== "cancelled" && (
              <button
                type="button"
                onClick={() => openEdit(menuLiability)}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
              >
                <Pencil className="h-4 w-4" /> Edit
              </button>
            )}
            <Link
              href={liabilityTransactionsHref(menuLiability.id)}
              onClick={() => setMenuAnchor(null)}
              className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium text-[#2563eb] hover:bg-blue-50"
            >
              <Receipt className="h-4 w-4" /> Transactions
            </Link>
            {menuLiability.status === "active" &&
              liabilityOutstanding(menuLiability) > 0 && (
                <button
                  type="button"
                  onClick={() => openPay(menuLiability)}
                  className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium text-teal-700 hover:bg-teal-50"
                >
                  <Banknote className="h-4 w-4" /> Pay
                </button>
              )}
            {menuLiability.status !== "cancelled" && (
              <button
                type="button"
                onClick={() => openCancel(menuLiability)}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50"
              >
                <Ban className="h-4 w-4" /> Cancel
              </button>
            )}
            {menuLiability.status === "cancelled" && (
              <button
                type="button"
                onClick={() => handleDelete(menuLiability)}
                className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50"
              >
                <Trash2 className="h-4 w-4" /> Delete
              </button>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
