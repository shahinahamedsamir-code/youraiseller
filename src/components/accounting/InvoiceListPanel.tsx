"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Eye, FileText, Printer, Search, Wallet } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  formatBdt,
  getInvoiceById,
  INVOICE_STATUS_LABELS,
  invoiceDeliveryChargeDeducted,
  invoiceDueBalance,
  invoiceNetCollected,
  type AccountingInvoice,
} from "@/lib/accounting-store";
import { getOrderPaymentAccountForDeliveryCharge } from "@/lib/order-delivery-expense";
import { canPayInvoiceDue } from "@/lib/order-payment";
import { getOrder } from "@/lib/orders-store";
import { openSmartInvoicePrint } from "@/lib/order-invoice";
import { useAccountingData } from "./useAccountingData";
import { SmartInvoiceModal } from "./SmartInvoiceModal";
import { PayInvoiceDueModal } from "./PayInvoiceDueModal";
import { TablePagination, paginateSlice, DEFAULT_ROWS_PER_PAGE } from "@/components/ui/TablePagination";

type StatusFilter = "all" | "paid" | "partial" | "due";

function matchesStatusFilter(inv: AccountingInvoice, filter: StatusFilter): boolean {
  if (filter === "all") return true;
  if (filter === "paid") return inv.status === "paid";
  if (filter === "partial") return inv.status === "partial";
  return invoiceDueBalance(inv) > 0;
}

