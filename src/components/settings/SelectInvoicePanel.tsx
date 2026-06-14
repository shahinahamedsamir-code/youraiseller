"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Check, FileText, Printer } from "lucide-react";
import clsx from "clsx";
import {
  loadBusinessSettings,
  saveBusinessSettings,
  type BusinessSettings,
} from "@/lib/business-settings-store";
import { loadActiveDeliveryMethods } from "@/lib/delivery-methods-store";
import {
  renderInvoiceDoc,
  sampleInvoiceOrder,
  type InvoiceTemplate,
  type InvoicePaper,
} from "@/lib/invoice-templates";

type Tab = "business" | "delivery";

const TEMPLATES: {
  id: InvoiceTemplate;
  title: string;
  subtitle: string;
  badge: string;
}[] = [
  { id: "fancy", title: "Aurora", subtitle: "Premium gradient invoice", badge: "Popular" },
  { id: "minimal", title: "Mono", subtitle: "Clean minimalist invoice", badge: "Classic" },
  { id: "elegant", title: "Luxe", subtitle: "Dark & gold premium invoice", badge: "New" },
  { id: "studio", title: "Studio", subtitle: "Split editorial invoice", badge: "Fresh" },
  { id: "ledger", title: "Ledger", subtitle: "Structured business invoice", badge: "Pro" },
  { id: "receipt", title: "Receipt", subtitle: "Compact print-first invoice", badge: "Fast" },
];

function PreviewCard({
  template,
  biz,
  paper,
  selected,
  onSelect,
}: {
  template: (typeof TEMPLATES)[number];
  biz: BusinessSettings;
  paper: InvoicePaper;
  selected: boolean;
  onSelect: () => void;
}) {
  const srcDoc = useMemo(
    () => renderInvoiceDoc(sampleInvoiceOrder(biz), biz, template.id, { paper }),
    [biz, template.id, paper]
  );

  const INVOICE_W = paper === "pos" ? 300 : 700;
  const DESIGN_H = paper === "pos" ? 620 : 820;
  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.45);

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () =>
      setScale(Math.min(el.clientWidth / INVOICE_W, paper === "pos" ? 1.1 : 1));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [INVOICE_W, paper]);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        "group relative flex flex-col overflow-hidden rounded-2xl border bg-white text-left transition",
        selected
          ? "border-violet-400 ring-2 ring-violet-200 shadow-lg"
          : "border-slate-200 hover:border-violet-200 hover:shadow-md"
      )}
    >
      <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
        <div>
          <p className="flex items-center gap-2 font-bold text-slate-900">
            {template.title}
            <span className="rounded-full bg-violet-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-violet-600">
              {template.badge}
            </span>
          </p>
          <p className="text-xs text-slate-500">{template.subtitle}</p>
        </div>
        {selected ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-violet-600 px-2.5 py-1 text-xs font-bold text-white">
            <Check className="h-3.5 w-3.5" />
            Selected
          </span>
        ) : (
          <span className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-500 group-hover:border-violet-200 group-hover:text-violet-600">
            Select
          </span>
        )}
      </div>
      <div
        ref={boxRef}
        className="flex justify-center overflow-hidden bg-slate-100 py-3"
        style={{ height: `${DESIGN_H * scale + 24}px` }}
      >
        <div
          className="overflow-hidden bg-white shadow-sm"
          style={{ width: `${INVOICE_W * scale}px`, height: `${DESIGN_H * scale}px` }}
        >
          <iframe
            title={template.title}
            srcDoc={srcDoc}
            scrolling="no"
            className="pointer-events-none bg-white"
            style={{
              width: `${INVOICE_W}px`,
              height: `${DESIGN_H}px`,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              border: "0",
            }}
          />
        </div>
      </div>
    </button>
  );
}

