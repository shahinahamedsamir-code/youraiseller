"use client";

import { useEffect, useMemo, useState } from "react";
import {
  BadgePercent,
  Barcode,
  Check,
  CreditCard,
  Hash,
  Minus,
  Phone,
  Plus,
  ReceiptText,
  RotateCcw,
  Search,
  ShoppingBag,
  Save,
  Trash2,
  UserPlus,
  UserRound,
  WalletCards,
  X,
} from "lucide-react";
import clsx from "clsx";
import {
  getProductDisplayImage,
  loadProducts,
  type Product,
} from "@/lib/inventory-store";
import { addCustomer, loadCustomers, type SellerCustomer } from "@/lib/customers-store";
import {
  addIncome,
  listVisiblePaymentAccounts,
  loadAccountingData,
  type AccountingAccount,
} from "@/lib/accounting-store";
import { saveCompletedSale } from "./CompleteSaleReceipt";
import { loadBusinessSettings } from "@/lib/business-settings-store";
import { openPosInvoicePrint } from "@/lib/pos-invoice";
import { savePosDraftSale, type PosDraftSaleRecord } from "@/lib/pos-drafts";
import { autoRecordCashSale } from "@/lib/pos-cash-register";

type CartLine = {
  product: Product;
  qty: number;
};

function money(n: number): string {
  return `BDT ${Math.max(0, n).toLocaleString("en-BD")}`;
}

