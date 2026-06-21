"use client";

import { useEffect, useMemo, useState, type ComponentType } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  CheckCircle2,
  Eye,
  FileText,
  Pencil,
  RefreshCw,
  Search,
  ShoppingBag,
  Trash2,
  X,
  ReceiptText,
} from "lucide-react";
import { addIncome, loadAccountingData } from "@/lib/accounting-store";
import { autoRecordCashSale } from "@/lib/pos-cash-register";
import { saveCompletedSale, type CompletedSaleData } from "./CompleteSaleReceipt";
import { loadBusinessSettings } from "@/lib/business-settings-store";
import { openPosInvoicePrint } from "@/lib/pos-invoice";
import {
  deletePosDraftSale,
  loadPosDraftSales,
  type PosDraftSaleRecord,
} from "@/lib/pos-drafts";

function money(n: number): string {
  return `BDT ${Math.max(0, n).toLocaleString("en-BD")}`;
}

export function DraftSalePanel() {
  const router = useRouter();
  const [drafts, setDrafts] = useState<PosDraftSaleRecord[]>([]);
  const [query, setQuery] = useState("");
  const [selectedDraftId, setSelectedDraftId] = useState<string | null>(null);
  const [tick, setTick] = useState(0);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const refresh = () => setTick((n) => n + 1);
    refresh();
    window.addEventListener("youraiseller-data-updated", refresh);
    return () => window.removeEventListener("youraiseller-data-updated", refresh);
  }, []);

  useEffect(() => {
    setDrafts(loadPosDraftSales());
  }, [tick]);

  const filteredDrafts = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return drafts;
    return drafts.filter((draft) => {
      const haystack = [
        draft.label,
        draft.customerName,
        draft.customerPhone,
        draft.paymentAccountName,
        draft.note,
        ...draft.lines.map((line) => `${line.product.name} ${line.product.code}`),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      return haystack.includes(q);
    });
  }, [drafts, query]);

  const selectedDraft = useMemo(
    () => drafts.find((draft) => draft.id === selectedDraftId) ?? null,
    [drafts, selectedDraftId]
  );

  const totalDraftAmount = drafts.reduce((sum, draft) => sum + draft.total, 0);
  const totalDraftItems = drafts.reduce(
    (sum, draft) => sum + draft.lines.reduce((qty, line) => qty + line.qty, 0),
    0
  );

  const completeDraft = (draft: PosDraftSaleRecord) => {
    const accounts = loadAccountingData().accounts;
    const account =
      accounts.find((acc) => acc.id === draft.paymentAccountId && acc.active) ??
      accounts.find((acc) => acc.active && acc.posEnabled) ??
      accounts.find((acc) => acc.active) ??
      null;
    if (!account) {
      setMessage("No payment account available.");
      return;
    }

    const reference = `POS-${Date.now().toString().slice(-8)}`;
    const saleData: CompletedSaleData = {
      reference,
      date: new Date().toLocaleDateString("en-GB", {
        day: "2-digit",
        month: "short",
        year: "numeric",
      }),
      time: new Date().toLocaleTimeString("en-GB", {
        hour: "2-digit",
        minute: "2-digit",
      }),
      items: draft.lines.map((line) => ({
        name: line.product.name,
        code: line.product.code,
        qty: line.qty,
        unitPrice: line.product.sellPrice,
        lineTotal: line.product.sellPrice * line.qty,
      })),
      customerName: draft.customerName,
      customerPhone: draft.customerPhone,
      subtotal: draft.subtotal,
      discount: draft.discount,
      total: draft.total,
      paid: Number(draft.paid) || 0,
      change: Math.max(0, (Number(draft.paid) || 0) - draft.total),
      due: Math.max(0, draft.total - (Number(draft.paid) || 0)),
      paymentAccount: account.name,
    };

    addIncome({
      title: `POS Sale${draft.customerName ? ` - ${draft.customerName}` : ""}`,
      amount: saleData.total,
      discount: saleData.discount || undefined,
      date: saleData.date,
      source: "order",
      accountId: account.id,
      reference,
      note: draft.note || `${draft.lines.length} item${draft.lines.length === 1 ? "" : "s"} from draft`,
    });

    saveCompletedSale(saleData);
    if (account.type === "cash") {
      autoRecordCashSale(saleData.total, reference, draft.customerName);
    }
    openPosInvoicePrint(saleData, loadBusinessSettings());
    deletePosDraftSale(draft.id);
    setDrafts(loadPosDraftSales());
    setSelectedDraftId(null);
    setMessage(`Completed ${draft.label}.`);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-slate-900">
            <FileText className="h-7 w-7 text-indigo-600" />
            Draft Sale
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Saved drafts only. Open one to review and complete it.
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
            className="inline-flex items-center gap-2 rounded-xl bg-slate-900 px-5 py-2.5 text-sm font-black text-white hover:bg-slate-800"
          >
            <ArrowLeft className="h-4 w-4" />
            New Sale
          </Link>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <MetricCard label="Drafts" value={String(drafts.length)} icon={FileText} />
        <MetricCard label="Items" value={String(totalDraftItems)} icon={ShoppingBag} />
        <MetricCard label="Total" value={money(totalDraftAmount)} icon={ReceiptText} />
        <MetricCard label="Loaded" value={selectedDraft ? selectedDraft.label : "—"} icon={Eye} />
      </div>

      <div className="rounded-2xl bg-white p-4 shadow-sm ring-1 ring-slate-200">
        <label className="relative block">
          <Search className="pointer-events-none absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-slate-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search drafts..."
            className="h-12 w-full rounded-xl border border-slate-200 bg-slate-50 pl-12 pr-4 text-sm font-semibold text-slate-900 outline-none focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-100"
          />
        </label>
      </div>

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="space-y-3">
          {filteredDrafts.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No drafts found"
              text="Saved drafts will appear here."
            />
          ) : (
            filteredDrafts.map((draft) => (
              <button
                key={draft.id}
                type="button"
                onClick={() => setSelectedDraftId(draft.id)}
                className="flex w-full items-center justify-between gap-3 rounded-2xl bg-white px-4 py-4 text-left shadow-sm ring-1 ring-slate-200 transition hover:-translate-y-0.5 hover:shadow-md"
              >
                <div className="min-w-0">
                  <p className="truncate text-base font-black text-slate-900">{draft.label}</p>
                  <p className="mt-1 text-sm text-slate-500">
                    {draft.customerName ?? "Walk-in customer"} · {draft.lines.length} item
                    {draft.lines.length === 1 ? "" : "s"}
                  </p>
                  <p className="mt-1 text-xs text-slate-400">
                    {draft.paymentAccountName} · {draft.updatedAt}
                  </p>
                </div>
                <div className="shrink-0 text-right">
                  <p className="text-sm font-black text-slate-900">{money(draft.total)}</p>
                  <p className="text-xs text-slate-400">View</p>
                </div>
              </button>
            ))
          )}
        </section>

        <aside>
          <div className="rounded-2xl bg-white shadow-sm ring-1 ring-slate-200">
            <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
              <div>
                <h2 className="font-extrabold text-slate-900">Draft Preview</h2>
                <p className="text-xs text-slate-500">
                  {selectedDraft ? selectedDraft.label : "Select a draft"}
                </p>
              </div>
              {selectedDraft ? (
                <button
                  type="button"
                  onClick={() => setSelectedDraftId(null)}
                  className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-slate-50"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>

            {selectedDraft ? (
              <div className="space-y-4 p-4">
                <div className="rounded-xl bg-indigo-50 px-4 py-3 ring-1 ring-indigo-100">
                  <p className="text-[11px] font-bold uppercase text-indigo-500">Customer</p>
                  <p className="mt-1 text-sm font-black text-slate-900">
                    {selectedDraft.customerName ?? "Walk-in customer"}
                  </p>
                  {selectedDraft.customerPhone ? (
                    <p className="text-xs text-slate-500">{selectedDraft.customerPhone}</p>
                  ) : null}
                </div>

                <div className="space-y-2">
                  {selectedDraft.lines.map((line) => (
                    <div
                      key={`${line.product.id}-${line.qty}`}
                      className="flex items-start justify-between gap-3 rounded-xl border border-slate-100 bg-slate-50 px-3 py-3"
                    >
                      <div className="min-w-0">
                        <p className="truncate text-sm font-black text-slate-900">{line.product.name}</p>
                        <p className="font-mono text-[11px] text-slate-400">{line.product.code}</p>
                      </div>
                      <div className="text-right">
                        <p className="text-sm font-semibold text-slate-600">
                          {line.qty} x {money(line.product.sellPrice)}
                        </p>
                        <p className="text-sm font-black text-slate-900">
                          {money(line.product.sellPrice * line.qty)}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>

                <div className="grid gap-2 rounded-xl bg-slate-50 p-3 ring-1 ring-slate-100">
                  <SummaryRow label="Subtotal" value={money(selectedDraft.subtotal)} />
                  <SummaryRow label="Discount" value={`-${money(selectedDraft.discount)}`} />
                  <SummaryRow label="Total" value={money(selectedDraft.total)} bold />
                  <SummaryRow label="Paid" value={money(Number(selectedDraft.paid) || 0)} />
                  <SummaryRow
                    label="Account"
                    value={selectedDraft.paymentAccountName}
                    tone="text-indigo-700"
                  />
                </div>

                {message ? (
                  <p className="rounded-xl bg-slate-900 px-3 py-2 text-xs font-semibold text-white">
                    {message}
                  </p>
                ) : null}

                <div className="grid gap-2 sm:grid-cols-3">
                  <button
                    type="button"
                    onClick={() => completeDraft(selectedDraft)}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl bg-emerald-500 text-sm font-black text-slate-950 transition hover:bg-emerald-400"
                  >
                    <CheckCircle2 className="h-5 w-5" />
                    Complete
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      localStorage.setItem("pos_edit_draft", JSON.stringify(selectedDraft));
                      deletePosDraftSale(selectedDraft.id);
                      setDrafts(loadPosDraftSales());
                      setSelectedDraftId(null);
                      router.push("/dashboard/pos/new-sale");
                    }}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-indigo-200 text-sm font-black text-indigo-700 hover:bg-indigo-50"
                  >
                    <Pencil className="h-4 w-4" />
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      deletePosDraftSale(selectedDraft.id);
                      setDrafts(loadPosDraftSales());
                      setSelectedDraftId(null);
                    }}
                    className="inline-flex h-12 items-center justify-center gap-2 rounded-xl border border-rose-200 text-sm font-black text-rose-700 hover:bg-rose-50"
                  >
                    <Trash2 className="h-4 w-4" />
                    Delete
                  </button>
                </div>
              </div>
            ) : (
              <EmptyState icon={Eye} title="Open a draft" text="Pick any draft to see its items and complete it." />
            )}
          </div>
        </aside>
      </div>
    </div>
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

function SummaryRow({
  label,
  value,
  bold = false,
  tone,
}: {
  label: string;
  value: string;
  bold?: boolean;
  tone?: string;
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
            : tone
              ? `font-bold ${tone}`
              : "font-bold text-slate-900"
        }
      >
        {value}
      </span>
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
    <div className="flex min-h-[260px] flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-white text-center">
      <Icon className="h-10 w-10 text-slate-300" />
      <p className="mt-3 text-base font-black text-slate-700">{title}</p>
      <p className="mt-1 max-w-sm text-sm text-slate-500">{text}</p>
    </div>
  );
}
