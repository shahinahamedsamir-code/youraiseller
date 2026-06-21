"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  RefreshCw,
  ReceiptText,
  ShoppingBag,
  WalletCards,
  X,
} from "lucide-react";
import {
  loadAccountingData,
  type AccountingIncome,
} from "@/lib/accounting-store";
import {
  loadCompletedSales,
  type CompletedSaleData,
} from "./CompleteSaleReceipt";

type SaleRow = {
  income: AccountingIncome;
  accountName: string;
  detail: CompletedSaleData | null;
};

function todayLabel(): string {
  return new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function money(n: number): string {
  return `BDT ${Math.max(0, n).toLocaleString("en-BD")}`;
}

export function TodaysSalesPanel() {
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [selectedRef, setSelectedRef] = useState<string | null>(null);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    const refresh = () => setTick((n) => n + 1);
    refresh();
    window.addEventListener("youraiseller-data-updated", refresh);
    return () => window.removeEventListener("youraiseller-data-updated", refresh);
  }, []);

  const today = todayLabel();

  useEffect(() => {
    const data = loadAccountingData();
    const details = loadCompletedSales();
    const detailMap = new Map<string, CompletedSaleData>();
    for (const d of details) detailMap.set(d.reference, d);

    const accountMap = new Map<string, string>();
    for (const acc of data.accounts) accountMap.set(acc.id, acc.name);

    const rows = data.income
      .filter(
        (inc) =>
          inc.date === today &&
          (inc.reference?.startsWith("POS-") || inc.title.startsWith("POS Sale"))
      )
      .sort((a, b) => (b.time ?? "").localeCompare(a.time ?? ""))
      .map((inc) => ({
        income: inc,
        accountName: accountMap.get(inc.accountId) ?? "Unknown",
        detail: inc.reference ? detailMap.get(inc.reference) ?? null : null,
      }));

    setSales(rows);
  }, [today, tick]);

  const summary = useMemo(() => {
    const total = sales.reduce((sum, row) => sum + row.income.amount, 0);
    const discount = sales.reduce((sum, row) => sum + (row.income.discount ?? 0), 0);
    const paid = sales.reduce((sum, row) => sum + (row.detail?.paid ?? row.income.amount), 0);
    const due = sales.reduce((sum, row) => sum + (row.detail?.due ?? 0), 0);
    return { total, discount, paid, due, count: sales.length };
  }, [sales]);

  const selectedSale = useMemo(
    () => sales.find((row) => row.income.reference === selectedRef) ?? null,
    [sales, selectedRef]
  );

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-slate-900">
            <CheckCircle2 className="h-7 w-7 text-emerald-600" />
            Today&apos;s Sales
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {today} - {summary.count} sales recorded
          </p>
        </div>
        <div className="flex gap-2">
          <button
            type="button"
            onClick={() => setTick((n) => n + 1)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4" />
            Refresh
          </button>
          <Link
            href="/dashboard/pos/new-sale"
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white hover:bg-indigo-700"
          >
            <ArrowLeft className="h-4 w-4" />
            New Sale
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatCard label="Sales" value={String(summary.count)} icon={ShoppingBag} />
        <StatCard label="Total" value={money(summary.total)} icon={ReceiptText} />
        <StatCard label="Paid" value={money(summary.paid)} icon={WalletCards} />
        <StatCard label="Due" value={money(summary.due)} icon={ReceiptText} />
      </div>

      {sales.length === 0 ? (
        <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl bg-white text-center shadow-sm ring-1 ring-slate-200">
          <ShoppingBag className="h-12 w-12 text-slate-300" />
          <p className="mt-3 text-lg font-extrabold text-slate-700">No sales today</p>
          <p className="mt-1 text-sm text-slate-500">
            Complete a sale from New Sale to see it here.
          </p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50 text-xs font-bold uppercase text-slate-500">
                <th className="px-4 py-3 text-left">Reference</th>
                <th className="px-4 py-3 text-left">Customer</th>
                <th className="px-4 py-3 text-left">Time</th>
                <th className="px-4 py-3 text-left">Account</th>
                <th className="px-4 py-3 text-right">Amount</th>
                <th className="px-4 py-3 text-right">Due</th>
                <th className="px-4 py-3 text-center">Details</th>
              </tr>
            </thead>
            <tbody>
              {sales.map((row) => (
                <tr key={row.income.id} className="border-b border-slate-50 hover:bg-slate-50">
                  <td className="px-4 py-3 font-mono text-xs font-bold text-indigo-700">
                    {row.income.reference ?? "—"}
                  </td>
                  <td className="px-4 py-3 font-semibold text-slate-900">
                    {row.detail?.customerName ?? "Walk-in customer"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {row.income.time ?? "—"}
                  </td>
                  <td className="px-4 py-3 text-slate-600">
                    {row.accountName}
                  </td>
                  <td className="px-4 py-3 text-right font-black text-slate-900">
                    {money(row.income.amount)}
                  </td>
                  <td className="px-4 py-3 text-right font-bold text-rose-600">
                    {money(row.detail?.due ?? 0)}
                  </td>
                  <td className="px-4 py-3 text-center">
                    {row.detail ? (
                      <button
                        type="button"
                        onClick={() => setSelectedRef(row.income.reference ?? null)}
                        className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1.5 text-xs font-bold text-indigo-700 hover:bg-indigo-100"
                      >
                        <Eye className="h-3.5 w-3.5" />
                        View
                      </button>
                    ) : (
                      <span className="text-xs text-slate-400">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {selectedSale?.detail ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">Sale Details</h3>
                <p className="text-xs text-slate-500">{selectedSale.detail.reference}</p>
              </div>
              <button
                type="button"
                onClick={() => setSelectedRef(null)}
                className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
              <div className="mb-4 flex items-center justify-between text-xs text-slate-500">
                <span>{selectedSale.detail.date}</span>
                <span>{selectedSale.detail.time}</span>
              </div>

              <div className="space-y-2">
                {selectedSale.detail.items.map((item) => (
                  <div key={`${item.code}-${item.name}`} className="flex items-start justify-between gap-3 border-b border-slate-100 py-2">
                    <div>
                      <p className="font-bold text-slate-900">{item.name}</p>
                      <p className="font-mono text-[11px] text-slate-400">{item.code}</p>
                    </div>
                    <div className="text-right text-sm">
                      <p className="font-semibold text-slate-600">
                        {item.qty} x {money(item.unitPrice)}
                      </p>
                      <p className="font-black text-slate-900">{money(item.lineTotal)}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm">
                <DetailRow label="Subtotal" value={money(selectedSale.detail.subtotal)} />
                <DetailRow label="Discount" value={`-${money(selectedSale.detail.discount)}`} color="text-rose-600" />
                <DetailRow label="Total" value={money(selectedSale.detail.total)} bold />
                <DetailRow label="Paid" value={money(selectedSale.detail.paid)} color="text-emerald-700" />
                <DetailRow label="Due" value={money(selectedSale.detail.due)} color="text-rose-600" />
                <DetailRow label="Payment" value={selectedSale.detail.paymentAccount} />
              </div>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function StatCard({
  label,
  value,
  icon: Icon,
}: {
  label: string;
  value: string;
  icon: ComponentType<{ className?: string }>;
}) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700">
          <Icon className="h-5 w-5" />
        </span>
        <div>
          <p className="text-xs font-bold uppercase text-slate-400">{label}</p>
          <p className="text-lg font-black text-slate-900">{value}</p>
        </div>
      </div>
    </div>
  );
}

function DetailRow({
  label,
  value,
  bold = false,
  color,
}: {
  label: string;
  value: string;
  bold?: boolean;
  color?: string;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={bold ? "text-base font-black text-slate-900" : "text-slate-500"}>
        {label}
      </span>
      <span className={bold ? "text-base font-black text-slate-900" : color ? `font-bold ${color}` : "font-bold text-slate-900"}>
        {value}
      </span>
    </div>
  );
}
