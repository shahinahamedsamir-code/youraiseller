"use client";

import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  CheckCircle2,
  CircleDashed,
  RefreshCw,
  RotateCcw,
  Search,
  ShoppingBag,
  WalletCards,
} from "lucide-react";
import clsx from "clsx";
import { addExpense, loadAccountingData } from "@/lib/accounting-store";
import {
  getProductDisplayImage,
  increaseStock,
  loadProducts,
  type Product,
} from "@/lib/inventory-store";
import {
  loadCompletedSales,
  type CompletedSaleData,
} from "./CompleteSaleReceipt";

type PosReturnItem = {
  code: string;
  name: string;
  qty: number;
  unitPrice: number;
  lineTotal: number;
};

type PosReturnRecord = {
  reference: string;
  date: string;
  time: string;
  customerName: string | null;
  refundAccount: string;
  refundAmount: number;
  restock: boolean;
  note?: string;
  items: PosReturnItem[];
};

type SaleRow = {
  incomeRef: string;
  incomeDate: string;
  incomeTime?: string;
  accountName: string;
  detail: CompletedSaleData | null;
};

type ReturnQtyMap = Record<string, string>;

const STORAGE_KEY = "pos_return_sales";

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

function timeLabel(): string {
  return new Date().toLocaleTimeString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function loadReturnSales(): PosReturnRecord[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as PosReturnRecord[]) : [];
  } catch {
    return [];
  }
}

function saveReturnSale(record: PosReturnRecord) {
  const existing = loadReturnSales();
  existing.unshift(record);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  window.dispatchEvent(new Event("youraiseller-data-updated"));
}

function findProductByCode(code: string): Product | undefined {
  return loadProducts().find((p) => p.code.toLowerCase() === code.toLowerCase());
}

