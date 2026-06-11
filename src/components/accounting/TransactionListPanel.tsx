"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useSearchParams } from "next/navigation";
import clsx from "clsx";
import { Calendar, ChevronDown, Eye, Receipt, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  DEFAULT_ROWS_PER_PAGE,
  paginateSlice,
  TablePagination,
} from "@/components/ui/TablePagination";
import {
  formatBdt,
  getAssetById,
  getLiabilityById,
  TRANSFER_STATUS_LABELS,
} from "@/lib/accounting-store";
import {
  buildLedgerTransactions,
  filterLedgerByAsset,
  filterLedgerByLiability,
  fromInputDate,
  isAssetLedgerKind,
  isLiabilityLedgerKind,
  LEDGER_KIND_LABELS,
  ledgerMatchesDateRange,
  ledgerMatchesFilter,
  listLedgerActors,
  toInputDate,
  type LedgerFilter,
  type LedgerTransaction,
} from "@/lib/accounting-transactions";
import { useAccountingData } from "./useAccountingData";
import { TransactionDetailModal } from "./TransactionDetailModal";

type DateFilterMode = "all" | "today" | "tomorrow" | "pick";

const FILTER_TABS: { id: LedgerFilter; label: string }[] = [
  { id: "all", label: "All" },
  { id: "advance", label: "Advance" },
  { id: "full_payment", label: "Full Payment" },
  { id: "transfer", label: "Transfer" },
  { id: "liability", label: "Liability" },
  { id: "asset", label: "Asset" },
  { id: "income", label: "Income" },
  { id: "delivery_charge", label: "Delivery Charge" },
  { id: "expense", label: "Expense" },
];

function kindBadgeClass(kind: LedgerTransaction["kind"]): string {
  if (kind === "advance") return "bg-violet-100 text-violet-700";
  if (kind === "full_payment") return "bg-sky-100 text-sky-700";
  if (kind === "transfer") return "bg-indigo-100 text-indigo-700";
  if (kind === "liability_received") return "bg-amber-100 text-amber-800";
  if (kind === "liability_payment") return "bg-orange-100 text-orange-800";
  if (kind === "asset_purchase") return "bg-amber-100 text-amber-800";
  if (kind === "asset_sale") return "bg-lime-100 text-lime-800";
  if (kind === "expense") return "bg-rose-100 text-rose-700";
  if (kind === "delivery_charge") return "bg-orange-100 text-orange-800";
  return "bg-teal-100 text-teal-700";
}

function amountClass(direction: LedgerTransaction["direction"]): string {
  if (direction === "in") return "text-emerald-700";
  if (direction === "out") return "text-rose-700";
  return "text-indigo-700";
}