function todayLabel(): string {
  return new Date().toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function accountIcon(account: AccountingAccount): typeof WalletCards {
  if (account.type === "mobile_wallet") return WalletCards;
  if (account.type === "bank") return CreditCard;
  if (account.type === "cash") return ReceiptText;
  return CreditCard;
}

function stockTone(product: Product): string {
  if (product.manageStock && product.stockQty <= 0) return "bg-rose-50 text-rose-700";
  if (product.manageStock && product.stockQty <= product.alertQty) {
    return "bg-amber-50 text-amber-700";
  }
  return "bg-emerald-50 text-emerald-700";
}

export function NewSalePanel() {
  const [query, setQuery] = useState("");
  const [cart, setCart] = useState<CartLine[]>([]);
  const [products, setProducts] = useState<Product[]>(() =>
    loadProducts().filter((p) => p.active !== false)
  );
  const [customers, setCustomers] = useState<SellerCustomer[]>(() => loadCustomers());
  const [selectedCustomerId, setSelectedCustomerId] = useState("");
  const [customerModalOpen, setCustomerModalOpen] = useState(false);
  const [customerForm, setCustomerForm] = useState({
    name: "",
    phone: "",
    address: "",
  });
  const [customerError, setCustomerError] = useState("");
  const [discount, setDiscount] = useState(0);
  const [paymentAccounts] = useState<AccountingAccount[]>(() =>
    listVisiblePaymentAccounts(loadAccountingData()).filter(
      (account) => account.active && account.posEnabled
    )
  );
  const [paymentAccountId, setPaymentAccountId] = useState(
    () => paymentAccounts.find((account) => account.defaultPaymentReceive)?.id ?? paymentAccounts[0]?.id ?? ""
  );
  const [paid, setPaid] = useState("");
  const [transactionId, setTransactionId] = useState("");
  const [completeMsg, setCompleteMsg] = useState("");
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    const check = () => setIsMobile(window.innerWidth < 1280);
    check();
    window.addEventListener("resize", check);
    return () => window.removeEventListener("resize", check);
  }, []);

  useEffect(() => {
    const refreshProducts = () => {
      setProducts(loadProducts().filter((p) => p.active !== false));
    };
    refreshProducts();
    window.addEventListener("youraiseller-data-updated", refreshProducts);
    return () => window.removeEventListener("youraiseller-data-updated", refreshProducts);
  }, []);

  useEffect(() => {
    try {
      const raw = localStorage.getItem("pos_edit_draft");
      if (!raw) return;
      localStorage.removeItem("pos_edit_draft");
      const draft: PosDraftSaleRecord = JSON.parse(raw);
      const allProducts = loadProducts().filter((p) => p.active !== false);
      const cartLines: CartLine[] = draft.lines
        .map((line) => {
          const liveProduct = allProducts.find((p) => p.id === line.product.id);
          return liveProduct ? { product: liveProduct, qty: line.qty } : null;
        })
        .filter((l): l is CartLine => l !== null);
      setCart(cartLines);
      if (draft.customerId) setSelectedCustomerId(draft.customerId);
      setDiscount(draft.discount);
      setPaid(draft.paid);
      if (draft.paymentAccountId) setPaymentAccountId(draft.paymentAccountId);
      if (draft.transactionId) setTransactionId(draft.transactionId);
    } catch {}
  }, []);

  const filteredProducts = useMemo(() => {
    const q = query.trim().toLowerCase();
    const list = q
      ? products.filter(
          (p) =>
            p.name.toLowerCase().includes(q) ||
            p.code.toLowerCase().includes(q)
        )
      : products;
    const limit = isMobile && !q ? 4 : 16;
    return list.slice(0, limit);
  }, [products, query, isMobile]);

  const subtotal = cart.reduce((sum, line) => sum + line.product.sellPrice * line.qty, 0);
  const selectedCustomer =
    customers.find((item) => item.id === selectedCustomerId) ?? null;
  const selectedPaymentAccount =
    paymentAccounts.find((account) => account.id === paymentAccountId) ?? null;
  const needsTrxId =
    selectedPaymentAccount?.type === "mobile_wallet" ||
    selectedPaymentAccount?.type === "bank";
  const safeDiscount = Math.min(Math.max(0, discount), subtotal);
  const total = subtotal - safeDiscount;
  const paidAmount = Number(paid) || 0;
  const change = Math.max(0, paidAmount - total);
  const due = Math.max(0, total - paidAmount);

  const addProduct = (product: Product) => {
    if (product.manageStock && product.stockQty <= 0) return;
    setCompleteMsg("");
    setCart((prev) => {
      const existing = prev.find((line) => line.product.id === product.id);
      if (existing) {
        return prev.map((line) =>
          line.product.id === product.id
            ? { ...line, qty: Math.min(line.qty + 1, line.product.stockQty || line.qty + 1) }
            : line
        );
      }
      return [...prev, { product, qty: 1 }];
    });
  };

  const updateQty = (productId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((line) => {
          if (line.product.id !== productId) return line;
          const maxQty = line.product.manageStock ? line.product.stockQty : 9999;
          return { ...line, qty: Math.max(0, Math.min(maxQty, line.qty + delta)) };
        })
        .filter((line) => line.qty > 0)
    );
  };

  const clearSale = () => {
    setCart([]);
    setSelectedCustomerId("");
    setDiscount(0);
    setPaid("");
    setTransactionId("");
    setPaymentAccountId(
      paymentAccounts.find((account) => account.defaultPaymentReceive)?.id ??
        paymentAccounts[0]?.id ??
        ""
    );
    setCompleteMsg("");
  };

  const completeSale = () => {
    if (cart.length === 0 || !selectedPaymentAccount) return;
    const reference = `POS-${Date.now().toString().slice(-8)}`;
    const now = new Date();
    addIncome({
      title: `POS Sale${selectedCustomer ? ` - ${selectedCustomer.name}` : ""}`,
      amount: total,
      discount: safeDiscount || undefined,
      date: todayLabel(),
      source: "order",
      accountId: selectedPaymentAccount.id,
      reference,
      note: transactionId
        ? `TrxID: ${transactionId} | ${cart.length} item${cart.length === 1 ? "" : "s"} sold from POS`
        : `${cart.length} item${cart.length === 1 ? "" : "s"} sold from POS`,
    });
    const saleData = {
      reference,
      date: todayLabel(),
      time: now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" }),
      items: cart.map((line) => ({
        name: line.product.name,
        code: line.product.code,
        qty: line.qty,
        unitPrice: line.product.sellPrice,
        lineTotal: line.product.sellPrice * line.qty,
      })),
      customerName: selectedCustomer?.name ?? null,
      customerPhone: selectedCustomer?.phone ?? null,
      subtotal,
      discount: safeDiscount,
      total,
      paid: paidAmount,
      change,
      due,
      paymentAccount: selectedPaymentAccount.name,
      transactionId: transactionId || undefined,
    };
    saveCompletedSale(saleData);
    if (selectedPaymentAccount.type === "cash") {
      autoRecordCashSale(total, reference, selectedCustomer?.name);
    }
    openPosInvoicePrint(saleData, loadBusinessSettings());
    clearSale();
  };

  const saveDraft = () => {
    if (cart.length === 0) return;
    const now = new Date();
    const draftId = selectedCustomerId
      ? `DRF-${selectedCustomerId}-${Date.now().toString().slice(-6)}`
      : `DRF-${Date.now().toString().slice(-8)}`;
    const draftLabel = selectedCustomer
      ? `${selectedCustomer.name} - ${cart.length} item${cart.length === 1 ? "" : "s"}`
      : `Draft Sale - ${cart.length} item${cart.length === 1 ? "" : "s"}`;
    savePosDraftSale({
      id: draftId,
      label: draftLabel,
      customerId: selectedCustomerId,
      customerName: selectedCustomer?.name ?? null,
      customerPhone: selectedCustomer?.phone ?? null,
      customerAddress: selectedCustomer?.address ?? null,
      discount: safeDiscount,
      paid,
      paymentAccountId: paymentAccountId || "",
      paymentAccountName: selectedPaymentAccount?.name ?? "",
      note: `Saved from New Sale at ${now.toLocaleTimeString("en-GB", { hour: "2-digit", minute: "2-digit" })}`,
      transactionId: transactionId || undefined,
      lines: cart.map((line) => ({
        product: {
          id: line.product.id,
          name: line.product.name,
          code: line.product.code,
          sellPrice: line.product.sellPrice,
          manageStock: line.product.manageStock,
          stockQty: line.product.stockQty,
          imageDataUrl: line.product.imageDataUrl,
        },
        qty: line.qty,
      })),
      subtotal,
      total,
      createdAt: now.toISOString(),
      updatedAt: now.toISOString(),
    });
    setCompleteMsg(`Draft saved: ${draftLabel}`);
  };

  const saveCustomer = () => {
    try {
      setCustomerError("");
      const next = addCustomer({
        name: customerForm.name,
        phone: customerForm.phone,
        address: customerForm.address,
      });
      setCustomers(loadCustomers());
      setSelectedCustomerId(next.id);
      setCustomerForm({ name: "", phone: "", address: "" });
      setCustomerModalOpen(false);
    } catch (error) {
      setCustomerError(error instanceof Error ? error.message : "Could not save customer.");
    }
  };

  return (
    <div className="space-y-5 pb-24 xl:pb-0">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-xl font-extrabold text-slate-900 sm:text-2xl">
            <ShoppingBag className="h-6 w-6 text-indigo-600 sm:h-7 sm:w-7" />
            New Sale
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Barcode search, quick cart, discount and payment in one counter screen.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-200">
          <ReceiptText className="h-5 w-5 text-indigo-500" />
          <div>
            <p className="text-xs font-semibold uppercase text-slate-400">Current total</p>
            <p className="text-lg font-extrabold text-slate-900">{money(total)}</p>
          </div>
        </div>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="space-y-4">
          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div className="flex flex-col gap-3 md:flex-row">
              <label className="relative flex-1">
                <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Scan barcode or search product name..."
                  className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
                />
              </label>
              <button
                type="button"
                className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-slate-900 px-5 text-sm font-bold text-white"
              >
                <Barcode className="h-4 w-4" />
                Barcode Mode
              </button>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3 2xl:grid-cols-3">
            {filteredProducts.map((product) => {
              const disabled = product.manageStock && product.stockQty <= 0;
              const img = getProductDisplayImage(product);
              return (
                <button
                  key={product.id}
                  type="button"
                  disabled={disabled}
                  onClick={() => addProduct(product)}
                  className={clsx(
                    "min-h-32 rounded-2xl bg-white p-3 text-left shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md sm:min-h-36 sm:p-4",
                    disabled && "cursor-not-allowed opacity-55 hover:translate-y-0 hover:shadow-sm"
                  )}
                >
                  <div className="flex items-start gap-2 sm:gap-3">
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={img}
                        alt=""
                        className="h-12 w-12 shrink-0 rounded-xl border border-slate-200 object-cover sm:h-14 sm:w-14"
                      />
                    ) : (
                      <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-dashed border-slate-200 bg-slate-50 text-[10px] font-black text-slate-400 sm:h-14 sm:w-14">
                        {product.code.slice(0, 4)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-extrabold text-slate-900 sm:text-base">
                        {product.name}
                      </p>
                      <p className="mt-1 font-mono text-[11px] font-semibold text-slate-500 sm:text-xs">
                        {product.code}
                      </p>
                    </div>
                    <span
                      className={clsx(
                        "shrink-0 rounded-full px-2 py-1 text-[10px] font-bold sm:px-2.5 sm:text-[11px]",
                        stockTone(product)
                      )}
                    >
                      {product.manageStock ? `${product.stockQty} stock` : "Open"}
                    </span>
                  </div>
                  <div className="mt-4 flex items-end justify-between gap-2 sm:mt-6 sm:gap-3">
                    <div className="min-w-0">
                      <p className="text-[10px] font-semibold uppercase text-slate-400 sm:text-xs">
                        Sale price
                      </p>
                      <p className="truncate text-lg font-black text-indigo-700 sm:text-2xl">
                        {money(product.sellPrice)}
                      </p>
                    </div>
                    <span className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-indigo-50 text-indigo-700 sm:h-10 sm:w-10">
                      <Plus className="h-5 w-5" />
                    </span>
                  </div>
                </button>
              );
            })}
          </div>
        </section>

        <aside className="space-y-4">
          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div>
                <h2 className="font-extrabold text-slate-900">Cart</h2>
                <p className="text-xs text-slate-500">{cart.length} products selected</p>
              </div>
              <button
                type="button"
                onClick={clearSale}
                className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-bold text-slate-600 hover:bg-slate-50"
              >
                <RotateCcw className="h-3.5 w-3.5" />
                Reset
              </button>
            </div>

            <div className="max-h-[340px] space-y-2 overflow-y-auto p-3">
              {cart.length === 0 ? (
                <div className="flex min-h-44 flex-col items-center justify-center rounded-xl border border-dashed border-slate-200 text-center">
                  <ShoppingBag className="h-8 w-8 text-slate-300" />
                  <p className="mt-2 text-sm font-semibold text-slate-500">
                    Add products to start a sale.
                  </p>
                </div>
              ) : (
                cart.map((line) => (
                  <div
                    key={line.product.id}
                    className="rounded-xl border border-slate-100 bg-slate-50 px-3 py-3"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-extrabold text-slate-900">
                          {line.product.name}
                        </p>
                        <p className="font-mono text-[11px] text-slate-500">
                          {line.product.code} - {money(line.product.sellPrice)}
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() =>
                          setCart((prev) =>
                            prev.filter((item) => item.product.id !== line.product.id)
                          )
                        }
                        className="rounded-lg p-1.5 text-slate-400 hover:bg-white hover:text-rose-500"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="inline-flex items-center rounded-xl border border-slate-200 bg-white">
                        <button
                          type="button"
                          onClick={() => updateQty(line.product.id, -1)}
                          className="p-2 text-slate-600"
                        >
                          <Minus className="h-4 w-4" />
                        </button>
                        <span className="w-10 text-center text-sm font-black text-slate-900">
                          {line.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQty(line.product.id, 1)}
                          className="p-2 text-slate-600"
                        >
                          <Plus className="h-4 w-4" />
                        </button>
                      </div>
                      <p className="text-sm font-black text-slate-900">
                        {money(line.product.sellPrice * line.qty)}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
            <div className="mb-3">
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
                  <UserRound className="h-3.5 w-3.5" />
                  Customer optional
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setCustomerError("");
                    setCustomerModalOpen(true);
                  }}
                  className="inline-flex items-center gap-1 rounded-lg bg-indigo-50 px-2.5 py-1 text-xs font-black text-indigo-700 hover:bg-indigo-100"
                >
                  <UserPlus className="h-3.5 w-3.5" />
                  Add
                </button>
              </div>
              <select
                value={selectedCustomerId}
                onChange={(e) => setSelectedCustomerId(e.target.value)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-400 focus:bg-white"
              >
                <option value="">Walk-in customer</option>
                {customers.map((item) => (
                  <option key={item.id} value={item.id}>
                    {item.name} - {item.phone}
                  </option>
                ))}
              </select>
              {selectedCustomer ? (
                <div className="mt-2 rounded-xl border border-indigo-100 bg-indigo-50 px-3 py-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="min-w-0 truncate text-sm font-black text-slate-900">
                      {selectedCustomer.name}
                    </p>
                    <p className="flex shrink-0 items-center gap-1 text-xs font-semibold text-slate-600">
                      <Phone className="h-3.5 w-3.5 text-indigo-600" />
                      {selectedCustomer.phone}
                    </p>
                  </div>
                  {selectedCustomer.address ? (
                    <p className="mt-0.5 text-xs text-slate-500">{selectedCustomer.address}</p>
                  ) : null}
                </div>
              ) : null}
            </div>

            <label className="block">
              <span className="mb-1 flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
                <BadgePercent className="h-3.5 w-3.5" />
                Discount
              </span>
              <input
                type="number"
                min={0}
                value={discount || ""}
                onChange={(e) => setDiscount(Number(e.target.value) || 0)}
                placeholder="0"
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-400 focus:bg-white"
              />
            </label>

            <div className="mt-4">
              <p className="mb-2 text-xs font-bold uppercase text-slate-500">Payment account</p>
              {paymentAccounts.length === 0 ? (
                <p className="rounded-xl border border-amber-200 bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">
                  No POS payment account assigned. Assign accounts from Accounting &gt; Accounts.
                </p>
              ) : (
                <div className="grid grid-cols-2 gap-2">
                  {paymentAccounts.map((account) => {
                    const Icon = accountIcon(account);
                  return (
                    <button
                      key={account.id}
                      type="button"
                      onClick={() => setPaymentAccountId(account.id)}
                      className={clsx(
                        "flex min-h-12 items-center justify-center gap-1 rounded-xl border px-2 text-xs font-black transition",
                        paymentAccountId === account.id
                          ? "border-indigo-600 bg-indigo-600 text-white"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-white"
                      )}
                    >
                      <Icon className="h-4 w-4" />
                      <span className="truncate">{account.name}</span>
                    </button>
                  );
                  })}
                </div>
              )}
            </div>

            <label className="mt-4 block">
              <span className="mb-1 text-xs font-bold uppercase text-slate-500">Paid amount</span>
              <input
                type="number"
                min={0}
                value={paid}
                onChange={(e) => setPaid(e.target.value)}
                placeholder={String(total)}
                className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-400 focus:bg-white"
              />
            </label>

            {needsTrxId ? (
              <label className="mt-4 block">
                <span className="mb-1 flex items-center gap-2 text-xs font-bold uppercase text-slate-500">
                  <Hash className="h-3.5 w-3.5" />
                  Transaction ID ({selectedPaymentAccount?.name})
                </span>
                <input
                  value={transactionId}
                  onChange={(e) => setTransactionId(e.target.value)}
                  placeholder="Paste trx ID from SMS or app"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-400 focus:bg-white"
                />
                <p className="mt-1 text-[11px] text-slate-400">
                  Copy the ID from {selectedPaymentAccount?.name} confirmation message.
                </p>
              </label>
            ) : null}
          </div>

          <div className="rounded-2xl bg-slate-950 p-4 text-white shadow-sm">
            <div className="space-y-2 text-sm">
              <TotalRow label="Subtotal" value={money(subtotal)} />
              <TotalRow label="Discount" value={`-${money(safeDiscount)}`} />
              <div className="border-t border-white/10 pt-3">
                <TotalRow label="Total" value={money(total)} strong />
              </div>
              <TotalRow label="Paid" value={money(paidAmount)} />
              <TotalRow label={due > 0 ? "Due" : "Change"} value={money(due > 0 ? due : change)} />
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2">
              <button
                type="button"
                disabled={cart.length === 0}
                onClick={saveDraft}
                className="flex h-12 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white text-sm font-black text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
              >
                <Save className="h-4 w-4" />
                Draft
              </button>
              <button
                type="button"
                disabled={cart.length === 0 || !selectedPaymentAccount}
                onClick={completeSale}
                className="flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-500 text-sm font-black text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-700 disabled:text-slate-400"
              >
                <Check className="h-5 w-5" />
                Complete
              </button>
            </div>
            {completeMsg ? (
              <p className="mt-3 rounded-xl bg-emerald-400/10 px-3 py-2 text-xs font-semibold text-emerald-200">
                {completeMsg}
              </p>
            ) : null}
          </div>
        </aside>
      </div>

      <div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 px-4 py-3 shadow-[0_-4px_16px_rgba(15,23,42,0.08)] backdrop-blur xl:hidden">
        <div className="mx-auto flex max-w-3xl items-center gap-3">
          <div className="min-w-0 flex-1">
            <p className="text-[11px] font-bold uppercase text-slate-400">
              {cart.length} item{cart.length === 1 ? "" : "s"} · {due > 0 ? "Due" : "Total"}
            </p>
            <p className="truncate text-lg font-black text-slate-900">
              {money(due > 0 ? due : total)}
            </p>
          </div>
          <button
            type="button"
            disabled={cart.length === 0}
            onClick={saveDraft}
            aria-label="Save draft"
            className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-700 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400"
          >
            <Save className="h-5 w-5" />
          </button>
          <button
            type="button"
            disabled={cart.length === 0 || !selectedPaymentAccount}
            onClick={completeSale}
            className="flex h-12 flex-1 items-center justify-center gap-2 rounded-xl bg-emerald-500 px-4 text-sm font-black text-slate-950 transition hover:bg-emerald-400 disabled:cursor-not-allowed disabled:bg-slate-200 disabled:text-slate-400"
          >
            <Check className="h-5 w-5" />
            Complete
          </button>
        </div>
      </div>

      {customerModalOpen ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">Add Customer</h3>
                <p className="text-xs text-slate-500">Save customer for this POS sale.</p>
              </div>
              <button
                type="button"
                onClick={() => setCustomerModalOpen(false)}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-3 px-5 py-5">
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase text-slate-500">
                  Name
                </span>
                <input
                  value={customerForm.name}
                  onChange={(e) =>
                    setCustomerForm((form) => ({ ...form, name: e.target.value }))
                  }
                  placeholder="Customer name"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-400 focus:bg-white"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase text-slate-500">
                  Phone
                </span>
                <input
                  value={customerForm.phone}
                  onChange={(e) =>
                    setCustomerForm((form) => ({ ...form, phone: e.target.value }))
                  }
                  placeholder="01XXXXXXXXX"
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-400 focus:bg-white"
                />
              </label>
              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase text-slate-500">
                  Address
                </span>
                <textarea
                  value={customerForm.address}
                  onChange={(e) =>
                    setCustomerForm((form) => ({ ...form, address: e.target.value }))
                  }
                  placeholder="Optional address"
                  rows={3}
                  className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-400 focus:bg-white"
                />
              </label>
              {customerError ? (
                <p className="rounded-xl bg-rose-50 px-3 py-2 text-sm font-semibold text-rose-700">
                  {customerError}
                </p>
              ) : null}
            </div>

            <div className="flex gap-3 border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={() => setCustomerModalOpen(false)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={saveCustomer}
                className="flex-1 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-black text-white hover:bg-indigo-700"
              >
                Save Customer
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function TotalRow({
  label,
  value,
  strong = false,
}: {
  label: string;
  value: string;
  strong?: boolean;
}) {
  return (
    <div className="flex items-center justify-between gap-3">
      <span className={strong ? "text-base font-black" : "text-slate-300"}>{label}</span>
      <span className={strong ? "text-xl font-black" : "font-bold"}>{value}</span>
    </div>
  );
}
