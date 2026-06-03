"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { Package, X } from "lucide-react";
import type { OrderLine } from "@/lib/orders-store";
import { getProduct, getProductImageForLine } from "@/lib/inventory-store";

type Props = {
  open: boolean;
  items: OrderLine[] | null;
  onClose: () => void;
};

export function OrderProductDetailModal({ open, items, onClose }: Props) {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [open, onClose]);

  if (!open || !mounted || !items?.length) return null;

  const grandTotal = items.reduce((sum, line) => sum + line.total, 0);

  return createPortal(
    <div className="fixed inset-0 z-[240] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-violet-100 bg-gradient-to-r from-violet-50 to-indigo-50/50 px-5 py-4">
          <div className="flex items-center gap-2">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
              <Package className="h-4 w-4" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">Order products</h2>
              <p className="text-xs text-slate-500">
                {items.length} item{items.length === 1 ? "" : "s"} in this order
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg border border-slate-200 p-2 text-slate-500 hover:bg-white"
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto p-4">
          <ul className="space-y-3">
            {items.map((item, idx) => (
              <ProductRow key={`${item.productId}-${idx}`} item={item} index={idx} />
            ))}
          </ul>
        </div>

        <div className="shrink-0 border-t border-slate-100 bg-slate-50/80 px-5 py-3">
          <div className="flex items-center justify-between text-sm">
            <span className="font-semibold text-slate-600">Products total</span>
            <span className="text-base font-extrabold text-violet-700">
              ৳{grandTotal.toLocaleString("en-BD")}
            </span>
          </div>
        </div>
      </div>
    </div>,
    document.body
  );
}

function ProductRow({ item, index }: { item: OrderLine; index: number }) {
  const img = getProductImageForLine(item);
  const product = getProduct(item.productId);

  return (
    <li className="rounded-xl border border-slate-100 bg-white p-3 shadow-sm">
      <div className="flex gap-3">
        {img ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={img}
            alt=""
            className="h-16 w-16 shrink-0 rounded-lg object-cover ring-1 ring-slate-200"
          />
        ) : (
          <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-indigo-50 text-indigo-400 ring-1 ring-slate-200">
            <Package className="h-6 w-6" />
          </div>
        )}
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-bold uppercase tracking-wide text-violet-600">
            Item {index + 1}
          </p>
          <p className="mt-0.5 font-extrabold leading-snug text-slate-900">
            {item.productName}
          </p>
          <p className="mt-1 text-xs text-slate-500">
            SKU: {item.productCode || "—"}
            {product ? ` · Stock: ${product.stockQty}` : ""}
          </p>
          <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1 text-xs font-semibold">
            <span className="text-indigo-600">Qty {item.qty}</span>
            <span className="text-slate-600">
              ৳{item.price.toLocaleString("en-BD")} each
            </span>
            <span className={clsx("text-violet-700")}>
              Total ৳{item.total.toLocaleString("en-BD")}
            </span>
          </div>
        </div>
      </div>
    </li>
  );
}
