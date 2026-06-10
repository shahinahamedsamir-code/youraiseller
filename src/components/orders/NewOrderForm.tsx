"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  Star,
  Trash2,
  Plus,
  Minus,
  Search,
  AlertTriangle,
  CheckCircle2,
  Package,
  Sparkles,
  User,
  Phone,
  MapPin,
  Truck,
  ShoppingCart,
  Layers,
  PlusCircle,
  Zap,
} from "lucide-react";
import {
  getInitialDeliveryMethodId,
  resolveDeliveryFieldsForOrderInput,
} from "@/lib/delivery-methods-store";
import { DeliveryMethodSelect } from "@/components/delivery/DeliveryMethodSelect";
import { PreorderReasonFields } from "@/components/orders/PreorderReasonFields";
import {
  buildAdvancePaymentRecord,
  buildLineFromProduct,
  createOrder,
  getOrder,
  updateOrder,
  appendOrderActivity,
  isOrderPreorder,
  findOrdersByPhone,
  loadProducts,
  type OrderLine,
  type AdvancePaymentMethod,
  type OrderAttachment,
  type Order,
} from "@/lib/orders-store";
import type { Product } from "@/lib/inventory-store";
import { getProductImageForLine } from "@/lib/inventory-store";
import {
  getPreorderReason,
  toDatetimeLocalValue,
  datetimeLocalToIso,
  type PreorderReason,
} from "@/lib/preorder-meta";
import {
  logForOpened,
  logForOrderEdit,
  logForAdvancePayment,
} from "@/lib/order-activity";
import { getSessionUser } from "@/lib/dev-users";
import { loadBusinessSettings } from "@/lib/business-settings-store";
import { ORDER_STATUS_LABELS } from "@/lib/order-status-tabs";
import { AdvancePaymentPanel } from "@/components/orders/AdvancePaymentPanel";
import { OrderSourceSelect } from "@/components/orders/OrderSourceSelect";
import { ShippingNoteField } from "@/components/orders/ShippingNoteField";
import { OrderExtraOptions } from "@/components/orders/OrderExtraOptions";
import { CourierRatioPanel } from "@/components/orders/CourierRatioPanel";
import {
  loadAdvanceSettings,
  ADVANCE_SETTINGS_UPDATED,
  type RequiredFieldKey,
} from "@/lib/advance-settings-store";
import {
  DEFAULT_ORDER_SOURCE,
  inferOrderSourceFromOrder,
  type OrderSource,
} from "@/lib/order-source";
import clsx from "clsx";

const inputCls =
  "w-full rounded-xl border border-slate-200/90 bg-white px-3 py-2.5 text-sm shadow-sm outline-none transition placeholder:text-slate-400 focus:border-violet-400 focus:ring-2 focus:ring-violet-100";

const labelCls = "mb-1.5 flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wide text-slate-500";

const REQUIRED_PHONE_DIGITS = 11;
const MIN_ADDRESS_CHARS = 10;

function phoneDigitCount(value: string): number {
  return value.replace(/\D/g, "").length;
}

function isValidPhone(value: string): boolean {
  return phoneDigitCount(value) === REQUIRED_PHONE_DIGITS;
}

function isValidAddress(value: string): boolean {
  return value.trim().length >= MIN_ADDRESS_CHARS;
}

type CartLine = OrderLine & { imageDataUrl?: string };

const APPROVED_LIST = "/dashboard/orders/approved/list";
const EDIT_ENTRY = "Approved Order List · Edit";

type Props = {
  /** When set, form edits existing order (full page — no popup). */
  orderId?: string;
};

