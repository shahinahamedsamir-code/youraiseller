"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Star,
  Trash2,
  Plus,
  Minus,
  Search,
  CheckCircle2,
  Package,
  Sparkles,
  Phone,
  MessageCircle,
} from "lucide-react";
import clsx from "clsx";
import {
  orderFormInputCls,
  OrderFormTotalField,
} from "@/components/orders/order-form-fields";
import { AdvancePaymentPanel } from "@/components/orders/AdvancePaymentPanel";
import { PreorderReasonFields } from "@/components/orders/PreorderReasonFields";
import { OrderActivityTimeline } from "@/components/orders/OrderActivityTimeline";
import {
  buildAdvancePaymentRecord,
  buildLineFromProduct,
  getOrder,
  updateOrder,
  promoteWebOrderToApproved,
  appendOrderActivity,
  isOrderPreorder,
  type AdvancePaymentMethod,
  type OrderLine,
  type PaymentMethod,
  type WebDisplayStatus,
} from "@/lib/orders-store";
import {
  loadProducts,
  getProductDisplayImage,
  getProductImageForLine,
  type Product,
} from "@/lib/inventory-store";
import {
  datetimeLocalToIso,
  getPreorderReason,
  toDatetimeLocalValue,
  type PreorderReason,
} from "@/lib/preorder-meta";
import {
  getOrderTimeline,
  logForOpened,
  logForOrderEdit,
  logForAdvancePayment,
  describeOrderOrigin,
} from "@/lib/order-activity";
import { getSessionUser } from "@/lib/dev-users";
import {
  isInWebQueue,
  shouldStayInWebQueueAfterWooSync,
} from "@/lib/web-order-queue";
import { webListTabForStatus } from "@/lib/web-order-tabs";
import { OrderSourceSelect } from "@/components/orders/OrderSourceSelect";
import {
  WEB_DEFAULT_ORDER_SOURCE,
  inferOrderSourceFromOrder,
  type OrderSource,
} from "@/lib/order-source";
import { statusColors } from "@/lib/mock-web-orders";

const WEB_STATUSES: { value: WebDisplayStatus; label: string }[] = [
  { value: "pending", label: "Pending" },
  { value: "processing", label: "Processing" },
  { value: "on_hold", label: "On Hold" },
  { value: "good_no_response", label: "Good but no response" },
  { value: "no_response", label: "No response" },
  { value: "incomplete", label: "Incomplete" },
  { value: "complete", label: "Complete" },
  { value: "cancelled", label: "Cancel" },
];

const WEB_LIST = "/dashboard/orders/web";
const ENTRY = "Web Order List · Open";

const PAYMENTS: PaymentMethod[] = ["cod", "bkash", "nagad", "prepaid"];

type CartLine = OrderLine & { imageDataUrl?: string };

function webStatusToOrderStatus(ws: WebDisplayStatus) {
  if (ws === "complete") return "delivered" as const;
  if (ws === "cancelled") return "cancelled" as const;
  return "pending" as const;
}

function whatsAppHref(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "#";
  const wa = digits.startsWith("880") ? digits : digits.startsWith("0") ? `88${digits}` : `88${digits}`;
  return `https://wa.me/${wa}`;
}

type Props = {
  orderId: string;
};

