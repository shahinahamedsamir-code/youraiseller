"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { CheckCircle2, CreditCard, Search, X } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { formatBdt, getInvoiceById, type AccountingInvoice } from "@/lib/accounting-store";
import {
  loadOrdersPendingPayment,
  loadOrdersRecordedPayment,
  paymentItemKey,
  paymentMethodLabelForItem,
  PAYMENT_TYPE_LABELS,
  recordedAccountLabel,
  recordedDateLabel,
  type PaymentApprovalItem,
} from "@/lib/order-payment";
import { RecordOrderPaymentModal } from "./RecordOrderPaymentModal";
import { BulkApprovePaymentModal } from "./BulkApprovePaymentModal";
import { SmartInvoiceModal } from "./SmartInvoiceModal";
import { OrderProductsList } from "@/components/orders/OrderProductsList";

type Tab = "pending" | "recorded";

const TH =
  "whitespace-nowrap px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wide text-white";
const TD = "px-4 py-3.5 text-sm text-slate-700 align-top";
const TD_NOWRAP = clsx(TD, "whitespace-nowrap");

export function PaymentListPanel() {
  const [tab, setTab] = useState<Tab>("pending");
  const [search, setSearch] = useState("");
  const [pending, setPending] = useState<PaymentApprovalItem[]>([]);
  const [recorded, setRecorded] = useState<PaymentApprovalItem[]>([]);
  const [approveItem, setApproveItem] = useState<PaymentApprovalItem | null>(null);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [bulkOpen, setBulkOpen] = useState(false);
  const [viewInvoice, setViewInvoice] = useState<AccountingInvoice | null>(null);

  const refresh = useCallback(() => {
    setPending(loadOrdersPendingPayment(search));
    setRecorded(loadOrdersRecordedPayment(search));
  }, [search]);

  useEffect(() => {
    refresh();
    window.addEventListener("youraiseller-data-updated", refresh);
    return () => window.removeEventListener("youraiseller-data-updated", refresh);
  }, [refresh]);

  const rows = tab === "pending" ? pending : recorded;

  const allPendingSelected =
    pending.length > 0 && pending.every((item) => selected.has(paymentItemKey(item)));

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
    if (allPendingSelected) setSelected(new Set());
    else setSelected(new Set(pending.map((item) => paymentItemKey(item))));
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

  return (
    <div className="space-y-6">
      <PageHeader title="Payment" />

      <div className="flex flex-wrap gap-2">
        <button
          type="button"
          onClick={() => {
            setTab("pending");
            clearSelection();
          }}
          className={clsx(
            "rounded-xl px-4 py-2 text-sm font-bold transition",
            tab === "pending"
              ? "bg-amber-500 text-white shadow-md"
              : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
          )}
        >
          Approve Pending
          {pending.length > 0 && (
            <span className="ml-1.5 rounded-full bg-white/25 px-1.5 py-0.5 text-xs">
              {pending.length}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => {
            setTab("recorded");
            clearSelection();
          }}
          className={clsx(
            "rounded-xl px-4 py-2 text-sm font-bold transition",
            tab === "recorded"
              ? "bg-emerald-600 text-white shadow-md"
              : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
          )}
        >
          Recorded
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
          <p className="text-sm text-slate-500">
            {tab === "pending" ? (
              <>
                <span className="font-bold text-amber-700">{pending.length}</span> awaiting approval
                <span className="mx-1.5 text-slate-300">·</span>
                <span className="font-bold text-slate-800">{formatBdt(pendingTotal)}</span> total
              </>
            ) : (
              <>
                <span className="font-bold text-emerald-700">{recorded.length}</span> recorded
                <span className="mx-1.5 text-slate-300">·</span>
                <span className="font-bold text-slate-800">{formatBdt(recordedTotal)}</span> total
              </>
            )}
          </p>
          <div className="relative ml-auto w-full min-w-[180px] sm:w-56">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="h-9 w-full rounded-lg border border-slate-200 py-0 pl-9 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              placeholder="Search order, customer, phone..."
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
                <th className={clsx(TH, "w-[100px]")}>Type</th>
                <th className={clsx(TH, "w-[115px]")}>Order</th>
                <th className={clsx(TH, "w-[130px]")}>Customer</th>
                <th className={clsx(TH, "w-[240px]")}>Products</th>
                <th className={clsx(TH, "w-[150px]")}>Payment Info</th>
                <th className={clsx(TH, "w-[90px]")}>Amount</th>
                {tab === "recorded" && (
                  <th className={clsx(TH, "w-[120px]")}>Received In</th>
                )}
                <th className={clsx(TH, "w-[130px]")}>Status</th>
                <th className={clsx(TH, "w-[100px] text-center")}>Action</th>
              </tr>
            </thead>
            <tbody>
              {rows.map((item, idx) => {
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
                    <td className={TD_NOWRAP}>
                      <span
                        className={clsx(
                          "inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold",
                          item.type === "advance"
                            ? "bg-violet-100 text-violet-700"
                            : "bg-sky-100 text-sky-700"
                        )}
                      >
                        {PAYMENT_TYPE_LABELS[item.type]}
                      </span>
                    </td>
                    <td className={TD_NOWRAP}>
                      <p className="font-bold text-[#2563eb]">{o.invoiceNumber ?? o.id}</p>
                      <p className="text-xs text-slate-500">{o.updatedAt}</p>
                    </td>
                    <td className={TD}>
                      <p className="break-words font-semibold text-slate-800">{o.customerName}</p>
                      <p className="text-xs text-slate-500">{o.phone}</p>
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
                    <td className={TD_NOWRAP}>
                      {tab === "pending" ? (
                        <span className="inline-flex rounded-full bg-amber-100 px-2.5 py-0.5 text-xs font-bold text-amber-800">
                          Approve Pending
                        </span>
                      ) : (
                        <span className="inline-flex rounded-full bg-emerald-100 px-2.5 py-0.5 text-xs font-bold text-emerald-700">
                          Recorded
                        </span>
                      )}
                    </td>
                    <td className={clsx(TD_NOWRAP, "text-center")}>
                      {tab === "pending" ? (
                        <button
                          type="button"
                          onClick={() => setApproveItem(item)}
                          className="inline-flex items-center gap-1 rounded-lg bg-[#2563eb] px-3 py-1.5 text-xs font-bold text-white hover:bg-[#1d4ed8]"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Approve
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">{recordedDateLabel(item)}</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {rows.length === 0 && (
                <tr>
                  <td colSpan={tab === "recorded" ? 9 : 10} className="px-4 py-16 text-center">
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
      </div>

      <RecordOrderPaymentModal
        item={approveItem}
        open={Boolean(approveItem)}
        onClose={() => setApproveItem(null)}
        onSaved={(result) => {
          refresh();
          if (result?.invoiceId) {
            const inv = getInvoiceById(result.invoiceId);
            if (inv) setViewInvoice(inv);
          }
        }}
      />

      <SmartInvoiceModal
        invoice={viewInvoice}
        open={Boolean(viewInvoice)}
        onClose={() => setViewInvoice(null)}
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
    </div>
  );
}
