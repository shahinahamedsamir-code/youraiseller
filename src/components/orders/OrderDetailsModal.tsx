"use client";

import { useEffect, useMemo, useState } from "react";
import {
  X,
  Phone,
  MessageCircle,
  MapPin,
  Package,
  CreditCard,
  Truck,
  StickyNote,
  Calendar,
  PackageCheck,
  User,
  Printer,
  History,
  Globe,
  Store,
  RefreshCw,
  ExternalLink,
  FileText,
  Link2,
  Tag,
  Paperclip,
} from "lucide-react";
import clsx from "clsx";
import { getOrder, isOrderPreorder } from "@/lib/orders-store";
import {
  formatPreorderDeliveryAt,
  getPreorderReason,
  getPreorderReasonLabel,
} from "@/lib/preorder-meta";
import { OrderRowActionsMenu } from "@/components/orders/OrderRowActionsMenu";
import { canEditOrder, canEditWebOrder } from "@/lib/order-edit";
import {
  getOrderTimeline,
  formatActivityDate,
  type OrderActivity,
  type OrderActivityType,
} from "@/lib/order-activity";
import { getProductImageForLine } from "@/lib/inventory-store";
import { getDeliveryMethodName } from "@/lib/delivery-methods-store";
import {
  getCourierPanelTrackingLabel,
  getCourierPanelTrackingUrl,
  getCourierTrackingDisplayId,
} from "@/lib/courier-tracking-url";
import { formatAdvancePaymentSummary } from "@/lib/orders-store";
import { ORDER_STATUS_LABELS } from "@/lib/order-status-tabs";
import { statusColors } from "@/lib/mock-web-orders";
import { resolveWebDisplayStatus } from "@/lib/order-edit";
import { loadOrderTags, orderTagChipClass } from "@/lib/order-tags-store";
import { getOrderCreatorInfo } from "@/lib/order-creator";

export type OrderDetailsModalProps = {
  orderId: string;
  variant?: "web" | "approved";
  onClose: () => void;
  onEdit?: () => void;
  onRefresh?: () => void;
  /** Preorder list: show Ready for Delivery instead of create-order flow */
  preorderActions?: {
    onReadyForDelivery: () => void;
  };
};

function activityIcon(type: OrderActivityType) {
  const map = {
    created: Store,
    woo_import: Globe,
    woo_sync: RefreshCw,
    status: History,
    edited: History,
    opened: ExternalLink,
    note: StickyNote,
    tracking: Truck,
    printed: Printer,
    approved: History,
  };
  return map[type] ?? History;
}

