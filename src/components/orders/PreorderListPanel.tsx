"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useState } from "react";
import {
  loadPreorderOrders,
  markPreorderNotified,
  type Order,
} from "@/lib/orders-store";
import {
  PREORDER_REASONS,
  PREORDER_BUSINESS_FILTERS,
  getPreorderReason,
  getPreorderReasonLabel,
  formatPreorderDeliveryAt,
  isPreorderNotified,
  preorderProductsSummary,
  type PreorderNotifyTab,
  type PreorderReason,
  type PreorderBusinessFilter,
} from "@/lib/preorder-meta";
import { loadProducts, getProductImageForLine } from "@/lib/inventory-store";
import { formatAdvancePaymentSummary } from "@/lib/orders-store";
import { OrderEditModal } from "@/components/orders/OrderEditModal";
import {
  RefreshCw,
  Bell,
  Package,
  Phone,
  MessageCircle,
  ExternalLink,
  ChevronDown,
  PlusCircle,
  AlertTriangle,
  Clock3,
  X,
} from "lucide-react";
import clsx from "clsx";

function whatsAppHref(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (!digits) return "#";
  const wa = digits.startsWith("880") ? digits : digits.startsWith("0") ? `88${digits}` : `88${digits}`;
  return `https://wa.me/${wa}`;
}

function parseDeliveryTs(order: Order): number | null {
  const ts = Date.parse(order.preorderDeliveryAt ?? "");
  return Number.isFinite(ts) && ts > 0 ? ts : null;
}

