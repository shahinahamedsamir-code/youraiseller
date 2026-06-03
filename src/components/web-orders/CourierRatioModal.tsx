"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import type { Order } from "@/lib/orders-store";
import { CourierRatioPanel } from "@/components/orders/CourierRatioPanel";

type Props = {
  open: boolean;
  phone: string;
  localOrders: Order[];
  onClose: () => void;
};

export function CourierRatioModal({ open, phone, localOrders, onClose }: Props) {
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

  if (!open || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[240] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative flex max-h-[90vh] w-full max-w-4xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-violet-100">
        <div className="flex shrink-0 items-center justify-between gap-3 border-b border-violet-100 bg-gradient-to-r from-violet-50 to-indigo-50/50 px-5 py-3">
          <div>
            <h2 className="text-lg font-extrabold text-slate-900">Courier delivery ratio</h2>
            <p className="text-xs text-slate-500">{phone}</p>
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
          <CourierRatioPanel phone={phone} localOrders={localOrders} embedded />
        </div>
      </div>
    </div>,
    document.body
  );
}
