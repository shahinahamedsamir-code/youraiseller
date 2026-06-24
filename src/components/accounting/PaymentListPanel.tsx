"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { CheckCircle2, CreditCard, Search, X, XCircle } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatBdt } from "@/lib/accounting-store";
import {
  loadOrdersPendingPayment,
  loadOrdersRecordedPayment,
  paymentItemKey,
  paymentMethodLabelForItem,
  recordedAccountLabel,
  recordedDateLabel,
  type PaymentApprovalItem,
} from "@/lib/order-payment";
import { RecordOrderPaymentModal } from "./RecordOrderPaymentModal";
import { BulkApprovePaymentModal } from "./BulkApprovePaymentModal";
import { DeclinePaymentModal } from "./DeclinePaymentModal";
import { OrderProductsList } from "@/components/orders/OrderProductsList";
import { TablePagination, paginateSlice, DEFAULT_ROWS_PER_PAGE } from "@/components/ui/TablePagination";

type Tab = "pending" | "recorded";

const PAYMENT_TYPE_SHORT: Record<PaymentApprovalItem["type"], string> = {
  advance: "Advance",
  delivery: "Delivery",
  return_delivery_expense: "Return",
};

const TH =
  "whitespace-nowrap px-3 py-2 text-left text-xs font-bold uppercase tracking-wide text-white";
const TD = "px-3 py-2 text-sm text-slate-700 align-middle";
const TD_NOWRAP = clsx(TD, "whitespace-nowrap");

