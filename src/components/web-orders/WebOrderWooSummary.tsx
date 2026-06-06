"use client";

import { useMemo, type ReactNode } from "react";
import Link from "next/link";
import clsx from "clsx";
import {
  RefreshCw,
  CreditCard,
  Package,
  Receipt,
  Shield,
  Smartphone,
  History,
} from "lucide-react";
import type { OrderLine, PaymentMethod } from "@/lib/orders-store";
import {
  getOrderSourceLabel,
  inferOrderSourceFromOrder,
  orderSourceBadgeClass,
  type OrderSource,
} from "@/lib/order-source";
import type { WooOrderSnapshot } from "@/lib/woo-order-snapshot";
import { formatWooDate } from "@/lib/woo-order-snapshot";
import type { Order, WebDisplayStatus } from "@/lib/orders-store";
import { statusColors } from "@/lib/mock-web-orders";
import {
  findOtherWooOrdersByPhone,
  formatWcStatusLabel,
  getWooCommerceStatus,
  wcStatusBadgeClass,
} from "@/lib/web-order-display";
import { WebOrderSmsActions } from "@/components/web-orders/WebOrderSmsActions";

type Props = {
  order: Order;
  wooSnapshot?: WooOrderSnapshot;
  webStatus: WebDisplayStatus;
  subtotal: number;
  shippingCharge: number;
  discount: number;
  grandTotal: number;
  items: OrderLine[];
  paymentMethod: PaymentMethod;
  orderSource: OrderSource;
  customOrderSource: string;
  onRefreshWoo?: () => void;
  wooRefreshing?: boolean;
};

const PAYMENT_LABELS: Record<PaymentMethod, string> = {
  cod: "Cash on delivery",
  bkash: "bKash",
  nagad: "Nagad",
  prepaid: "Prepaid / Online",
};

function SummaryRow({
  label,
  value,
  strong,
  mono,
}: {
  label: string;
  value: ReactNode;
  strong?: boolean;
  mono?: boolean;
}) {
  return (
    <div className="flex items-start justify-between gap-3 text-xs">
      <span className="shrink-0 font-semibold text-slate-500">{label}</span>
      <span
        className={clsx(
          "text-right",
          strong ? "font-extrabold text-slate-900" : "font-medium text-slate-800",
          mono && "font-mono text-[11px]"
        )}
      >
        {value}
      </span>
    </div>
  );
}

