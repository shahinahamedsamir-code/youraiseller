"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  BanknoteIcon,
  CheckCircle2,
  Eye,
  Printer,
  ReceiptText,
  Search,
  ShoppingBag,
  WalletCards,
  X,
} from "lucide-react";
import clsx from "clsx";
import {
  addIncome,
  listVisiblePaymentAccounts,
  loadAccountingData,
  type AccountingAccount,
  type AccountingIncome,
} from "@/lib/accounting-store";

export type CompletedSaleData = {
  reference: string;
  date: string;
  time: string;
  items: {
    name: string;
    code: string;
    qty: number;
    unitPrice: number;
    lineTotal: number;
  }[];
  customerName: string | null;
  customerPhone: string | null;
  subtotal: number;
  discount: number;
  total: number;
  paid: number;
  change: number;
  due: number;
  paymentAccount: string;
  transactionId?: string;
};

const STORAGE_KEY = "pos_completed_sales";

export function saveCompletedSale(data: CompletedSaleData) {
  const existing = loadCompletedSales();
  existing.unshift(data);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("youraiseller-data-updated"));
  }
}

export function updateCompletedSale(reference: string, update: Partial<CompletedSaleData>) {
  const sales = loadCompletedSales();
  const idx = sales.findIndex((s) => s.reference === reference);
  if (idx >= 0) {
    sales[idx] = { ...sales[idx], ...update };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(sales));
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("youraiseller-data-updated"));
    }
  }
}

export function loadCompletedSales(): CompletedSaleData[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) {
      const old = localStorage.getItem("pos_last_completed_sale");
      if (old) {
        const parsed = JSON.parse(old);
        return [parsed];
      }
      return [];
    }
    return JSON.parse(raw);
  } catch {
    return [];
  }
}

function money(n: number): string {
  return `BDT ${Math.max(0, n).toLocaleString("en-BD")}`;
}

type PosSaleRow = {
  income: AccountingIncome;
  accountName: string;
  detail: CompletedSaleData | null;
};

