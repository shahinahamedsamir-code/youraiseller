"use client";

import { useEffect, useMemo, useState, type ComponentType, type ReactNode } from "react";
import {
  ArrowLeftRight,
  ArrowRight,
  Check,
  CreditCard,
  Minus,
  Plus,
  ReceiptText,
  RefreshCw,
  RotateCcw,
  Search,
  ShoppingBag,
  Trash2,
  WalletCards,
} from "lucide-react";
import clsx from "clsx";
import {
  addExpense,
  addIncome,
  listVisiblePaymentAccounts,
  loadAccountingData,
  type AccountingAccount,
} from "@/lib/accounting-store";
import {
  decreaseStock,
  getProductDisplayImage,
  increaseStock,
  loadProducts,
  type Product,
} from "@/lib/inventory-store";
import {
  loadCompletedSales,
  saveCompletedSale,
  type CompletedSaleData,
} from "./CompleteSaleReceipt";
import { loadBusinessSettings } from "@/lib/business-settings-store";
import { openPosInvoicePrint } from "@/lib/pos-invoice";

function money(n: number): string {
  return `BDT ${Math.max(0, n).toLocaleString("en-BD")}`;
}

function todayLabel(): string {
  return new Date().toLocaleDateString("en-GB", { day: "2-digit", month: "short", year: "numeric" });
}

function timeLabel(): string {
  return new Date().toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" });
}

type ExchangeRecord = {
  id: string;
  originalRef: string;
  date: string;
  time: string;
  customerName: string | null;
  returnedItems: { code: string; name: string; qty: number; unitPrice: number; lineTotal: number }[];
  newItems: { code: string; name: string; qty: number; unitPrice: number; lineTotal: number }[];
  returnValue: number;
  newValue: number;
  difference: number;
  paymentType: "customer_pays" | "refund" | "even";
  accountName: string;
};

const EXCHANGE_KEY = "pos_exchange_sales";

function loadExchanges(): ExchangeRecord[] {
  try {
    const raw = localStorage.getItem(EXCHANGE_KEY);
    return raw ? (JSON.parse(raw) as ExchangeRecord[]) : [];
  } catch {
    return [];
  }
}

function saveExchange(record: ExchangeRecord) {
  const existing = loadExchanges();
  existing.unshift(record);
  localStorage.setItem(EXCHANGE_KEY, JSON.stringify(existing));
  window.dispatchEvent(new Event("youraiseller-data-updated"));
}

type SaleRow = {
  ref: string;
  date: string;
  time?: string;
  accountName: string;
  detail: CompletedSaleData | null;
};

type ReturnLine = {
  code: string;
  name: string;
  unitPrice: number;
  soldQty: number;
  returnQty: number;
  product: Product | null;
};

type NewCartLine = {
  product: Product;
  qty: number;
};