export function PaymentListPanel() {
  const [tab, setTab] = useState<Tab>("pending");
  const [search, setSearch] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [pending, setPending] = useState<PaymentApprovalItem[]>([]);
  const [recorded, setRecorded] = useState<PaymentApprovalItem[]>([]);
  const [approveItem, setApproveItem] = useState<PaymentApprovalItem | null>(null);
  const [declineItems, setDeclineItems] = useState<PaymentApprovalItem[]>([]);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE);

  // Debounce the search term so typing doesn't recompute the whole order scan on
  // every keystroke.
  useEffect(() => {
    const t = window.setTimeout(() => setDebouncedSearch(search), 300);
    return () => window.clearTimeout(t);
  }, [search]);

  const refresh = useCallback(() => {
    setPending(
      loadOrdersPendingPayment(debouncedSearch).filter(
        (item) => item.type !== "return_delivery_expense"
      )
    );
    setRecorded(
      loadOrdersRecordedPayment(debouncedSearch).filter(
        (item) => item.type !== "return_delivery_expense"
      )
    );
  }, [debouncedSearch]);

  useEffect(() => {
    refresh();
    window.addEventListener("youraiseller-data-updated", refresh);
    return () => window.removeEventListener("youraiseller-data-updated", refresh);
  }, [refresh]);

  const rows = tab === "pending" ? pending : recorded;
  const pagedRows = paginateSlice(rows, page, rowsPerPage);

  const selectablePageRows = tab === "pending" ? pagedRows : [];
  const allPendingSelected =
    selectablePageRows.length > 0 &&
    selectablePageRows.every((item) => selected.has(paymentItemKey(item)));

  const selectedItems = useMemo(
    () => pending.filter((item) => selected.has(paymentItemKey(item))),
    [pending, selected]
  );

  const selectedTotal = useMemo(
    () => selectedItems.reduce((s, item) => s + item.amount, 0),
    [selectedItems]
  );

  const toggleSelect = (key: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };

  const toggleSelectAll = () => {
    const pageKeys = selectablePageRows.map((item) => paymentItemKey(item));
    setSelected((prev) => {
      const next = new Set(prev);
      if (allPendingSelected) {
        pageKeys.forEach((key) => next.delete(key));
      } else {
        pageKeys.forEach((key) => next.add(key));
      }
      return next;
    });
  };

  const clearSelection = () => setSelected(new Set());

  const pendingTotal = useMemo(
    () => pending.reduce((s, item) => s + item.amount, 0),
    [pending]
  );

  const recordedTotal = useMemo(
    () => recorded.reduce((s, item) => s + item.amount, 0),
    [recorded]
  );

  const summaryText =
    tab === "pending" ? (
      <>
        <span className="font-bold text-amber-700">{pending.length}</span> pending
        <span className="mx-1 text-slate-300">·</span>
        <span className="font-bold text-slate-800">{formatBdt(pendingTotal)}</span>
      </>
    ) : (
      <>
        <span className="font-bold text-emerald-700">{recorded.length}</span> recorded
        <span className="mx-1 text-slate-300">·</span>
        <span className="font-bold text-slate-800">{formatBdt(recordedTotal)}</span>
      </>
    );

  return (
    <div className="space-y-3">
      <PageHeader title="Payment" />

      <div className="overflow-hidden rounded-xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-2">
          <button
            type="button"
            onClick={() => {
              setTab("pending");
              setPage(1);
              clearSelection();
            }}
            className={clsx(
              "rounded-lg px-3 py-1.5 text-xs font-bold transition",
              tab === "pending"
                ? "bg-amber-500 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            Approve Pending
            {pending.length > 0 && (
              <span className="ml-1 rounded-full bg-white/25 px-1 py-0.5 text-[10px]">
                {pending.length}
              </span>
            )}
          </button>
          <button
            type="button"
            onClick={() => {
              setTab("recorded");
              setPage(1);
              clearSelection();
            }}
            className={clsx(
              "rounded-lg px-3 py-1.5 text-xs font-bold transition",
              tab === "recorded"
                ? "bg-emerald-600 text-white"
                : "bg-slate-100 text-slate-600 hover:bg-slate-200"
            )}
          >
            Recorded
          </button>
          <p className="text-xs text-slate-500">{summaryText}</p>
          <div className="relative ml-auto w-full min-w-[160px] sm:w-52">
            <Search className="absolute left-2.5 top-1/2 h-3.5 w-3.5 -translate-y-1/2 text-slate-400" />
            <input
              className="h-8 w-full rounded-lg border border-slate-200 py-0 pl-8 pr-2.5 text-xs outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              placeholder="Search order, customer..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        {tab === "pending" && selected.size > 0 && (
          <div className="flex flex-wrap items-center gap-3 border-b border-amber-100 bg-amber-50 px-4 py-2.5">
            <p className="text-sm font-semibold text-amber-900">
              <span className="font-bold">{selected.size}</span> selected
              <span className="mx-1.5 text-amber-300">·</span>
              <span className="font-bold">{formatBdt(selectedTotal)}</span>
            </p>
            <div className="ml-auto flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={clearSelection}
                className="inline-flex items-center gap-1 rounded-lg border border-amber-200 bg-white px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-amber-50"
              >
                <X className="h-3.5 w-3.5" />
                Clear
              </button>
              <button
                type="button"
                onClick={() => setDeclineItems(selectedItems)}
                className="inline-flex items-center gap-1.5 rounded-lg border border-rose-200 bg-white px-3 py-1.5 text-xs font-bold text-rose-700 hover:bg-rose-50"
              >
                <XCircle className="h-3.5 w-3.5" />
                Decline Selected ({selected.size})
              </button>
              <button
                type="button"
                onClick={() => setBulkOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-4 py-1.5 text-xs font-bold text-white hover:bg-emerald-700"
              >
                <CheckCircle2 className="h-3.5 w-3.5" />
                Approve Selected ({selected.size})
              </button>
            </div>
          </div>
        )}

        <div className="overflow-x-auto">
          <table className="w-full min-w-[1100px] table-fixed">
            <thead>
              <tr className="bg-[#2b4c7e]">
                {tab === "pending" && (
                  <th className={clsx(TH, "w-10 text-center")}>
                    <input
                      type="checkbox"
                      checked={allPendingSelected}
                      onChange={toggleSelectAll}
                      aria-label="Select all pending payments"
                      className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    />
                  </th>
                )}
                <th className={clsx(TH, "w-[175px]")}>Type / Order</th>
                <th className={clsx(TH, "w-[125px]")}>Customer</th>
                <th className={clsx(TH, "w-[240px]")}>Products</th>
                <th className={clsx(TH, "w-[150px]")}>Payment Info</th>
                <th className={clsx(TH, "w-[90px]")}>Amount</th>
                {tab === "recorded" && (
                  <th className={clsx(TH, "w-[120px]")}>Received In</th>
                )}
                <th className={clsx(TH, "w-[110px]")}>Status</th>
                {tab === "pending" && (
                  <th className={clsx(TH, "w-[160px] text-center")}>Action</th>
                )}
              </tr>
            </thead>
            <tbody>
              {pagedRows.map((item, idx) => {
                const o = item.order;
                const key = paymentItemKey(item);
                const isChecked = selected.has(key);
                return (
                  <tr
                    key={key}
                    className={clsx(
                      "border-b border-slate-100",
                      idx % 2 === 0 ? "bg-white" : "bg-slate-50/60",
                      tab === "pending" && isChecked && "bg-blue-50/50"
                    )}
                  >
                    {tab === "pending" && (
                      <td className={clsx(TD_NOWRAP, "text-center")}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelect(key)}
                          aria-label={`Select ${o.invoiceNumber ?? o.id}`}
                          className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                        />
                      </td>
                    )}
                    <td className={clsx(TD, "text-xs leading-tight")}>
                      <div className="flex min-w-0 items-center gap-1">
                        <span
                          className={clsx(
                            "inline-flex shrink-0 rounded px-1.5 py-0.5 text-[10px] font-bold",
                            item.type === "advance"
                              ? "bg-violet-100 text-violet-700"
                              : "bg-sky-100 text-sky-700"
                          )}
                        >
                          {PAYMENT_TYPE_SHORT[item.type]}
                        </span>
                        <span className="truncate font-bold text-[#2563eb]">
                          {o.invoiceNumber ?? o.id}
                        </span>
                      </div>
                    </td>
                    <td className={clsx(TD, "text-xs leading-tight")}>
                      <p className="truncate font-semibold text-slate-800">{o.customerName}</p>
                      <p className="truncate text-[11px] text-slate-500">{o.phone}</p>
                    </td>
                    <td className={TD}>
                      <div className="min-w-0 break-words whitespace-normal">
                        <OrderProductsList items={o.items} />
                      </div>
                    </td>
                    <td className={TD}>
                      <p className="break-words whitespace-normal text-slate-700">
                        {paymentMethodLabelForItem(item)}
                      </p>
                    </td>
                    <td className={clsx(TD_NOWRAP, "font-bold text-slate-900")}>
                      {tab === "pending" ? (
                        formatBdt(item.amount)
                      ) : (
                        <div>
                          <p>{formatBdt(item.amount)}</p>
                          {item.type === "delivery" && (o.paymentCollectionDiscount ?? 0) > 0 && (
                            <p className="text-xs font-medium text-amber-700">
                              Disc −{formatBdt(o.paymentCollectionDiscount!)}
                            </p>
                          )}
                        </div>
                      )}
                    </td>
                    {tab === "recorded" && (
                      <td className={TD}>
                        <p className="break-words whitespace-normal">
                          {recordedAccountLabel(item)}
                        </p>
                      </td>
                    )}
                    <td className={clsx(TD, "text-xs")}>
                      {tab === "pending" ? (
                        <span className="inline-flex rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                          Pending
                        </span>
                      ) : (
                        <div className="leading-tight">
                          <span className="inline-flex rounded-full bg-emerald-100 px-2 py-0.5 text-[10px] font-bold text-emerald-700">
                            Recorded
                          </span>
                          <p className="mt-0.5 text-[11px] text-slate-500">{recordedDateLabel(item)}</p>
                        </div>
                      )}
                    </td>
                    {tab === "pending" && (
                      <td className={clsx(TD_NOWRAP, "text-center")}>
                        <div className="flex items-center justify-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => setDeclineItems([item])}
                            className="inline-flex items-center gap-1 rounded-lg border border-rose-200 bg-white px-2.5 py-1 text-[11px] font-bold text-rose-700 hover:bg-rose-50"
                          >
                            <XCircle className="h-3 w-3" />
                            Decline
                          </button>
                          <button
                            type="button"
                            onClick={() => setApproveItem(item)}
                            className="inline-flex items-center gap-1 rounded-lg bg-[#2563eb] px-2.5 py-1 text-[11px] font-bold text-white hover:bg-[#1d4ed8]"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Approve
                          </button>
                        </div>
                      </td>
                    )}
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={tab === "recorded" ? 7 : 8} className="px-4 py-16 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-slate-500">
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                        <CreditCard className="h-6 w-6" />
                      </span>
                      <p className="text-sm font-medium">
                        {tab === "pending"
                          ? "No payments awaiting approval."
                          : "No recorded payments yet."}
                      </p>
                      <p className="text-xs text-slate-400">
                        {tab === "pending"
                          ? "New orders with advance, or delivered orders, appear here."
                          : "Approved advance and delivery payments show here."}
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <TablePagination
          totalRows={rows.length}
          page={page}
          rowsPerPage={rowsPerPage}
          selectedCount={tab === "pending" ? selected.size : 0}
          onPageChange={setPage}
          onRowsPerPageChange={(n) => { setRowsPerPage(n); setPage(1); }}
        />
      </div>

      <RecordOrderPaymentModal
        item={approveItem}
        open={Boolean(approveItem)}
        onClose={() => setApproveItem(null)}
        onSaved={() => {
          refresh();
        }}
      />

      <BulkApprovePaymentModal
        items={selectedItems}
        open={bulkOpen}
        onClose={() => {
          setBulkOpen(false);
          clearSelection();
        }}
        onSaved={() => {
          refresh();
          clearSelection();
        }}
      />

      <DeclinePaymentModal
        items={declineItems}
        open={declineItems.length > 0}
        onClose={() => setDeclineItems([])}
        onSaved={() => {
          refresh();
          clearSelection();
        }}
      />
    </div>
  );
}
