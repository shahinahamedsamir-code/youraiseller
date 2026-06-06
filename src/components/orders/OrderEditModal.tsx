"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import {
  X,
  Plus,
  Trash2,
  Save,
  Package,
  Phone,
  MessageCircle,
  Truck,
} from "lucide-react";
import clsx from "clsx";
import {
  getOrder,
  updateOrder,
  appendOrderActivity,
  isOrderPreorder,
  readyPreorderForDelivery,
  buildAdvancePaymentRecord,
  type AdvancePaymentInfo,
  type AdvancePaymentMethod,
  type Order,
  type OrderLine,
  type OrderStatus,
  type PaymentMethod,
  type WebDisplayStatus,
} from "@/lib/orders-store";
import { AdvancePaymentPanel } from "@/components/orders/AdvancePaymentPanel";
import { getProductImageForLine } from "@/lib/inventory-store";
import { loadDeliveryMethods, type DeliveryMethod } from "@/lib/delivery-methods-store";
import { BD_DISTRICTS } from "@/lib/approved-orders-nav";
import { ORDER_STATUS_LABELS } from "@/lib/order-status-tabs";
import { statusColors } from "@/lib/mock-web-orders";
import {
  getOrderTimeline,
  logForOpened,
  logForOrderEdit,
  logForAdvancePayment,
  describeOrderOrigin,
} from "@/lib/order-activity";
import { getSessionUser } from "@/lib/dev-users";
import {
  datetimeLocalToIso,
  getPreorderReason,
  toDatetimeLocalValue,
  type PreorderReason,
} from "@/lib/preorder-meta";
import { PreorderReasonFields } from "@/components/orders/PreorderReasonFields";
import { OrderProductPicker } from "./OrderProductPicker";
import { OrderActivityTimeline } from "./OrderActivityTimeline";

export type OrderEditModalProps = {
  orderId: string;
  variant?: "web" | "approved";
  onClose: () => void;
  onSaved: () => void;
  /** e.g. "Web Order List · Open" — used in activity log */
  entryPoint?: string;
  /** Log when modal opens (where user came from + order origin) */
  logOnOpen?: boolean;
  /** Show source & activity timeline under the form (web open) */
  showActivityLog?: boolean;
  /** Full edit from Preorder List (New Order–style, reason & delivery here) */
  preorderMode?: boolean;
  /** After save, move to approved pending (preorder list only) */
  onReadyForDelivery?: () => void;
  /** Full page (no popup) — used by /dashboard/orders/web/view/[id] */
  layout?: "modal" | "page";
};

function lineImage(item: OrderLine): string | undefined {
  return getProductImageForLine(item);
}

function whatsAppHref(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "#";
  const wa = digits.startsWith("880")
    ? digits
    : digits.startsWith("0")
      ? `88${digits}`
      : `88${digits}`;
  return `https://wa.me/${wa}`;
}

function recalcLine(line: OrderLine): OrderLine {
  const qty = Math.max(1, line.qty);
  const price = Math.max(0, line.price);
  return { ...line, qty, price, total: qty * price };
}

function webStatusToOrderStatus(ws: WebDisplayStatus): OrderStatus {
  if (ws === "complete") return "delivered";
  if (ws === "cancelled") return "cancelled";
  return "pending";
}

const WEB_STATUSES: WebDisplayStatus[] = [
  "pending",
  "processing",
  "on_hold",
  "good_no_response",
  "no_response",
  "incomplete",
  "complete",
  "cancelled",
];

const PAYMENTS: PaymentMethod[] = ["cod", "bkash", "nagad", "prepaid"];

