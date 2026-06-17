"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Check, Printer, Tags } from "lucide-react";
import clsx from "clsx";
import {
  loadBusinessSettings,
  saveBusinessSettings,
  type BusinessSettings,
} from "@/lib/business-settings-store";
import {
  productLabelSizeLabel,
  productLabelSizePx,
  renderProductLabelDoc,
  sampleProductLabelProduct,
  type ProductLabelSize,
  type ProductLabelTemplate,
} from "@/lib/product-label-templates";

const TEMPLATES: {
  id: ProductLabelTemplate;
  title: string;
  subtitle: string;
  badge: string;
}[] = [
  { id: "retail", title: "Retail Tag", subtitle: "Compact product label with price panel", badge: "Popular" },
  { id: "tag", title: "Hang Tag", subtitle: "Store name, barcode and large bottom price", badge: "Fashion" },
  { id: "shelf", title: "Shelf Price", subtitle: "Clean shelf label with price and scan code", badge: "Wide" },
  { id: "mini", title: "Mini Barcode", subtitle: "Barcode-first label for tiny products", badge: "Scan" },
  { id: "price", title: "Price Focus", subtitle: "Large price with small product details", badge: "Bold" },
  { id: "sku", title: "Clean SKU", subtitle: "Vertical store mark with SKU and barcode", badge: "Clean" },
];

function PreviewCard({
  template,
  biz,
  size,
  selected,
  onSelect,
}: {
  template: (typeof TEMPLATES)[number];
  biz: BusinessSettings;
  size: ProductLabelSize;
  selected: boolean;
  onSelect: () => void;
}) {
  const product = useMemo(() => sampleProductLabelProduct(), []);
  const srcDoc = useMemo(
    () => renderProductLabelDoc(product, biz, template.id, size),
    [biz, product, template.id, size]
  );

  const dim = productLabelSizePx(size);
  const boxRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(1);

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => setScale(Math.min((el.clientWidth - 40) / dim.w, 1.65));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [dim.w]);

  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        "group flex flex-col overflow-hidden rounded-2xl border bg-white text-left transition",
        selected
          ? "border-teal-400 shadow-lg ring-2 ring-teal-100"
          : "border-slate-200 hover:border-teal-200 hover:shadow-md"
      )}
    >
      <div className="flex items-center justify-between gap-3 border-b border-slate-100 px-4 py-3">
        <div className="min-w-0">
          <p className="flex items-center gap-2 font-bold text-slate-900">
            {template.title}
            <span className="rounded-full bg-teal-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-teal-700">
              {template.badge}
            </span>
          </p>
          <p className="truncate text-xs text-slate-500">{template.subtitle}</p>
        </div>
        {selected ? (
          <span className="inline-flex items-center gap-1 rounded-full bg-teal-600 px-2.5 py-1 text-xs font-bold text-white">
            <Check className="h-3.5 w-3.5" />
            Selected
          </span>
        ) : (
          <span className="rounded-full border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-500 group-hover:border-teal-200 group-hover:text-teal-700">
            Select
          </span>
        )}
      </div>
      <div
        ref={boxRef}
        className="flex items-center justify-center overflow-hidden bg-slate-100 py-4"
        style={{ height: `${Math.max(140, dim.h * scale + 36)}px` }}
      >
        <div
          className="overflow-hidden bg-white shadow-sm"
          style={{ width: `${dim.w * scale}px`, height: `${dim.h * scale}px` }}
        >
          <iframe
            title={template.title}
            srcDoc={srcDoc}
            scrolling="no"
            className="pointer-events-none bg-white"
            style={{
              width: `${dim.w}px`,
              height: `${dim.h}px`,
              transform: `scale(${scale})`,
              transformOrigin: "top left",
              border: 0,
            }}
          />
        </div>
      </div>
    </button>
  );
}

export function SelectProductLabelPanel() {
  const [biz, setBiz] = useState<BusinessSettings | null>(null);
  const [toast, setToast] = useState("");

  useEffect(() => {
    setBiz(loadBusinessSettings());
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
        Loading product labels...
      </div>
    );
  }

  const size = biz.productLabelSize;

  const select = (id: ProductLabelTemplate) => {
    const saved = saveBusinessSettings({ ...biz, productLabelTemplate: id });
    setBiz(saved);
    const name = TEMPLATES.find((t) => t.id === id)?.title ?? "Product label";
    setToast(`${name} selected.`);
  };

  const setSize = (nextSize: ProductLabelSize) => {
    const saved = saveBusinessSettings({ ...biz, productLabelSize: nextSize });
    setBiz(saved);
    setToast(`${productLabelSizeLabel(nextSize)} size selected.`);
  };

  const printPreview = () => {
    const doc = renderProductLabelDoc(
      sampleProductLabelProduct(),
      biz,
      biz.productLabelTemplate,
      size,
      { print: true }
    );
    const w = window.open("", "_blank");
    if (w) {
      w.document.write(doc);
      w.document.close();
    }
  };

  return (
    <div className="space-y-5">
      <div className="relative overflow-hidden rounded-3xl border border-teal-100 bg-gradient-to-br from-teal-500 via-cyan-600 to-blue-600 p-6 text-white shadow-lg shadow-teal-200">
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/30">
              <Tags className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">Product / Price Label</h1>
              <p className="mt-1 text-sm text-white/85">
                Pick barcode price labels for products, shelves and tags
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={printPreview}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-teal-700 shadow-md transition hover:shadow-lg"
          >
            <Printer className="h-4 w-4" />
            Print Preview
          </button>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
        <div>
          <p className="text-sm font-bold text-slate-800">Label size</p>
          <p className="text-xs text-slate-500">
            {size === "1.5x1"
              ? "Small tag for tiny product labels"
              : size === "3x1"
                ? "Wide shelf or barcode price label"
                : "Standard thermal product price label"}
          </p>
        </div>
        <div className="flex flex-wrap gap-1 rounded-xl bg-slate-100 p-1">
          {(
            [
              { id: "1.5x1", label: "1.5 x 1 in" },
              { id: "2x1", label: "2 x 1 in" },
              { id: "3x1", label: "3 x 1 in" },
            ] as { id: ProductLabelSize; label: string }[]
          ).map((option) => (
            <button
              key={option.id}
              type="button"
              onClick={() => setSize(option.id)}
              className={clsx(
                "rounded-lg px-4 py-1.5 text-sm font-bold transition",
                size === option.id
                  ? "bg-white text-teal-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              {option.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-5 lg:grid-cols-3">
        {TEMPLATES.map((tpl) => (
          <PreviewCard
            key={tpl.id}
            template={tpl}
            biz={biz}
            size={size}
            selected={biz.productLabelTemplate === tpl.id}
            onSelect={() => select(tpl.id)}
          />
        ))}
      </div>

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