export function WebOrderEditForm({ orderId }: Props) {
  const router = useRouter();
  const snapshotRef = useRef<ReturnType<typeof getOrder> | null>(null);
  const openedLoggedRef = useRef(false);

  const allProducts = useMemo(
    () => loadProducts().filter((p) => p.active !== false),
    []
  );

  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [saving, setSaving] = useState(false);
  const [addedFlash, setAddedFlash] = useState<string | null>(null);
  const [logTick, setLogTick] = useState(0);

  const [phone, setPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [email, setEmail] = useState("");
  const [address, setAddress] = useState("");
  const [note, setNote] = useState("");
  const [orderSource, setOrderSource] = useState<OrderSource>(WEB_DEFAULT_ORDER_SOURCE);
  const [customOrderSource, setCustomOrderSource] = useState("");
  const [webStatus, setWebStatus] = useState<WebDisplayStatus>("pending");
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("cod");
  const [isPreorder, setIsPreorder] = useState(false);
  const [preorderReason, setPreorderReason] =
    useState<PreorderReason>("out_of_stock");
  const [preorderDeliveryLocal, setPreorderDeliveryLocal] = useState("");

  const [advancePaymentMethod, setAdvancePaymentMethod] =
    useState<AdvancePaymentMethod>("bkash");
  const [advanceTxnId, setAdvanceTxnId] = useState("");
  const [cashReceiverName, setCashReceiverName] = useState("");
  const [cashReference, setCashReference] = useState("");

  const [searchCode, setSearchCode] = useState("");
  const [searchName, setSearchName] = useState("");
  const [featuredOnly, setFeaturedOnly] = useState(false);

  const [lines, setLines] = useState<CartLine[]>([]);
  const [discount, setDiscount] = useState("0");
  const [advance, setAdvance] = useState("0");
  const [shippingCharge, setShippingCharge] = useState("0");

  const hydrateFromStore = useCallback(() => {
    const o = getOrder(orderId);
    if (!o) return;
    snapshotRef.current = { ...o, items: o.items.map((i) => ({ ...i })) };
    setCustomerName(o.customerName);
    setPhone(o.phone);
    setEmail(o.email ?? "");
    setAddress(o.address);
    setNote(o.note ?? "");
    setOrderSource(inferOrderSourceFromOrder(o));
    setCustomOrderSource(o.customOrderSource ?? "");
    setPaymentMethod(o.paymentMethod);
    setWebStatus(
      o.webStatus ??
        (o.status === "cancelled"
          ? "cancelled"
          : o.status === "delivered"
            ? "complete"
            : "pending")
    );
    setLines(
      o.items.map((line) => ({
        ...line,
        imageDataUrl: getProductImageForLine(line),
      }))
    );
    setShippingCharge(String(o.shippingCharge));
    setDiscount(String(o.discount));
    setAdvance(String(o.advance ?? 0));
    const ap = o.advancePayment;
    setAdvancePaymentMethod(ap?.method ?? "bkash");
    setAdvanceTxnId(ap?.transactionId ?? "");
    setCashReceiverName(ap?.cashReceiverName ?? "");
    setCashReference(ap?.cashReference ?? "");
    setIsPreorder(isOrderPreorder(o));
    setPreorderReason(getPreorderReason(o));
    setPreorderDeliveryLocal(toDatetimeLocalValue(o.preorderDeliveryAt));
  }, [orderId]);

  useEffect(() => {
    hydrateFromStore();
    openedLoggedRef.current = false;
  }, [orderId, hydrateFromStore]);

  useEffect(() => {
    if (openedLoggedRef.current) return;
    const o = getOrder(orderId);
    if (!o) return;
    openedLoggedRef.current = true;
    const entry = logForOpened(o, { entryPoint: ENTRY });
    appendOrderActivity(orderId, {
      type: entry.type,
      title: entry.title,
      detail: entry.detail,
      actor: getSessionUser()?.name ?? entry.actor,
    });
    setLogTick((t) => t + 1);
  }, [orderId]);

  const timeline = useMemo(() => {
    void logTick;
    const o = getOrder(orderId);
    return o ? getOrderTimeline(o) : [];
  }, [orderId, logTick]);

  const originInfo = useMemo(() => {
    const o = getOrder(orderId);
    return o ? describeOrderOrigin(o) : null;
  }, [orderId, logTick]);

  const filteredProducts = useMemo(() => {
    const code = searchCode.toLowerCase().trim();
    const name = searchName.toLowerCase().trim();
    return allProducts.filter((p) => {
      if (featuredOnly && !p.featured) return false;
      if (code && !p.code.toLowerCase().includes(code)) return false;
      if (name && !p.name.toLowerCase().includes(name)) return false;
      return true;
    });
  }, [allProducts, searchCode, searchName, featuredOnly]);

  const subtotal = lines.reduce((s, l) => s + l.total, 0);
  const discountNum = parseFloat(discount) || 0;
  const advanceNum = parseFloat(advance) || 0;
  const deliveryNum = parseFloat(shippingCharge) || 0;
  const grandTotal = Math.max(0, subtotal + deliveryNum - discountNum - advanceNum);
  const showAdvancePayment = advanceNum > 0;
  const isHandCashAdvance = advancePaymentMethod === "hand_cash";

  const tapAddProduct = (product: Product) => {
    if (product.manageStock && product.stockQty <= 0) {
      setError(`${product.name} is out of stock.`);
      return;
    }
    setError("");
    const img = getProductDisplayImage(product);
    setLines((prev) => {
      const idx = prev.findIndex((l) => l.productId === product.id);
      if (idx >= 0) {
        const next = [...prev];
        const newQty = next[idx].qty + 1;
        if (product.manageStock && newQty > product.stockQty) {
          setError(`Only ${product.stockQty} in stock.`);
          return prev;
        }
        const line = buildLineFromProduct(product.id, newQty)!;
        next[idx] = { ...line, imageDataUrl: img };
        return next;
      }
      const line = buildLineFromProduct(product.id, 1);
      if (!line) return prev;
      return [...prev, { ...line, imageDataUrl: img }];
    });
    setAddedFlash(product.id);
    setTimeout(() => setAddedFlash(null), 400);
  };

  const changeQty = (productId: string, delta: number) => {
    const product = allProducts.find((p) => p.id === productId);
    setLines((prev) =>
      prev
        .map((l) => {
          if (l.productId !== productId) return l;
          const newQty = l.qty + delta;
          if (newQty <= 0) return null;
          if (product?.manageStock && newQty > product.stockQty) {
            setError(`Max stock: ${product.stockQty}`);
            return l;
          }
          const built = buildLineFromProduct(productId, newQty);
          return built
            ? { ...built, imageDataUrl: l.imageDataUrl ?? getProductDisplayImage(product!) }
            : l;
        })
        .filter(Boolean) as CartLine[]
    );
  };

  const removeLine = (productId: string) => {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
  };

  const buildPatch = (): Parameters<typeof updateOrder>[1] | null => {
    setError("");
    if (!customerName.trim() || !phone.trim()) {
      setError("Customer name and phone are required.");
      return null;
    }
    if (lines.length === 0) {
      setError("Add at least one product.");
      return null;
    }
    if (isPreorder && !preorderDeliveryLocal.trim()) {
      setError("Select tentative delivery date & time for preorder.");
      return null;
    }
    if (showAdvancePayment) {
      if (isHandCashAdvance) {
        if (!cashReceiverName.trim() || !cashReference.trim()) {
          setError("Enter hand cash receiver and reference.");
          return null;
        }
      } else if (!advanceTxnId.trim()) {
        setError("Enter transaction ID for advance payment.");
        return null;
      }
    }

    let advancePayment;
    try {
      advancePayment = buildAdvancePaymentRecord(
        advanceNum,
        advancePaymentMethod,
        advanceTxnId,
        cashReceiverName,
        cashReference
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid advance payment");
      return null;
    }

    const before = snapshotRef.current ?? getOrder(orderId);
    const wasPreorder = before ? isOrderPreorder(before) : false;
    const stillInWebQueue = before ? isInWebQueue(before) : true;

    const patch: Parameters<typeof updateOrder>[1] = {
      customerName: customerName.trim(),
      phone: phone.trim(),
      email: email.trim() || undefined,
      address: address.trim(),
      note: note.trim() || undefined,
      orderSource,
      customOrderSource:
        orderSource === "custom" ? customOrderSource.trim() : undefined,
      paymentMethod,
      items: lines,
      shippingCharge: deliveryNum,
      discount: discountNum,
      advance: advanceNum,
      advancePayment,
    };

    if (isPreorder) {
      patch.isPreorder = true;
      patch.status = "preorder";
      patch.preorderReason = preorderReason;
      patch.preorderDeliveryAt = datetimeLocalToIso(preorderDeliveryLocal);
    } else if (wasPreorder) {
      patch.isPreorder = false;
      patch.preorderReason = undefined;
      patch.preorderDeliveryAt = undefined;
      patch.webStatus = webStatus;
      patch.status = stillInWebQueue
        ? "pending"
        : webStatusToOrderStatus(webStatus);
    } else {
      patch.webStatus = webStatus;
      patch.webStatusStaffSetAt = new Date().toISOString();
      patch.status = stillInWebQueue
        ? "pending"
        : webStatusToOrderStatus(webStatus);
      patch.inWebQueue = shouldStayInWebQueueAfterWooSync(
        { ...before!, webStatus },
        webStatus
      );
    }
    return patch;
  };

  const submit = () => {
    setSuccess("");
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

      if (before) {
        const entry = logForOrderEdit(before, updated, { entryPoint: ENTRY });
        appendOrderActivity(orderId, {
          type: entry.type,
          title: entry.title,
          detail: entry.detail,
          actor,
        });
      }

      setSuccess(`Order ${orderId} saved.`);
      snapshotRef.current = { ...updated, items: updated.items.map((i) => ({ ...i })) };
      setLogTick((t) => t + 1);
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("youraiseller-data-updated"));
      }
      const tab = !isPreorder ? webListTabForStatus(webStatus) : "all";
      setTimeout(
        () => router.push(`${WEB_LIST}?tab=${encodeURIComponent(tab)}`),
        800
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Save failed");
    } finally {
      setSaving(false);
    }
  };

  const createApprovedOrder = () => {
    setSuccess("");
    const patch = buildPatch();
    if (!patch) return;
    if (isPreorder) {
      setError("Uncheck preorder or save as preorder from Preorder List.");
      return;
    }
    if (
      !window.confirm(
        "Create Order করলে Approved Pending-এ যাবে + Web list Complete। তারপর আপনি Web Order List (Processing) এ ফিরে যাবেন।"
      )
    ) {
      return;
    }

    setSaving(true);
    try {
      const updated = promoteWebOrderToApproved(orderId, patch);
      if (!updated) {
        setError("Order not found.");
        return;
      }
      if (typeof window !== "undefined") {
        window.dispatchEvent(new Event("youraiseller-data-updated"));
      }
      router.replace(
        `${WEB_LIST}?created=${encodeURIComponent(orderId)}`
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not create approved order");
    } finally {
      setSaving(false);
    }
  };

  const order = getOrder(orderId);
  const inWebQueue = order ? isInWebQueue(order) : false;

  if (!order) {
    return (
      <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
        Order not found.
      </p>
    );
  }

  return (
    <div className="space-y-4">
      <section className="yai-panel p-4">
        <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
          <div>
            <p className="text-xs font-bold uppercase text-teal-600">Web order</p>
            <p className="text-lg font-extrabold text-slate-900">{orderId}</p>
            {order.wooNumber && (
              <p className="text-xs text-teal-600">WooCommerce #{order.wooNumber}</p>
            )}
          </div>
          <span
            className={clsx(
              "rounded-full px-3 py-1 text-xs font-bold capitalize",
              statusColors[webStatus]
            )}
          >
            {webStatus.replace("_", " ")}
          </span>
        </div>

        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">
              Mobile Number
            </label>
            <div className="flex gap-2">
              <input
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="01XXXXXXXXX"
                className={orderFormInputCls}
              />
              <a
                href={phone.trim() ? `tel:${phone.trim()}` : undefined}
                className="inline-flex shrink-0 items-center gap-1 rounded-lg bg-teal-50 px-2.5 py-2 text-xs font-bold text-teal-700 ring-1 ring-teal-200"
              >
                <Phone className="h-4 w-4" />
              </a>
              <a
                href={whatsAppHref(phone)}
                target="_blank"
                rel="noreferrer"
                className="inline-flex shrink-0 items-center rounded-lg bg-emerald-50 px-2.5 py-2 text-emerald-700 ring-1 ring-emerald-200"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
            </div>
          </div>
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">
              Customer Name
            </label>
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className={orderFormInputCls}
            />
          </div>
          <div className="flex flex-col gap-2">
            <label className="block text-xs font-bold text-slate-500">
              Web status
            </label>
            <select
              value={webStatus}
              disabled={isPreorder}
              onChange={(e) => setWebStatus(e.target.value as WebDisplayStatus)}
              className={orderFormInputCls}
            >
              {WEB_STATUSES.map((s) => (
                <option key={s.value} value={s.value}>
                  {s.label}
                </option>
              ))}
            </select>
            <button
              type="button"
              onClick={submit}
              disabled={lines.length === 0 || saving || isPreorder}
              className={clsx(
                "flex w-full items-center justify-center gap-2 rounded-xl border-2 border-emerald-600/80 px-4 py-3 text-sm font-extrabold shadow-md transition",
                "bg-gradient-to-b from-emerald-400 to-emerald-500 text-slate-900",
                "hover:from-emerald-300 hover:to-emerald-400 hover:shadow-lg active:scale-[0.99]",
                "disabled:cursor-not-allowed disabled:border-slate-300 disabled:from-slate-200 disabled:to-slate-300 disabled:text-slate-500 disabled:shadow-none"
              )}
            >
              <Sparkles className="h-4 w-4 shrink-0" />
              {saving
                ? "Saving…"
                : `Save changes (৳${grandTotal.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`}
            </button>
            <p className="text-[10px] leading-snug text-slate-500">
              Status change করলে Save চাপুন — list-এ সঠিক tab-এ যাবে
            </p>
          </div>
        </div>

        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-bold text-slate-500">
              Address
            </label>
            <textarea
              rows={3}
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="Full delivery address"
              className={orderFormInputCls}
            />
          </div>
          <div className="space-y-3">
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">
                Note
              </label>
              <input
                value={note}
                onChange={(e) => setNote(e.target.value)}
                className={orderFormInputCls}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-bold text-slate-500">
                Payment
              </label>
              <select
                value={paymentMethod}
                onChange={(e) =>
                  setPaymentMethod(e.target.value as PaymentMethod)
                }
                className={orderFormInputCls}
              >
                {PAYMENTS.map((p) => (
                  <option key={p} value={p}>
                    {p.toUpperCase()}
                  </option>
                ))}
              </select>
            </div>
            <OrderSourceSelect
              value={orderSource}
              onChange={setOrderSource}
              customLabel={customOrderSource}
              onCustomLabelChange={setCustomOrderSource}
              inputClassName={orderFormInputCls}
              compact
              hint="Defaults to Website for web orders — change if needed."
            />
            <label className="flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-2 text-sm font-semibold text-amber-800">
              <input
                type="checkbox"
                checked={isPreorder}
                onChange={(e) => setIsPreorder(e.target.checked)}
              />
              Preorder (Preorder List)
            </label>
            {isPreorder && (
              <PreorderReasonFields
                reason={preorderReason}
                onReasonChange={setPreorderReason}
                deliveryAtLocal={preorderDeliveryLocal}
                onDeliveryAtChange={setPreorderDeliveryLocal}
                inputClassName={orderFormInputCls}
              />
            )}
          </div>
        </div>
      </section>

      <section className="grid min-h-[420px] gap-4 lg:grid-cols-2">
        <div className="yai-panel flex flex-col overflow-hidden">
          <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
            <h3 className="font-bold text-slate-800">Ordered Products</h3>
            <p className="text-xs text-slate-500">{lines.length} item(s) in cart</p>
          </div>
          <div className="flex-1 overflow-y-auto p-3">
            {lines.length === 0 ? (
              <div className="flex h-full min-h-[280px] flex-col items-center justify-center text-center">
                <Package className="mb-3 h-12 w-12 text-rose-300" />
                <p className="font-semibold text-rose-500">No products added yet</p>
                <p className="mt-1 max-w-xs text-sm text-slate-500">
                  Tap a product on the right → it will appear here instantly
                </p>
              </div>
            ) : (
              <ul className="space-y-2">
                {lines.map((l) => (
                  <li
                    key={l.productId}
                    className="flex gap-3 rounded-xl border border-slate-100 bg-white p-3 shadow-sm"
                  >
                    {l.imageDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={l.imageDataUrl}
                        alt=""
                        className="h-14 w-14 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-14 w-14 items-center justify-center rounded-lg bg-indigo-50 text-xs text-indigo-400">
                        IMG
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <p className="truncate font-bold text-slate-800">
                        {l.productName}
                      </p>
                      <p className="text-xs text-emerald-600">SKU: {l.productCode}</p>
                      <p className="text-sm font-semibold text-indigo-600">
                        ৳{l.total.toLocaleString()}
                      </p>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <button
                        type="button"
                        onClick={() => removeLine(l.productId)}
                        className="text-rose-500 hover:text-rose-700"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                      <div className="flex items-center rounded-lg border border-slate-200">
                        <button
                          type="button"
                          onClick={() => changeQty(l.productId, -1)}
                          className="px-2 py-1 text-slate-600 hover:bg-slate-50"
                        >
                          <Minus className="h-3.5 w-3.5" />
                        </button>
                        <span className="min-w-[28px] text-center text-sm font-bold">
                          {l.qty}
                        </span>
                        <button
                          type="button"
                          onClick={() => changeQty(l.productId, 1)}
                          className="px-2 py-1 text-slate-600 hover:bg-slate-50"
                        >
                          <Plus className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </div>
        </div>

        <div className="yai-panel flex flex-col overflow-hidden">
          <div className="border-b border-slate-100 bg-indigo-50 px-4 py-3">
            <h3 className="font-bold text-indigo-900">Click To Add Products</h3>
            <p className="text-xs text-indigo-600/80">Tap any card to add to order</p>
          </div>
          <div className="border-b border-slate-100 p-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  placeholder="Code / SKU"
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value)}
                  className={`${orderFormInputCls} pl-8`}
                />
              </div>
              <input
                placeholder="Name"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className={`${orderFormInputCls} flex-1`}
              />
              <button
                type="button"
                onClick={() => setFeaturedOnly((f) => !f)}
                className={clsx(
                  "rounded-lg border px-3 transition",
                  featuredOnly
                    ? "border-amber-300 bg-amber-100 text-amber-700"
                    : "border-slate-200 bg-white text-slate-400"
                )}
              >
                <Star
                  className={clsx("h-5 w-5", featuredOnly && "fill-amber-400")}
                />
              </button>
            </div>
          </div>
          <div className="max-h-[360px] flex-1 overflow-y-auto p-2">
            {filteredProducts.length === 0 ? (
              <p className="p-6 text-center text-sm text-slate-500">No products found</p>
            ) : (
              <div className="space-y-2">
                {filteredProducts.map((p) => {
                  const img = getProductDisplayImage(p);
                  return (
                    <button
                      key={p.id}
                      type="button"
                      onClick={() => tapAddProduct(p)}
                      className={clsx(
                        "flex w-full gap-3 rounded-xl border p-3 text-left transition",
                        addedFlash === p.id
                          ? "border-indigo-400 bg-indigo-50 ring-2 ring-indigo-200"
                          : "border-slate-100 bg-white hover:border-indigo-300 hover:bg-indigo-50/50 hover:shadow-md",
                        p.stockQty === 0 && "opacity-50"
                      )}
                    >
                      {img ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img
                          src={img}
                          alt=""
                          className="h-16 w-16 shrink-0 rounded-lg object-cover"
                        />
                      ) : (
                        <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-100 to-rose-50 text-[10px] font-bold text-indigo-400">
                          {p.code.slice(0, 4)}
                        </div>
                      )}
                      <div className="min-w-0 flex-1">
                        <p className="line-clamp-2 text-sm font-bold uppercase text-slate-800">
                          {p.name}
                        </p>
                        <p className="text-xs font-semibold text-emerald-600">
                          SKU: {p.code}
                        </p>
                        <p className="text-sm">
                          <span className="text-slate-500">Price: </span>
                          <span className="font-bold text-slate-800">
                            ৳{p.sellPrice}
                          </span>
                        </p>
                        <p className="text-xs text-slate-500">
                          Stock:{" "}
                          <span className="font-bold">{p.stockQty}</span>
                        </p>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      </section>

      <section className="yai-panel p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <OrderFormTotalField
            label="Discount"
            value={discount}
            onChange={setDiscount}
          />
          <OrderFormTotalField
            label="Advance"
            value={advance}
            onChange={setAdvance}
            highlight={showAdvancePayment}
          />
          <div className="rounded-xl bg-slate-50 px-4 py-3">
            <p className="text-xs font-bold uppercase text-slate-500">Sub Total</p>
            <p className="text-xl font-extrabold text-slate-900">
              ৳{subtotal.toLocaleString()}
            </p>
          </div>
          <OrderFormTotalField
            label="Delivery Charge"
            value={shippingCharge}
            onChange={setShippingCharge}
            placeholder="Any amount"
          />
          <div className="rounded-xl bg-gradient-to-br from-indigo-600 to-violet-600 px-4 py-3 text-white">
            <p className="text-xs font-bold uppercase text-indigo-200">Grand Total</p>
            <p className="text-2xl font-extrabold">৳{grandTotal.toLocaleString()}</p>
          </div>
        </div>

        {showAdvancePayment ? (
          <AdvancePaymentPanel
            amount={advanceNum}
            method={advancePaymentMethod}
            onMethodChange={setAdvancePaymentMethod}
            transactionId={advanceTxnId}
            onTransactionIdChange={setAdvanceTxnId}
            cashReceiverName={cashReceiverName}
            onCashReceiverNameChange={setCashReceiverName}
            cashReference={cashReference}
            onCashReferenceChange={setCashReference}
          />
        ) : advanceNum === 0 ? (
          <p className="mt-3 rounded-xl border border-dashed border-slate-200 bg-slate-50/80 px-4 py-3 text-center text-xs text-slate-500">
            Enter an <strong>Advance</strong> amount above to record how the customer
            paid (saved in activity log).
          </p>
        ) : null}

        {error && (
          <p className="mt-3 rounded-lg bg-rose-50 px-3 py-2 text-sm text-rose-700">
            {error}
          </p>
        )}
        {success && (
          <p className="mt-3 flex items-center gap-2 rounded-lg bg-emerald-50 px-3 py-2 text-sm text-emerald-800">
            <CheckCircle2 className="h-4 w-4" /> {success}
          </p>
        )}

        <div className="mt-6 space-y-3">
          {inWebQueue && !isPreorder && (
            <button
              type="button"
              onClick={createApprovedOrder}
              disabled={lines.length === 0 || saving}
              className={clsx(
                "flex w-full items-center justify-center gap-3 rounded-xl border-2 border-indigo-600/80 px-6 py-5 text-xl font-extrabold tracking-tight shadow-lg transition",
                "bg-gradient-to-b from-indigo-500 to-violet-600 text-white",
                "hover:from-indigo-400 hover:to-violet-500 hover:shadow-xl active:scale-[0.99]",
                "disabled:cursor-not-allowed disabled:border-slate-300 disabled:from-slate-200 disabled:to-slate-300 disabled:text-slate-500 disabled:shadow-none"
              )}
            >
              <Sparkles className="h-6 w-6 shrink-0" />
              <span>
                {saving
                  ? "Creating…"
                  : `Create Order (৳${grandTotal.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`}
              </span>
            </button>
          )}
          {inWebQueue && !isPreorder ? (
            <p className="text-center text-xs text-slate-500">
              <strong className="text-indigo-700">Create Order</strong> → Approved
              Pending + Web list-এ <strong>Complete</strong> ইতিহাস ·{" "}
              <strong className="text-emerald-700">Save changes</strong> দিয়ে শুধু
              status/তথ্য আপডেট
            </p>
          ) : (
            <p className="text-center text-xs text-slate-500">
              Web status-এর নিচে Save changes — activity log-এ সব পরিবর্তন
            </p>
          )}
        </div>
      </section>

      {originInfo && (
        <section className="yai-panel p-4">
          <p className="text-[10px] font-bold uppercase text-teal-700">Order source</p>
          <p className="mt-1 text-sm font-semibold text-slate-800">
            {originInfo.channel} — {originInfo.summary}
          </p>
          {originInfo.detail && (
            <p className="mt-0.5 text-xs text-slate-600">{originInfo.detail}</p>
          )}
        </section>
      )}

      {timeline.length > 0 && (
        <section className="yai-panel p-4">
          <OrderActivityTimeline timeline={timeline} variant="web" />
        </section>
      )}
    </div>
  );
}