export function InvoiceListPanel() {
  const { data } = useAccountingData();
  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const [viewInvoice, setViewInvoice] = useState<AccountingInvoice | null>(null);
  const [payDueInvoice, setPayDueInvoice] = useState<AccountingInvoice | null>(null);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE);

  const refresh = useCallback(() => {
    if (viewInvoice) {
      const fresh = getInvoiceById(viewInvoice.id);
      if (fresh) setViewInvoice(fresh);
    }
  }, [viewInvoice]);

  const allInvoices = useMemo(
    () => [...(data.invoices ?? [])].map((inv) => getInvoiceById(inv.id) ?? inv),
    [data.invoices]
  );

  const filterCounts = useMemo(
    () => ({
      all: allInvoices.length,
      paid: allInvoices.filter((inv) => inv.status === "paid").length,
      partial: allInvoices.filter((inv) => inv.status === "partial").length,
      due: allInvoices.filter((inv) => invoiceDueBalance(inv) > 0).length,
    }),
    [allInvoices]
  );

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim();
    return allInvoices
      .filter((inv) => matchesStatusFilter(inv, statusFilter))
      .filter(
        (inv) =>
          !q ||
          inv.invoiceNumber.toLowerCase().includes(q) ||
          inv.customerName.toLowerCase().includes(q) ||
          inv.customerPhone.includes(q) ||
          inv.orderId.toLowerCase().includes(q)
      )
      .sort((a, b) => b.date.localeCompare(a.date));
  }, [allInvoices, search, statusFilter]);

  useEffect(() => { setPage(1); }, [search, statusFilter]);

  const pagedInvoices = paginateSlice(filtered, page, rowsPerPage);
  const totalCollected = filtered.reduce((s, inv) => s + invoiceNetCollected(inv), 0);
  const totalDue = filtered.reduce((s, inv) => s + invoiceDueBalance(inv), 0);

  return (
    <div className="space-y-6">
      <PageHeader title="Invoice" />

      <div className="flex flex-wrap gap-2">
        {(
          [
            { id: "all" as const, label: "All", active: "bg-slate-800 text-white" },
            { id: "paid" as const, label: "Paid", active: "bg-emerald-600 text-white" },
            { id: "partial" as const, label: "Partial", active: "bg-amber-500 text-white" },
            { id: "due" as const, label: "Due", active: "bg-orange-600 text-white" },
          ] as const
        ).map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setStatusFilter(tab.id)}
            className={clsx(
              "rounded-xl px-4 py-2 text-sm font-bold transition",
              statusFilter === tab.id
                ? clsx(tab.active, "shadow-md")
                : "bg-white text-slate-600 ring-1 ring-slate-200 hover:bg-slate-50"
            )}
          >
            {tab.label}
            {filterCounts[tab.id] > 0 && (
              <span
                className={clsx(
                  "ml-1.5 rounded-full px-1.5 py-0.5 text-xs",
                  statusFilter === tab.id ? "bg-white/25" : "bg-slate-100 text-slate-600"
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
            <span className="font-bold text-slate-800">{filtered.length}</span> invoices
            <span className="mx-1.5 text-slate-300">·</span>
            <span className="font-bold text-slate-800">{formatBdt(totalCollected)}</span> collected
            {totalDue > 0 && (
              <>
                <span className="mx-1.5 text-slate-300">·</span>
                <span className="font-bold text-amber-700">{formatBdt(totalDue)}</span> due
              </>
            )}
          </p>
          <div className="relative ml-auto w-full min-w-[180px] sm:w-56">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="h-9 w-full rounded-lg border border-slate-200 py-0 pl-9 pr-3 text-sm outline-none focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              placeholder="Search invoice, customer, order..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[980px]">
            <thead>
              <tr className="bg-[#2b4c7e]">
                <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wide text-white">
                  Invoice Number
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wide text-white">
                  Date
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wide text-white">
                  Customer
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wide text-white">
                  Total
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wide text-white">
                  Collected
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wide text-white">
                  Delivery
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wide text-white">
                  Due
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wide text-white">
                  Status
                </th>
                <th className="px-4 py-3.5 text-center text-xs font-bold uppercase tracking-wide text-white">
                  Action
                </th>
              </tr>
            </thead>
            <tbody>
              {pagedInvoices.map((inv, idx) => {
                const due = invoiceDueBalance(inv);
                const canPay = canPayInvoiceDue(inv.id);
                const delivery = invoiceDeliveryChargeDeducted(inv);
                const order = getOrder(inv.orderId);
                const paymentAccount = getOrderPaymentAccountForDeliveryCharge(inv.orderId);
                return (
                  <tr
                    key={inv.id}
                    className={clsx(
                      "border-b border-slate-100",
                      idx % 2 === 0 ? "bg-white" : "bg-slate-50/60"
                    )}
                  >
                    <td className="px-4 py-3.5 text-sm font-bold text-[#2563eb]">{inv.invoiceNumber}</td>
                    <td className="px-4 py-3.5 text-sm text-slate-700">{inv.date}</td>
                    <td className="px-4 py-3.5 text-sm">
                      <p className="font-semibold text-slate-800">{inv.customerName}</p>
                      <p className="text-xs text-slate-500">{inv.customerPhone}</p>
                    </td>
                    <td className="px-4 py-3.5 text-sm font-semibold text-slate-800">
                      {formatBdt(inv.amount)}
                    </td>
                    <td className="px-4 py-3.5 text-sm">
                      <p className="font-bold text-emerald-700">{formatBdt(invoiceNetCollected(inv))}</p>
                      <p className="text-xs text-slate-500">
                        Gross {formatBdt(inv.paidAmount)}
                      </p>
                      {(inv.advanceAmount ?? 0) > 0 && (
                        <p className="text-xs text-violet-600">
                          Adv {formatBdt(inv.advanceAmount!)}
                        </p>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-sm">
                      {delivery > 0 ? (
                        <>
                          <p className="font-bold text-orange-700">{formatBdt(delivery)}</p>
                          {paymentAccount && (
                            <p className="text-xs text-slate-500">− {paymentAccount.accountName}</p>
                          )}
                        </>
                      ) : (order?.shippingCharge ?? 0) > 0 ? (
                        <button
                          type="button"
                          onClick={() => setViewInvoice(inv)}
                          className="text-xs font-bold text-orange-600 hover:underline"
                        >
                          Set {formatBdt(order!.shippingCharge!)}
                        </button>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-sm font-bold">
                      {due > 0 ? (
                        <span className="text-amber-700">{formatBdt(due)}</span>
                      ) : (
                        <span className="text-slate-400">—</span>
                      )}
                    </td>
                    <td className="px-4 py-3.5">
                      <span
                        className={clsx(
                          "inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold",
                          inv.status === "paid"
                            ? "bg-emerald-100 text-emerald-700"
                            : inv.status === "partial"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-slate-100 text-slate-600"
                        )}
                      >
                        {INVOICE_STATUS_LABELS[inv.status]}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      <div className="inline-flex flex-wrap items-center justify-center gap-1">
                        {due > 0 && canPay.ok && (
                          <button
                            type="button"
                            onClick={() => setPayDueInvoice(inv)}
                            className="inline-flex items-center gap-1 rounded-lg bg-amber-500 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-amber-600"
                          >
                            <Wallet className="h-3.5 w-3.5" />
                            Pay Due
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => setViewInvoice(inv)}
                          className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                        >
                          <Eye className="h-3.5 w-3.5" />
                          View
                        </button>
                        <button
                          type="button"
                          onClick={() => openSmartInvoicePrint(inv.orderId)}
                          className="inline-flex items-center gap-1 rounded-lg bg-slate-800 px-2.5 py-1.5 text-xs font-bold text-white hover:bg-slate-900"
                        >
                          <Printer className="h-3.5 w-3.5" />
                          Print
                        </button>
                      </div>
                    </td>
                  </tr>
                );
              })}
              {filtered.length === 0 && (
                <tr>
                  <td colSpan={9} className="px-4 py-16 text-center">
                    <div className="mx-auto flex max-w-sm flex-col items-center gap-3 text-slate-500">
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-100 text-slate-400">
                        <FileText className="h-6 w-6" />
                      </span>
                      <p className="text-sm font-medium">
                        {statusFilter === "all" && !search.trim()
                          ? "No invoices yet."
                          : "No invoices match this filter."}
                      </p>
                      <p className="text-xs text-slate-400">
                        {statusFilter === "all" && !search.trim()
                          ? "Approve advance payment from Payment — a partial invoice is created with due balance."
                          : "Try another filter or clear the search."}
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
          onRowsPerPageChange={(n) => { setRowsPerPage(n); setPage(1); }}
        />
      </div>

      <SmartInvoiceModal
        invoice={viewInvoice}
        open={Boolean(viewInvoice)}
        onClose={() => setViewInvoice(null)}
        onUpdated={refresh}
      />

      <PayInvoiceDueModal
        invoice={payDueInvoice}
        open={Boolean(payDueInvoice)}
        onClose={() => setPayDueInvoice(null)}
        onSaved={() => {
          window.dispatchEvent(new Event("youraiseller-data-updated"));
          if (payDueInvoice) {
            const fresh = getInvoiceById(payDueInvoice.id);
            if (fresh) setViewInvoice(fresh);
          }
          setPayDueInvoice(null);
        }}
      />
    </div>
  );
}
