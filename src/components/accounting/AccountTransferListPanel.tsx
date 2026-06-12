"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { ArrowRightLeft, Ban, Plus, Search } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import {
  cancelAccountTransfer,
  formatBdt,
  formatTransferLabel,
  isActiveTransfer,
  listAccountTransfers,
  TRANSFER_STATUS_LABELS,
  transferStatus,
  type AccountingTransfer,
} from "@/lib/accounting-store";
import { useAccountingData } from "./useAccountingData";
import { AccountTransferModal } from "./AccountTransferModal";
import { CancelTransferModal } from "./CancelTransferModal";
import { TablePagination, paginateSlice, DEFAULT_ROWS_PER_PAGE } from "@/components/ui/TablePagination";

export function AccountTransferListPanel() {
  const { data, refresh } = useAccountingData();
  const [search, setSearch] = useState("");
  const [modalOpen, setModalOpen] = useState(false);
  const [cancelTarget, setCancelTarget] = useState<AccountingTransfer | null>(null);
  const [cancelError, setCancelError] = useState("");
  const [cancelSaving, setCancelSaving] = useState(false);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE);

  const transfers = useMemo(() => {
    const q = search.toLowerCase().trim();
    return listAccountTransfers().filter((t) => {
      if (!q) return true;
      const label = formatTransferLabel(t).toLowerCase();
      const statusLabel = TRANSFER_STATUS_LABELS[transferStatus(t)].toLowerCase();
      return (
        label.includes(q) ||
        statusLabel.includes(q) ||
        (t.reference ?? "").toLowerCase().includes(q) ||
        (t.note ?? "").toLowerCase().includes(q)
      );
    });
  }, [data, search]);

  useEffect(() => { setPage(1); }, [search]);

  const pagedTransfers = paginateSlice(transfers, page, rowsPerPage);
  const activeTransfers = transfers.filter(isActiveTransfer);
  const totalMoved = activeTransfers.reduce((s, t) => s + t.amount, 0);
  const cancelledCount = transfers.length - activeTransfers.length;

  const openCancel = (t: AccountingTransfer) => {
    setCancelTarget(t);
    setCancelError("");
  };

  const handleCancelConfirm = () => {
    if (!cancelTarget) return;
    setCancelSaving(true);
    setCancelError("");
    const result = cancelAccountTransfer(cancelTarget.id);
    setCancelSaving(false);
    if (!result.ok) {
      setCancelError(result.message);
      return;
    }
    setCancelTarget(null);
    refresh();
  };

  return (
    <div className="space-y-6">
      <PageHeader title="Account Transfer" />

      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500">
          Internal moves between bKash, bank &amp; cash — not counted as income or expense
        </p>
        <button
          type="button"
          onClick={() => setModalOpen(true)}
          className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-indigo-700"
        >
          <Plus className="h-4 w-4" />
          New Transfer
        </button>
      </div>

      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
          <p className="text-sm text-slate-500">
            <span className="font-bold text-slate-800">{transfers.length}</span> transfers
            {cancelledCount > 0 && (
              <>
                <span className="mx-1.5 text-slate-300">·</span>
                <span className="font-bold text-slate-600">{cancelledCount}</span> cancelled
              </>
            )}
            <span className="mx-1.5 text-slate-300">·</span>
            <span className="font-bold text-indigo-700">{formatBdt(totalMoved)}</span> moved
          </p>
          <div className="relative ml-auto w-full min-w-[180px] sm:w-56">
            <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
            <input
              className="h-9 w-full rounded-lg border border-slate-200 py-0 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
              placeholder="Search accounts, ref..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px]">
            <thead>
              <tr className="bg-[#2b4c7e]">
                <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wide text-white">
                  Date
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wide text-white">
                  From → To
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wide text-white">
                  Amount
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wide text-white">
                  Fee
                </th>
                <th className="px-4 py-3.5 text-left text-xs font-bold uppercase tracking-wide text-white">
                  Reference
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
              {pagedTransfers.map((t, idx) => {
                const status = transferStatus(t);
                const cancelled = status === "cancelled";

                return (
                  <tr
                    key={t.id}
                    className={clsx(
                      "border-b border-slate-100",
                      idx % 2 === 0 ? "bg-white" : "bg-slate-50/60",
                      cancelled && "opacity-75"
                    )}
                  >
                    <td className="px-4 py-3.5 text-sm text-slate-700">
                      <p>{t.date}</p>
                      <p className="text-xs text-slate-400">{t.time}</p>
                      {t.cancelledAt && (
                        <p className="mt-0.5 text-[10px] text-slate-400">Cancelled {t.cancelledAt}</p>
                      )}
                    </td>
                    <td className="px-4 py-3.5 text-sm">
                      <div
                        className={clsx(
                          "flex items-center gap-2 font-semibold text-slate-800",
                          cancelled && "line-through decoration-slate-400"
                        )}
                      >
                        <ArrowRightLeft className="h-4 w-4 shrink-0 text-indigo-500" />
                        <span>{formatTransferLabel(t)}</span>
                      </div>
                      {t.note && <p className="mt-1 text-xs text-slate-500">{t.note}</p>}
                    </td>
                    <td
                      className={clsx(
                        "px-4 py-3.5 text-sm font-bold",
                        cancelled ? "text-slate-400 line-through" : "text-indigo-700"
                      )}
                    >
                      {formatBdt(t.amount)}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-600">
                      {(t.fee ?? 0) > 0 ? formatBdt(t.fee!) : "—"}
                    </td>
                    <td className="px-4 py-3.5 text-sm text-slate-600">{t.reference ?? "—"}</td>
                    <td className="px-4 py-3.5">
                      <span
                        className={clsx(
                          "inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold",
                          cancelled
                            ? "bg-slate-200 text-slate-600"
                            : "bg-emerald-100 text-emerald-700"
                        )}
                      >
                        {TRANSFER_STATUS_LABELS[status]}
                      </span>
                    </td>
                    <td className="px-4 py-3.5 text-center">
                      {!cancelled ? (
                        <button
                          type="button"
                          onClick={() => openCancel(t)}
                          className="inline-flex items-center gap-1 rounded-lg border border-rose-200 px-2.5 py-1.5 text-xs font-bold text-rose-600 hover:bg-rose-50"
                        >
                          <Ban className="h-3.5 w-3.5" />
                          Cancel
                        </button>
                      ) : (
                        <span className="text-xs text-slate-400">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
              {transfers.length === 0 && (
                <tr>
                  <td colSpan={7} className="px-4 py-16 text-center text-slate-500">
                    <div className="mx-auto flex max-w-sm flex-col items-center gap-3">
                      <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-50 text-indigo-400">
                        <ArrowRightLeft className="h-6 w-6" />
                      </span>
                      <p className="text-sm font-medium">No transfers yet.</p>
                      <p className="text-xs text-slate-400">
                        Move money from bKash to bank, or between any active accounts.
                      </p>
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        <TablePagination
          totalRows={transfers.length}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={setPage}
          onRowsPerPageChange={(n) => { setRowsPerPage(n); setPage(1); }}
        />
      </div>

      <AccountTransferModal
        open={modalOpen}
        onClose={() => setModalOpen(false)}
        onSaved={refresh}
      />

      <CancelTransferModal
        transfer={cancelTarget}
        open={cancelTarget != null}
        onClose={() => {
          setCancelTarget(null);
          setCancelError("");
        }}
        onConfirm={handleCancelConfirm}
        saving={cancelSaving}
        error={cancelError}
      />
    </div>
  );
}