export function CompleteSaleReceipt() {
  const router = useRouter();
  const [sales, setSales] = useState<PosSaleRow[]>([]);
  const [selectedRef, setSelectedRef] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [tick, setTick] = useState(0);
  const [dueFilter, setDueFilter] = useState(false);
  const [payDueRef, setPayDueRef] = useState<string | null>(null);
  const [payAmount, setPayAmount] = useState("");
  const [payAccountId, setPayAccountId] = useState("");
  const [payMsg, setPayMsg] = useState("");
  const [payAccounts] = useState<AccountingAccount[]>(() =>
    listVisiblePaymentAccounts(loadAccountingData()).filter(
      (a) => a.active && a.posEnabled
    )
  );

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

    const posSales = data.income
      .filter(
        (inc) =>
          inc.reference?.startsWith("POS-") || inc.title.startsWith("POS Sale")
      )
      .sort((a, b) => (b.time ?? "").localeCompare(a.time ?? ""))
      .map((inc) => ({
        income: inc,
        accountName: accountMap.get(inc.accountId) ?? "Unknown",
        detail: inc.reference ? detailMap.get(inc.reference) ?? null : null,
      }));

    setSales(posSales);
  }, [tick]);

  const filteredSales = useMemo(() => {
    let result = sales;
    if (dueFilter) {
      result = result.filter((row) => (row.detail?.due ?? 0) > 0);
    }
    const q = query.trim().toLowerCase();
    if (q) {
      result = result.filter((row) => {
        const detail = row.detail;
        const haystack = [
          row.income.reference,
          row.income.title,
          row.income.date,
          row.income.time,
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
    }
    return result;
  }, [query, sales, dueFilter]);

  const summary = useMemo(() => {
    const total = sales.reduce((sum, row) => sum + row.income.amount, 0);
    const discount = sales.reduce((sum, row) => sum + (row.income.discount ?? 0), 0);
    const paid = sales.reduce(
      (sum, row) => sum + (row.detail?.paid ?? row.income.amount),
      0
    );
    const due = sales.reduce((sum, row) => sum + (row.detail?.due ?? 0), 0);
    return { total, discount, paid, due, count: sales.length };
  }, [sales]);

  const filteredSummary = useMemo(() => {
    const total = filteredSales.reduce((sum, row) => sum + row.income.amount, 0);
    const due = filteredSales.reduce((sum, row) => sum + (row.detail?.due ?? 0), 0);
    return { total, due, count: filteredSales.length };
  }, [filteredSales]);

  const selectedSale = useMemo(() => {
    if (!selectedRef) return null;
    return sales.find((s) => s.income.reference === selectedRef) ?? null;
  }, [sales, selectedRef]);

  const payDueSale = useMemo(() => {
    if (!payDueRef) return null;
    return sales.find((s) => s.income.reference === payDueRef) ?? null;
  }, [sales, payDueRef]);

  const openPayDue = (ref: string) => {
    const sale = sales.find((s) => s.income.reference === ref);
    const dueAmt = sale?.detail?.due ?? 0;
    setPayDueRef(ref);
    setPayAmount(String(dueAmt));
    setPayAccountId(
      sale?.income.accountId ??
        payAccounts.find((a) => a.defaultPaymentReceive)?.id ??
        payAccounts[0]?.id ??
        ""
    );
    setPayMsg("");
  };

  const confirmPayDue = () => {
    if (!payDueSale?.detail || !payDueRef) return;
    const amount = Number(payAmount) || 0;
    if (amount <= 0) {
      setPayMsg("Amount must be greater than 0.");
      return;
    }
    const detail = payDueSale.detail;
    const currentDue = detail.due;
    if (amount > currentDue) {
      setPayMsg(`Amount cannot exceed due balance (${money(currentDue)}).`);
      return;
    }
    const account = payAccounts.find((a) => a.id === payAccountId);
    if (!account) {
      setPayMsg("Please select a payment account.");
      return;
    }

    addIncome({
      title: `POS Due Payment${detail.customerName ? ` - ${detail.customerName}` : ""}`,
      amount,
      date: new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      source: "order",
      accountId: account.id,
      reference: payDueRef,
      note: `Due payment for ${payDueRef}`,
    });

    const newPaid = detail.paid + amount;
    const newDue = Math.max(0, detail.total - newPaid);
    const newChange = Math.max(0, newPaid - detail.total);
    updateCompletedSale(payDueRef, {
      paid: newPaid,
      due: newDue,
      change: newChange,
    });

    setPayDueRef(null);
    setTick((n) => n + 1);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-slate-900">
            <CheckCircle2 className="h-7 w-7 text-emerald-600" />
            Complete Sale
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Review every POS sale, payment and receipt in one place.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => setTick((n) => n + 1)}
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50"
          >
            <ReceiptText className="h-4 w-4" />
            Refresh
          </button>
          <button
            type="button"
            onClick={() => router.push("/dashboard/pos/new-sale")}
            className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 text-sm font-black text-white hover:bg-indigo-700"
          >
            <ArrowLeft className="h-4 w-4" />
            New Sale
          </button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard
          label="Total Sales"
          value={String(summary.count)}
          hint={`${filteredSummary.count} shown`}
          icon={ShoppingBag}
        />
        <MetricCard
          label="Gross Amount"
          value={money(summary.total)}
          hint={`Filtered: ${money(filteredSummary.total)}`}
          icon={ReceiptText}
        />
        <MetricCard
          label="Discount"
          value={`-${money(summary.discount)}`}
          hint="All POS sales"
          icon={ReceiptText}
        />
        <MetricCard
          label="Due Balance"
          value={money(summary.due)}
          hint={`Filtered: ${money(filteredSummary.due)}`}
          icon={WalletCards}
        />
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <div className="flex gap-3">
          <label className="relative flex-1">
            <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search reference, customer, account, product..."
              className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
            />
          </label>
          <button
            type="button"
            onClick={() => setDueFilter((v) => !v)}
            className={clsx(
              "inline-flex h-12 items-center gap-2 rounded-xl border px-4 text-sm font-black transition",
              dueFilter
                ? "border-rose-300 bg-rose-50 text-rose-700"
                : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-white"
            )}
          >
            <BanknoteIcon className="h-4 w-4" />
            Due Only
          </button>
        </div>
      </div>

      {sales.length === 0 ? (
        <EmptyState
          icon={ShoppingBag}
          title="No POS sales yet"
          text="Complete a sale from New Sale to see it here."
        />
      ) : filteredSales.length === 0 ? (
        <EmptyState
          icon={Search}
          title="No matching sales"
          text="Try a different reference, customer or item name."
        />
      ) : (
        <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
          <div className="border-b border-slate-100 px-4 py-3 text-xs font-bold uppercase text-slate-500">
            {filteredSales.length} sale{filteredSales.length === 1 ? "" : "s"} shown
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[860px] text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50 text-xs font-bold uppercase text-slate-500">
                  <th className="px-4 py-3 text-left">Reference</th>
                  <th className="px-4 py-3 text-left">Customer</th>
                  <th className="px-4 py-3 text-left">Date</th>
                  <th className="px-4 py-3 text-left">Account</th>
                  <th className="px-4 py-3 text-right">Amount</th>
                  <th className="px-4 py-3 text-right">Due</th>
                  <th className="px-4 py-3 text-right">Discount</th>
                  <th className="px-4 py-3 text-center">Details</th>
                </tr>
              </thead>
              <tbody>
                {filteredSales.map((row) => (
                  <tr key={row.income.id} className="border-b border-slate-50 transition hover:bg-slate-50">
                    <td className="px-4 py-3 font-mono text-xs font-bold text-indigo-700">
                      {row.income.reference ?? "—"}
                    </td>
                    <td className="px-4 py-3 font-semibold text-slate-900">
                      <p className="truncate font-black text-slate-900">
                        {row.detail?.customerName ?? "Walk-in customer"}
                      </p>
                    </td>
                    <td className="px-4 py-3 text-slate-600">
                      {row.income.date}
                      {row.income.time ? (
                        <span className="ml-1 text-xs text-slate-400">
                          {row.income.time}
                        </span>
                      ) : null}
                    </td>
                    <td className="px-4 py-3 text-slate-600">{row.accountName}</td>
                    <td className="px-4 py-3 text-right font-black text-slate-900">
                      {money(row.income.amount)}
                    </td>
                    <td className="px-4 py-3 text-right">
                      {(row.detail?.due ?? 0) > 0 ? (
                        <button
                          type="button"
                          onClick={() => openPayDue(row.income.reference ?? "")}
                          className="inline-flex items-center gap-1 rounded-lg bg-rose-50 px-2.5 py-1.5 text-xs font-black text-rose-700 hover:bg-rose-100"
                        >
                          {money(row.detail!.due)}
                        </button>
                      ) : (
                        <span className="text-xs font-semibold text-emerald-600">Paid</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-rose-600">
                      {row.income.discount ? `-${money(row.income.discount)}` : "—"}
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
        </div>
      )}

      {selectedSale?.detail ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-2xl overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
            <div className="flex items-start justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <div className="flex items-center gap-2">
                  <ReceiptText className="h-5 w-5 text-indigo-600" />
                  <span className="text-lg font-black text-slate-900">Sale Receipt</span>
                </div>
                <p className="mt-1 text-xs text-slate-500">
                  {selectedSale.detail.reference}
                </p>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => window.print()}
                  className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
                >
                  <Printer className="h-4 w-4" />
                </button>
                <button
                  type="button"
                  onClick={() => setSelectedRef(null)}
                  className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>
            </div>

            <div className="max-h-[70vh] overflow-y-auto px-5 py-4">
              <div className={`grid gap-3 ${selectedSale.detail.transactionId ? "sm:grid-cols-4" : "sm:grid-cols-3"}`}>
                <InfoTile label="Date" value={selectedSale.detail.date} />
                <InfoTile label="Time" value={selectedSale.detail.time} />
                <InfoTile label="Payment" value={selectedSale.detail.paymentAccount} />
                {selectedSale.detail.transactionId ? (
                  <InfoTile label="Trx ID" value={selectedSale.detail.transactionId} />
                ) : null}
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl bg-indigo-50 px-4 py-3 ring-1 ring-indigo-100">
                  <p className="text-[11px] font-bold uppercase text-indigo-500">
                    Customer
                  </p>
                  <p className="mt-1 text-sm font-black text-slate-900">
                    {selectedSale.detail.customerName ?? "Walk-in customer"}
                  </p>
                  {selectedSale.detail.customerPhone ? (
                    <p className="text-xs text-slate-500">
                      {selectedSale.detail.customerPhone}
                    </p>
                  ) : null}
                </div>
                <div className="rounded-xl bg-slate-50 px-4 py-3 ring-1 ring-slate-100">
                  <p className="text-[11px] font-bold uppercase text-slate-400">
                    Reference
                  </p>
                  <p className="mt-1 font-mono text-sm font-black text-indigo-700">
                    {selectedSale.detail.reference}
                  </p>
                </div>
              </div>

              <div className="mt-5 overflow-hidden rounded-2xl border border-slate-100">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-slate-100 bg-slate-50 text-xs font-bold uppercase text-slate-400">
                      <th className="px-4 py-3 text-left">Item</th>
                      <th className="px-4 py-3 text-center">Qty</th>
                      <th className="px-4 py-3 text-right">Price</th>
                      <th className="px-4 py-3 text-right">Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {selectedSale.detail.items.map((item, i) => (
                      <tr key={i} className="border-b border-slate-50">
                        <td className="px-4 py-2.5">
                          <p className="font-extrabold text-slate-900">{item.name}</p>
                          <p className="font-mono text-[11px] text-slate-400">
                            {item.code}
                          </p>
                        </td>
                        <td className="px-4 py-2.5 text-center font-bold text-slate-700">
                          {item.qty}
                        </td>
                        <td className="px-4 py-2.5 text-right font-semibold text-slate-600">
                          {money(item.unitPrice)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-black text-slate-900">
                          {money(item.lineTotal)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <InfoTile label="Subtotal" value={money(selectedSale.detail.subtotal)} />
                <InfoTile label="Discount" value={`-${money(selectedSale.detail.discount)}`} />
                <InfoTile
                  label="Paid"
                  value={money(selectedSale.detail.paid)}
                />
                <InfoTile
                  label="Due"
                  value={money(selectedSale.detail.due)}
                />
              </div>

              <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm">
                <SummaryRow label="Total" value={money(selectedSale.detail.total)} bold />
                {selectedSale.detail.change > 0 ? (
                  <SummaryRow
                    label="Change"
                    value={money(selectedSale.detail.change)}
                    color="text-amber-600"
                  />
                ) : null}
                <SummaryRow
                  label="Payment"
                  value={selectedSale.detail.paymentAccount}
                />
              </div>

              {selectedSale.detail.due > 0 ? (
                <div className="mt-4 border-t border-slate-100 pt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedRef(null);
                      openPayDue(selectedSale.detail!.reference);
                    }}
                    className="inline-flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-rose-600 text-sm font-black text-white hover:bg-rose-700"
                  >
                    <BanknoteIcon className="h-4 w-4" />
                    Pay Due ({money(selectedSale.detail.due)})
                  </button>
                </div>
              ) : null}
            </div>
          </div>
        </div>
      ) : null}

      {payDueSale?.detail ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/50 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
              <div>
                <h3 className="text-lg font-black text-slate-900">Pay Due</h3>
                <p className="text-xs text-slate-500">
                  {payDueSale.detail.reference} — {payDueSale.detail.customerName ?? "Walk-in customer"}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setPayDueRef(null)}
                className="rounded-xl border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
              >
                <X className="h-4 w-4" />
              </button>
            </div>

            <div className="space-y-4 px-5 py-5">
              <div className="grid grid-cols-3 gap-3">
                <InfoTile label="Total" value={money(payDueSale.detail.total)} />
                <InfoTile label="Paid" value={money(payDueSale.detail.paid)} />
                <InfoTile label="Due" value={money(payDueSale.detail.due)} />
              </div>

              <label className="block">
                <span className="mb-1 block text-xs font-bold uppercase text-slate-500">
                  Pay Amount
                </span>
                <input
                  type="number"
                  min={1}
                  max={payDueSale.detail.due}
                  value={payAmount}
                  onChange={(e) => setPayAmount(e.target.value)}
                  placeholder={String(payDueSale.detail.due)}
                  className="h-11 w-full rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-400 focus:bg-white"
                />
              </label>

              <div>
                <p className="mb-2 text-xs font-bold uppercase text-slate-500">Payment Account</p>
                <div className="grid grid-cols-2 gap-2">
                  {payAccounts.map((acc) => (
                    <button
                      key={acc.id}
                      type="button"
                      onClick={() => setPayAccountId(acc.id)}
                      className={clsx(
                        "flex min-h-11 items-center justify-center gap-1 rounded-xl border px-2 text-xs font-black transition",
                        payAccountId === acc.id
                          ? "border-indigo-600 bg-indigo-600 text-white"
                          : "border-slate-200 bg-slate-50 text-slate-600 hover:bg-white"
                      )}
                    >
                      <span className="truncate">{acc.name}</span>
                    </button>
                  ))}
                </div>
              </div>

              {payMsg ? (
                <p className="rounded-xl bg-rose-50 px-3 py-2 text-xs font-semibold text-rose-700">
                  {payMsg}
                </p>
              ) : null}
            </div>

            <div className="flex gap-3 border-t border-slate-100 px-5 py-4">
              <button
                type="button"
                onClick={() => setPayDueRef(null)}
                className="flex-1 rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-black text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmPayDue}
                className="flex-1 rounded-xl bg-emerald-500 px-4 py-2.5 text-sm font-black text-slate-950 hover:bg-emerald-400"
              >
                Confirm Payment
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function MetricCard({
  label,
  value,
  hint,
  icon: Icon,
}: {
  label: string;
  value: string;
  hint: string;
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
          <p className="text-xs font-medium text-slate-500">{hint}</p>
        </div>
      </div>
    </div>
  );
}

function InfoTile({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className="rounded-xl border border-slate-100 bg-slate-50 px-4 py-3">
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
    <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl bg-white text-center shadow-sm ring-1 ring-slate-200">
      <Icon className="h-12 w-12 text-slate-300" />
      <p className="mt-3 text-lg font-extrabold text-slate-700">{title}</p>
      <p className="mt-1 text-sm text-slate-500">{text}</p>
    </div>
  );
}

function SummaryRow({
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
      <span
        className={
          bold
            ? "text-base font-black text-slate-900"
            : color
              ? `font-bold ${color}`
              : "font-bold text-slate-900"
        }
      >
        {value}
      </span>
    </div>
  );
}