export function ReturnSalePanel() {
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [returns, setReturns] = useState<PosReturnRecord[]>([]);
  const [selectedRef, setSelectedRef] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [tick, setTick] = useState(0);
  const [returnQtyByCode, setReturnQtyByCode] = useState<ReturnQtyMap>({});
  const [refundAccountId, setRefundAccountId] = useState("");
  const [restock, setRestock] = useState(true);
  const [note, setNote] = useState("");
  const [message, setMessage] = useState("");
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const refresh = () => setTick((n) => n + 1);
    refresh();
    window.addEventListener("youraiseller-data-updated", refresh);
    return () => window.removeEventListener("youraiseller-data-updated", refresh);
  }, []);

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
          inc.reference?.startsWith("POS-") || inc.title.startsWith("POS Sale")
      )
      .sort((a, b) => (b.time ?? "").localeCompare(a.time ?? ""))
      .map((inc) => ({
        incomeRef: inc.reference ?? inc.id,
        incomeDate: inc.date,
        incomeTime: inc.time,
        accountName: accountMap.get(inc.accountId) ?? "Unknown",
        detail: inc.reference ? detailMap.get(inc.reference) ?? null : null,
      }));

    setSales(rows);
    setReturns(loadReturnSales());

    const firstAccount = data.accounts.find((acc) => acc.active && acc.posEnabled) ?? data.accounts.find((acc) => acc.active);
    if (!refundAccountId && firstAccount) {
      setRefundAccountId(firstAccount.id);
    }
  }, [tick, refundAccountId]);

  const filteredSales = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sales;
    return sales.filter((row) => {
      const detail = row.detail;
      const haystack = [
        row.incomeRef,
        row.incomeDate,
        row.incomeTime,
        row.accountName,
        detail?.customerName,
        detail?.customerPhone,
        detail?.paymentAccount,
        ...(detail?.items.map((item) => `${item.name} ${item.code}`) ?? []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [query, sales]);

  useEffect(() => {
    if (selectedRef && filteredSales.some((row) => row.incomeRef === selectedRef)) {
      return;
    }
    setSelectedRef(filteredSales[0]?.incomeRef ?? null);
  }, [filteredSales, selectedRef]);

  const selectedSale = useMemo(
    () => sales.find((row) => row.incomeRef === selectedRef) ?? null,
    [sales, selectedRef]
  );

  const selectedReturn = useMemo(() => {
    if (!selectedSale?.detail) return [];
    const sold = selectedSale.detail.items;
    const alreadyReturned = new Map<string, number>();
    for (const record of returns.filter((r) => r.reference === selectedSale.incomeRef)) {
      for (const item of record.items) {
        alreadyReturned.set(item.code, (alreadyReturned.get(item.code) ?? 0) + item.qty);
      }
    }
    return sold.map((item) => {
      const returned = alreadyReturned.get(item.code) ?? 0;
      const available = Math.max(0, item.qty - returned);
      return {
        ...item,
        returned,
        available,
        product: findProductByCode(item.code) ?? null,
      };
    });
  }, [returns, selectedSale]);

  const refundAmount = useMemo(() => {
    return selectedReturn.reduce((sum, item) => {
      const qty = Number(returnQtyByCode[item.code]) || 0;
      return sum + qty * item.unitPrice;
    }, 0);
  }, [returnQtyByCode, selectedReturn]);

  const selectedSummary = useMemo(() => {
    if (!selectedSale?.detail) return { sold: 0, returned: 0, available: 0 };
    const sold = selectedSale.detail.items.reduce((sum, item) => sum + item.qty, 0);
    const returned = selectedReturn.reduce((sum, item) => sum + item.returned, 0);
    const available = selectedReturn.reduce((sum, item) => sum + item.available, 0);
    return { sold, returned, available };
  }, [selectedReturn, selectedSale]);

  const recentReturns = useMemo(() => {
    return returns.slice(0, 8);
  }, [returns]);

  const resetForm = () => {
    setReturnQtyByCode({});
    setNote("");
    setRestock(true);
    setMessage("");
  };

  useEffect(() => {
    resetForm();
  }, [selectedRef]);

  const handleSubmit = () => {
    if (!selectedSale?.detail) return;
    if (!refundAccountId) {
      setMessage("Select a refund account.");
      return;
    }

    const rows = selectedReturn
      .map((item) => ({
        ...item,
        qty: Math.max(0, Math.min(item.available, Number(returnQtyByCode[item.code]) || 0)),
      }))
      .filter((item) => item.qty > 0);

    if (rows.length === 0) {
      setMessage("Select at least one item quantity to return.");
      return;
    }

    const account = loadAccountingData().accounts.find((acc) => acc.id === refundAccountId);
    if (!account) {
      setMessage("Refund account not found.");
      return;
    }

    setSubmitting(true);
    try {
      for (const row of rows) {
        if (restock && row.product && row.product.manageStock) {
          increaseStock({
            productId: row.product.id,
            qty: row.qty,
            reason: "POS Return",
            note: `${selectedSale.incomeRef} refund`,
          });
        }
      }

      const refundItems = rows.map((row) => ({
        code: row.code,
        name: row.name,
        qty: row.qty,
        unitPrice: row.unitPrice,
        lineTotal: row.qty * row.unitPrice,
      }));
      const amount = refundItems.reduce((sum, item) => sum + item.lineTotal, 0);

      addExpense({
        date: todayLabel(),
        amount,
        category: "general",
        accountId: refundAccountId,
        expenseTo: "POS Return Refund",
        title: `POS Return Refund - ${selectedSale.incomeRef}`,
        reference: `RETURN-${selectedSale.incomeRef}`,
        note: note.trim() || `Refund for returned sale ${selectedSale.incomeRef}`,
        status: "approved",
      });

      saveReturnSale({
        reference: selectedSale.incomeRef,
        date: todayLabel(),
        time: timeLabel(),
        customerName: selectedSale.detail.customerName,
        refundAccount: account.name,
        refundAmount: amount,
        restock,
        note: note.trim() || undefined,
        items: refundItems,
      });

      setMessage(`Return saved. Refund ${money(amount)} recorded.`);
      setReturnQtyByCode({});
      setNote("");
    } catch (error) {
      setMessage(error instanceof Error ? error.message : "Could not save return.");
    } finally {
      setSubmitting(false);
    }
  };

  const hasSelectedReturnable = selectedReturn.some((item) => item.available > 0);

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-slate-900">
            <RotateCcw className="h-7 w-7 text-rose-600" />
            Return Sale
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Search a completed sale, pick returned items, and record refund plus stock return.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
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
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-black text-white hover:bg-indigo-700"
          >
            <ArrowLeft className="h-4 w-4" />
            New Sale
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Sales" value={String(sales.length)} icon={ShoppingBag} />
        <MetricCard label="Returns" value={String(returns.length)} icon={RotateCcw} />
        <MetricCard label="Refunds" value={money(returns.reduce((sum, row) => sum + row.refundAmount, 0))} icon={WalletCards} />
        <MetricCard label="Restocked" value={String(returns.filter((row) => row.restock).length)} icon={CheckCircle2} />
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search reference, customer, item, account..."
            className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm font-semibold text-slate-900 outline-none focus:border-rose-400 focus:bg-white focus:ring-4 focus:ring-rose-100"
          />
        </label>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="space-y-4">
          <PanelCard title="Completed Sales" subtitle={`${filteredSales.length} sale${filteredSales.length === 1 ? "" : "s"} available`}>
            {filteredSales.length === 0 ? (
              <EmptyState
                icon={ShoppingBag}
                title="No sales found"
                text="Try another customer name, reference, or product code."
              />
            ) : (
              <div className="space-y-2">
                {filteredSales.map((row) => (
                  <button
                    key={row.incomeRef}
                    type="button"
                    onClick={() => setSelectedRef(row.incomeRef)}
                    className={clsx(
                      "flex w-full items-center gap-3 rounded-xl border px-4 py-3 text-left transition",
                      selectedRef === row.incomeRef
                        ? "border-rose-200 bg-rose-50"
                        : "border-slate-100 bg-white hover:bg-slate-50"
                    )}
                  >
                    {row.detail?.customerName ? (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-rose-100 text-xs font-black text-rose-700">
                        {row.detail.customerName.slice(0, 2).toUpperCase()}
                      </div>
                    ) : (
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-slate-400">
                        <CircleDashed className="h-4 w-4" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-black text-slate-900">
                        {row.detail?.customerName ?? "Walk-in customer"}
                      </p>
                      <p className="truncate text-xs text-slate-500">
                        {row.incomeRef} · {row.incomeDate}
                        {row.incomeTime ? ` · ${row.incomeTime}` : ""}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-black text-slate-900">
                        {row.detail ? money(row.detail.total) : "—"}
                      </p>
                      <p className="text-xs text-slate-500">{row.accountName}</p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </PanelCard>

          <PanelCard
            title="Recent Returns"
            subtitle={`${recentReturns.length} latest refunds`}
          >
            {recentReturns.length === 0 ? (
              <EmptyState
                icon={RotateCcw}
                title="No returns yet"
                text="Saved return refunds will appear here."
              />
            ) : (
              <div className="space-y-2">
                {recentReturns.map((row, idx) => (
                  <div
                    key={`${row.reference}-${idx}`}
                    className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="text-sm font-black text-slate-900">{row.reference}</p>
                        <p className="text-xs text-slate-500">
                          {row.customerName ?? "Walk-in customer"} · {row.date} {row.time}
                        </p>
                      </div>
                      <p className="text-sm font-black text-rose-600">
                        {money(row.refundAmount)}
                      </p>
                    </div>
                    <p className="mt-2 text-xs text-slate-500">
                      {row.items.length} item{row.items.length === 1 ? "" : "s"} ·
                      {row.restock ? " Restocked" : " Not restocked"} · {row.refundAccount}
                    </p>
                  </div>
                ))}
              </div>
            )}
          </PanelCard>
        </section>

        <aside className="space-y-4">
          <PanelCard
            title="Return Entry"
            subtitle={selectedSale?.detail ? selectedSale.incomeRef : "Select a sale to begin"}
          >
            {!selectedSale?.detail ? (
              <EmptyState
                icon={RotateCcw}
                title="Select a sale"
                text="Pick a completed sale from the list to create a return."
              />
            ) : (
              <div className="space-y-4">
                <div className="rounded-xl bg-rose-50 px-4 py-3 ring-1 ring-rose-100">
                  <p className="text-[11px] font-bold uppercase text-rose-500">Customer</p>
                  <p className="mt-1 text-sm font-black text-slate-900">
                    {selectedSale.detail.customerName ?? "Walk-in customer"}
                  </p>
                  <p className="text-xs text-slate-500">
                    {selectedSale.incomeRef} · {selectedSale.incomeDate}
                    {selectedSale.incomeTime ? ` · ${selectedSale.incomeTime}` : ""}
                  </p>
                </div>

                <div className="grid grid-cols-3 gap-2">
                  <MiniStat label="Sold" value={String(selectedSummary.sold)} />
                  <MiniStat label="Returned" value={String(selectedSummary.returned)} />
                  <MiniStat label="Open" value={String(selectedSummary.available)} />
                </div>

                <div className="space-y-2">
                  {selectedReturn.map((item) => {
                    const productImg = item.product ? getProductDisplayImage(item.product) : undefined;
                    return (
                      <div
                        key={item.code}
                        className="rounded-xl border border-slate-100 bg-white p-3"
                      >
                        <div className="flex items-start gap-3">
                          {productImg ? (
                            // eslint-disable-next-line @next/next/no-img-element
                            <img
                              src={productImg}
                              alt=""
                              className="h-12 w-12 shrink-0 rounded-lg border border-slate-200 object-cover"
                            />
                          ) : (
                            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-bold text-slate-400">
                              {item.code.slice(0, 4)}
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="truncate text-sm font-black text-slate-900">{item.name}</p>
                            <p className="font-mono text-[11px] text-slate-400">{item.code}</p>
                            <p className="mt-1 text-xs text-slate-500">
                              Sold {item.qty} · Already returned {item.returned} · Available {item.available}
                            </p>
                          </div>
                          <div className="w-28">
                            <label className="block">
                              <span className="mb-1 block text-[11px] font-bold uppercase text-slate-400">
                                Return Qty
                              </span>
                              <input
                                type="number"
                                min={0}
                                max={item.available}
                                value={returnQtyByCode[item.code] ?? ""}
                                onChange={(e) =>
                                  setReturnQtyByCode((prev) => ({
                                    ...prev,
                                    [item.code]: e.target.value,
                                  }))
                                }
                                placeholder="0"
                                className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-900 outline-none focus:border-rose-400 focus:bg-white"
                              />
                            </label>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="grid gap-2 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                  <label className="block">
                    <span className="mb-1 block text-xs font-bold uppercase text-slate-500">
                      Refund Account
                    </span>
                    <select
                      value={refundAccountId}
                      onChange={(e) => setRefundAccountId(e.target.value)}
                      className="h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm font-semibold text-slate-900 outline-none focus:border-rose-400"
                    >
                      {loadAccountingData().accounts
                        .filter((acc) => acc.active)
                        .map((acc) => (
                          <option key={acc.id} value={acc.id}>
                            {acc.name}
                          </option>
                        ))}
                    </select>
                  </label>

                  <div className="grid grid-cols-2 gap-2">
                    <button
                      type="button"
                      onClick={() => setRestock(true)}
                      className={clsx(
                        "rounded-xl border px-3 py-2 text-sm font-black",
                        restock
                          ? "border-emerald-500 bg-emerald-50 text-emerald-700"
                          : "border-slate-200 bg-white text-slate-600"
                      )}
                    >
                      Restock On
                    </button>
                    <button
                      type="button"
                      onClick={() => setRestock(false)}
                      className={clsx(
                        "rounded-xl border px-3 py-2 text-sm font-black",
                        !restock
                          ? "border-rose-500 bg-rose-50 text-rose-700"
                          : "border-slate-200 bg-white text-slate-600"
                      )}
                    >
                      No Restock
                    </button>
                  </div>

                  <label className="block">
                    <span className="mb-1 block text-xs font-bold uppercase text-slate-500">
                      Note
                    </span>
                    <textarea
                      value={note}
                      onChange={(e) => setNote(e.target.value)}
                      rows={3}
                      placeholder="Optional return reason or note"
                      className="w-full rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-rose-400"
                    />
                  </label>

                  <div className="rounded-xl bg-white px-4 py-3 ring-1 ring-slate-100">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-bold text-slate-500">Refund amount</span>
                      <span className="text-lg font-black text-slate-900">{money(refundAmount)}</span>
                    </div>
                  </div>

                  {message ? (
                    <p className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white">
                      {message}
                    </p>
                  ) : null}

                  <button
                    type="button"
                    disabled={!hasSelectedReturnable || submitting}
                    onClick={handleSubmit}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-rose-600 text-sm font-black text-white transition hover:bg-rose-700 disabled:cursor-not-allowed disabled:bg-slate-300"
                  >
                    <RotateCcw className="h-4 w-4" />
                    {submitting ? "Saving..." : "Save Return"}
                  </button>
                </div>
              </div>
            )}
          </PanelCard>
        </aside>
      </div>
    </div>
  );
}

function PanelCard({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle: string;
  children: ReactNode;
}) {
  return (
    <section className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      <div className="border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-black uppercase tracking-wide text-slate-900">
          {title}
        </h2>
        <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function MetricCard({
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
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-rose-50 text-rose-600">
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

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-white px-3 py-2 text-center">
      <p className="text-[11px] font-bold uppercase text-slate-400">{label}</p>
      <p className="mt-1 text-sm font-black text-slate-900">{value}</p>
    </div>
  );
}

function EmptyState({
  icon: Icon,
  title,
  text,
}: {
  icon: ComponentType<{ className?: string }>;
  title: string;
  text: string;
}) {
  return (
    <div className="flex min-h-[220px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center">
      <Icon className="h-10 w-10 text-slate-300" />
      <p className="mt-3 text-base font-black text-slate-700">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{text}</p>
    </div>
  );
}