export function SelectInvoicePanel() {
  const [biz, setBiz] = useState<BusinessSettings | null>(null);
  const [tab, setTab] = useState<Tab>("business");
  const [toast, setToast] = useState("");
  const [methods, setMethods] = useState<{ id: string; name: string }[]>([]);
  const [methodId, setMethodId] = useState("");

  useEffect(() => {
    setBiz(loadBusinessSettings());
    const list = loadActiveDeliveryMethods().map((m) => ({ id: m.id, name: m.name }));
    setMethods(list);
    setMethodId((prev) => prev || list[0]?.id || "");
    const onUpdate = () => setBiz(loadBusinessSettings());
    window.addEventListener("youraiseller-business-settings-updated", onUpdate);
    return () =>
      window.removeEventListener("youraiseller-business-settings-updated", onUpdate);
  }, []);

  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(""), 2400);
    return () => clearTimeout(t);
  }, [toast]);

  if (!biz) {
    return (
      <div className="py-20 text-center text-sm font-semibold text-slate-400">
        Loading invoices…
      </div>
    );
  }

  const paper = biz.invoicePaper;

  const select = (id: InvoiceTemplate) => {
    const saved = saveBusinessSettings({ ...biz, invoiceTemplate: id });
    setBiz(saved);
    const name = TEMPLATES.find((t) => t.id === id)?.title ?? "Invoice";
    setToast(`${name} invoice selected.`);
  };

  const setPaper = (p: InvoicePaper) => {
    const saved = saveBusinessSettings({ ...biz, invoicePaper: p });
    setBiz(saved);
    setToast(p === "pos" ? "POS (80mm) size selected." : "A4 / Printer size selected.");
  };

  const methodName = methods.find((m) => m.id === methodId)?.name ?? "this courier";
  const methodOverride = biz.deliveryInvoices[methodId];

  const setMethodTemplate = (id: InvoiceTemplate) => {
    if (!methodId) return;
    const next = { ...biz.deliveryInvoices, [methodId]: id };
    const saved = saveBusinessSettings({ ...biz, deliveryInvoices: next });
    setBiz(saved);
    const name = TEMPLATES.find((t) => t.id === id)?.title ?? "Invoice";
    setToast(`${name} set for ${methodName}.`);
  };

  const clearMethodTemplate = () => {
    if (!methodId) return;
    const next = { ...biz.deliveryInvoices };
    delete next[methodId];
    const saved = saveBusinessSettings({ ...biz, deliveryInvoices: next });
    setBiz(saved);
    setToast(`${methodName} now uses the Business Invoice.`);
  };

  const printPreview = () => {
    const doc = renderInvoiceDoc(sampleInvoiceOrder(biz), biz, biz.invoiceTemplate, {
      print: true,
      paper,
    });
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(doc);
      w.document.close();
    }
  };

  return (
    <div className="space-y-5">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-amber-100 bg-gradient-to-br from-amber-500 via-orange-500 to-amber-600 p-6 text-white shadow-lg shadow-amber-200">
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/30">
              <FileText className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">Select Invoice</h1>
              <p className="mt-1 text-sm text-white/85">
                Choose the invoice layout used when you print an order
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={printPreview}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-orange-600 shadow-md transition hover:shadow-lg"
          >
            <Printer className="h-4 w-4" />
            Print Preview
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-2 rounded-2xl border border-slate-200 bg-white p-1.5">
        {(
          [
            { id: "business", label: "Business Invoice" },
            { id: "delivery", label: "Delivery Method Invoice" },
          ] as { id: Tab; label: string }[]
        ).map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTab(t.id)}
            className={clsx(
              "flex-1 rounded-xl px-4 py-2.5 text-sm font-bold transition",
              tab === t.id
                ? "bg-gradient-to-r from-violet-600 to-indigo-600 text-white shadow"
                : "text-slate-500 hover:bg-slate-50"
            )}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Paper size */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
        <div>
          <p className="text-sm font-bold text-slate-800">Paper size</p>
          <p className="text-xs text-slate-500">
            {paper === "pos"
              ? "80mm thermal receipt — for POS / mini printers"
              : "A4 full page — for laser / inkjet printers"}
          </p>
        </div>
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
          {(
            [
              { id: "a4", label: "A4 / Printer" },
              { id: "pos", label: "POS 80mm" },
            ] as { id: InvoicePaper; label: string }[]
          ).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setPaper(p.id)}
              className={clsx(
                "rounded-lg px-4 py-1.5 text-sm font-bold transition",
                paper === p.id
                  ? "bg-white text-violet-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      {tab === "business" ? (
        <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {TEMPLATES.map((tpl) => (
            <PreviewCard
              key={tpl.id}
              template={tpl}
              biz={biz}
              paper={paper}
              selected={biz.invoiceTemplate === tpl.id}
              onSelect={() => select(tpl.id)}
            />
          ))}
        </div>
      ) : (
        <div className="space-y-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-4">
            <label className="mb-1.5 block text-xs font-bold uppercase tracking-wide text-slate-500">
              Select Delivery Method
            </label>
            <select
              value={methodId}
              onChange={(e) => setMethodId(e.target.value)}
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-semibold outline-none focus:border-violet-300 focus:ring-2 focus:ring-violet-100"
            >
              {methods.length === 0 && <option value="">No delivery methods</option>}
              {methods.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
            <p className="mt-2 text-xs text-slate-500">
              Orders shipped via <b className="text-slate-700">{methodName}</b>{" "}
              {methodOverride ? (
                <>
                  will print the{" "}
                  <b className="text-violet-600">
                    {TEMPLATES.find((t) => t.id === methodOverride)?.title}
                  </b>{" "}
                  invoice.
                </>
              ) : (
                <>use the default Business Invoice. Pick a design below to override it.</>
              )}
            </p>
            {methodOverride && (
              <button
                type="button"
                onClick={clearMethodTemplate}
                className="mt-2 inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Reset to Business default
              </button>
            )}
          </div>

          <div className="grid gap-5 md:grid-cols-2 xl:grid-cols-3">
            {TEMPLATES.map((tpl) => (
              <PreviewCard
                key={tpl.id}
                template={tpl}
                biz={biz}
                paper={paper}
                selected={methodOverride === tpl.id}
                onSelect={() => setMethodTemplate(tpl.id)}
              />
            ))}
          </div>
        </div>
      )}

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-[60] -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-lg">
          <span className="inline-flex items-center gap-2">
            <Check className="h-4 w-4 text-emerald-400" />
            {toast}
          </span>
        </div>
      )}
    </div>
  );
}