export function WebOrderWooSummary({
  order,
  wooSnapshot,
  webStatus,
  subtotal,
  shippingCharge,
  discount,
  grandTotal,
  items,
  paymentMethod,
  orderSource,
  customOrderSource,
  onRefreshWoo,
  wooRefreshing,
}: Props) {
  const source = inferOrderSourceFromOrder(order);
  const sourceLabel = getOrderSourceLabel(orderSource || source, customOrderSource);
  const attribution =
    wooSnapshot?.attributionSource ||
    (orderSource !== "website" && orderSource !== "unknown"
      ? sourceLabel
      : undefined);
  const wcStatus = getWooCommerceStatus(order);
  const otherWooOrders = useMemo(
    () => findOtherWooOrdersByPhone(order.phone, order.id).slice(0, 8),
    [order.phone, order.id]
  );
  const gateway =
    wooSnapshot?.paymentMethodTitle ||
    wooSnapshot?.paymentMethod?.toUpperCase() ||
    PAYMENT_LABELS[paymentMethod];
  const storeUrl = order.wooOrderId ? `#${order.wooNumber ?? order.wooOrderId}` : order.id;

  return (
    <div className="space-y-3">
      <WebOrderSmsActions order={order} />

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ring-1 ring-slate-100">
        <div className="border-b border-slate-100 bg-gradient-to-r from-teal-50 to-cyan-50/60 px-4 py-3">
          <div className="flex items-center gap-2">
            <Receipt className="h-4 w-4 text-teal-600" />
            <h3 className="text-sm font-extrabold text-slate-900">Order summary</h3>
          </div>
          <p className="mt-0.5 text-[10px] font-medium text-slate-500">
            WooCommerce + panel totals
          </p>
        </div>
        <div className="space-y-2.5 p-4">
          <SummaryRow label="Order" value={storeUrl} strong mono />
          <SummaryRow
            label="Created"
            value={wooSnapshot?.dateCreated ? formatWooDate(wooSnapshot.dateCreated) : order.createdAt}
          />
          {wooSnapshot?.dateModified ? (
            <SummaryRow label="Updated" value={formatWooDate(wooSnapshot.dateModified)} />
          ) : (
            <SummaryRow label="Updated" value={order.updatedAt} />
          )}
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-500">WC status</span>
            {wcStatus ? (
              <span
                className={clsx(
                  "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase ring-1",
                  wcStatusBadgeClass(wcStatus)
                )}
              >
                {formatWcStatusLabel(wcStatus)}
              </span>
            ) : (
              <span className="text-xs text-slate-400">—</span>
            )}
          </div>
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-500">Panel status</span>
            <span
              className={clsx(
                "rounded-full px-2 py-0.5 text-[10px] font-bold capitalize",
                statusColors[webStatus]
              )}
            >
              {webStatus.replace(/_/g, " ")}
            </span>
          </div>
          <SummaryRow label="Payment" value={gateway} />
          <div className="flex items-center justify-between gap-2">
            <span className="text-xs font-semibold text-slate-500">Source</span>
            <span
              className={clsx(
                "rounded-full px-2 py-0.5 text-[10px] font-bold capitalize",
                orderSourceBadgeClass(orderSource || source)
              )}
            >
              {attribution || sourceLabel}
            </span>
          </div>
          <div className="my-1 border-t border-dashed border-slate-200" />
          <SummaryRow label="Subtotal" value={`৳${subtotal.toLocaleString("en-BD")}`} />
          <SummaryRow label="Delivery" value={`৳${shippingCharge.toLocaleString("en-BD")}`} />
          {discount > 0 ? (
            <SummaryRow label="Discount" value={`-৳${discount.toLocaleString("en-BD")}`} />
          ) : null}
          {wooSnapshot?.couponCode ? (
            <SummaryRow label="Coupon" value={wooSnapshot.couponCode} mono />
          ) : null}
          <SummaryRow label="Total" value={`৳${grandTotal.toLocaleString("en-BD")}`} strong />
        </div>
      </section>

      {order.wooOrderId ? (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ring-1 ring-slate-100">
          <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <CreditCard className="h-4 w-4 text-indigo-600" />
              <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-700">
                WooCommerce payment
              </h3>
            </div>
          </div>
          <div className="space-y-2 p-4">
            <SummaryRow label="Gateway" value={gateway} />
            <SummaryRow
              label="Transaction"
              value={wooSnapshot?.transactionId?.trim() || "N/A"}
              mono
            />
            <SummaryRow
              label="Needs payment"
              value={
                wooSnapshot?.needsPayment == null
                  ? "—"
                  : wooSnapshot.needsPayment
                    ? "Yes"
                    : "No"
              }
            />
            {wooSnapshot?.datePaid ? (
              <SummaryRow label="Paid at" value={formatWooDate(wooSnapshot.datePaid)} />
            ) : null}
          </div>
        </section>
      ) : null}

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ring-1 ring-slate-100">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-violet-600" />
            <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-700">
              Meta data
            </h3>
          </div>
        </div>
        <div className="space-y-2 p-4">
          <SummaryRow
            label="IP"
            value={wooSnapshot?.customerIp || "—"}
            mono
          />
          <SummaryRow label="Mobile" value={order.phone} mono />
          {order.email ? <SummaryRow label="Email" value={order.email} /> : null}
          <SummaryRow
            label="Device"
            value={
              wooSnapshot?.deviceLabel ? (
                <span className="inline-flex items-center gap-1">
                  <Smartphone className="h-3 w-3" />
                  {wooSnapshot.deviceLabel}
                </span>
              ) : (
                "—"
              )
            }
          />
          {wooSnapshot?.syncedAt ? (
            <SummaryRow
              label="Woo sync"
              value={formatWooDate(wooSnapshot.syncedAt)}
            />
          ) : null}
        </div>
      </section>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ring-1 ring-slate-100">
        <div className="border-b border-slate-100 bg-slate-50 px-4 py-2.5">
          <div className="flex items-center gap-2">
            <Package className="h-4 w-4 text-teal-600" />
            <h3 className="text-xs font-extrabold uppercase tracking-wide text-slate-700">
              Order items ({items.length})
            </h3>
          </div>
        </div>
        <ul className="divide-y divide-slate-100">
          {items.map((item, idx) => (
            <li key={`${item.productId}-${idx}`} className="flex gap-2.5 p-3">
              {item.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={item.imageUrl}
                  alt=""
                  className="h-11 w-11 shrink-0 rounded-lg object-cover ring-1 ring-slate-200"
                />
              ) : (
                <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-teal-50 text-[10px] font-bold text-teal-500">
                  {item.productCode.slice(0, 3)}
                </div>
              )}
              <div className="min-w-0 flex-1">
                <p className="line-clamp-2 text-xs font-bold text-slate-800">
                  {item.productName}
                </p>
                <p className="text-[10px] text-slate-500">
                  {item.qty}× · ৳{item.total.toLocaleString("en-BD")}
                </p>
              </div>
            </li>
          ))}
        </ul>
      </section>

      {otherWooOrders.length > 0 ? (
        <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm ring-1 ring-slate-100">
          <div className="border-b border-slate-100 bg-amber-50/80 px-4 py-2.5">
            <div className="flex items-center gap-2">
              <History className="h-4 w-4 text-amber-700" />
              <h3 className="text-xs font-extrabold uppercase tracking-wide text-amber-900">
                Same customer · other WC orders ({otherWooOrders.length})
              </h3>
            </div>
          </div>
          <ul className="divide-y divide-slate-100">
            {otherWooOrders.map((o) => {
              const otherWc = getWooCommerceStatus(o);
              return (
                <li key={o.id}>
                  <Link
                    href={`/dashboard/orders/web/view/${encodeURIComponent(o.id)}`}
                    className="flex items-center justify-between gap-2 px-4 py-2.5 transition hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-xs font-bold text-teal-800">
                        #{o.wooNumber ?? o.wooOrderId ?? o.id}
                      </p>
                      <p className="text-[10px] text-slate-500">
                        {o.createdAt.slice(0, 10)} · ৳{o.total.toLocaleString("en-BD")}
                      </p>
                    </div>
                    {otherWc ? (
                      <span
                        className={clsx(
                          "shrink-0 rounded-full px-2 py-0.5 text-[9px] font-bold uppercase ring-1",
                          wcStatusBadgeClass(otherWc)
                        )}
                      >
                        {formatWcStatusLabel(otherWc)}
                      </span>
                    ) : null}
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      ) : null}

      {order.wooOrderId ? (
        <div className="space-y-2">
          {onRefreshWoo ? (
            <button
              type="button"
              onClick={onRefreshWoo}
              disabled={wooRefreshing}
              className="flex w-full items-center justify-center gap-2 rounded-xl border border-teal-200 bg-teal-50 px-3 py-2.5 text-xs font-bold text-teal-800 transition hover:bg-teal-100 disabled:opacity-60"
            >
              <RefreshCw
                className={clsx("h-3.5 w-3.5", wooRefreshing && "animate-spin")}
              />
              {wooRefreshing ? "Loading…" : "Refresh from WooCommerce"}
            </button>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}