export function OrderEditModal({
  orderId,
  variant = "approved",
  onClose,
  onSaved,
  entryPoint,
  logOnOpen = false,
  showActivityLog = false,
  preorderMode = false,
  onReadyForDelivery,
  layout = "modal",
}: OrderEditModalProps) {
  const isPage = layout === "page";
  const isWeb = variant === "web" && !preorderMode;
  const isPreorderEdit = preorderMode;
  const source = getOrder(orderId);
  const snapshotRef = useRef<Order | null>(null);
  const openedLoggedRef = useRef(false);
  const [logTick, setLogTick] = useState(0);
  const [customerName, setCustomerName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [district, setDistrict] = useState<string>(BD_DISTRICTS[0]);
  const [note, setNote] = useState("");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [webStatus, setWebStatus] = useState<WebDisplayStatus>("pending");
  const [deliveryMethodId, setDeliveryMethodId] = useState("");
  const [trackingId, setTrackingId] = useState("");
  const [deliveryMethods, setDeliveryMethods] = useState<DeliveryMethod[]>([]);
  const [items, setItems] = useState<OrderLine[]>([]);
  const [shippingCharge, setShippingCharge] = useState(0);
  const [discount, setDiscount] = useState(0);
  const [advance, setAdvance] = useState(0);
  const [advancePaymentMethod, setAdvancePaymentMethod] =
    useState<AdvancePaymentMethod>("bkash");
  const [advanceTxnId, setAdvanceTxnId] = useState("");
  const [cashReceiverName, setCashReceiverName] = useState("");
  const [cashReference, setCashReference] = useState("");
  const [isPreorder, setIsPreorder] = useState(false);
  const [preorderReason, setPreorderReason] =
    useState<PreorderReason>("out_of_stock");
  const [preorderDeliveryLocal, setPreorderDeliveryLocal] = useState("");
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    setDeliveryMethods(loadDeliveryMethods().filter((m) => m.active));
  }, []);

  useEffect(() => {
    const o = getOrder(orderId);
    if (!o) return;
    snapshotRef.current = { ...o, items: o.items.map((i) => ({ ...i })) };
    openedLoggedRef.current = false;
    setCustomerName(o.customerName);
    setPhone(o.phone);
    setEmail(o.email ?? "");
    setAddress(o.address);
    setDistrict(
      BD_DISTRICTS.includes(o.district as (typeof BD_DISTRICTS)[number])
        ? o.district
        : BD_DISTRICTS[0]
    );
    setNote(o.note ?? "");
    setPaymentMethod(o.paymentMethod);
    setDeliveryMethodId(o.deliveryMethodId ?? "");
    setTrackingId(o.trackingId ?? "");
    setWebStatus(
      o.webStatus ??
        (o.status === "cancelled"
          ? "cancelled"
          : o.status === "delivered"
            ? "complete"
            : "pending")
    );
    setItems(o.items.map(recalcLine));
    setShippingCharge(o.shippingCharge);
    setDiscount(o.discount);
    setAdvance(o.advance ?? 0);
    const ap = o.advancePayment;
    setAdvancePaymentMethod(ap?.method ?? "bkash");
    setAdvanceTxnId(ap?.transactionId ?? "");
    setCashReceiverName(ap?.cashReceiverName ?? "");
    setCashReference(ap?.cashReference ?? "");
    setIsPreorder(isOrderPreorder(o) || preorderMode);
    setPreorderReason(getPreorderReason(o));
    setPreorderDeliveryLocal(toDatetimeLocalValue(o.preorderDeliveryAt));
  }, [orderId, preorderMode]);

  useEffect(() => {
    if (!logOnOpen || !entryPoint || openedLoggedRef.current) return;
    const o = getOrder(orderId);
    if (!o) return;
    openedLoggedRef.current = true;
    const entry = logForOpened(o, { entryPoint });
    appendOrderActivity(orderId, {
      type: entry.type,
      title: entry.title,
      detail: entry.detail,
      actor: getSessionUser()?.name ?? entry.actor,
    });
    setLogTick((t) => t + 1);
  }, [orderId, logOnOpen, entryPoint]);

  const timeline = useMemo(() => {
    void logTick;
    const o = getOrder(orderId);
    return o ? getOrderTimeline(o) : [];
  }, [orderId, logTick]);

  const originInfo = useMemo(() => {
    const o = getOrder(orderId);
    return o ? describeOrderOrigin(o) : null;
  }, [orderId, logTick]);

  useEffect(() => {
    if (!isPage) {
      document.body.style.overflow = "hidden";
    }
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("keydown", onKey);
      if (!isPage) {
        document.body.style.overflow = "";
      }
    };
  }, [onClose, isPage]);

  const subtotal = useMemo(
    () => items.reduce((s, i) => s + i.total, 0),
    [items]
  );
  const total = Math.max(0, subtotal + shippingCharge - discount - advance);
  const showAdvancePayment = advance > 0;

  const updateItem = (idx: number, patch: Partial<OrderLine>) => {
    setItems((prev) =>
      prev.map((line, i) => (i === idx ? recalcLine({ ...line, ...patch }) : line))
    );
  };

  const removeItem = (idx: number) => {
    setError("");
    setItems((prev) => prev.filter((_, i) => i !== idx));
  };

  const addItem = () => {
    setItems((prev) => [
      ...prev,
      recalcLine({
        productId: `manual-${Date.now()}`,
        productName: "New product",
        productCode: "SKU",
        qty: 1,
        price: 0,
        total: 0,
      }),
    ]);
  };

  const buildPatch = (): Partial<Order> | null => {
    setError("");
    if (!customerName.trim() || !phone.trim()) {
      setError("Customer name and phone are required.");
      return null;
    }
    if (items.length === 0) {
      setError("Add at least one product line.");
      return null;
    }
    if ((isPreorder || isPreorderEdit) && !preorderDeliveryLocal.trim()) {
      setError("Select tentative delivery date & time for this preorder.");
      return null;
    }

    let advancePayment: AdvancePaymentInfo | undefined;
    try {
      advancePayment = buildAdvancePaymentRecord(
        advance,
        advancePaymentMethod,
        advanceTxnId,
        cashReceiverName,
        cashReference
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid advance payment");
      return null;
    }

    const patch: Partial<Order> = {
      customerName: customerName.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      address: address.trim(),
      district,
      note: note.trim() || undefined,
      paymentMethod,
      items: items.map(recalcLine),
      shippingCharge,
      discount,
      advance,
      advancePayment,
    };

    const before = snapshotRef.current ?? getOrder(orderId);
    const wasPreorder = before ? isOrderPreorder(before) : false;

    if (isPreorder || isPreorderEdit) {
      patch.isPreorder = true;
      patch.status = "preorder";
      patch.preorderReason = preorderReason;
      patch.preorderDeliveryAt = datetimeLocalToIso(preorderDeliveryLocal);
    } else if (wasPreorder) {
      patch.isPreorder = false;
      patch.preorderReason = undefined;
      patch.preorderDeliveryAt = undefined;
      if (isWeb) {
        patch.webStatus = webStatus;
        patch.status = webStatusToOrderStatus(webStatus);
      } else if (before?.status === "preorder") {
        patch.status = "pending";
      }
    } else if (isWeb) {
      patch.webStatus = webStatus;
      patch.status = webStatusToOrderStatus(webStatus);
    } else {
      if (deliveryMethodId) patch.deliveryMethodId = deliveryMethodId;
      patch.trackingId = trackingId.trim() || undefined;
    }

    return patch;
  };

  const save = (andReady = false) => {
    const patch = buildPatch();
    if (!patch) return;

    setSaving(true);
    try {
      const before = snapshotRef.current ?? getOrder(orderId);
      const updated = updateOrder(orderId, patch);
      if (!updated) {
        setError("Order not found.");
        return;
      }

      const actor = getSessionUser()?.name ?? "Staff";
      const advanceChanged =
        (before?.advance ?? 0) !== (updated.advance ?? 0) ||
        JSON.stringify(before?.advancePayment ?? null) !==
          JSON.stringify(updated.advancePayment ?? null);

      if (advanceChanged && (updated.advance ?? 0) > 0) {
        const advLog = logForAdvancePayment(updated, actor);
        if (advLog) {
          appendOrderActivity(orderId, {
            type: advLog.type,
            title: advLog.title,
            detail: advLog.detail,
            actor,
          });
        }
      } else if (advanceChanged && (before?.advance ?? 0) > 0) {
        appendOrderActivity(orderId, {
          type: "note",
          title: "Advance payment cleared",
          detail: "Advance amount removed from order",
          actor,
        });
      }

      if (before && entryPoint) {
        const entry = logForOrderEdit(before, updated, { entryPoint });
        appendOrderActivity(orderId, {
          type: entry.type,
          title: entry.title,
          detail: entry.detail,
          actor,
        });
      } else if (!advanceChanged) {
        appendOrderActivity(orderId, {
          type: "edited",
          title: "Order edited",
          detail: `${items.length} item(s) · Total ৳${total.toLocaleString("en-BD")}`,
        });
      }
      setLogTick((t) => t + 1);
      if (andReady) {
        readyPreorderForDelivery(orderId);
        onReadyForDelivery?.();
      }
      onSaved();
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const saveAndReady = () => {
    if (
      !window.confirm(
        "Save changes and move this order to Approved Orders → Pending list?"
      )
    ) {
      return;
    }
    save(true);
  };

  if (!source) {
    const notFound = (
      <div className="rounded-2xl bg-white p-6 text-sm text-slate-600 shadow-sm ring-1 ring-slate-100">
        Order not found.
        <button
          type="button"
          onClick={onClose}
          className={clsx("ml-3 font-semibold", isWeb ? "text-teal-600" : "text-indigo-600")}
        >
          {isPage ? "Back to list" : "Close"}
        </button>
      </div>
    );
    if (isPage) return <div>{notFound}</div>;
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
        {notFound}
      </div>
    );
  }

  const headerGradient = isPreorderEdit
    ? "from-violet-50 to-indigo-50"
    : isWeb
      ? "from-teal-50 to-indigo-50"
      : "from-indigo-50 to-violet-50";
  const accent = isPreorderEdit
    ? "text-violet-700"
    : isWeb
      ? "text-teal-700"
      : "text-indigo-700";
  const saveGradient = isPreorderEdit
    ? "from-violet-600 to-indigo-600"
    : isWeb
      ? "from-teal-500 to-emerald-500"
      : "from-indigo-600 to-violet-600";
  const totalColor = isPreorderEdit
    ? "text-violet-700"
    : isWeb
      ? "text-teal-700"
      : "text-indigo-700";
  const pickerAccent = isPreorderEdit ? "indigo" : isWeb ? "teal" : "indigo";

  const panel = (
      <div
        className={clsx(
          "flex w-full flex-col overflow-hidden bg-white shadow-sm ring-1 ring-slate-100",
          isPage
            ? "rounded-2xl"
            : "max-h-[92vh] rounded-t-2xl shadow-2xl sm:rounded-2xl",
          isPreorderEdit ? "max-w-5xl" : isPage ? "max-w-none" : "max-w-4xl"
        )}
        onClick={isPage ? undefined : (e) => e.stopPropagation()}
      >
        <div
          className={clsx(
            "flex items-start justify-between gap-3 border-b border-slate-100 bg-gradient-to-r px-5 py-4",
            headerGradient
          )}
        >
          <div>
            <p className={clsx("text-xs font-bold uppercase tracking-wide", accent)}>
              {isPreorderEdit
                ? "Preorder · Open & edit"
                : isWeb
                  ? "Web order · Open & edit"
                  : "Edit order"}
            </p>
            <h2
              id="order-edit-modal-title"
              className="text-xl font-extrabold text-slate-900"
            >
              {source.id}
              {source.wooNumber ? (
                <span className="ml-2 text-sm font-semibold text-slate-500">
                  WC #{source.wooNumber}
                </span>
              ) : null}
            </h2>
            {isWeb ? (
              <span
                className={clsx(
                  "mt-1 inline-flex rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
                  statusColors[webStatus]
                )}
              >
                {webStatus.replace("_", " ")}
              </span>
            ) : (
              <span
                className={clsx(
                  "mt-1 inline-flex rounded-full px-2.5 py-0.5 text-xs font-bold",
                  isPreorderEdit
                    ? "bg-violet-100 text-violet-800"
                    : "bg-amber-100 text-amber-800"
                )}
              >
                {isPreorderEdit ? "Preorder" : ORDER_STATUS_LABELS[source.status]}
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-xl p-2 text-slate-500 hover:bg-white/80"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4">
          {error && (
            <p className="mb-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
              {error}
            </p>
          )}

          <section className="mb-5">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <h3 className="text-xs font-bold uppercase text-slate-500">
                Customer
              </h3>
              {(isPreorderEdit || isPreorder) && (
                <div className="w-full sm:col-span-2">
                  <PreorderReasonFields
                    compact={!isPreorderEdit}
                    reason={preorderReason}
                    onReasonChange={setPreorderReason}
                    deliveryAtLocal={preorderDeliveryLocal}
                    onDeliveryAtChange={setPreorderDeliveryLocal}
                    inputClassName="w-full rounded-lg border border-violet-200 bg-white px-2 py-1.5 text-sm font-medium"
                  />
                </div>
              )}
              {!isPreorderEdit && (
                <div className="flex flex-col items-end gap-2 sm:col-span-2">
                  <label
                    className={clsx(
                      "flex cursor-pointer items-center gap-2 rounded-lg px-3 py-1.5 text-xs font-bold ring-1",
                      isPreorder
                        ? "bg-violet-100 text-violet-800 ring-violet-200"
                        : "bg-white text-slate-600 ring-slate-200 hover:bg-slate-50"
                    )}
                  >
                    <input
                      type="checkbox"
                      checked={isPreorder}
                      onChange={(e) => setIsPreorder(e.target.checked)}
                      className="rounded border-slate-300"
                    />
                    Preorder · goes to Preorder List
                  </label>
                </div>
              )}
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Name</span>
                <input
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Phone</span>
                <div className="mt-1 flex gap-2">
                  <input
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    className="min-w-0 flex-1 rounded-lg border border-slate-200 px-3 py-2"
                  />
                  <a
                    href={phone.trim() ? `tel:${phone.trim()}` : undefined}
                    className={clsx(
                      "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold ring-1 transition",
                      phone.trim()
                        ? isWeb
                          ? "bg-teal-50 text-teal-700 ring-teal-200 hover:bg-teal-100"
                          : "bg-indigo-50 text-indigo-700 ring-indigo-200 hover:bg-indigo-100"
                        : "pointer-events-none bg-slate-50 text-slate-300 ring-slate-100"
                    )}
                    aria-label="Call customer"
                    onClick={(e) => {
                      if (!phone.trim()) e.preventDefault();
                    }}
                  >
                    <Phone className="h-4 w-4 shrink-0" />
                    Call
                  </a>
                  <a
                    href={whatsAppHref(phone)}
                    target="_blank"
                    rel="noreferrer"
                    className={clsx(
                      "inline-flex shrink-0 items-center gap-1.5 rounded-lg px-3 py-2 text-xs font-bold ring-1 transition",
                      phone.replace(/\D/g, "")
                        ? "bg-emerald-50 text-emerald-700 ring-emerald-200 hover:bg-emerald-100"
                        : "pointer-events-none bg-slate-50 text-slate-300 ring-slate-100"
                    )}
                    aria-label="WhatsApp customer"
                    onClick={(e) => {
                      if (!phone.replace(/\D/g, "")) e.preventDefault();
                    }}
                  >
                    <MessageCircle className="h-4 w-4 shrink-0" />
                    WhatsApp
                  </a>
                </div>
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="font-medium text-slate-700">Email</span>
                <input
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                />
              </label>
              <label className="block text-sm sm:col-span-2">
                <span className="font-medium text-slate-700">Address</span>
                <textarea
                  value={address}
                  onChange={(e) => setAddress(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                />
              </label>
              <label className="block text-sm">
                <span className="font-medium text-slate-700">District</span>
                <select
                  value={district}
                  onChange={(e) => setDistrict(e.target.value)}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                >
                  {BD_DISTRICTS.map((d) => (
                    <option key={d} value={d}>
                      {d}
                    </option>
                  ))}
                </select>
              </label>
              {isWeb && isPreorder && (
                <p className="rounded-lg bg-violet-50 px-3 py-2 text-xs font-medium text-violet-800 sm:col-span-2">
                  This order will appear in{" "}
                  <strong>Approved → Preorder List</strong> and leave the web
                  order list until preorder is unchecked.
                </p>
              )}
              {isWeb ? (
                <label className="block text-sm">
                  <span className="font-medium text-slate-700">Status</span>
                  <select
                    value={webStatus}
                    disabled={isPreorder}
                    onChange={(e) =>
                      setWebStatus(e.target.value as WebDisplayStatus)
                    }
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2 disabled:bg-slate-50 disabled:text-slate-400"
                  >
                    {WEB_STATUSES.map((s) => (
                      <option key={s} value={s}>
                        {s.replace("_", " ")}
                      </option>
                    ))}
                  </select>
                </label>
              ) : (
                <label className="block text-sm">
                  <span className="font-medium text-slate-700">Delivery</span>
                  <select
                    value={deliveryMethodId}
                    onChange={(e) => setDeliveryMethodId(e.target.value)}
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                  >
                    <option value="">— Select —</option>
                    {deliveryMethods.map((m) => (
                      <option key={m.id} value={m.id}>
                        {m.name}
                      </option>
                    ))}
                  </select>
                </label>
              )}
              <label className="block text-sm">
                <span className="font-medium text-slate-700">Payment</span>
                <select
                  value={paymentMethod}
                  onChange={(e) =>
                    setPaymentMethod(e.target.value as PaymentMethod)
                  }
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                >
                  {PAYMENTS.map((p) => (
                    <option key={p} value={p}>
                      {p.toUpperCase()}
                    </option>
                  ))}
                </select>
              </label>
              {!isWeb && (
                <label className="block text-sm">
                  <span className="font-medium text-slate-700">Tracking ID</span>
                  <input
                    value={trackingId}
                    onChange={(e) => setTrackingId(e.target.value)}
                    placeholder="Courier tracking"
                    className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                  />
                </label>
              )}
              <label className="block text-sm sm:col-span-2">
                <span className="font-medium text-slate-700">Note</span>
                <textarea
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  rows={2}
                  className="mt-1 w-full rounded-lg border border-slate-200 px-3 py-2"
                />
              </label>
            </div>
          </section>

          <section className="mb-5">
            <div className="mb-2 flex items-center justify-between">
              <h3 className="text-xs font-bold uppercase text-slate-500">
                Products ({items.length})
              </h3>
              <button
                type="button"
                onClick={addItem}
                className={clsx(
                  "flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold",
                  isWeb
                    ? "bg-teal-50 text-teal-700 hover:bg-teal-100"
                    : "bg-indigo-50 text-indigo-700 hover:bg-indigo-100"
                )}
              >
                <Plus className="h-3.5 w-3.5" />
                Custom line
              </button>
            </div>

            <div className="mb-3">
              <OrderProductPicker
                items={items}
                onItemsChange={setItems}
                accent={pickerAccent}
              />
            </div>

            <div className="space-y-3">
              {items.length === 0 && (
                <p className="rounded-xl border border-dashed border-slate-200 bg-white px-4 py-6 text-center text-sm text-slate-500">
                  No products on this order. Add from inventory above or use{" "}
                  <span className="font-semibold text-slate-700">Custom line</span>.
                </p>
              )}
              {items.map((item, idx) => {
                const img = lineImage(item);
                return (
                  <div
                    key={`line-${idx}-${item.productId}`}
                    className="flex gap-3 rounded-xl border border-slate-100 bg-slate-50/80 p-3"
                  >
                    {img ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={img}
                        alt=""
                        className="h-16 w-16 shrink-0 rounded-lg object-cover ring-1 ring-slate-200"
                      />
                    ) : (
                      <div
                        className={clsx(
                          "flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-white ring-1 ring-slate-200",
                          isWeb ? "text-teal-500" : "text-indigo-500"
                        )}
                      >
                        <Package className="h-7 w-7" />
                      </div>
                    )}
                    <div className="min-w-0 flex-1 grid gap-2 sm:grid-cols-2">
                      <label className="block text-xs sm:col-span-2">
                        <span className="font-medium text-slate-600">
                          Product name
                        </span>
                        <input
                          value={item.productName}
                          onChange={(e) =>
                            updateItem(idx, { productName: e.target.value })
                          }
                          className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
                        />
                      </label>
                      <label className="block text-xs">
                        <span className="font-medium text-slate-600">SKU</span>
                        <input
                          value={item.productCode}
                          onChange={(e) =>
                            updateItem(idx, { productCode: e.target.value })
                          }
                          className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
                        />
                      </label>
                      <label className="block text-xs">
                        <span className="font-medium text-slate-600">Qty</span>
                        <input
                          type="number"
                          min={1}
                          value={item.qty}
                          onChange={(e) =>
                            updateItem(idx, {
                              qty: parseInt(e.target.value, 10) || 1,
                            })
                          }
                          className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
                        />
                      </label>
                      <label className="block text-xs">
                        <span className="font-medium text-slate-600">
                          Price (৳)
                        </span>
                        <input
                          type="number"
                          min={0}
                          value={item.price}
                          onChange={(e) =>
                            updateItem(idx, {
                              price: parseFloat(e.target.value) || 0,
                            })
                          }
                          className="mt-0.5 w-full rounded-lg border border-slate-200 bg-white px-2 py-1.5 text-sm"
                        />
                      </label>
                      <p className="flex items-end text-sm font-bold text-slate-800 sm:col-span-2">
                        Line total: ৳{item.total.toLocaleString("en-BD")}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        removeItem(idx);
                      }}
                      className="relative z-10 shrink-0 self-start rounded-lg p-2 text-slate-400 hover:bg-rose-50 hover:text-rose-600"
                      aria-label="Remove product line"
                      title="Remove this product"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                );
              })}
            </div>
          </section>

          <section className="grid gap-3 rounded-xl border border-slate-100 bg-slate-50 p-4 sm:grid-cols-3">
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Shipping ৳</span>
              <input
                type="number"
                min={0}
                value={shippingCharge}
                onChange={(e) =>
                  setShippingCharge(parseFloat(e.target.value) || 0)
                }
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Discount ৳</span>
              <input
                type="number"
                min={0}
                value={discount}
                onChange={(e) => setDiscount(parseFloat(e.target.value) || 0)}
                className="mt-1 w-full rounded-lg border border-slate-200 bg-white px-3 py-2"
              />
            </label>
            <label className="block text-sm">
              <span className="font-medium text-slate-700">Advance ৳</span>
              <input
                type="number"
                min={0}
                value={advance}
                onChange={(e) => setAdvance(parseFloat(e.target.value) || 0)}
                className={clsx(
                  "mt-1 w-full rounded-lg border bg-white px-3 py-2",
                  showAdvancePayment
                    ? "border-violet-300 ring-1 ring-violet-100"
                    : "border-slate-200"
                )}
              />
            </label>
            <p className={clsx("sm:col-span-3 text-right text-lg font-extrabold", totalColor)}>
              Total: ৳{total.toLocaleString("en-BD")}
              <span className="ml-2 text-xs font-normal text-slate-500">
                (subtotal ৳{subtotal.toLocaleString("en-BD")}
                {showAdvancePayment
                  ? ` · advance ৳${advance.toLocaleString("en-BD")}`
                  : ""}
                )
              </span>
            </p>
          </section>

          {showAdvancePayment ? (
            <section className="mb-5">
              <AdvancePaymentPanel
                amount={advance}
                method={advancePaymentMethod}
                onMethodChange={setAdvancePaymentMethod}
                transactionId={advanceTxnId}
                onTransactionIdChange={setAdvanceTxnId}
                cashReceiverName={cashReceiverName}
                onCashReceiverNameChange={setCashReceiverName}
                cashReference={cashReference}
                onCashReferenceChange={setCashReference}
              />
              <p className="mt-2 text-center text-[10px] text-slate-500">
                Saved to order activity log.
              </p>
            </section>
          ) : null}

          {isWeb && originInfo && (
            <section className="mt-5 rounded-xl border border-teal-100 bg-teal-50/40 p-3">
              <p className="text-[10px] font-bold uppercase text-teal-700">
                Where this order came from
              </p>
              <p className="mt-1 text-sm font-semibold text-slate-800">
                {originInfo.channel} — {originInfo.summary}
              </p>
              {originInfo.detail && (
                <p className="mt-0.5 text-xs text-slate-600">{originInfo.detail}</p>
              )}
              {entryPoint && (
                <p className="mt-2 text-xs text-teal-700">
                  You opened via: <strong>{entryPoint}</strong>
                </p>
              )}
            </section>
          )}

          {showActivityLog && timeline.length > 0 && (
            <section className="mt-5">
              <OrderActivityTimeline timeline={timeline} variant={variant} />
            </section>
          )}
        </div>

        <div
          className={clsx(
            "flex flex-wrap gap-2 border-t border-slate-100 bg-white px-5 py-4",
            isPreorderEdit && "sm:flex-nowrap"
          )}
        >
          <button
            type="button"
            onClick={onClose}
            className="min-w-[100px] flex-1 rounded-xl border border-slate-200 py-2.5 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            {isPage ? "Back to list" : "Cancel"}
          </button>
          <button
            type="button"
            onClick={() => save(false)}
            disabled={saving}
            className={clsx(
              "flex min-w-[120px] flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r py-2.5 text-sm font-bold text-white shadow-md disabled:opacity-60",
              saveGradient
            )}
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving…" : "Save changes"}
          </button>
          {isPreorderEdit && onReadyForDelivery && (
            <button
              type="button"
              onClick={saveAndReady}
              disabled={saving}
              className="flex min-w-[160px] flex-1 items-center justify-center gap-2 rounded-xl bg-teal-600 py-2.5 text-sm font-bold text-white shadow-md hover:bg-teal-700 disabled:opacity-60"
            >
              <Truck className="h-4 w-4" />
              Ready for Delivery
            </button>
          )}
        </div>
      </div>
  );

  if (isPage) {
    return panel;
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end justify-center bg-black/50 p-0 sm:items-center sm:p-4"
      role="dialog"
      aria-modal
      aria-labelledby="order-edit-modal-title"
    >
      {panel}
    </div>
  );
}
