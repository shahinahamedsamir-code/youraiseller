"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import clsx from "clsx";
import type { Order } from "@/lib/orders-store";
import { ORDER_STATUS_LABELS } from "@/lib/order-status-tabs";

type Props = {
  open: boolean;
  onClose: () => void;
  title: string;
  subtitle: string;
  orders: Order[];
};

function formatOrderDate(iso: string): string {
  try {
    return new Date(iso).toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "2-digit",
    });
  } catch {
    return iso;
  }
}

function orderDisplayId(o: Order): string {
  if (o.wooNumber?.trim()) return `#${o.wooNumber.trim()}`;
  if (o.wooOrderId != null) return `#${o.wooOrderId}`;
  return o.id;
}

function statusLabel(o: Order): string {
  if (o.webStatus === "cancelled" || o.status === "cancelled") return "CANCEL";
  if (o.webStatus) return o.webStatus.replace(/_/g, " ").toUpperCase();
  return (ORDER_STATUS_LABELS[o.status] ?? o.status).toUpperCase();
}

function statusClass(o: Order): string {
  if (o.status === "cancelled" || o.webStatus === "cancelled") {
    return "bg-slate-100 text-slate-600 ring-slate-200";
  }
  if (o.status === "delivered" || o.webStatus === "complete") {
    return "bg-emerald-100 text-emerald-700 ring-emerald-200";
  }
  if (o.status === "pending" || o.status === "preorder") {
    return "bg-amber-100 text-amber-800 ring-amber-200";
  }
  return "bg-sky-100 text-sky-700 ring-sky-200";
}

export function CustomerOrderHistoryModal({
  open,
  onClose,
  title,
  subtitle,
  orders,
}: Props) {
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

  const modal = (
    <div className="fixed inset-0 z-[250] flex items-center justify-center p-4">
      <button
        type="button"
        aria-label="Close"
        className="absolute inset-0 bg-slate-900/50 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative flex max-h-[90vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-200">
        <div className="flex items-start justify-between gap-4 border-b border-slate-100 px-6 py-5">
          <div>
            <h2 className="text-xl font-extrabold tracking-tight text-slate-900">
              {title}
            </h2>
            <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-800"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-auto">
          {orders.length === 0 ? (
            <div className="px-6 py-16 text-center text-sm text-slate-500">
              No orders found for this filter.
            </div>
          ) : (
            <table className="w-full min-w-[720px] text-left text-sm">
              <thead className="sticky top-0 z-10 border-b border-slate-100 bg-slate-50/95 backdrop-blur">
                <tr>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Order
                  </th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Date
                  </th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Customer
                  </th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Products
                  </th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Total
                  </th>
                  <th className="px-4 py-3 text-xs font-bold uppercase tracking-wide text-slate-500">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {orders.map((o) => (
                  <tr key={o.id} className="hover:bg-slate-50/80">
                    <td className="px-4 py-3 align-top">
                      <p className="font-bold text-slate-900">{orderDisplayId(o)}</p>
                      {o.source === "web" && (
                        <p className="text-[10px] font-semibold uppercase text-slate-400">
                          Web
                        </p>
                      )}
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 align-top text-slate-600">
                      {formatOrderDate(o.createdAt)}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <p className="font-semibold text-slate-800">{o.customerName}</p>
                      <p className="text-xs text-slate-500">{o.phone}</p>
                    </td>
                    <td className="max-w-xs px-4 py-3 align-top">
                      <ul className="space-y-1.5">
                        {o.items.map((line, i) => (
                          <li key={`${line.productId}-${i}`} className="text-xs leading-snug">
                            <span className="font-semibold text-slate-800">
                              {line.qty}x {line.productName}
                            </span>
                            {line.productId ? (
                              <span className="mt-0.5 block text-[10px] text-slate-400">
                                ({line.productId})
                              </span>
                            ) : null}
                          </li>
                        ))}
                      </ul>
                    </td>
                    <td className="whitespace-nowrap px-4 py-3 align-top font-bold text-slate-900">
                      ৳{o.total.toLocaleString("en-BD")}
                    </td>
                    <td className="px-4 py-3 align-top">
                      <span
                        className={clsx(
                          "inline-flex rounded-md px-2 py-1 text-[10px] font-extrabold tracking-wide ring-1",
                          statusClass(o)
                        )}
                      >
                        {statusLabel(o)}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