export function ExchangeSalePanel() {
  const [tick, setTick] = useState(0);
  const [sales, setSales] = useState<SaleRow[]>([]);
  const [query, setQuery] = useState("");
  const [selectedRef, setSelectedRef] = useState<string | null>(null);
  const [step, setStep] = useState<"select" | "exchange">("select");

  const [returnLines, setReturnLines] = useState<ReturnLine[]>([]);
  const [newCart, setNewCart] = useState<NewCartLine[]>([]);
  const [productQuery, setProductQuery] = useState("");
  const [products, setProducts] = useState<Product[]>([]);

  const [paymentAccounts] = useState<AccountingAccount[]>(() =>
    listVisiblePaymentAccounts(loadAccountingData()).filter((a) => a.active && a.posEnabled)
  );
  const [paymentAccountId, setPaymentAccountId] = useState(
    () => paymentAccounts.find((a) => a.defaultPaymentReceive)?.id ?? paymentAccounts[0]?.id ?? ""
  );
  const [discount, setDiscount] = useState(0);
  const [message, setMessage] = useState("");
  const [exchanges, setExchanges] = useState<ExchangeRecord[]>([]);

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
      .filter((inc) => inc.reference?.startsWith("POS-") || inc.title.startsWith("POS Sale"))
      .sort((a, b) => (b.time ?? "").localeCompare(a.time ?? ""))
      .map((inc) => ({
        ref: inc.reference ?? inc.id,
        date: inc.date,
        time: inc.time,
        accountName: accountMap.get(inc.accountId) ?? "Unknown",
        detail: inc.reference ? detailMap.get(inc.reference) ?? null : null,
      }));

    setSales(rows);
    setProducts(loadProducts().filter((p) => p.active !== false));
    setExchanges(loadExchanges());
  }, [tick]);

  const filteredSales = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return sales;
    return sales.filter((row) => {
      const d = row.detail;
      return [row.ref, row.date, row.time, row.accountName, d?.customerName, d?.customerPhone,
        ...(d?.items.map((i) => `${i.name} ${i.code}`) ?? [])]
        .filter(Boolean).join(" ").toLowerCase().includes(q);
    });
  }, [query, sales]);

  const selectedSale = useMemo(
    () => sales.find((r) => r.ref === selectedRef) ?? null,
    [sales, selectedRef]
  );

  const filteredProducts = useMemo(() => {
    const q = productQuery.trim().toLowerCase();
    if (!q) return products.slice(0, 12);
    return products
      .filter((p) => p.name.toLowerCase().includes(q) || p.code.toLowerCase().includes(q))
      .slice(0, 12);
  }, [products, productQuery]);

  const returnValue = returnLines.reduce((s, l) => s + l.returnQty * l.unitPrice, 0);
  const newValue = newCart.reduce((s, l) => s + l.product.sellPrice * l.qty, 0);
  const safeDiscount = Math.min(Math.max(0, discount), newValue);
  const newValueAfterDiscount = newValue - safeDiscount;
  const difference = newValueAfterDiscount - returnValue;
  const selectedAccount = paymentAccounts.find((a) => a.id === paymentAccountId) ?? null;

  const startExchange = (ref: string) => {
    const sale = sales.find((r) => r.ref === ref);
    if (!sale?.detail) return;
    setSelectedRef(ref);
    setReturnLines(
      sale.detail.items.map((item) => ({
        code: item.code,
        name: item.name,
        unitPrice: item.unitPrice,
        soldQty: item.qty,
        returnQty: 0,
        product: products.find((p) => p.code.toLowerCase() === item.code.toLowerCase()) ?? null,
      }))
    );
    setNewCart([]);
    setProductQuery("");
    setDiscount(0);
    setMessage("");
    setStep("exchange");
  };

  const updateReturnQty = (code: string, delta: number) => {
    setReturnLines((prev) =>
      prev.map((l) =>
        l.code === code ? { ...l, returnQty: Math.max(0, Math.min(l.soldQty, l.returnQty + delta)) } : l
      )
    );
  };

  const addNewProduct = (product: Product) => {
    if (product.manageStock && product.stockQty <= 0) return;
    setNewCart((prev) => {
      const existing = prev.find((l) => l.product.id === product.id);
      if (existing) {
        return prev.map((l) =>
          l.product.id === product.id
            ? { ...l, qty: Math.min(l.qty + 1, l.product.manageStock ? l.product.stockQty : 9999) }
            : l
        );
      }
      return [...prev, { product, qty: 1 }];
    });
  };

  const updateNewQty = (productId: string, delta: number) => {
    setNewCart((prev) =>
      prev
        .map((l) => {
          if (l.product.id !== productId) return l;
          const max = l.product.manageStock ? l.product.stockQty : 9999;
          return { ...l, qty: Math.max(0, Math.min(max, l.qty + delta)) };
        })
        .filter((l) => l.qty > 0)
    );
  };

  const hasReturn = returnLines.some((l) => l.returnQty > 0);
  const hasNew = newCart.length > 0;

  const completeExchange = () => {
    if (!selectedSale?.detail || !hasReturn || !hasNew) {
      setMessage("Select returned items and new items.");
      return;
    }
    if (!selectedAccount) {
      setMessage("Select a payment account.");
      return;
    }

    const returnedItems = returnLines
      .filter((l) => l.returnQty > 0)
      .map((l) => ({ code: l.code, name: l.name, qty: l.returnQty, unitPrice: l.unitPrice, lineTotal: l.returnQty * l.unitPrice }));

    const newItems = newCart.map((l) => ({
      code: l.product.code,
      name: l.product.name,
      qty: l.qty,
      unitPrice: l.product.sellPrice,
      lineTotal: l.product.sellPrice * l.qty,
    }));

    for (const line of returnLines.filter((l) => l.returnQty > 0)) {
      if (line.product?.manageStock) {
        increaseStock({ productId: line.product.id, qty: line.returnQty, reason: "POS Exchange Return", note: `Exchange from ${selectedRef}` });
      }
    }

    const exchangeRef = `EXCH-${Date.now().toString().slice(-8)}`;

    // New items handed over in the exchange leave the shop — deduct them.
    for (const line of newCart) {
      if (line.product.manageStock) {
        decreaseStock({ productId: line.product.id, qty: line.qty, reason: "POS Exchange Sale", note: `Exchange ${exchangeRef}` });
      }
    }

    if (difference > 0) {
      addIncome({
        title: `POS Exchange${selectedSale.detail.customerName ? ` - ${selectedSale.detail.customerName}` : ""}`,
        amount: difference,
        date: todayLabel(),
        source: "order",
        accountId: selectedAccount.id,
        reference: exchangeRef,
        note: `Exchange difference. Original: ${selectedRef}`,
      });
    } else if (difference < 0) {
      addExpense({
        date: todayLabel(),
        amount: Math.abs(difference),
        category: "general",
        accountId: selectedAccount.id,
        expenseTo: "POS Exchange Refund",
        title: `POS Exchange Refund - ${selectedRef}`,
        reference: exchangeRef,
        note: `Exchange refund. Original: ${selectedRef}`,
        status: "approved",
      });
    }

    const saleData: CompletedSaleData = {
      reference: exchangeRef,
      date: todayLabel(),
      time: timeLabel(),
      items: newItems,
      customerName: selectedSale.detail.customerName,
      customerPhone: selectedSale.detail.customerPhone,
      subtotal: newValue,
      discount: safeDiscount,
      total: newValueAfterDiscount,
      paid: newValueAfterDiscount,
      change: 0,
      due: 0,
      paymentAccount: selectedAccount.name,
    };
    saveCompletedSale(saleData);

    const paymentType: ExchangeRecord["paymentType"] =
      difference > 0 ? "customer_pays" : difference < 0 ? "refund" : "even";

    saveExchange({
      id: exchangeRef,
      originalRef: selectedRef!,
      date: todayLabel(),
      time: timeLabel(),
      customerName: selectedSale.detail.customerName,
      returnedItems,
      newItems,
      returnValue,
      newValue,
      difference,
      paymentType,
      accountName: selectedAccount.name,
    });

    openPosInvoicePrint(saleData, loadBusinessSettings());

    setMessage(`Exchange complete! ${paymentType === "customer_pays" ? `Customer paid ${money(difference)} extra.` : paymentType === "refund" ? `Refund ${money(Math.abs(difference))} to customer.` : "Even exchange — no payment needed."}`);
    setStep("select");
    setSelectedRef(null);
    setReturnLines([]);
    setNewCart([]);
    setTick((n) => n + 1);
  };

  const recentExchanges = exchanges.slice(0, 8);

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-slate-900">
            <ArrowLeftRight className="h-7 w-7 text-amber-600" />
            Exchange Sale
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Customer returns a product and takes a new one. Difference auto-calculated.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {step === "exchange" ? (
            <button
              type="button"
              onClick={() => { setStep("select"); setSelectedRef(null); setReturnLines([]); setNewCart([]); setDiscount(0); setMessage(""); }}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              <RotateCcw className="h-4 w-4" />
              Cancel
            </button>
          ) : (
            <button
              type="button"
              onClick={() => setTick((n) => n + 1)}
              className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
            >
              <RefreshCw className="h-4 w-4" />
              Refresh
            </button>
          )}
        </div>
      </div>

      {/* Stats */}
      <div className="grid gap-3 sm:grid-cols-4">
        <MetricCard label="Exchanges" value={String(exchanges.length)} icon={ArrowLeftRight} />
        <MetricCard label="Customer Paid" value={money(exchanges.filter((e) => e.paymentType === "customer_pays").reduce((s, e) => s + e.difference, 0))} icon={WalletCards} />
        <MetricCard label="Refunded" value={money(exchanges.filter((e) => e.paymentType === "refund").reduce((s, e) => s + Math.abs(e.difference), 0))} icon={RotateCcw} />
        <MetricCard label="Even Swaps" value={String(exchanges.filter((e) => e.paymentType === "even").length)} icon={Check} />
      </div>

      {step === "select" ? (
        <>
          {/* Search */}
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <label className="relative block">
              <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search sale by reference, customer, product..."
                className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white focus:ring-4 focus:ring-amber-100"
              />
            </label>
          </div>

          <div className="grid gap-5 xl:grid-cols-2">
            {/* Sales list */}
            <PanelCard title="Select Sale to Exchange" subtitle={`${filteredSales.length} completed sales`}>
              {filteredSales.length === 0 ? (
                <EmptyState icon={ShoppingBag} title="No sales found" text="Complete a sale first to start an exchange." />
              ) : (
                <div className="max-h-[400px] space-y-2 overflow-y-auto">
                  {filteredSales.map((row) => (
                    <button
                      key={row.ref}
                      type="button"
                      onClick={() => startExchange(row.ref)}
                      className="flex w-full items-center gap-3 rounded-xl border border-slate-100 bg-white px-4 py-3 text-left transition hover:border-amber-200 hover:bg-amber-50/50"
                    >
                      <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-amber-100 text-amber-700">
                        <ArrowLeftRight className="h-4 w-4" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-slate-900">
                          {row.detail?.customerName ?? "Walk-in customer"}
                        </p>
                        <p className="text-xs text-slate-500">
                          {row.ref} · {row.date}{row.time ? ` · ${row.time}` : ""}
                        </p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-black text-slate-900">{row.detail ? money(row.detail.total) : "—"}</p>
                        <p className="text-xs text-slate-500">{row.detail?.items.length ?? 0} items</p>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </PanelCard>

            {/* Recent exchanges */}
            <PanelCard title="Recent Exchanges" subtitle={`${recentExchanges.length} latest`}>
              {recentExchanges.length === 0 ? (
                <EmptyState icon={ArrowLeftRight} title="No exchanges yet" text="Exchange records will appear here." />
              ) : (
                <div className="max-h-[400px] space-y-2 overflow-y-auto">
                  {recentExchanges.map((ex) => (
                    <div key={ex.id} className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-sm font-black text-slate-900">{ex.id}</p>
                          <p className="text-xs text-slate-500">
                            {ex.customerName ?? "Walk-in"} · {ex.date} {ex.time}
                          </p>
                        </div>
                        <span className={clsx("rounded-full px-2.5 py-1 text-[10px] font-bold",
                          ex.paymentType === "customer_pays" ? "bg-emerald-100 text-emerald-700"
                            : ex.paymentType === "refund" ? "bg-rose-100 text-rose-700"
                              : "bg-slate-200 text-slate-600"
                        )}>
                          {ex.paymentType === "customer_pays" ? `+${money(ex.difference)}` : ex.paymentType === "refund" ? `-${money(Math.abs(ex.difference))}` : "Even"}
                        </span>
                      </div>
                      <p className="mt-2 text-xs text-slate-500">
                        Returned {ex.returnedItems.reduce((s, i) => s + i.qty, 0)} · New {ex.newItems.reduce((s, i) => s + i.qty, 0)} · {ex.accountName}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </PanelCard>
          </div>
        </>
      ) : (
        /* Exchange flow */
        <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_380px]">
          <div className="space-y-4">
            {/* Return items */}
            <PanelCard title="Return Items" subtitle={`From ${selectedRef} · Select items to return`}>
              <div className="space-y-2">
                {returnLines.map((line) => {
                  const img = line.product ? getProductDisplayImage(line.product) : undefined;
                  return (
                    <div key={line.code} className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-3">
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={img} alt="" className="h-11 w-11 shrink-0 rounded-lg border border-slate-200 object-cover" />
                      ) : (
                        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-slate-100 text-[10px] font-bold text-slate-400">
                          {line.code.slice(0, 4)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-slate-900">{line.name}</p>
                        <p className="text-xs text-slate-500">
                          {money(line.unitPrice)} · Sold {line.soldQty}
                        </p>
                      </div>
                      <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white">
                        <button type="button" onClick={() => updateReturnQty(line.code, -1)} className="p-2 text-slate-600"><Minus className="h-4 w-4" /></button>
                        <span className={clsx("w-10 text-center text-sm font-black", line.returnQty > 0 ? "text-rose-600" : "text-slate-400")}>{line.returnQty}</span>
                        <button type="button" onClick={() => updateReturnQty(line.code, 1)} className="p-2 text-slate-600"><Plus className="h-4 w-4" /></button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </PanelCard>

            {/* New items */}
            <PanelCard title="New Items" subtitle="Search and add replacement products">
              <div className="mb-3">
                <label className="relative block">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
                  <input
                    value={productQuery}
                    onChange={(e) => setProductQuery(e.target.value)}
                    placeholder="Search product name or code..."
                    className="h-10 w-full rounded-xl border border-slate-200 bg-slate-50 pl-10 pr-3 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white"
                  />
                </label>
              </div>
              <div className="mb-4 grid grid-cols-2 gap-2 sm:grid-cols-3">
                {filteredProducts.map((p) => {
                  const disabled = p.manageStock && p.stockQty <= 0;
                  return (
                    <button
                      key={p.id}
                      type="button"
                      disabled={disabled}
                      onClick={() => addNewProduct(p)}
                      className={clsx(
                        "rounded-xl border p-2.5 text-left transition",
                        disabled ? "cursor-not-allowed border-slate-100 opacity-50" : "border-slate-200 hover:border-amber-300 hover:bg-amber-50/50"
                      )}
                    >
                      <p className="truncate text-xs font-bold text-slate-900">{p.name}</p>
                      <p className="text-xs font-black text-amber-700">{money(p.sellPrice)}</p>
                    </button>
                  );
                })}
              </div>

              {newCart.length > 0 ? (
                <div className="space-y-2 border-t border-slate-100 pt-3">
                  {newCart.map((line) => (
                    <div key={line.product.id} className="flex items-center gap-3 rounded-xl border border-emerald-100 bg-emerald-50/50 p-3">
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-black text-slate-900">{line.product.name}</p>
                        <p className="text-xs text-slate-500">{money(line.product.sellPrice)} each</p>
                      </div>
                      <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white">
                        <button type="button" onClick={() => updateNewQty(line.product.id, -1)} className="p-2 text-slate-600"><Minus className="h-4 w-4" /></button>
                        <span className="w-10 text-center text-sm font-black text-emerald-700">{line.qty}</span>
                        <button type="button" onClick={() => updateNewQty(line.product.id, 1)} className="p-2 text-slate-600"><Plus className="h-4 w-4" /></button>
                      </div>
                      <button type="button" onClick={() => setNewCart((prev) => prev.filter((l) => l.product.id !== line.product.id))} className="rounded-lg p-1.5 text-slate-400 hover:text-rose-500">
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  ))}
                </div>
              ) : null}
            </PanelCard>
          </div>

          {/* Summary aside */}
          <aside>
            <div className="sticky top-20 space-y-4">
              <PanelCard title="Exchange Summary" subtitle={selectedSale?.detail?.customerName ?? "Walk-in customer"}>
                <div className="space-y-3">
                  <div className="rounded-xl bg-rose-50 px-4 py-3 ring-1 ring-rose-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-rose-500">Return Value</span>
                      <span className="text-base font-black text-rose-700">{money(returnValue)}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {returnLines.filter((l) => l.returnQty > 0).length} item(s) being returned
                    </p>
                  </div>

                  <div className="flex items-center justify-center">
                    <ArrowRight className="h-5 w-5 text-slate-300" />
                  </div>

                  <div className="rounded-xl bg-emerald-50 px-4 py-3 ring-1 ring-emerald-100">
                    <div className="flex items-center justify-between">
                      <span className="text-xs font-bold uppercase text-emerald-600">New Value</span>
                      <span className="text-base font-black text-emerald-700">{money(newValue)}</span>
                    </div>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {newCart.length} item(s) as replacement
                    </p>
                  </div>

                  {/* Discount */}
                  <div className="rounded-xl border border-slate-100 bg-white px-4 py-3">
                    <label className="block">
                      <span className="mb-1 flex items-center gap-1.5 text-xs font-bold uppercase text-slate-500">
                        Discount
                      </span>
                      <input
                        type="number"
                        min={0}
                        max={newValue}
                        value={discount || ""}
                        onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                        placeholder="0"
                        className="h-10 w-full rounded-lg border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-900 outline-none focus:border-amber-400 focus:bg-white"
                      />
                    </label>
                    {safeDiscount > 0 ? (
                      <p className="mt-1.5 text-xs font-semibold text-rose-600">
                        -{money(safeDiscount)} discount applied
                      </p>
                    ) : null}
                  </div>

                  <div className={clsx(
                    "rounded-xl px-4 py-4 ring-1",
                    difference > 0 ? "bg-amber-50 ring-amber-200" : difference < 0 ? "bg-indigo-50 ring-indigo-200" : "bg-slate-50 ring-slate-200"
                  )}>
                    <p className="text-xs font-bold uppercase text-slate-500">
                      {difference > 0 ? "Customer Pays Extra" : difference < 0 ? "Refund to Customer" : "Even Exchange"}
                    </p>
                    <p className={clsx("mt-1 text-2xl font-black",
                      difference > 0 ? "text-amber-700" : difference < 0 ? "text-indigo-700" : "text-slate-700"
                    )}>
                      {difference === 0 ? "BDT 0" : money(Math.abs(difference))}
                    </p>
                  </div>

                  {/* Payment account */}
                  {difference !== 0 ? (
                    <div>
                      <p className="mb-2 text-xs font-bold uppercase text-slate-500">Payment Account</p>
                      <div className="grid grid-cols-2 gap-2">
                        {paymentAccounts.map((acc) => (
                          <button
                            key={acc.id}
                            type="button"
                            onClick={() => setPaymentAccountId(acc.id)}
                            className={clsx(
                              "flex min-h-10 items-center justify-center rounded-xl border px-2 text-xs font-black transition",
                              paymentAccountId === acc.id
                                ? "border-amber-600 bg-amber-600 text-white"
                                : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-white"
                            )}
                          >
                            <span className="truncate">{acc.name}</span>
                          </button>
                        ))}
                      </div>
                    </div>
                  ) : null}

                  {message ? (
                    <p className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white">{message}</p>
                  ) : null}

                  <button
                    type="button"
                    disabled={!hasReturn || !hasNew}
                    onClick={completeExchange}
                    className="inline-flex h-12 w-full items-center justify-center gap-2 rounded-xl bg-amber-500 text-sm font-black text-slate-950 transition hover:bg-amber-400 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
                  >
                    <ArrowLeftRight className="h-5 w-5" />
                    Complete Exchange
                  </button>
                </div>
              </PanelCard>
            </div>
          </aside>
        </div>
      )}
    </div>
  );
}

function PanelCard({ title, subtitle, children }: { title: string; subtitle: string; children: ReactNode }) {
  return (
    <section className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
      <div className="border-b border-slate-100 px-4 py-3">
        <h2 className="text-sm font-black uppercase tracking-wide text-slate-900">{title}</h2>
        <p className="mt-0.5 text-xs text-slate-500">{subtitle}</p>
      </div>
      <div className="p-4">{children}</div>
    </section>
  );
}

function MetricCard({ label, value, icon: Icon }: { label: string; value: string; icon: ComponentType<{ className?: string }> }) {
  return (
    <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
      <div className="flex items-center gap-3">
        <span className="flex h-11 w-11 items-center justify-center rounded-xl bg-amber-50 text-amber-600">
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

function EmptyState({ icon: Icon, title, text }: { icon: ComponentType<{ className?: string }>; title: string; text: string }) {
  return (
    <div className="flex min-h-[200px] flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-center">
      <Icon className="h-10 w-10 text-slate-300" />
      <p className="mt-3 text-base font-black text-slate-700">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{text}</p>
    </div>
  );
}