function activityDotClass(type: OrderActivityType, isWeb: boolean) {
  if (type === "woo_import" || type === "woo_sync")
    return "bg-violet-100 text-violet-600";
  if (type === "opened")
    return isWeb ? "bg-teal-100 text-teal-700" : "bg-indigo-100 text-indigo-600";
  if (type === "created")
    return isWeb ? "bg-teal-100 text-teal-600" : "bg-indigo-100 text-indigo-600";
  if (type === "status" || type === "approved")
    return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

const APPROVED_STATUS_CLASS: Record<string, string> = {
  pending: "bg-amber-100 text-amber-800",
  rts: "bg-indigo-100 text-indigo-800",
  shipped: "bg-sky-100 text-sky-800",
  delivered: "bg-emerald-100 text-emerald-800",
  cancelled: "bg-slate-100 text-slate-600",
  preorder: "bg-violet-100 text-violet-800",
};

export function OrderDetailsModal({
  orderId,
  variant = "approved",
  onClose,
  onEdit,
  onRefresh,
  preorderActions,
}: OrderDetailsModalProps) {
  const isWeb = variant === "web";
  const [dataTick, setDataTick] = useState(0);
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    const refresh = () => setDataTick((t) => t + 1);
    window.addEventListener("youraiseller-data-updated", refresh);
    return () =>
      window.removeEventListener("youraiseller-data-updated", refresh);
  }, []);

  const order = useMemo(() => {
    void dataTick;
    return getOrder(orderId);
  }, [orderId, dataTick]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
    };
  }, [onClose]);

  const timeline = useMemo(() => {
    void dataTick;
    return order ? getOrderTimeline(order) : [];
  }, [order, dataTick]);

  const allowEdit = order
    ? isWeb
      ? canEditWebOrder(order)
      : canEditOrder(order.status)
    : false;

  const due = useMemo(
    () => (order ? Math.max(0, order.total - (order.advance ?? 0)) : 0),
    [order]
  );

  const orderTags = useMemo(() => {
    void dataTick;
    return loadOrderTags();
  }, [dataTick]);

  const hasExtraOptions =
    !!order?.internalNote?.trim() ||
    !!order?.referenceLink?.trim() ||
    (order?.tags?.length ?? 0) > 0 ||
    (order?.attachments?.length ?? 0) > 0;

  const creatorInfo = order ? getOrderCreatorInfo(order) : null;

  if (!order) {
    return (
      <div className="fixed inset-0 z-[110] flex items-center justify-center bg-black/40 p-4">
        <div className="rounded-2xl bg-white p-6 text-sm">Order not found.</div>
      </div>
    );
  }

  const ws = isWeb ? resolveWebDisplayStatus(order) : null;
  const accent = isWeb ? "from-teal-600 to-emerald-600" : "from-indigo-600 to-violet-600";
  const soft = isWeb ? "text-teal-700" : "text-indigo-700";

  return (
    <div
      className="fixed inset-0 z-[110] flex items-end justify-center bg-slate-900/50 p-0 backdrop-blur-sm sm:items-center sm:p-4"
      role="dialog"
      aria-modal
      onClick={onClose}
    >
      <div
        className="flex max-h-[94vh] w-full max-w-2xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Hero */}
        <div className={clsx("relative bg-gradient-to-br px-6 py-6 text-white", accent)}>
          <button
            type="button"
            onClick={onClose}
            className="absolute right-4 top-4 rounded-full bg-white/20 p-2 hover:bg-white/30"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
          <p className="text-xs font-bold uppercase tracking-widest text-white/80">
            Order details
          </p>
          <h2 className="mt-1 text-3xl font-extrabold tracking-tight">{order.id}</h2>
          {order.wooNumber && (
            <p className="text-sm text-white/80">WooCommerce #{order.wooNumber}</p>
          )}
          <div className="mt-4 flex flex-wrap items-center gap-3">
            <span
              className={clsx(
                "rounded-full px-3 py-1 text-xs font-bold capitalize",
                isWeb
                  ? statusColors[ws!]
                  : (APPROVED_STATUS_CLASS[order.status] ??
                    "bg-slate-100 text-slate-700")
              )}
            >
              {isWeb ? ws!.replace("_", " ") : ORDER_STATUS_LABELS[order.status]}
            </span>
            <span className="rounded-full bg-white/20 px-3 py-1 text-xs font-semibold capitalize">
              {order.source}
            </span>
            {order.printed && (
              <span className="flex items-center gap-1 rounded-full bg-white/20 px-3 py-1 text-xs font-semibold">
                <Printer className="h-3.5 w-3.5" /> Printed
              </span>
            )}
          </div>
          <p className="mt-4 text-4xl font-extrabold">
            ৳{order.total.toLocaleString("en-BD")}
          </p>
          {order.advance > 0 && (
            <p className="text-sm text-white/90">
              Advance ৳{order.advance.toLocaleString()} · Due ৳{due.toLocaleString()}
              {formatAdvancePaymentSummary(order.advancePayment)
                ? ` · ${formatAdvancePaymentSummary(order.advancePayment)}`
                : ""}
            </p>
          )}
          {isOrderPreorder(order) && (
            <p className="mt-2 text-sm text-white/95">
              Preorder · {getPreorderReasonLabel(getPreorderReason(order))}
              {order.preorderDeliveryAt
                ? ` · Delivery ${formatPreorderDeliveryAt(order.preorderDeliveryAt)}`
                : ""}
            </p>
          )}
        </div>

        <div className="flex-1 overflow-y-auto p-5">
          {/* Meta row */}
          <div className="mb-4 flex items-center gap-2 text-xs text-slate-500">
            <Calendar className="h-4 w-4" />
            <span>{order.createdAt}</span>
            {creatorInfo && (
              <>
                <span className="text-slate-300">·</span>
                <User className="h-4 w-4" />
                <span>
                  {creatorInfo.role === "SYSTEM"
                    ? creatorInfo.name
                    : `${creatorInfo.roleLabel} · ${creatorInfo.name}`}
                </span>
              </>
            )}
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            {/* Customer */}
            <div className="rounded-2xl border border-slate-100 bg-gradient-to-br from-slate-50 to-white p-4 shadow-sm">
              <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                <User className="h-4 w-4" /> Customer
              </p>
              <p className="text-lg font-bold text-slate-900">{order.customerName}</p>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                <a
                  href={`tel:${order.phone}`}
                  className={clsx(
                    "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-sm font-semibold",
                    isWeb ? "bg-teal-50 text-teal-700" : "bg-indigo-50 text-indigo-700"
                  )}
                >
                  <Phone className="h-4 w-4" />
                  {order.phone}
                </a>
                <a
                  href={`https://wa.me/88${order.phone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 rounded-lg bg-emerald-50 px-2.5 py-1.5 text-emerald-700"
                >
                  <MessageCircle className="h-4 w-4" />
                </a>
              </div>
              {order.email && (
                <p className="mt-2 text-sm text-slate-600">{order.email}</p>
              )}
              <p className="mt-3 flex gap-2 text-sm leading-relaxed text-slate-600">
                <MapPin className={clsx("mt-0.5 h-4 w-4 shrink-0", soft)} />
                <span>
                  {order.address}
                  {order.district ? `, ${order.district}` : ""}
                </span>
              </p>
            </div>

            {/* Payment & delivery */}
            <div className="space-y-3">
              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-slate-400">
                  <CreditCard className="h-4 w-4" /> Payment
                </p>
                <p className="text-sm font-bold uppercase text-slate-800">
                  {order.paymentMethod}
                </p>
                <div className="mt-2 space-y-1 text-xs text-slate-600">
                  <p>Subtotal ৳{order.subtotal.toLocaleString()}</p>
                  <p>Shipping ৳{order.shippingCharge.toLocaleString()}</p>
                  {order.discount > 0 && (
                    <p className="text-rose-600">
                      Discount −৳{order.discount.toLocaleString()}
                    </p>
                  )}
                </div>
              </div>
              <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
                <p className="mb-2 flex items-center gap-2 text-xs font-bold uppercase text-slate-400">
                  <Truck className="h-4 w-4" /> Delivery
                </p>
                <p className="font-semibold text-slate-800">
                  {order.deliveryMethodId
                    ? getDeliveryMethodName(order.deliveryMethodId)
                    : order.courier}
                </p>
                {getCourierTrackingDisplayId(order) && (
                  <div className="mt-1">
                    <p className="font-mono text-xs font-bold text-indigo-600">
                      {getCourierTrackingDisplayId(order)}
                    </p>
                    {getCourierPanelTrackingUrl(order) && (
                      <a
                        href={getCourierPanelTrackingUrl(order)!}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="mt-1 inline-flex items-center gap-1 text-xs font-bold text-sky-600 hover:underline"
                      >
                        Parcel Link
                        <ExternalLink className="h-3.5 w-3.5" />
                      </a>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* Note */}
          {order.note && (
            <div className="mt-4 rounded-2xl border border-amber-200 bg-amber-50/80 p-4">
              <p className="mb-1 flex items-center gap-2 text-xs font-bold uppercase text-amber-700">
                <StickyNote className="h-4 w-4" /> Shipping note
              </p>
              <p className="whitespace-pre-wrap text-sm leading-relaxed text-slate-700">
                {order.note}
              </p>
            </div>
          )}

          {hasExtraOptions && (
            <div className="mt-4 rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50/50 to-white p-4 shadow-sm">
              <p className="mb-3 text-xs font-bold uppercase tracking-wide text-violet-700">
                Extra options
              </p>
              <div className="space-y-3">
                {order.internalNote?.trim() ? (
                  <div>
                    <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-500">
                      <FileText className="h-3.5 w-3.5" />
                      Internal note
                    </p>
                    <p className="whitespace-pre-wrap rounded-xl border border-slate-100 bg-white px-3 py-2 text-sm leading-relaxed text-slate-700">
                      {order.internalNote}
                    </p>
                  </div>
                ) : null}

                {order.referenceLink?.trim() ? (
                  <div>
                    <p className="mb-1 flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-500">
                      <Link2 className="h-3.5 w-3.5" />
                      Reference link
                    </p>
                    <a
                      href={order.referenceLink}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex max-w-full items-center gap-1.5 truncate rounded-xl border border-sky-100 bg-sky-50 px-3 py-2 text-sm font-semibold text-sky-700 hover:bg-sky-100"
                    >
                      {order.referenceLink}
                      <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                    </a>
                  </div>
                ) : null}

                {(order.tags?.length ?? 0) > 0 ? (
                  <div>
                    <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-500">
                      <Tag className="h-3.5 w-3.5" />
                      Order tags
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {order.tags!.map((label) => {
                        const def = orderTags.find((t) => t.label === label);
                        return (
                          <span
                            key={label}
                            className={clsx(
                              "rounded-lg px-2.5 py-1 text-[10px] font-bold ring-1",
                              orderTagChipClass(def?.color ?? "slate")
                            )}
                          >
                            {label}
                          </span>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {(order.attachments?.length ?? 0) > 0 ? (
                  <div>
                    <p className="mb-1.5 flex items-center gap-1.5 text-[10px] font-bold uppercase text-slate-500">
                      <Paperclip className="h-3.5 w-3.5" />
                      Attachments ({order.attachments!.length})
                    </p>
                    <ul className="space-y-2">
                      {order.attachments!.map((file, i) => {
                        const isImage = file.type?.startsWith("image/");
                        return (
                          <li
                            key={`${file.name}-${i}`}
                            className="flex items-center gap-3 rounded-xl border border-slate-100 bg-white p-2"
                          >
                            {isImage ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={file.dataUrl}
                                alt=""
                                className="h-12 w-12 rounded-lg object-cover ring-1 ring-slate-100"
                              />
                            ) : (
                              <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-slate-50 text-slate-400 ring-1 ring-slate-100">
                                <Paperclip className="h-5 w-5" />
                              </div>
                            )}
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-semibold text-slate-800">
                                {file.name}
                              </p>
                              {file.size ? (
                                <p className="text-[10px] text-slate-400">
                                  {(file.size / 1024).toFixed(0)} KB
                                </p>
                              ) : null}
                            </div>
                            <a
                              href={file.dataUrl}
                              download={file.name}
                              className="shrink-0 rounded-lg bg-violet-50 px-2.5 py-1.5 text-[10px] font-bold text-violet-700 ring-1 ring-violet-100 hover:bg-violet-100"
                            >
                              Download
                            </a>
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ) : null}
              </div>
            </div>
          )}

          {/* Products */}
          <div className="mt-5">
            <p className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400">
              <Package className="h-4 w-4" />
              Order items ({order.items.length})
            </p>
            <div className="space-y-2">
              {order.items.map((item, idx) => {
                const img = getProductImageForLine(item);
                return (
                  <div
                    key={`${item.productId}-${idx}`}
                    className="flex items-center gap-3 rounded-2xl border border-slate-100 bg-white p-3 shadow-sm"
                  >
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={img}
                        alt=""
                        className="h-14 w-14 rounded-xl object-cover ring-1 ring-slate-100"
                      />
                    ) : (
                      <div
                        className={clsx(
                          "flex h-14 w-14 items-center justify-center rounded-xl",
                          isWeb ? "bg-teal-50 text-teal-500" : "bg-indigo-50 text-indigo-500"
                        )}
                      >
                        <Package className="h-6 w-6" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="font-bold text-slate-900">{item.productName}</p>
                      <p className="text-xs text-slate-500">{item.productCode}</p>
                      <p className="text-xs text-slate-500">
                        Qty {item.qty} × ৳{item.price.toLocaleString()}
                      </p>
                    </div>
                    <p className="text-sm font-extrabold text-slate-900">
                      ৳{item.total.toLocaleString()}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Activity log — newest first, at bottom */}
          <div className="mt-5 rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/60 to-white p-4">
            <p className="mb-3 flex items-center justify-between gap-2">
              <span className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-indigo-600">
                <History className="h-4 w-4" />
                Order source &amp; activity
              </span>
              <span className="text-[10px] font-medium text-slate-400">
                Latest first
              </span>
            </p>
            <ul className="space-y-3">
              {timeline.map((entry: OrderActivity, i) => {
                const Icon = activityIcon(entry.type);
                const isLatest = i === 0;
                return (
                  <li
                    key={entry.id}
                    className={clsx(
                      "flex gap-3",
                      isLatest &&
                        "rounded-xl border border-indigo-100/80 bg-white p-3 shadow-sm"
                    )}
                  >
                    <span
                      className={clsx(
                        "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                        activityDotClass(entry.type, isWeb)
                      )}
                    >
                      <Icon className="h-4 w-4" />
                    </span>
                    <div className="min-w-0 flex-1 pb-1">
                      {isLatest && (
                        <span
                          className={clsx(
                            "mb-1.5 inline-block rounded-full px-2 py-0.5 text-[9px] font-bold uppercase",
                            isWeb
                              ? "bg-teal-100 text-teal-700"
                              : "bg-indigo-100 text-indigo-700"
                          )}
                        >
                          Latest
                        </span>
                      )}
                      <p className="text-sm font-semibold leading-snug text-slate-800">
                        {entry.title}
                      </p>
                      {entry.detail && (
                        <p className="mt-0.5 whitespace-pre-line text-xs leading-relaxed text-slate-500">
                          {entry.detail}
                        </p>
                      )}
                      <p className="mt-1.5 flex flex-wrap items-center gap-x-1.5 text-[10px] text-slate-400">
                        <Calendar className="h-3 w-3 shrink-0 text-slate-300" />
                        <span className="font-medium text-slate-500">
                          {formatActivityDate(entry.at)}
                        </span>
                        {entry.actor ? (
                          <span className="text-slate-400">· {entry.actor}</span>
                        ) : null}
                      </p>
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        </div>

        {/* Footer */}
        <div className="border-t border-slate-100 bg-slate-50/80 px-5 py-4">
          {isWeb && onRefresh ? (
            <div className="space-y-3">
              <div className="flex flex-wrap items-center gap-2">
                <a
                  href={`tel:${order.phone}`}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-white px-3 py-2 text-xs font-bold text-slate-700 ring-1 ring-slate-200 hover:bg-teal-50"
                >
                  <Phone className="h-3.5 w-3.5 text-teal-600" />
                  Call
                </a>
                <a
                  href={`https://wa.me/88${order.phone.replace(/\D/g, "")}`}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-bold text-emerald-700 ring-1 ring-emerald-200 hover:bg-emerald-100"
                >
                  <MessageCircle className="h-3.5 w-3.5" />
                  WhatsApp
                </a>
                {onEdit && allowEdit && (
                  <button
                    type="button"
                    onClick={onEdit}
                    className="rounded-xl bg-teal-600 px-4 py-2 text-xs font-bold text-white hover:bg-teal-700"
                  >
                    Edit order
                  </button>
                )}
                <OrderRowActionsMenu
                  order={order}
                  open={menuOpen}
                  onToggle={() => setMenuOpen((v) => !v)}
                  onClose={() => setMenuOpen(false)}
                  canEdit={allowEdit}
                  onViewDetails={() => {}}
                  onEdit={() => onEdit?.()}
                  onRefresh={onRefresh}
                  skipDetails
                  variant="web"
                />
              </div>
              <button
                type="button"
                onClick={onClose}
                className="w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
            </div>
          ) : preorderActions && order && isOrderPreorder(order) ? (
            <div className="flex flex-col gap-2 sm:flex-row">
              <button
                type="button"
                onClick={onClose}
                className="flex-1 rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  preorderActions.onReadyForDelivery();
                  onRefresh?.();
                }}
                className="flex flex-1 items-center justify-center gap-2 rounded-xl bg-teal-600 py-3 text-sm font-bold text-white shadow-md hover:bg-teal-700"
              >
                <PackageCheck className="h-4 w-4" />
                Ready for Delivery
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={onClose}
              className="w-full rounded-xl border border-slate-200 bg-white py-3 text-sm font-semibold text-slate-700 hover:bg-slate-50"
            >
              Close
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
