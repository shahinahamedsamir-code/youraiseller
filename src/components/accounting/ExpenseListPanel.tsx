"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import clsx from "clsx";
import {
  Download,
  MoreVertical,
  RotateCcw,
  Search,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import {
  EXPENSE_STATUS_LABELS,
  deleteExpense,
  formatBdtDecimal,
  getAccountById,
  getChartAssetLabelForAccount,
  loadAccountingData,
  listExpensePaidFromAssets,
  type AccountingExpense,
  type ExpenseStatus,
} from "@/lib/accounting-store";
import { isOrderDeliveryChargeExpense } from "@/lib/order-delivery-expense";
import { getOrder } from "@/lib/orders-store";
import { useAccountingData } from "./useAccountingData";
import { paginateSlice } from "@/components/ui/TablePagination";

type RangeKey = "all" | "today" | "week" | "month" | "custom";

function isReturnDeliveryChargeExpense(e: AccountingExpense): boolean {
  return Boolean(e.reference?.trim().endsWith("#return_delivery_expense"));
}

function isChargeExpense(e: AccountingExpense): boolean {
  return (
    e.status === "approved" &&
    (e.category === "courier" || isReturnDeliveryChargeExpense(e) || isOrderDeliveryChargeExpense(e))
  );
}

function isPendingChargeExpense(e: AccountingExpense): boolean {
  return e.status === "draft" && e.category === "courier";
}

type ExpenseFilters = {
  expenseFrom: string;
  expenseTo: string;
  range: RangeKey;
  statusApproved: boolean;
  statusDraft: boolean;
  dateFrom: string;
  dateTo: string;
};

const DEFAULT_FILTERS: ExpenseFilters = {
  expenseFrom: "",
  expenseTo: "",
  range: "all",
  statusApproved: true,
  statusDraft: true,
  dateFrom: "",
  dateTo: "",
};

const ROW_OPTIONS = [10, 25, 50, 100] as const;

const FILTER_SELECT =
  "h-9 min-w-[7.5rem] shrink-0 rounded-lg border border-slate-200 bg-white px-2.5 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100";
const FILTER_DATE =
  "h-9 w-[8.75rem] shrink-0 rounded-lg border border-slate-200 bg-white px-2 text-sm font-medium text-slate-700 outline-none transition focus:border-blue-400 focus:ring-2 focus:ring-blue-100";

function expenseInvoiceNo(e: AccountingExpense): string {
  return e.reference?.trim() || e.refNumber || "—";
}

function expenseDisplayInvoiceNo(e: AccountingExpense): string {
  if (isReturnDeliveryChargeExpense(e)) {
    const orderId = e.reference?.replace("#return_delivery_expense", "").trim();
    if (orderId) return orderId;
  }
  if (isOrderDeliveryChargeExpense(e)) {
    const orderId = e.reference?.replace("#delivery_charge", "").trim();
    if (orderId) {
      const order = getOrder(orderId);
      return order?.invoiceNumber ?? orderId;
    }
  }
  return expenseInvoiceNo(e);
}

function expenseCategoryLabel(e: AccountingExpense): { main: string; sub?: string } {
  if (isReturnDeliveryChargeExpense(e)) {
    return {
      main: e.expenseTo ?? "Delivery Charge",
      sub: e.title,
    };
  }
  if (isOrderDeliveryChargeExpense(e)) {
    return {
      main: e.expenseTo ?? "Courier Charge",
      sub: e.title,
    };
  }
  return {
    main: e.title,
    sub: e.vendor,
  };
}

const TH =
  "whitespace-nowrap px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wide text-white";
const TD = "px-4 py-3.5 text-sm text-slate-700";
const TD_NOWRAP = clsx(TD, "whitespace-nowrap");

function parseDisplayDate(label: string): Date | null {
  const t = Date.parse(label);
  return Number.isNaN(t) ? null : new Date(t);
}

function toInputDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function fromInputDate(value: string): Date | null {
  if (!value) return null;
  const [y, m, d] = value.split("-").map(Number);
  if (!y || !m || !d) return null;
  return new Date(y, m - 1, d);
}

function rangeDates(range: RangeKey): { from: string; to: string } {
  const now = new Date();
  const today = toInputDate(now);
  if (range === "today") return { from: today, to: today };
  if (range === "week") {
    const start = new Date(now);
    start.setDate(now.getDate() - 6);
    return { from: toInputDate(start), to: today };
  }
  if (range === "month") {
    const start = new Date(now.getFullYear(), now.getMonth(), 1);
    return { from: toInputDate(start), to: today };
  }
  return { from: "", to: "" };
}

function matchesFilters(expense: AccountingExpense, filters: ExpenseFilters): boolean {
  if (filters.expenseFrom && expense.accountId !== filters.expenseFrom) return false;
  if (filters.expenseTo && expense.expenseTo !== filters.expenseTo) return false;

  const statuses: ExpenseStatus[] = [];
  if (filters.statusApproved) statuses.push("approved");
  if (filters.statusDraft) statuses.push("draft");
  if (statuses.length > 0 && !statuses.includes(expense.status)) return false;

  const expenseDate = parseDisplayDate(expense.date);
  const from = fromInputDate(filters.dateFrom);
  const to = fromInputDate(filters.dateTo);
  if (from && expenseDate && expenseDate < from) return false;
  if (to && expenseDate) {
    const end = new Date(to);
    end.setHours(23, 59, 59, 999);
    if (expenseDate > end) return false;
  }

  return true;
}

function exportExpensesCsv(rows: AccountingExpense[]) {
  const headers = [
    "Invoice Number",
    "Date",
    "Time",
    "Description",
    "Expense Account",
    "Category",
    "Amount",
    "Status",
  ];
  const lines = rows.map((e) => [
    expenseInvoiceNo(e),
    e.date,
    e.time,
    e.title,
    getChartAssetLabelForAccount(e.accountId),
    e.expenseTo ?? "",
    String(e.amount),
    EXPENSE_STATUS_LABELS[e.status],
  ]);
  const csv = [headers, ...lines]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(","))
    .join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `expenses-${toInputDate(new Date())}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function ExpenseListPanel() {
  const { data, refresh } = useAccountingData();
  const [draftFilters, setDraftFilters] = useState<ExpenseFilters>(DEFAULT_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState<ExpenseFilters>(DEFAULT_FILTERS);
  const [search, setSearch] = useState("");
  const [rowsPerPage, setRowsPerPage] = useState<number>(25);
  const [page, setPage] = useState(1);
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const menuRef = useRef<HTMLDivElement>(null);

  const expenseFromAccounts = useMemo(
    () => listExpensePaidFromAssets(data),
    [data]
  );
  const expenseToNames = useMemo(() => {
    const fromChart = (data.chartAccounts ?? [])
      .filter((c) => c.group === "expense" && c.active)
      .map((c) => c.name);
    const fromRows = data.expenses.map((e) => e.expenseTo).filter(Boolean) as string[];
    return Array.from(new Set([...fromChart, ...fromRows])).sort();
  }, [data.chartAccounts, data.expenses]);

  useEffect(() => {
    const close = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) {
        setOpenMenu(null);
      }
    };
    document.addEventListener("mousedown", close);
    return () => document.removeEventListener("mousedown", close);
  }, []);

  useEffect(() => {
    const all = loadAccountingData().expenses;
    const seen = new Set<string>();
    const duplicateIds: string[] = [];
    for (const e of all) {
      const ref = e.reference?.trim();
      if (!ref || !ref.endsWith("#return_delivery_expense")) continue;
      if (seen.has(ref)) duplicateIds.push(e.id);
      else seen.add(ref);
    }
    if (duplicateIds.length === 0) return;
    for (const id of duplicateIds) {
      deleteExpense(id);
    }
    refresh();
  }, [data.expenses, refresh]);

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return data.expenses
      .filter((e) => matchesFilters(e, appliedFilters))
      .filter(
        (e) =>
          !q ||
          e.title.toLowerCase().includes(q) ||
          expenseInvoiceNo(e).toLowerCase().includes(q) ||
          (e.vendor ?? "").toLowerCase().includes(q) ||
          (e.expenseTo ?? "").toLowerCase().includes(q)
      )
      .sort((a, b) => b.date.localeCompare(a.date) || expenseInvoiceNo(b).localeCompare(expenseInvoiceNo(a)));
  }, [data.expenses, appliedFilters, search]);

  const tableRows = useMemo(
    () => filtered.filter((e) => !isChargeExpense(e) && !isPendingChargeExpense(e)),
    [filtered]
  );

  const totalPages = Math.max(1, Math.ceil(tableRows.length / rowsPerPage));
  const safePage = Math.min(page, totalPages);
  const paged = paginateSlice(tableRows, safePage, rowsPerPage);
  const totalAmount = tableRows.reduce((s, e) => s + e.amount, 0);

  const applyFilters = () => {
    setAppliedFilters(draftFilters);
    setPage(1);
  };

  const clearFilters = () => {
    setDraftFilters(DEFAULT_FILTERS);
    setAppliedFilters(DEFAULT_FILTERS);
    setSearch("");
    setPage(1);
  };

  const onRangeChange = (range: RangeKey) => {
    const dates = rangeDates(range);
    setDraftFilters((f) => ({
      ...f,
      range,
      dateFrom: dates.from,
      dateTo: dates.to,
    }));
  };

  const hasActiveFilters =
    appliedFilters.expenseFrom !== "" ||
    appliedFilters.expenseTo !== "" ||
    appliedFilters.range !== "all" ||
    !appliedFilters.statusApproved ||
    !appliedFilters.statusDraft ||
    appliedFilters.dateFrom !== "" ||
    appliedFilters.dateTo !== "";

  const toggleStatus = (key: "statusApproved" | "statusDraft") => {
    setDraftFilters((f) => ({ ...f, [key]: !f[key] }));
  };

  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
      <div className="border-b border-slate-100 bg-gradient-to-r from-slate-50 to-white px-3 py-2.5 sm:px-4">
        <div className="mb-2 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-slate-400">
          <SlidersHorizontal className="h-3.5 w-3.5" />
          Filters
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <select
            className={FILTER_SELECT}
            title="Expense Account"
            value={draftFilters.expenseFrom}
            onChange={(e) => setDraftFilters((f) => ({ ...f, expenseFrom: e.target.value }))}
          >
            <option value="">Expense Account</option>
            {expenseFromAccounts.map((a) => (
              <option key={a.accountId} value={a.accountId}>
                {a.groupLabel} · {a.chartName}
              </option>
            ))}
          </select>

          <select
            className={FILTER_SELECT}
            title="Category"
            value={draftFilters.expenseTo}
            onChange={(e) => setDraftFilters((f) => ({ ...f, expenseTo: e.target.value }))}
          >
            <option value="">Category</option>
            {expenseToNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>

          <select
            className={FILTER_SELECT}
            title="Date range"
            value={draftFilters.range}
            onChange={(e) => onRangeChange(e.target.value as RangeKey)}
          >
            <option value="all">All Time</option>
            <option value="today">Today</option>
            <option value="week">Last 7 Days</option>
            <option value="month">This Month</option>
            <option value="custom">Custom</option>
          </select>

          <div className="flex shrink-0 items-center gap-1">
            <input
              type="date"
              className={FILTER_DATE}
              value={draftFilters.dateFrom}
              onChange={(e) =>
                setDraftFilters((f) => ({ ...f, range: "custom", dateFrom: e.target.value }))
              }
            />
            <span className="text-xs font-bold text-slate-300">–</span>
            <input
              type="date"
              className={FILTER_DATE}
              value={draftFilters.dateTo}
              onChange={(e) =>
                setDraftFilters((f) => ({ ...f, range: "custom", dateTo: e.target.value }))
              }
            />
          </div>

          <div className="flex shrink-0 items-center gap-1 rounded-lg border border-slate-200 bg-white p-0.5">
            <button
              type="button"
              onClick={() => toggleStatus("statusApproved")}
              className={clsx(
                "rounded-md px-2.5 py-1 text-xs font-bold transition",
                draftFilters.statusApproved
                  ? "bg-emerald-600 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-50"
              )}
            >
              Approved
            </button>
            <button
              type="button"
              onClick={() => toggleStatus("statusDraft")}
              className={clsx(
                "rounded-md px-2.5 py-1 text-xs font-bold transition",
                draftFilters.statusDraft
                  ? "bg-amber-500 text-white shadow-sm"
                  : "text-slate-500 hover:bg-slate-50"
              )}
            >
              Draft
            </button>
          </div>

          <div className="flex shrink-0 items-center gap-1.5">
            <button
              type="button"
              onClick={applyFilters}
              className="h-9 rounded-lg bg-[#2563eb] px-3.5 text-xs font-bold text-white shadow-sm hover:bg-[#1d4ed8]"
            >
              Apply
            </button>
            <button
              type="button"
              onClick={clearFilters}
              title="Clear filters"
              className="inline-flex h-9 items-center gap-1 rounded-lg border border-slate-200 bg-white px-3 text-xs font-bold text-slate-600 hover:bg-slate-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Clear
            </button>
          </div>

          {hasActiveFilters && (
            <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-blue-600">
              Filtered
            </span>
          )}
        </div>
      </div>

      {/* Toolbar */}
      <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-3 py-3 sm:px-4">
        <p className="text-sm text-slate-500">
          <span className="font-bold text-slate-800">{tableRows.length}</span> entries
          <span className="mx-1.5 text-slate-300">·</span>
          <span className="font-bold text-slate-800">{formatBdtDecimal(totalAmount)}</span>
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
                <option key={n} value={n}>{n}</option>
              ))}
            </select>
          </label>

          <div className="relative w-full min-w-[180px] sm:w-52">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="h-9 w-full rounded-lg border border-slate-200 py-0 pl-9 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              placeholder="Search..."
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(1);
              }}
            />
          </div>

          <button
            type="button"
            onClick={() => exportExpensesCsv(tableRows)}
            className="inline-flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-white text-slate-600 hover:bg-slate-50"
            title="Download CSV"
          >
            <Download className="h-4 w-4" />
          </button>
        </div>
      </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead>
              <tr className="bg-[#2b4c7e]">
                <th className={TH}>Invoice Number</th>
                <th className={TH}>Date</th>
                <th className={TH}>Time</th>
                <th className={TH}>Category</th>
                <th className={TH}>Expense Account</th>
                <th className={TH}>Amount</th>
                <th className={TH}>Status</th>
                <th className={clsx(TH, "text-center")}>Action</th>
              </tr>
            </thead>
            <tbody>
              {paged.map((e, idx) => {
                const category = expenseCategoryLabel(e);
                return (
                <tr
                  key={e.id}
                  className={clsx(
                    "border-b border-slate-100",
                    idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"
                  )}
                >
                  <td className={TD_NOWRAP}>
                    <button
                      type="button"
                      className="font-semibold text-[#2563eb] hover:underline"
                      title={expenseInvoiceNo(e)}
                    >
                      {expenseDisplayInvoiceNo(e)}
                    </button>
                  </td>
                  <td className={TD_NOWRAP}>{e.date}</td>
                  <td className={TD_NOWRAP}>{e.time}</td>
                  <td className={clsx(TD, "max-w-[220px] min-w-[160px]")}>
                    <p className="truncate font-medium text-slate-800" title={category.main}>
                      {category.main}
                    </p>
                    {category.sub && (
                      <p className="truncate text-xs text-slate-500" title={category.sub}>
                        {category.sub}
                      </p>
                    )}
                  </td>
                  <td className={clsx(TD, "min-w-[140px] max-w-[180px]")}>
                    <p
                      className="truncate font-medium text-slate-800"
                      title={getChartAssetLabelForAccount(e.accountId)}
                    >
                      {getChartAssetLabelForAccount(e.accountId)}
                    </p>
                  </td>
                  <td className={clsx(TD_NOWRAP, "font-bold text-slate-900")}>{formatBdtDecimal(e.amount)}</td>
                  <td className={TD_NOWRAP}>
                    <span
                      className={clsx(
                        "inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold",
                        e.status === "approved"
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-amber-100 text-amber-700"
                      )}
                    >
                      {EXPENSE_STATUS_LABELS[e.status]}
                    </span>
                  </td>
                  <td className={clsx(TD_NOWRAP, "relative text-center")}>
                    <button
                      type="button"
                      onClick={() => setOpenMenu(openMenu === e.id ? null : e.id)}
                      className="inline-flex rounded-lg p-2 text-slate-500 hover:bg-slate-100"
                    >
                      <MoreVertical className="h-4 w-4" />
                    </button>
                    {openMenu === e.id && (
                      <div
                        ref={menuRef}
                        className="absolute right-4 z-20 mt-1 w-36 rounded-xl border border-slate-200 bg-white py-1 text-left shadow-xl"
                      >
                        <button
                          type="button"
                          onClick={() => {
                            if (confirm("Delete this expense?")) {
                              deleteExpense(e.id);
                              refresh();
                            }
                            setOpenMenu(null);
                          }}
                          className="flex w-full items-center gap-2 px-3 py-2 text-sm font-medium text-rose-600 hover:bg-rose-50"
                        >
                          <Trash2 className="h-4 w-4" />
                          Delete
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              );
              })}
              {paged.length === 0 && (
                <tr>
                  <td colSpan={8} className="px-4 py-10 text-center text-sm text-slate-500">
                    No expenses found.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>

        {tableRows.length > 0 && (
          <div className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-100 px-4 py-3 text-sm text-slate-600">
            <span>
              Showing {(safePage - 1) * rowsPerPage + 1}–
              {Math.min(safePage * rowsPerPage, tableRows.length)} of {tableRows.length}
            </span>
            <div className="flex items-center gap-2">
              <button
                type="button"
                disabled={safePage <= 1}
                onClick={() => setPage((p) => Math.max(1, p - 1))}
                className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold disabled:opacity-40"
              >
                Previous
              </button>
              <span className="font-bold text-slate-800">
                Page {safePage} of {totalPages}
              </span>
              <button
                type="button"
                disabled={safePage >= totalPages}
                onClick={() => setPage((p) => Math.min(totalPages, p + 1))}
                className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold disabled:opacity-40"
              >
                Next
              </button>
            </div>
          </div>
        )}

    </div>
  );
}
