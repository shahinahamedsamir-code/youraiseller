"use client";

import type { ReactNode } from "react";
import {
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
} from "lucide-react";
import clsx from "clsx";

export const DEFAULT_ROWS_PER_PAGE = 10;

export const ROWS_PER_PAGE_OPTIONS = [10, 20, 50, 100, 500, 1000] as const;

type Variant = "indigo" | "teal";

type Props = {
  totalRows: number;
  page: number;
  rowsPerPage: number;
  selectedCount?: number;
  onPageChange: (page: number) => void;
  onRowsPerPageChange: (rows: number) => void;
  variant?: Variant;
};

export function TablePagination({
  totalRows,
  page,
  rowsPerPage,
  selectedCount = 0,
  onPageChange,
  onRowsPerPageChange,
  variant = "indigo",
}: Props) {
  const totalPages = Math.max(1, Math.ceil(totalRows / rowsPerPage));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const from = totalRows === 0 ? 0 : (safePage - 1) * rowsPerPage + 1;
  const to = Math.min(safePage * rowsPerPage, totalRows);

  const accent =
    variant === "teal"
      ? {
          ring: "focus:border-teal-400 focus:ring-teal-100",
          btn: "hover:border-teal-300 hover:bg-teal-50 hover:text-teal-700",
          page: "text-teal-800",
        }
      : {
          ring: "focus:border-indigo-400 focus:ring-indigo-100",
          btn: "hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700",
          page: "text-indigo-800",
        };

  const navBtn = (disabled: boolean, onClick: () => void, label: string, child: ReactNode) => (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      aria-label={label}
      className={clsx(
        "inline-flex h-9 w-9 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 shadow-sm transition",
        accent.btn,
        disabled && "cursor-not-allowed opacity-35 shadow-none hover:bg-white"
      )}
    >
      {child}
    </button>
  );

  return (
    <div className="flex flex-wrap items-center justify-between gap-4 border-t border-slate-100 bg-gradient-to-r from-slate-50/90 to-white px-4 py-3.5">
      <div className="flex flex-wrap items-center gap-3 text-sm text-slate-600">
        <span className="font-medium">
          <span className="font-bold text-slate-800">{selectedCount}</span> of{" "}
          <span className="font-bold text-slate-800">{totalRows}</span> row
          {totalRows === 1 ? "" : "s"} selected
        </span>
        {totalRows > 0 && (
          <span className="hidden text-xs text-slate-400 sm:inline">
            Showing {from}–{to}
          </span>
        )}
      </div>

      <div className="flex flex-wrap items-center gap-3 sm:gap-4">
        <label className="flex items-center gap-2 text-sm font-semibold text-slate-600">
          <span className="whitespace-nowrap">Rows per page</span>
          <select
            value={rowsPerPage}
            onChange={(e) => {
              onRowsPerPageChange(Number(e.target.value));
              onPageChange(1);
            }}
            className={clsx(
              "h-9 min-w-[4.5rem] cursor-pointer rounded-xl border border-slate-200 bg-white px-3 text-sm font-bold text-slate-800 shadow-sm outline-none transition",
              accent.ring
            )}
          >
            {ROWS_PER_PAGE_OPTIONS.map((n) => (
              <option key={n} value={n}>
                {n}
              </option>
            ))}
          </select>
        </label>

        <span
          className={clsx(
            "min-w-[7rem] text-center text-sm font-extrabold tabular-nums",
            accent.page
          )}
        >
          Page {safePage} of {totalPages}
        </span>

        <div className="flex items-center gap-1">
          {navBtn(safePage <= 1, () => onPageChange(1), "First page", (
            <ChevronsLeft className="h-4 w-4" />
          ))}
          {navBtn(safePage <= 1, () => onPageChange(safePage - 1), "Previous page", (
            <ChevronLeft className="h-4 w-4" />
          ))}
          {navBtn(
            safePage >= totalPages,
            () => onPageChange(safePage + 1),
            "Next page",
            <ChevronRight className="h-4 w-4" />
          )}
          {navBtn(
            safePage >= totalPages,
            () => onPageChange(totalPages),
            "Last page",
            <ChevronsRight className="h-4 w-4" />
          )}
        </div>
      </div>
    </div>
  );
}

/** Slice a list for the current page (1-based page index). */
export function paginateSlice<T>(items: T[], page: number, rowsPerPage: number): T[] {
  const start = (page - 1) * rowsPerPage;
  return items.slice(start, start + rowsPerPage);
}
