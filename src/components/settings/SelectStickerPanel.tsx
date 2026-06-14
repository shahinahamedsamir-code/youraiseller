"use client";

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { Check, Sticker, Printer } from "lucide-react";
import clsx from "clsx";
import {
  loadBusinessSettings,
  saveBusinessSettings,
  type BusinessSettings,
} from "@/lib/business-settings-store";
import {
  renderStickerDoc,
  sampleStickerOrder,
  type StickerTemplate,
  type StickerSize,
} from "@/lib/sticker-templates";

const TEMPLATES: {
  id: StickerTemplate;
  title: string;
  subtitle: string;
  badge: string;
}[] = [
  { id: "classic", title: "Classic", subtitle: "Full label with product table", badge: "Popular" },
  { id: "bold", title: "Bold", subtitle: "Dark courier header label", badge: "Premium" },
  { id: "barcode", title: "Scan", subtitle: "Big barcode & COD focus", badge: "Fast" },
  { id: "compact", title: "Compact", subtitle: "Minimal essentials only", badge: "Small" },
  { id: "neo", title: "Neo", subtitle: "Fresh split-card label", badge: "Creative" },
  { id: "split", title: "Split", subtitle: "Courier panel + recipient side", badge: "Smart" },
  { id: "express", title: "Express", subtitle: "Barcode-first fast scan layout", badge: "Swift" },
  { id: "mono", title: "Mono", subtitle: "Clean black-and-white label", badge: "Clean" },
];

const SIZE_W: Record<StickerSize, number> = {
  "3x3": 288,
  "2x3": 192,
  "3x4": 288,
};

function PreviewCard({
  template,
  biz,
  size,
  selected,
  onSelect,
}: {
  template: (typeof TEMPLATES)[number];
  biz: BusinessSettings;
  size: StickerSize;
  selected: boolean;
  onSelect: () => void;
}) {
  const srcDoc = useMemo(
    () => renderStickerDoc(sampleStickerOrder(biz), biz, template.id, size),
    [biz, template.id, size]
  );

  const W = SIZE_W[size];
  const boxRef = useRef<HTMLDivElement>(null);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const [scale, setScale] = useState(0.6);
  const [naturalH, setNaturalH] = useState(360);

  useLayoutEffect(() => {
    const el = boxRef.current;
    if (!el) return;
    const measure = () => setScale(Math.min((el.clientWidth - 24) / W, 1));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [W]);

  const onFrameLoad = () => {
    const doc = frameRef.current?.contentDocument;
    const h = doc?.body?.scrollHeight;
    if (h && h > 0) setNaturalH(h);
  };

  return (
    <button
      type="button"
      onClick={onSelect}
      className={clsx(
        "group flex flex-col overflow-hidden rounded-2xl border bg-white text-left transition",
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
        style={{ height: `${naturalH * scale + 24}px` }}
      >
        <div
          className="overflow-hidden bg-white shadow-sm"
          style={{ width: `${W * scale}px`, height: `${naturalH * scale}px` }}
        >
          <iframe
            ref={frameRef}
            title={template.title}
            srcDoc={srcDoc}
            scrolling="no"
            onLoad={onFrameLoad}
            className="pointer-events-none bg-white"
            style={{
              width: `${W}px`,
              height: `${naturalH}px`,
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

export function SelectStickerPanel() {
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
        Loading stickers…
      </div>
    );
  }

  const size = biz.stickerSize;

  const select = (id: StickerTemplate) => {
    const saved = saveBusinessSettings({ ...biz, stickerTemplate: id });
    setBiz(saved);
    const name = TEMPLATES.find((t) => t.id === id)?.title ?? "Sticker";
    setToast(`${name} sticker selected.`);
  };

  const setSize = (s: StickerSize) => {
    const saved = saveBusinessSettings({ ...biz, stickerSize: s });
    setBiz(saved);
    const label = s === "2x3" ? "2 × 3 in" : s === "3x4" ? "3 × 4 in" : "3 × 3 in";
    setToast(`${label} size selected.`);
  };

  const printPreview = () => {
    const doc = renderStickerDoc(
      sampleStickerOrder(biz),
      biz,
      biz.stickerTemplate,
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
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-pink-100 bg-gradient-to-br from-pink-500 via-rose-500 to-fuchsia-600 p-6 text-white shadow-lg shadow-pink-200">
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/30">
              <Sticker className="h-7 w-7" />
            </div>
            <div>
              <h1 className="text-2xl font-extrabold tracking-tight">Select Sticker</h1>
              <p className="mt-1 text-sm text-white/85">
                Shipping label printed for couriers & parcels
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={printPreview}
            className="inline-flex items-center gap-2 rounded-xl bg-white px-5 py-2.5 text-sm font-bold text-rose-600 shadow-md transition hover:shadow-lg"
          >
            <Printer className="h-4 w-4" />
            Print Preview
          </button>
        </div>
      </div>

      {/* Size */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-slate-200 bg-white px-4 py-3">
        <div>
          <p className="text-sm font-bold text-slate-800">Label size</p>
          <p className="text-xs text-slate-500">
            {size === "2x3"
              ? "2 × 3 in — narrow thermal label"
              : size === "3x4"
                ? "3 × 4 in — tall courier label"
                : "3 × 3 in — square courier label"}
          </p>
        </div>
        <div className="flex gap-1 rounded-xl bg-slate-100 p-1">
          {(
            [
              { id: "3x3", label: "3 × 3 in" },
              { id: "3x4", label: "3 × 4 in" },
              { id: "2x3", label: "2 × 3 in" },
            ] as { id: StickerSize; label: string }[]
          ).map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => setSize(p.id)}
              className={clsx(
                "rounded-lg px-4 py-1.5 text-sm font-bold transition",
                size === p.id
                  ? "bg-white text-violet-700 shadow-sm"
                  : "text-slate-500 hover:text-slate-700"
              )}
            >
              {p.label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-5 sm:grid-cols-2 xl:grid-cols-4">
        {TEMPLATES.map((tpl) => (
          <PreviewCard
            key={tpl.id}
            template={tpl}
            biz={biz}
            size={size}
            selected={biz.stickerTemplate === tpl.id}
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