export function PreorderListPanel() {
  const [tick, setTick] = useState(0);
  const [notifyTab, setNotifyTab] = useState<PreorderNotifyTab>("all");
  const [reasonFilter, setReasonFilter] = useState<PreorderReason | "all">("all");
  const [productCode, setProductCode] = useState("");
  const [business, setBusiness] = useState<PreorderBusinessFilter>("all");
  const [editOrderId, setEditOrderId] = useState<string | null>(null);
  const [summaryOpen, setSummaryOpen] = useState(false);
  const [notifyPreviewOpen, setNotifyPreviewOpen] = useState(false);
  const [toast, setToast] = useState("");

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const onData = () => refresh();
    window.addEventListener("youraiseller-data-updated", onData);
    return () => window.removeEventListener("youraiseller-data-updated", onData);
  }, [refresh]);

  const allPreorders = useMemo(() => {
    void tick;
    return loadPreorderOrders();
  }, [tick]);

  const filtered = useMemo(() => {
    let list = [...allPreorders];
    if (reasonFilter !== "all") {
      list = list.filter((o) => getPreorderReason(o) === reasonFilter);
    }
    if (business !== "all") {
      list = list.filter((o) => o.source === business);
    }
    const code = productCode.trim().toLowerCase();
    if (code) {
      list = list.filter((o) =>
        o.items.some(
          (i) =>
            i.productCode.toLowerCase().includes(code) ||
            i.productName.toLowerCase().includes(code)
        )
      );
    }
    if (notifyTab === "notified") {
      list = list.filter((o) => isPreorderNotified(o));
    } else if (notifyTab === "pending_notification") {
      list = list.filter((o) => !isPreorderNotified(o));
    }
    return list.sort((a, b) => {
      const ta = Date.parse(a.preorderDeliveryAt ?? "") || 0;
      const tb = Date.parse(b.preorderDeliveryAt ?? "") || 0;
      if (ta && tb && ta !== tb) return ta - tb;
      return b.createdAt.localeCompare(a.createdAt);
    });
  }, [allPreorders, reasonFilter, business, productCode, notifyTab]);

  const tabCounts = useMemo(() => {
    const base = allPreorders.filter((o) => {
      if (reasonFilter !== "all" && getPreorderReason(o) !== reasonFilter) return false;
      if (business !== "all" && o.source !== business) return false;
      const code = productCode.trim().toLowerCase();
      if (
        code &&
        !o.items.some(
          (i) =>
            i.productCode.toLowerCase().includes(code) ||
            i.productName.toLowerCase().includes(code)
        )
      ) {
        return false;
      }
      return true;
    });
    return {
      all: base.length,
      notified: base.filter((o) => isPreorderNotified(o)).length,
      pending_notification: base.filter((o) => !isPreorderNotified(o)).length,
    };
  }, [allPreorders, reasonFilter, business, productCode]);

  const productSummary = useMemo(() => {
    const map = new Map<string, { name: string; code: string; qty: number }>();
    for (const o of allPreorders) {
      for (const line of o.items) {
        const key = line.productCode || line.productId;
        const cur = map.get(key);
        if (cur) cur.qty += line.qty;
        else
          map.set(key, {
            name: line.productName,
            code: line.productCode,
            qty: line.qty,
          });
      }
    }
    return Array.from(map.values()).sort((a, b) => b.qty - a.qty);
  }, [allPreorders]);

  const pendingNotifications = useMemo(
    () => filtered.filter((o) => !isPreorderNotified(o)),
    [filtered]
  );

  const notificationSummary = useMemo(() => {
    const now = Date.now();
    const next24 = now + 24 * 60 * 60 * 1000;
    let overdue = 0;
    let dueSoon = 0;
    let noDate = 0;

    for (const order of pendingNotifications) {
      const ts = parseDeliveryTs(order);
      if (!ts) {
        noDate += 1;
        continue;
      }
      if (ts < now) overdue += 1;
      else if (ts <= next24) dueSoon += 1;
    }

    return { total: pendingNotifications.length, overdue, dueSoon, noDate };
  }, [pendingNotifications]);

  const showToast = (msg: string) => {
    setToast(msg);
    setTimeout(() => setToast(""), 3200);
  };

  const handleCheckNotifications = () => {
    if (notificationSummary.total === 0) {
      showToast("No pending notifications in this view.");
      return;
    }
    setNotifyPreviewOpen(true);
  };

  const handleMarkShownAsNotified = () => {
    for (const o of pendingNotifications) markPreorderNotified(o.id);
    setNotifyPreviewOpen(false);
    refresh();
    showToast(`Marked ${pendingNotifications.length} order(s) as notified.`);
  };

  const handleRefreshStock = () => {
    void loadProducts();
    refresh();
    showToast("Stock data refreshed.");
  };

  const openPreorder = (orderId: string) => setEditOrderId(orderId);

  return (
    <div className="space-y-0">
      {toast && (
        <div className="mb-4 rounded-xl border border-teal-200 bg-teal-50 px-4 py-3 text-sm font-medium text-teal-800">
          {toast}
        </div>
      )}

      <div className="overflow-hidden rounded-2xl border border-slate-200/90 bg-white shadow-sm">
        {/* Header */}
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 px-5 py-4">
          <h1 className="text-xl font-bold text-slate-900">Preorders</h1>
          <div className="flex flex-wrap items-center gap-2">
            <Link
              href="/dashboard/orders/approved/new?preorder=1"
              className="rounded-lg bg-violet-600 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:bg-violet-700"
            >
              <span className="flex items-center gap-2">
                <PlusCircle className="h-4 w-4" />
                Create Pre Order
              </span>
            </Link>
            <button
              type="button"
              onClick={() => setSummaryOpen((s) => !s)}
              className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-800 shadow-sm hover:bg-slate-50"
            >
              Product Summary
            </button>
            <button
              type="button"
              onClick={handleCheckNotifications}
              className={clsx(
                "rounded-lg px-4 py-2 text-sm font-semibold text-white shadow-sm",
                notificationSummary.total > 0
                  ? "bg-teal-600 hover:bg-teal-700"
                  : "cursor-not-allowed bg-slate-400"
              )}
            >
              <span className="flex items-center gap-2">
                <Bell className="h-4 w-4" />
                Check Notifications
                <span
                  className={clsx(
                    "rounded-full px-2 py-0.5 text-xs font-bold",
                    notificationSummary.total > 0
                      ? "bg-rose-600 text-white"
                      : "bg-white/20 text-white"
                  )}
                >
                  {notificationSummary.total}
                </span>
              </span>
            </button>
          </div>
        </div>

        {summaryOpen && productSummary.length > 0 && (
          <div className="border-b border-slate-100 bg-slate-50/80 px-5 py-3">
            <p className="mb-2 text-xs font-bold uppercase text-slate-500">
              Products on preorder
            </p>
            <div className="flex flex-wrap gap-2">
              {productSummary.map((p) => (
                <span
                  key={p.code}
                  className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-700 ring-1 ring-slate-200"
                >
                  <Package className="h-3.5 w-3.5 text-violet-500" />
                  {p.name} · {p.code} · Qty {p.qty}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Filters */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-5 py-3">
          <div className="relative">
            <select
              value={reasonFilter}
              onChange={(e) =>
                setReasonFilter(e.target.value as PreorderReason | "all")
              }
              className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm font-medium text-slate-700 outline-none focus:border-teal-400"
            >
              {PREORDER_REASONS.map((r) => (
                <option key={r.value} value={r.value}>
                  {r.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
          <input
            type="search"
            value={productCode}
            onChange={(e) => setProductCode(e.target.value)}
            placeholder="Filter by product code"
            className="min-w-[180px] flex-1 rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-teal-400 sm:max-w-xs"
          />
          <div className="relative">
            <select
              value={business}
              onChange={(e) =>
                setBusiness(e.target.value as PreorderBusinessFilter)
              }
              className="appearance-none rounded-lg border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm font-medium text-slate-700 outline-none focus:border-teal-400"
            >
              {PREORDER_BUSINESS_FILTERS.map((b) => (
                <option key={b.value} value={b.value}>
                  {b.label}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute right-2 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
          </div>
          <button
            type="button"
            onClick={handleRefreshStock}
            className="ml-auto flex items-center gap-1.5 rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <RefreshCw className="h-4 w-4 text-slate-500" />
            Refresh Stock
          </button>
        </div>

        {/* Tabs */}
        <div className="flex gap-0 border-b border-slate-100 px-5">
          {(
            [
              { key: "all" as const, label: "All" },
              { key: "notified" as const, label: "Notified" },
              { key: "pending_notification" as const, label: "Pending Notification" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => setNotifyTab(tab.key)}
              className={clsx(
                "border-b-2 px-4 py-3 text-sm font-semibold transition",
                notifyTab === tab.key
                  ? "border-slate-900 text-slate-900"
                  : "border-transparent text-slate-500 hover:text-slate-700"
              )}
            >
              {tab.label}
              <span className="ml-1.5 text-xs font-medium text-slate-400">
                ({tabCounts[tab.key]})
              </span>
            </button>
          ))}
        </div>

        {/* Table */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[1000px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/60 text-left text-xs font-bold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Invoice</th>
                <th className="px-4 py-3">Customer</th>
                <th className="px-4 py-3">Mobile</th>
                <th className="px-4 py-3">Reason</th>
                <th className="px-4 py-3">Note</th>
                <th className="px-4 py-3">Tentative delivery</th>
                <th className="px-4 py-3">Notification Date</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Products</th>
                <th className="px-4 py-3">Created At</th>
                <th className="px-4 py-3 text-right">Actions</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td
                    colSpan={11}
                    className="px-4 py-16 text-center text-slate-500"
                  >
                    No results.
                    <p className="mt-1 text-xs text-slate-400">
                      Mark an order as preorder from Web Order List or Approved
                      Orders.
                    </p>
                  </td>
                </tr>
              ) : (
                filtered.map((order) => {
                  const reason = getPreorderReason(order);
                  const notified = isPreorderNotified(order);
                  return (
                    <tr
                      key={order.id}
                      className="border-b border-slate-50 align-top transition hover:bg-violet-50/30"
                    >
                      <td className="px-4 py-3">
                        <button
                          type="button"
                          onClick={() => openPreorder(order.id)}
                          className="font-bold text-violet-700 hover:underline"
                        >
                          {order.id}
                        </button>
                        <p className="mt-0.5 text-[10px] capitalize text-slate-400">
                          {order.source}
                        </p>
                      </td>
                      <td className="px-4 py-3 font-semibold text-slate-800">
                        {order.customerName}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap items-center gap-1.5">
                          <a
                            href={`tel:${order.phone}`}
                            className="inline-flex items-center gap-1 font-bold text-teal-700 hover:underline"
                          >
                            <Phone className="h-3.5 w-3.5" />
                            {order.phone}
                          </a>
                          <a
                            href={whatsAppHref(order.phone)}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-lg p-1 text-emerald-600 hover:bg-emerald-50"
                            aria-label="WhatsApp"
                          >
                            <MessageCircle className="h-3.5 w-3.5" />
                          </a>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs font-medium text-slate-700">
                        {getPreorderReasonLabel(reason)}
                      </td>
                      <td className="max-w-[140px] px-4 py-3">
                        <p className="line-clamp-2 text-xs text-slate-600">
                          {order.note || "—"}
                        </p>
                      </td>
                      <td className="min-w-[140px] px-4 py-3 text-xs font-medium text-violet-800">
                        {formatPreorderDeliveryAt(order.preorderDeliveryAt)}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {order.preorderNotifiedAt ?? "—"}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={clsx(
                            "inline-flex rounded-full px-2.5 py-0.5 text-[10px] font-bold",
                            notified
                              ? "bg-teal-100 text-teal-800"
                              : "bg-amber-100 text-amber-800"
                          )}
                        >
                          {notified ? "Notified" : "Pending"}
                        </span>
                      </td>
                      <td className="max-w-[200px] px-4 py-3">
                        <div className="flex gap-2">
                          {order.items[0] ? (
                            getProductImageForLine(order.items[0]) ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img
                                src={getProductImageForLine(order.items[0])}
                                alt=""
                                className="h-11 w-11 shrink-0 rounded-lg border border-slate-200 object-cover"
                              />
                            ) : (
                              <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg border border-slate-200 bg-slate-100 text-slate-400">
                                <Package className="h-5 w-5" />
                              </div>
                            )
                          ) : null}
                          <div className="min-w-0">
                            <p className="line-clamp-2 text-xs font-medium text-slate-800">
                              {preorderProductsSummary(order)}
                            </p>
                            {order.items.length > 1 && (
                              <p className="mt-0.5 text-[10px] text-slate-400">
                                +{order.items.length - 1} more item
                                {order.items.length > 2 ? "s" : ""}
                              </p>
                            )}
                            {order.advance > 0 && (
                              <p className="mt-1 text-[10px] font-semibold text-indigo-700">
                                Advance ৳
                                {order.advance.toLocaleString("en-BD")}
                                {formatAdvancePaymentSummary(
                                  order.advancePayment
                                )
                                  ? ` · ${formatAdvancePaymentSummary(order.advancePayment)}`
                                  : " · payment method not set"}
                              </p>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-600">
                        {order.createdAt}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex flex-col items-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => openPreorder(order.id)}
                            className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-xs font-bold text-slate-700 hover:bg-slate-50"
                          >
                            Open
                            <ExternalLink className="h-3 w-3" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editOrderId && (
        <OrderEditModal
          orderId={editOrderId}
          variant="approved"
          preorderMode
          entryPoint="Preorder List · Open"
          logOnOpen
          showActivityLog
          onClose={() => setEditOrderId(null)}
          onSaved={() => {
            setEditOrderId(null);
            refresh();
          }}
          onReadyForDelivery={() => {
            refresh();
            showToast("Order moved to Approved Orders → Pending list.");
          }}
        />
      )}

      {notifyPreviewOpen && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center p-4" role="dialog" aria-modal="true">
          <button
            type="button"
            aria-label="Close notification preview"
            className="absolute inset-0 bg-slate-900/45 backdrop-blur-sm"
            onClick={() => setNotifyPreviewOpen(false)}
          />
          <div className="relative w-full max-w-3xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-100 bg-slate-50 px-5 py-4">
              <div>
                <h2 className="text-lg font-bold text-slate-900">Pending Notifications</h2>
                <p className="text-xs text-slate-500">
                  Review preorders before marking them as notified
                </p>
              </div>
              <button
                type="button"
                onClick={() => setNotifyPreviewOpen(false)}
                className="rounded-lg p-2 text-slate-400 hover:bg-slate-200/60"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div className="grid gap-2 border-b border-slate-100 bg-white px-5 py-3 text-xs sm:grid-cols-3">
              <p className="rounded-lg bg-rose-50 px-3 py-2 font-semibold text-rose-700">
                <AlertTriangle className="mr-1 inline h-3.5 w-3.5" />
                Overdue: {notificationSummary.overdue}
              </p>
              <p className="rounded-lg bg-amber-50 px-3 py-2 font-semibold text-amber-700">
                <Clock3 className="mr-1 inline h-3.5 w-3.5" />
                Due in 24h: {notificationSummary.dueSoon}
              </p>
              <p className="rounded-lg bg-slate-100 px-3 py-2 font-semibold text-slate-700">
                No tentative date: {notificationSummary.noDate}
              </p>
            </div>

            <div className="max-h-[48vh] overflow-y-auto px-5 py-3">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-left text-xs font-bold uppercase text-slate-500">
                    <th className="py-2">Invoice</th>
                    <th className="py-2">Customer</th>
                    <th className="py-2">Tentative Delivery</th>
                    <th className="py-2">Products</th>
                  </tr>
                </thead>
                <tbody>
                  {pendingNotifications.map((order) => (
                    <tr key={order.id} className="border-b border-slate-50 align-top">
                      <td className="py-2 pr-3 font-semibold text-violet-700">{order.id}</td>
                      <td className="py-2 pr-3 text-slate-700">{order.customerName}</td>
                      <td className="py-2 pr-3 text-xs text-slate-600">
                        {formatPreorderDeliveryAt(order.preorderDeliveryAt)}
                      </td>
                      <td className="py-2 text-xs text-slate-600">{preorderProductsSummary(order)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="flex items-center justify-end gap-2 border-t border-slate-100 bg-slate-50 px-5 py-4">
              <button
                type="button"
                onClick={() => setNotifyPreviewOpen(false)}
                className="rounded-lg border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleMarkShownAsNotified}
                className="rounded-lg bg-teal-600 px-4 py-2 text-sm font-semibold text-white hover:bg-teal-700"
              >
                Mark shown as notified ({notificationSummary.total})
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