export function NewOrderForm({ orderId }: Props = {}) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const isEdit = Boolean(orderId);
  const snapshotRef = useRef<ReturnType<typeof getOrder> | null>(null);
  const openedLoggedRef = useRef(false);
  const allProducts = useMemo(
    () => loadProducts().filter((p) => p.active !== false),
    []
  );
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [duplicateWarn, setDuplicateWarn] = useState("");
  const [addedFlash, setAddedFlash] = useState<string | null>(null);

  const [phone, setPhone] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [deliveryMethodId, setDeliveryMethodId] = useState(
    () => getInitialDeliveryMethodId()
  );
  const [address, setAddress] = useState("");
  const [shippingNote, setShippingNote] = useState("");
  const [orderSource, setOrderSource] = useState<OrderSource>(DEFAULT_ORDER_SOURCE);
  const [customOrderSource, setCustomOrderSource] = useState("");
  const [internalNote, setInternalNote] = useState("");
  const [referenceLink, setReferenceLink] = useState("");
  const [orderTags, setOrderTags] = useState<string[]>([]);
  const [attachments, setAttachments] = useState<OrderAttachment[]>([]);
  const [isPreorder, setIsPreorder] = useState(false);
  useEffect(() => {
    if (isEdit) return;
    if (searchParams.get("preorder") === "1") {
      setIsPreorder(true);
    }
  }, [isEdit, searchParams]);

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
  const [saving, setSaving] = useState(false);
  const [requiredFields, setRequiredFields] = useState<
    Record<RequiredFieldKey, boolean>
  >(() => loadAdvanceSettings().required);

  useEffect(() => {
    const refresh = () => setRequiredFields(loadAdvanceSettings().required);
    refresh();
    window.addEventListener(ADVANCE_SETTINGS_UPDATED, refresh);
    window.addEventListener("youraiseller-data-updated", refresh);
    return () => {
      window.removeEventListener(ADVANCE_SETTINGS_UPDATED, refresh);
      window.removeEventListener("youraiseller-data-updated", refresh);
    };
  }, []);

  // New order: seed delivery charge / note from Business Settings defaults.
  useEffect(() => {
    if (orderId) return;
    const biz = loadBusinessSettings();
    if (biz.defaultDeliveryCost > 0) setShippingCharge(String(biz.defaultDeliveryCost));
    if (biz.orderNote?.trim()) setShippingNote(biz.orderNote.trim());
  }, [orderId]);

  useEffect(() => {
    if (!orderId) return;
    const o = getOrder(orderId);
    if (!o) return;
    snapshotRef.current = { ...o, items: o.items.map((i) => ({ ...i })) };
    openedLoggedRef.current = false;
    setCustomerName(o.customerName);
    setPhone(o.phone);
    setAddress(o.address);
    setShippingNote(o.note ?? "");
    setDeliveryMethodId(o.deliveryMethodId ?? "");
    setLines(
      o.items.map((line) => ({
        ...line,
        imageDataUrl: getProductImageForLine(line),
      }))
    );
    setDiscount(String(o.discount));
    setAdvance(String(o.advance ?? 0));
    setShippingCharge(String(o.shippingCharge));
    const ap = o.advancePayment;
    setAdvancePaymentMethod(ap?.method ?? "bkash");
    setAdvanceTxnId(ap?.transactionId ?? "");
    setCashReceiverName(ap?.cashReceiverName ?? "");
    setCashReference(ap?.cashReference ?? "");
    setIsPreorder(isOrderPreorder(o));
    setPreorderReason(getPreorderReason(o));
    setPreorderDeliveryLocal(toDatetimeLocalValue(o.preorderDeliveryAt));
    setOrderSource(inferOrderSourceFromOrder(o));
    setCustomOrderSource(o.customOrderSource ?? "");
    setInternalNote(o.internalNote ?? "");
    setReferenceLink(o.referenceLink ?? "");
    setOrderTags(o.tags ?? []);
    setAttachments(o.attachments ?? []);
  }, [orderId]);

  useEffect(() => {
    if (!orderId || openedLoggedRef.current) return;
    const o = getOrder(orderId);
    if (!o) return;
    openedLoggedRef.current = true;
    const entry = logForOpened(o, { entryPoint: EDIT_ENTRY });
    appendOrderActivity(orderId, {
      type: entry.type,
      title: entry.title,
      detail: entry.detail,
      actor: getSessionUser()?.name ?? entry.actor,
    });
  }, [orderId]);

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
  const phoneInvalid = phone.trim().length > 0 && !isValidPhone(phone);
  const addressInvalid = address.trim().length > 0 && !isValidAddress(address);
  const localOrdersForPhone = useMemo(() => {
    if (!isValidPhone(phone)) return [];
    return findOrdersByPhone(phone);
  }, [phone]);

  const fillFromLastOrder = (order: Order) => {
    setCustomerName(order.customerName);
    setAddress(order.address);
    if (order.note?.trim()) setShippingNote(order.note.trim());
  };

  const checkPhone = () => {
    if (!isValidPhone(phone)) {
      setDuplicateWarn("");
      return;
    }
    const prev = findOrdersByPhone(phone);
    setDuplicateWarn(
      prev.length > 0
        ? `Previous orders: ${prev.length} · Last ${prev[0].id}`
        : ""
    );
  };

  const tapAddProduct = (product: Product) => {
    if (product.manageStock && product.stockQty <= 0) {
      setError(`${product.name} is out of stock.`);
      return;
    }
    setError("");
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
        next[idx] = { ...line, imageDataUrl: product.imageDataUrl };
        return next;
      }
      const line = buildLineFromProduct(product.id, 1);
      if (!line) return prev;
      return [...prev, { ...line, imageDataUrl: product.imageDataUrl }];
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
          return built ? { ...built, imageDataUrl: l.imageDataUrl } : l;
        })
        .filter(Boolean) as CartLine[]
    );
  };

  const removeLine = (productId: string) => {
    setLines((prev) => prev.filter((l) => l.productId !== productId));
  };

  const submit = () => {
    setError("");
    setSuccess("");
    if (!customerName.trim()) {
      setError("Customer name is required.");
      return;
    }
    if (!phone.trim()) {
      setError("Mobile number is required.");
      return;
    }
    if (!isValidPhone(phone)) {
      setError("Mobile number must be 11 digits.");
      return;
    }
    if (!address.trim()) {
      setError("Delivery address is required.");
      return;
    }
    if (!isValidAddress(address)) {
      setError("Address must be at least 10 characters.");
      return;
    }
    if (requiredFields.deliveryMethod && !deliveryMethodId) {
      setError("Select a delivery method.");
      return;
    }
    if (requiredFields.shippingNote && !shippingNote.trim()) {
      setError("Shipping note is required.");
      return;
    }
    if (requiredFields.orderSource && orderSource === "unknown") {
      setError("Select an order source.");
      return;
    }
    if (lines.length === 0) {
      setError("Add at least one product.");
      return;
    }
    if (showAdvancePayment && requiredFields.transactionId) {
      if (isHandCashAdvance) {
        if (!cashReceiverName.trim()) {
          setError("Enter who received the cash (receiver name).");
          return;
        }
        if (!cashReference.trim()) {
          setError("Enter cash reference / note.");
          return;
        }
      } else if (!advanceTxnId.trim()) {
        setError("Enter transaction ID for advance payment.");
        return;
      }
    }
    if (isPreorder && !preorderDeliveryLocal.trim()) {
      setError("Select tentative delivery date & time for this preorder.");
      return;
    }
    if (orderSource === "custom" && !customOrderSource.trim()) {
      setError("Enter a name for custom order source.");
      return;
    }
    let advancePayment;
    try {
      advancePayment = buildAdvancePaymentRecord(
        advanceNum,
        advancePaymentMethod,
        advanceTxnId,
        cashReceiverName,
        cashReference,
        requiredFields.transactionId
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Invalid advance payment");
      return;
    }

    setSaving(true);
    try {
      if (isEdit && orderId) {
        const before = snapshotRef.current ?? getOrder(orderId);
        const wasPreorder = before ? isOrderPreorder(before) : false;
        const delivery = resolveDeliveryFieldsForOrderInput({ deliveryMethodId });
        const patch = {
          customerName: customerName.trim(),
          phone: phone.trim(),
          address: address.trim(),
          note: shippingNote.trim() || undefined,
          deliveryMethodId: delivery.deliveryMethodId,
          courier: delivery.courier,
          items: lines,
          shippingCharge: deliveryNum,
          discount: discountNum,
          advance: advanceNum,
          advancePayment,
          orderSource,
          customOrderSource:
            orderSource === "custom" ? customOrderSource.trim() : undefined,
          internalNote: internalNote.trim() || undefined,
          referenceLink: referenceLink.trim() || undefined,
          tags: orderTags.length ? orderTags : undefined,
          attachments: attachments.length ? attachments : undefined,
        };
        if (isPreorder) {
          Object.assign(patch, {
            isPreorder: true,
            status: "preorder" as const,
            preorderReason,
            preorderDeliveryAt: datetimeLocalToIso(preorderDeliveryLocal),
          });
        } else if (wasPreorder) {
          Object.assign(patch, {
            isPreorder: false,
            preorderReason: undefined,
            preorderDeliveryAt: undefined,
            status: "pending" as const,
          });
        }

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
        }

        if (before) {
          const entry = logForOrderEdit(before, updated, { entryPoint: EDIT_ENTRY });
          appendOrderActivity(orderId, {
            type: entry.type,
            title: entry.title,
            detail: entry.detail,
            actor,
          });
        }

        setSuccess(`Order ${orderId} saved.`);
        snapshotRef.current = { ...updated, items: updated.items.map((i) => ({ ...i })) };
        setTimeout(() => router.push(APPROVED_LIST), 700);
        return;
      }

      const order = createOrder({
        customerName,
        phone,
        address: address.trim(),
        district: "",
        paymentMethod: "cod",
        deliveryMethodId,
        items: lines,
        shippingCharge: deliveryNum,
        discount: discountNum,
        advance: advanceNum,
        advancePayment,
        note: shippingNote,
        isPreorder,
        preorderReason: isPreorder ? preorderReason : undefined,
        preorderDeliveryAt: isPreorder
          ? datetimeLocalToIso(preorderDeliveryLocal)
          : undefined,
        status: isPreorder ? "preorder" : "pending",
        orderSource,
        customOrderSource:
          orderSource === "custom" ? customOrderSource : undefined,
        internalNote: internalNote.trim() || undefined,
        referenceLink: referenceLink.trim() || undefined,
        tags: orderTags.length ? orderTags : undefined,
        attachments: attachments.length ? attachments : undefined,
      });
      setSuccess(
        isPreorder
          ? `Preorder ${order.id} saved — see Preorder List`
          : `Order ${order.id} saved as pending!`
      );
      setTimeout(
        () =>
          router.push(
            isPreorder
              ? "/dashboard/orders/approved/preorders"
              : APPROVED_LIST
          ),
        900
      );
    } catch (e) {
      setError(e instanceof Error ? e.message : "Could not save order");
    } finally {
      setSaving(false);
    }
  };

  const editOrder = isEdit ? getOrder(orderId!) : null;
  if (isEdit && !editOrder) {
    return (
      <p className="rounded-xl bg-rose-50 px-4 py-3 text-sm text-rose-700">
        Order not found.
      </p>
    );
  }

  return (
    <div className="space-y-5">
      {!isEdit ? (
        <div className="relative overflow-hidden rounded-2xl border border-violet-100/80 bg-gradient-to-br from-white via-violet-50/40 to-indigo-50/30 px-5 py-5 shadow-sm ring-1 ring-violet-100/60">
          <div className="pointer-events-none absolute -right-16 -top-16 h-40 w-40 rounded-full bg-violet-200/30 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-10 -left-10 h-32 w-32 rounded-full bg-indigo-200/25 blur-3xl" />
          <div className="relative flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-lg shadow-violet-200">
                <PlusCircle className="h-6 w-6" />
              </div>
              <div>
                <h1 className="text-xl font-extrabold tracking-tight text-slate-900">
                  New Order
                </h1>
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-full bg-white/90 px-3 py-1.5 text-xs font-bold text-slate-600 ring-1 ring-violet-100">
                <ShoppingCart className="h-3.5 w-3.5 text-violet-600" />
                {lines.length} in cart
              </span>
              <span className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-violet-600 to-indigo-600 px-3 py-1.5 text-xs font-bold text-white shadow-md shadow-violet-200">
                <Zap className="h-3.5 w-3.5" />
                ৳{grandTotal.toLocaleString("en-IN")}
              </span>
            </div>
          </div>
        </div>
      ) : null}
      {isEdit && editOrder && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-2xl border border-violet-100 bg-gradient-to-r from-violet-50/80 to-indigo-50/50 px-4 py-3 shadow-sm ring-1 ring-violet-100/60">
          <div>
            <p className="text-xs font-bold uppercase text-indigo-600">Edit order</p>
            <p className="text-lg font-extrabold text-slate-900">{editOrder.id}</p>
          </div>
          <span className="rounded-full bg-amber-100 px-3 py-1 text-xs font-bold text-amber-800">
            {ORDER_STATUS_LABELS[editOrder.status]}
          </span>
        </div>
      )}
      {/* Customer row */}
      <section className="yai-panel overflow-visible">
        <div className="border-b border-violet-100/80 bg-gradient-to-r from-violet-50/60 via-white to-indigo-50/40 px-4 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-indigo-600 text-white shadow-md shadow-violet-200">
              <User className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900">Customer & Delivery</h3>
              <p className="text-xs text-slate-500">Contact, address, and courier details</p>
            </div>
          </div>
        </div>
        <div className="p-4">
        {isValidPhone(phone) && (
          <CourierRatioPanel
            phone={phone}
            localOrders={localOrdersForPhone}
            onFillInfo={fillFromLastOrder}
          />
        )}
        <div className="grid gap-3 md:grid-cols-2 lg:grid-cols-3">
          <div>
            <label className={labelCls}>
              <Phone className="h-3.5 w-3.5 text-violet-500" />
              Mobile Number
              <span className="text-rose-500">*</span>
            </label>
            <input
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              onBlur={checkPhone}
              placeholder="01XXXXXXXXX"
              inputMode="numeric"
              maxLength={14}
              className={clsx(
                inputCls,
                phoneInvalid &&
                  "border-rose-400 bg-rose-50/50 ring-2 ring-rose-100 focus:border-rose-500 focus:ring-rose-200",
                isValidPhone(phone) &&
                  "border-emerald-400 bg-emerald-50/30 ring-2 ring-emerald-100 focus:border-emerald-500 focus:ring-emerald-100"
              )}
            />
            {phone.trim() ? (
              <p
                className={clsx(
                  "mt-1 text-[10px] font-semibold",
                  isValidPhone(phone)
                    ? "text-emerald-600"
                    : phoneInvalid
                      ? "text-rose-600"
                      : "text-slate-400"
                )}
              >
                {phoneDigitCount(phone)}/{REQUIRED_PHONE_DIGITS} digits
              </p>
            ) : null}
            {phoneInvalid && (
              <p className="mt-0.5 text-xs font-medium text-rose-600">
                Enter exactly {REQUIRED_PHONE_DIGITS} digits (e.g. 01XXXXXXXXX)
              </p>
            )}
          </div>
          <div>
            <label className={labelCls}>
              <User className="h-3.5 w-3.5 text-violet-500" />
              Customer Name
              <span className="text-rose-500">*</span>
            </label>
            <input
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className={inputCls}
            />
          </div>
          <div>
            <label className={labelCls}>
              <Truck className="h-3.5 w-3.5 text-violet-500" />
              Delivery Method
              {requiredFields.deliveryMethod && <span className="text-rose-500">*</span>}
            </label>
            <DeliveryMethodSelect
              value={deliveryMethodId}
              onChange={setDeliveryMethodId}
              className={inputCls}
            />
          </div>
        </div>
        <div className="mt-3 grid gap-3 lg:grid-cols-2">
          <div className="space-y-3">
            <div>
              <label className={labelCls}>
                <MapPin className="h-3.5 w-3.5 text-violet-500" />
                Address
                <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                value={address}
                onChange={(e) => setAddress(e.target.value)}
                placeholder="Full delivery address"
                className={clsx(
                  inputCls,
                  addressInvalid && "border-rose-300 ring-2 ring-rose-100"
                )}
              />
              <p className="mt-1 text-[10px] text-slate-400">
                Minimum {MIN_ADDRESS_CHARS} characters
                {address.trim()
                  ? ` · ${address.trim().length}/${MIN_ADDRESS_CHARS}`
                  : ""}
              </p>
              {addressInvalid && (
                <p className="mt-0.5 text-xs font-medium text-rose-600">
                  Address must be at least {MIN_ADDRESS_CHARS} characters
                </p>
              )}
            </div>
            <div>
              <label className={labelCls}>
                <Layers className="h-3.5 w-3.5 text-violet-500" />
                Shipping Note
                {requiredFields.shippingNote && <span className="text-rose-500">*</span>}
              </label>
              <ShippingNoteField
                value={shippingNote}
                onChange={setShippingNote}
                inputClassName={inputCls}
              />
            </div>
          </div>
          <div className="space-y-3">
            <OrderExtraOptions
              note={internalNote}
              onNoteChange={setInternalNote}
              link={referenceLink}
              onLinkChange={setReferenceLink}
              tags={orderTags}
              onTagsChange={setOrderTags}
              attachments={attachments}
              onAttachmentsChange={setAttachments}
            />
            <OrderSourceSelect
              value={orderSource}
              onChange={setOrderSource}
              customLabel={customOrderSource}
              onCustomLabelChange={setCustomOrderSource}
              inputClassName={inputCls}
              compact
              required={requiredFields.orderSource}
            />
            <label className="flex items-center gap-2 rounded-xl border border-amber-200/80 bg-gradient-to-r from-amber-50 to-orange-50/50 px-3 py-2.5 text-sm font-semibold text-amber-900 shadow-sm">
              <input
                type="checkbox"
                checked={isPreorder}
                onChange={(e) => setIsPreorder(e.target.checked)}
              />
              Preorder
            </label>
            {isPreorder && (
              <PreorderReasonFields
                reason={preorderReason}
                onReasonChange={setPreorderReason}
                deliveryAtLocal={preorderDeliveryLocal}
                onDeliveryAtChange={setPreorderDeliveryLocal}
                inputClassName={inputCls}
              />
            )}
          </div>
        </div>
        {duplicateWarn && (
          <p className="mt-3 flex items-center gap-1.5 rounded-xl bg-amber-50 px-3 py-2 text-xs font-medium text-amber-800 ring-1 ring-amber-100">
            <AlertTriangle className="h-3.5 w-3.5 shrink-0" /> {duplicateWarn}
          </p>
        )}
        </div>
      </section>

      {/* Products split */}
      <section className="grid min-h-[420px] gap-4 lg:grid-cols-2">
        <div className="yai-panel flex flex-col overflow-hidden ring-1 ring-violet-100/60">
          <div className="border-b border-violet-100/80 bg-gradient-to-r from-violet-50/70 via-white to-rose-50/30 px-4 py-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-600 text-white shadow-md shadow-violet-200">
                <ShoppingCart className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-slate-900">Ordered Products</h3>
                <p className="text-xs text-slate-500">{lines.length} item(s) in cart</p>
              </div>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto bg-gradient-to-b from-white to-violet-50/20 p-3">
            {lines.length === 0 ? (
              <div className="flex h-full min-h-[280px] flex-col items-center justify-center rounded-2xl border border-dashed border-violet-200/80 bg-violet-50/30 p-6 text-center">
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-white shadow-sm ring-1 ring-violet-100">
                  <Package className="h-8 w-8 text-violet-300" />
                </div>
                <p className="mt-4 font-bold text-violet-600">No products added yet</p>
              </div>
            ) : (
              <ul className="space-y-2">
                {lines.map((l) => (
                  <li
                    key={l.productId}
                    className="flex gap-3 rounded-2xl border border-violet-100/80 bg-white p-3 shadow-sm ring-1 ring-violet-50 transition hover:shadow-md"
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
                      <p className="truncate font-bold text-slate-800">{l.productName}</p>
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

        <div className="yai-panel flex flex-col overflow-hidden ring-1 ring-indigo-100/60">
          <div className="border-b border-indigo-100/80 bg-gradient-to-r from-indigo-50/80 via-white to-cyan-50/40 px-4 py-3.5">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-indigo-500 to-cyan-600 text-white shadow-md shadow-indigo-200">
                <Package className="h-4 w-4" />
              </div>
              <div>
                <h3 className="font-extrabold text-indigo-950">Add Products</h3>
              </div>
            </div>
          </div>
          <div className="border-b border-slate-100 bg-white/80 p-3">
            <div className="flex gap-2">
              <div className="relative flex-1">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-slate-400" />
                <input
                  placeholder="Code / SKU"
                  value={searchCode}
                  onChange={(e) => setSearchCode(e.target.value)}
                  className={`${inputCls} pl-8`}
                />
              </div>
              <input
                placeholder="Name"
                value={searchName}
                onChange={(e) => setSearchName(e.target.value)}
                className={`${inputCls} flex-1`}
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
                title="Featured only"
              >
                <Star
                  className={clsx("h-5 w-5", featuredOnly && "fill-amber-400")}
                />
              </button>
            </div>
          </div>
          <div className="max-h-[360px] flex-1 overflow-y-auto bg-gradient-to-b from-white to-indigo-50/20 p-2">
            {filteredProducts.length === 0 ? (
              <p className="p-6 text-center text-sm text-slate-500">No products found</p>
            ) : (
              <div className="space-y-2">
                {filteredProducts.map((p) => (
                  <button
                    key={p.id}
                    type="button"
                    onClick={() => tapAddProduct(p)}
                    className={clsx(
                      "flex w-full gap-3 rounded-2xl border p-3 text-left transition",
                      addedFlash === p.id
                        ? "border-violet-400 bg-violet-50 ring-2 ring-violet-200 shadow-md"
                        : "border-slate-100/90 bg-white hover:-translate-y-0.5 hover:border-violet-300 hover:bg-violet-50/40 hover:shadow-lg",
                      p.stockQty === 0 && "opacity-50"
                    )}
                  >
                    {p.imageDataUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        src={p.imageDataUrl}
                        alt=""
                        className="h-16 w-16 shrink-0 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-lg bg-gradient-to-br from-indigo-100 to-rose-50 text-[10px] font-bold text-indigo-400">
                        {p.code.slice(0, 4)}
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <div className="flex items-start justify-between gap-1">
                        <p className="line-clamp-2 text-sm font-bold uppercase text-slate-800">
                          {p.name}
                        </p>
                        {p.featured && (
                          <Star className="h-4 w-4 shrink-0 fill-amber-400 text-amber-400" />
                        )}
                      </div>
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
                        <span
                          className={clsx(
                            "font-bold",
                            p.stockQty <= p.alertQty ? "text-rose-600" : "text-slate-700"
                          )}
                        >
                          {p.stockQty}
                        </span>
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </section>

      {/* Totals + actions */}
      <section className="yai-panel overflow-hidden ring-1 ring-emerald-100/50">
        <div className="border-b border-emerald-100/80 bg-gradient-to-r from-emerald-50/50 via-white to-teal-50/30 px-4 py-3.5">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 text-white shadow-md shadow-emerald-200">
              <Sparkles className="h-4 w-4" />
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900">Order Totals</h3>
              <p className="text-xs text-slate-500">Discount, advance, delivery & grand total</p>
            </div>
          </div>
        </div>
        <div className="p-4">
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
          <TotalField label="Discount" value={discount} onChange={setDiscount} />
          <TotalField
            label="Advance"
            value={advance}
            onChange={setAdvance}
            highlight={showAdvancePayment}
          />
          <div className="rounded-xl bg-gradient-to-br from-slate-50 to-slate-100/80 px-4 py-3 ring-1 ring-slate-100">
            <p className="text-xs font-bold uppercase text-slate-500">Sub Total</p>
            <p className="text-xl font-extrabold text-slate-900">
              ৳{subtotal.toLocaleString()}
            </p>
          </div>
          <TotalField
            label="Delivery Charge"
            value={shippingCharge}
            onChange={setShippingCharge}
            placeholder="Any amount"
          />
          <div className="rounded-xl bg-gradient-to-br from-violet-600 via-indigo-600 to-violet-700 px-4 py-3 text-white shadow-lg shadow-violet-200">
            <p className="text-xs font-bold uppercase text-violet-200">Grand Total</p>
            <p className="text-2xl font-extrabold tracking-tight">৳{grandTotal.toLocaleString("en-IN")}</p>
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
            proofRequired={requiredFields.transactionId}
          />
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

        <div className="mt-6 space-y-2">
          <button
            type="button"
            onClick={submit}
            disabled={lines.length === 0 || saving}
            className={clsx(
              "flex w-full items-center justify-center gap-3 rounded-xl border-2 border-emerald-600/80 px-6 py-5 text-xl font-extrabold tracking-tight shadow-lg transition",
              "bg-gradient-to-b from-emerald-400 to-emerald-500 text-slate-900",
              "hover:from-emerald-300 hover:to-emerald-400 hover:shadow-xl active:scale-[0.99]",
              "disabled:cursor-not-allowed disabled:border-slate-300 disabled:from-slate-200 disabled:to-slate-300 disabled:text-slate-500 disabled:shadow-none"
            )}
          >
            <Sparkles className="h-6 w-6 shrink-0" />
            <span>
              {saving
                ? "Saving…"
                : isEdit
                  ? `Save changes (৳${grandTotal.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`
                  : `Create Order (৳${grandTotal.toLocaleString("en-BD", { minimumFractionDigits: 2, maximumFractionDigits: 2 })})`}
            </span>
          </button>
          {!isEdit && (
            <p className="text-center text-xs text-slate-500">
              Order saves as <strong className="text-slate-700">Pending</strong> — approve later from Order List
            </p>
          )}
        </div>
        </div>
      </section>
    </div>
  );
}

function TotalField({
  label,
  value,
  onChange,
  placeholder,
  highlight,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={clsx(
        "rounded-xl border px-3 py-2.5 shadow-sm transition",
        highlight
          ? "border-amber-300 bg-gradient-to-br from-amber-50 to-orange-50/50 ring-2 ring-amber-200/60"
          : "border-slate-100/90 bg-white ring-1 ring-slate-50"
      )}
    >
      <label
        className={clsx(
          "text-xs font-bold uppercase",
          highlight ? "text-amber-800" : "text-slate-500"
        )}
      >
        {label}
      </label>
      <input
        type="number"
        min={0}
        step="any"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full border-0 bg-transparent p-0 text-lg font-bold text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400"
      />
    </div>
  );
}