function formatPickDateLabel(value: string): string {
  const d = fromInputDate(value);
  if (!d) return "";
  return d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function dateFilterBounds(mode: DateFilterMode, pickDate: string) {
  const now = new Date();
  if (mode === "today") {
    const d = toInputDate(now);
    return { from: d, to: d };
  }
  if (mode === "tomorrow") {
    const next = new Date(now);
    next.setDate(now.getDate() + 1);
    const d = toInputDate(next);
    return { from: d, to: d };
  }
  if (mode === "pick" && pickDate) return { from: pickDate, to: pickDate };
  return { from: "", to: "" };
}

function dateFilterLabel(mode: DateFilterMode, pickDate: string): string {
  if (mode === "all") return "All dates";
  if (mode === "today") return "Today";
  if (mode === "tomorrow") return "Tomorrow";
  if (pickDate) return formatPickDateLabel(pickDate);
  return "Pick a date";
}

export function TransactionListPanel() {
  const dateMenuRef = useRef<HTMLDivElement>(null);
  const searchParams = useSearchParams();
  const { data } = useAccountingData();
  const [search, setSearch] = useState("");
  const [filter, setFilter] = useState<LedgerFilter>("all");
  const [liabilityFilter, setLiabilityFilter] = useState<string | null>(null);
  const [assetFilter, setAssetFilter] = useState<string | null>(null);
  const [userFilter, setUserFilter] = useState("all");
  const [dateMode, setDateMode] = useState<DateFilterMode>("all");
  const [pickDate, setPickDate] = useState("");
  const [dateOpen, setDateOpen] = useState(false);
  const [viewTxn, setViewTxn] = useState<LedgerTransaction | null>(null);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE);

  const liaParam = searchParams.get("lia");
  const astParam = searchParams.get("ast");
  const filterParam = searchParams.get("filter");

  useEffect(() => {
    if (filterParam === "liability") setFilter("liability");
    if (filterParam === "asset") setFilter("asset");
    if (filterParam === "delivery_charge") setFilter("delivery_charge");
    if (liaParam) setLiabilityFilter(liaParam);
    if (astParam) setAssetFilter(astParam);
  }, [filterParam, liaParam, astParam]);

  const filteredLiability = liabilityFilter ? getLiabilityById(liabilityFilter) : undefined;
  const filteredAsset = assetFilter ? getAssetById(assetFilter) : undefined;

  const { from: activeDateFrom, to: activeDateTo } = dateFilterBounds(dateMode, pickDate);

  useEffect(() => {
    if (!dateOpen) return;
    const onPointer = (e: MouseEvent) => {
      if (!dateMenuRef.current?.contains(e.target as Node)) setDateOpen(false);
    };
    document.addEventListener("mousedown", onPointer);
    return () => document.removeEventListener("mousedown", onPointer);
  }, [dateOpen]);

  const allRows = useMemo(() => buildLedgerTransactions(data), [data]);
  const actorOptions = useMemo(() => listLedgerActors(allRows), [allRows]);

  const filterCounts = useMemo(() => {
    const counts: Record<LedgerFilter, number> = {
      all: allRows.length,
      advance: 0,
      full_payment: 0,
      transfer: 0,
      liability: 0,
      asset: 0,
      income: 0,
      delivery_charge: 0,
      expense: 0,
      liability_received: 0,
      liability_payment: 0,
      asset_purchase: 0,
      asset_sale: 0,
    };
    for (const row of allRows) {
      counts[row.kind]++;
      if (isLiabilityLedgerKind(row.kind)) counts.liability++;
      if (isAssetLedgerKind(row.kind)) counts.asset++;
    }
    return counts;
  }, [allRows]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    let rows = allRows;
    if (liabilityFilter) {
      rows = filterLedgerByLiability(rows, liabilityFilter);
    }
    if (assetFilter) {
      rows = filterLedgerByAsset(rows, assetFilter);
    }
    return rows.filter((row) => {
      if (!ledgerMatchesFilter(row, filter)) return false;
      if (userFilter !== "all" && row.recordedByName !== userFilter) return false;
      if (!ledgerMatchesDateRange(row, activeDateFrom, activeDateTo)) return false;
      if (!q) return true;
      return (
        row.txnNumber.toLowerCase().includes(q) ||
        row.title.toLowerCase().includes(q) ||
        (row.subtitle ?? "").toLowerCase().includes(q) ||
        row.accountLabel.toLowerCase().includes(q) ||
        row.recordedByName.toLowerCase().includes(q) ||
        row.recordedByRoleLabel.toLowerCase().includes(q) ||
        (row.counterpartyLabel ?? "").toLowerCase().includes(q) ||
        (row.orderRef ?? "").toLowerCase().includes(q) ||
        (row.invoiceRef ?? "").toLowerCase().includes(q) ||
        (row.customerName ?? "").toLowerCase().includes(q) ||
        (row.customerPhone ?? "").includes(q) ||
        (row.reference ?? "").toLowerCase().includes(q) ||
        (row.note ?? "").toLowerCase().includes(q)
      );
    });
  }, [allRows, filter, userFilter, search, activeDateFrom, activeDateTo, liabilityFilter, assetFilter]);

  useEffect(() => {
    setPage(1);
  }, [filter, userFilter, search, dateMode, pickDate, liabilityFilter, assetFilter]);

  const paged = useMemo(
    () => paginateSlice(filtered, page, rowsPerPage),
    [filtered, page, rowsPerPage]
  );

  const hasActiveFilters =
    filter !== "all" ||
    userFilter !== "all" ||
    dateMode !== "all" ||
    Boolean(search.trim()) ||
    Boolean(liabilityFilter) ||
    Boolean(assetFilter);

  const moneyIn = filtered.filter((r) => r.direction === "in").reduce((s, r) => s + r.amount, 0);
  const moneyOut = filtered.filter((r) => r.direction === "out").reduce((s, r) => s + r.amount, 0);
  const transferred = filtered
    .filter(
      (r) => r.direction === "internal" && r.status !== TRANSFER_STATUS_LABELS.cancelled
    )
    .reduce((s, r) => s + r.amount, 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Transaction" />

      {filteredAsset && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-900">
            Showing transactions for asset{" "}
            <span className="font-bold">{filteredAsset.name}</span>
          </p>
          <button
            type="button"
            onClick={() => {
              setAssetFilter(null);
              window.history.replaceState(null, "", "/dashboard/accounting/transactions");
            }}
            className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-amber-800 ring-1 ring-amber-200 hover:bg-amber-100"
          >
            Show all transactions
          </button>
        </div>
      )}

      {filteredLiability && (
        <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
          <p className="text-sm text-amber-900">
            Showing transactions for liability{" "}
            <span className="font-bold">{filteredLiability.name}</span>
          </p>
          <button
            type="button"
            onClick={() => {
              setLiabilityFilter(null);
              window.history.replaceState(null, "", "/dashboard/accounting/transactions");
            }}
            className="rounded-lg bg-white px-3 py-1.5 text-xs font-bold text-amber-800 ring-1 ring-amber-200 hover:bg-amber-100"
          >
            Show all transactions
          </button>
        </div>
      )}

      <div className="flex flex-wrap gap-2">
        {FILTER_TABS.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setFilter(tab.id)}
            className={clsx(
              "rounded-xl px-3 py-2 text-sm font-bold transition sm:px-4",
              filter === tab.id
                ? "bg-slate-800 text-white shadow-md"
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            )}
          >
            {tab.label}
            {filterCounts[tab.id] > 0 && (
              <span
                className={clsx(
                  "ml-1.5 rounded-full px-1.5 py-0.5 text-xs",
                  filter === tab.id ? "bg-white/25" : "bg-slate-100 text-slate-600"
                )}
              >
                {filterCounts[tab.id]}
              </span>
            )}
          </button>
        ))}
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
          <p className="text-sm text-slate-500">
            <span className="font-bold text-slate-800">{filtered.length}</span> transactions
            <span className="mx-1.5 text-slate-300">·</span>
            <span className="font-bold text-emerald-700">{formatBdt(moneyIn)}</span> in
            <span className="mx-1.5 text-slate-300">·</span>
            <span className="font-bold text-rose-700">{formatBdt(moneyOut)}</span> out
            {transferred > 0 && (
              <>
                <span className="mx-1.5 text-slate-300">·</span>
                <span className="font-bold text-indigo-700">{formatBdt(transferred)}</span> transferred
              </>
            )}
          </p>

          <div className="flex min-w-[190px] flex-1 items-center justify-center px-2">
            <div ref={dateMenuRef} className="relative w-full max-w-[240px]">
              <button
                type="button"
                onClick={() => setDateOpen((o) => !o)}
                className={clsx(
                  "flex h-9 w-full items-center gap-2 rounded-lg border bg-white pl-3 pr-2.5 text-left text-sm transition",
                  dateMode !== "all"
                    ? "border-blue-300 ring-2 ring-blue-100"
                    : "border-slate-200 hover:border-blue-300"
                )}
              >
                <Calendar className="h-4 w-4 shrink-0 text-slate-400" />
                <span
                  className={clsx(
                    "min-w-0 flex-1 truncate font-medium",
                    dateMode !== "all" ? "text-slate-800" : "text-slate-500"
                  )}
                >
                  {dateFilterLabel(dateMode, pickDate)}
                </span>
                <ChevronDown
                  className={clsx(
                    "h-4 w-4 shrink-0 text-slate-400 transition",
                    dateOpen && "rotate-180"
                  )}
                />
              </button>

              {dateOpen && (
                <div className="absolute left-1/2 top-full z-30 mt-1.5 w-56 -translate-x-1/2 rounded-xl border border-slate-200 bg-white p-2 shadow-xl">
                  {(
                    [
                      { id: "all" as const, label: "All dates" },
                      { id: "today" as const, label: "Today" },
                      { id: "tomorrow" as const, label: "Tomorrow" },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.id}
                      type="button"
                      onClick={() => {
                        setDateMode(opt.id);
                        setPickDate("");
                        setDateOpen(false);
                      }}
                      className={clsx(
                        "flex w-full rounded-lg px-3 py-2 text-left text-sm font-semibold transition",
                        dateMode === opt.id
                          ? "bg-blue-50 text-blue-700"
                          : "text-slate-700 hover:bg-slate-50"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                  <div className="mt-1 border-t border-slate-100 pt-2">
                    <p className="px-1 pb-1.5 text-xs font-bold uppercase tracking-wide text-slate-400">
                      Pick a date
                    </p>
                    <input
                      type="date"
                      value={pickDate}
                      onChange={(e) => {
                        setPickDate(e.target.value);
                        setDateMode("pick");
                        setDateOpen(false);
                      }}
                      className="h-9 w-full rounded-lg border border-slate-200 px-2.5 text-sm text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex w-full flex-wrap items-center gap-2 sm:ml-auto sm:w-auto">
            {actorOptions.length > 0 && (
              <select
                className="h-9 min-w-[140px] rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-medium text-slate-700 outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                value={userFilter}
                onChange={(e) => setUserFilter(e.target.value)}
              >
                <option value="all">All users</option>
                {actorOptions.map((name) => (
                  <option key={name} value={name}>
                    {name}
                  </option>
                ))}
              </select>
            )}
            <div className="relative min-w-[180px] flex-1 sm:w-64 sm:flex-none">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                className="h-9 w-full rounded-lg border border-slate-200 py-0 pl-9 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                placeholder="Search txn no, order, customer..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1180px] table-fixed">
            <thead>
              <tr className="bg-[#2b4c7e]">
                <th className="w-[130px] px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wide text-white">
                  Txn No.
                </th>
                <th className="w-[110px] px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wide text-white">
                  Date
                </th>
                <th className="w-[120px] px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wide text-white">
                  Type
                </th>
                <th className="w-[200px] px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wide text-white">
                  Description
                </th>
                <th className="w-[140px] px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wide text-white">
                  Account
                </th>
                <th className="w-[90px] px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wide text-white">
                  Amount
                </th>
                <th className="w-[120px] px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wide text-white">
                  How
                </th>
                <th className="w-[120px] px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wide text-white">
                  By user
                </th>
                <th className="w-[90px] px-4 py-3.5 text-center text-xs font-bold uppercase tracking-wide text-white">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {paged.map((row, idx) => (
                <tr
                  key={row.id}
                  className={clsx(
                    "border-b border-slate-100",
                    idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"
                  )}
                >
                  <td className="px-4 py-3.5 text-sm font-bold text-[#2563eb]">{row.txnNumber}</td>
                  <td className="px-4 py-3.5 text-sm text-slate-700">
                    <p>{row.date}</p>
                    {row.time && <p className="text-xs text-slate-400">{row.time}</p>}
                  </td>
                  <td className="px-4 py-3.5">
                    <span
                      className={clsx(
                        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold",
                        kindBadgeClass(row.kind)
                      )}
                    >
                      {LEDGER_KIND_LABELS[row.kind]}
                    </span>
                  </td>
                  <td className="px-4 py-3.5 text-sm">
                    <p className="font-semibold text-slate-800">{row.title}</p>
                    {row.customerName && (
                      <p className="text-xs text-slate-500">
                        {row.customerName}
                        {row.customerPhone ? ` · ${row.customerPhone}` : ""}
                      </p>
                    )}
                    {row.orderRef && (
                      <p className="text-xs font-medium text-blue-600">Order {row.orderRef}</p>
                    )}
                    {(row.discountAmount ?? 0) > 0 && (
                      <p className="text-xs font-semibold text-amber-700">
                        Discount −{formatBdt(row.discountAmount!)} · Due cleared{" "}
                        {formatBdt(row.amount + row.discountAmount!)}
                      </p>
                    )}
                    {row.subtitle && !row.customerName && !(row.discountAmount ?? 0) && (
                      <p className="text-xs text-slate-500">{row.subtitle}</p>
                    )}
                  </td>
                  <td className="px-4 py-3.5 text-sm text-slate-700">{row.accountLabel}</td>
                  <td className={clsx("px-4 py-3.5 text-sm font-bold", amountClass(row.direction))}>
                    {row.direction === "out" ? "−" : row.direction === "in" ? "+" : ""}
                    {formatBdt(row.amount)}
                  </td>
                  <td className="px-4 py-3.5 text-sm text-slate-600">
                    {row.methodLabel ?? "—"}
                  </td>
                  <td className="px-4 py-3.5 text-sm">
                    <p className="font-semibold text-slate-800">{row.recordedByName}</p>
                    <p className="text-xs text-slate-500">{row.recordedByRoleLabel}</p>
                  </td>
                  <td className="px-4 py-3.5 text-center">
                    <button
                      type="button"
                      onClick={() => setViewTxn(row)}
                      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                    >
                      <Eye className="h-3.5 w-3.5" />
                      View
                    </button>
                  </td>
                </tr>
              ))}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-slate-500">
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                        <Receipt className="h-6 w-6" />
                      </span>
                      <p className="text-sm font-medium">
                        {hasActiveFilters ? "No transactions match your filters." : "No transactions yet."}
                      </p>
                      <p className="text-xs text-slate-400">
                        {hasActiveFilters
                          ? "Try a different date range or clear filters."
                          : "Advance payments, full payments, transfers, liabilities & expenses appear here automatically."}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          totalRows={filtered.length}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={setPage}
          onRowsPerPageChange={setRowsPerPage}
          variant="indigo"
        />
      </div>

      <TransactionDetailModal
        txn={viewTxn}
        open={Boolean(viewTxn)}
        onClose={() => setViewTxn(null)}
      />
    </div>
  );
}
