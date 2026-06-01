"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import clsx from "clsx";
import {
  ArrowLeft,
  CheckCircle2,
  ExternalLink,
  Lock,
  Package,
  Search,
  Shield,
  Sparkles,
  Truck,
} from "lucide-react";
import {
  appendOrderActivity,
  getOrder,
  loadOrders,
  updateOrder,
  type Order,
  type OrderStatus,
} from "@/lib/orders-store";
import { ORDER_LIST_TABS, ORDER_STATUS_LABELS } from "@/lib/order-status-tabs";
import {
  getCourierBrandName,
  getCourierPanelTrackingUrl,
  getSteadfastConsignmentId,
  getSteadfastTrackingCode,
  orderHasCourierTracking,
} from "@/lib/courier-tracking-url";

type UploadState = "uploaded" | "not_uploaded";

type FormState = {
  status: OrderStatus;
  uploadState: UploadState;
  trackingId: string;
  consignmentId: string;
};

function orderToForm(order: Order): FormState {
  const hasUpload = orderHasCourierTracking(order);
  return {
    status: order.status,
    uploadState: hasUpload ? "uploaded" : "not_uploaded",
    trackingId: order.trackingId?.trim() ?? "",
    consignmentId: order.courierConsignmentId?.trim() ?? "",
  };
}

function findOrderByQuery(query: string): Order | undefined {
  const q = query.trim();
  if (!q) return undefined;
  const orders = loadOrders();
  const lower = q.toLowerCase();
  return (
    orders.find((o) => o.id === q) ??
    orders.find((o) => o.id.toLowerCase() === lower) ??
    orders.find((o) => o.trackingId?.toLowerCase() === lower) ??
    orders.find((o) => o.courierConsignmentId === q) ??
    orders.find((o) => o.wooNumber?.toLowerCase() === lower)
  );
}

const statusColors: Partial<Record<OrderStatus, string>> = {
  pending: "bg-amber-100 text-amber-800 ring-amber-200",
  rts: "bg-sky-100 text-sky-800 ring-sky-200",
  shipped: "bg-indigo-100 text-indigo-800 ring-indigo-200",
  delivered: "bg-emerald-100 text-emerald-800 ring-emerald-200",
  cancelled: "bg-rose-100 text-rose-800 ring-rose-200",
  returned: "bg-orange-100 text-orange-800 ring-orange-200",
};

export function SuperEditPanel() {
  const searchParams = useSearchParams();
  const initialId = searchParams.get("id")?.trim() ?? "";

  const [query, setQuery] = useState(initialId);
  const [orderId, setOrderId] = useState<string | null>(null);
  const [form, setForm] = useState<FormState | null>(null);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [tick, setTick] = useState(0);

  const order = orderId ? getOrder(orderId) : undefined;

  const recentOrders = useMemo(() => {
    void tick;
    return loadOrders()
      .filter((o) => !o.inWebQueue)
      .slice(0, 8);
  }, [tick]);

  useEffect(() => {
    if (!initialId) return;
    const found = findOrderByQuery(initialId);
    if (found) {
      setOrderId(found.id);
      setForm(orderToForm(found));
      setQuery(found.id);
    }
  }, [initialId]);

  useEffect(() => {
    const onData = () => setTick((t) => t + 1);
    window.addEventListener("youraiseller-data-updated", onData);
    return () => window.removeEventListener("youraiseller-data-updated", onData);
  }, []);

  const courierBrand = order ? getCourierBrandName(order) : "Courier";

  const previewUrl = useMemo(() => {
    if (!order || !form || form.uploadState !== "uploaded") return null;
    return getCourierPanelTrackingUrl({
      ...order,
      trackingId: form.trackingId.trim() || undefined,
      courierConsignmentId: form.consignmentId.trim() || undefined,
    });
  }, [order, form]);

  const lookup = useCallback(() => {
    setError("");
    setSaved(false);
    const found = findOrderByQuery(query);
    if (!found) {
      setOrderId(null);
      setForm(null);
      setError("Order not found — check ID, tracking, or consignment number.");
      return;
    }
    setOrderId(found.id);
    setForm(orderToForm(found));
    setQuery(found.id);
  }, [query]);

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    if (!orderId || !form || !order) return;
    setError("");
    setSaved(false);

    const patch: Partial<Order> = {
      status: form.status,
      isPreorder: form.status === "preorder",
    };

    if (form.uploadState === "not_uploaded") {
      patch.trackingId = undefined;
      patch.courierConsignmentId = undefined;
      patch.courierStatus = undefined;
      patch.courierRiderAssigned = false;
      patch.courierSyncedAt = undefined;
    } else {
      const tracking = form.trackingId.trim();
      const consignment = form.consignmentId.trim();
      if (!tracking && !consignment) {
        setError("Add tracking ID or consignment ID when marked as uploaded.");
        return;
      }
      patch.trackingId = tracking || undefined;
      patch.courierConsignmentId = consignment || undefined;
    }

    const updated = updateOrder(orderId, patch);
    if (!updated) {
      setError("Could not save — try again.");
      return;
    }

    const changes: string[] = [];
    if (order.status !== form.status) {
      changes.push(
        `Status: ${ORDER_STATUS_LABELS[order.status]} → ${ORDER_STATUS_LABELS[form.status]}`
      );
    }
    const wasUploaded = orderHasCourierTracking(order);
    const nowUploaded = form.uploadState === "uploaded";
    if (wasUploaded !== nowUploaded) {
      changes.push(nowUploaded ? "Courier: marked uploaded" : "Courier: cleared upload");
    } else if (nowUploaded) {
      if ((order.trackingId ?? "") !== form.trackingId.trim()) {
        changes.push(`Tracking: ${form.trackingId.trim() || "(cleared)"}`);
      }
      if ((order.courierConsignmentId ?? "") !== form.consignmentId.trim()) {
        changes.push(`Consignment: ${form.consignmentId.trim() || "(cleared)"}`);
      }
    }

    appendOrderActivity(orderId, {
      type: "status",
      title: "Super Edit",
      detail: changes.length ? changes.join(" · ") : "Super edit saved (no field changes)",
    });

    setSaved(true);
    setForm(orderToForm(updated));
    window.dispatchEvent(new Event("youraiseller-data-updated"));
    setTimeout(() => setSaved(false), 3200);
  };

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-2xl bg-gradient-to-br from-violet-600 via-indigo-600 to-teal-600 p-6 text-white shadow-lg shadow-indigo-500/20 sm:p-8">
        <div className="pointer-events-none absolute -right-8 -top-8 h-40 w-40 rounded-full bg-white/10 blur-2xl" />
        <div className="pointer-events-none absolute -bottom-12 left-1/3 h-32 w-32 rounded-full bg-teal-300/20 blur-2xl" />
        <div className="relative flex flex-wrap items-start justify-between gap-4">
          <div>
            <div className="mb-2 inline-flex items-center gap-1.5 rounded-full bg-white/15 px-3 py-1 text-[11px] font-bold uppercase tracking-wider backdrop-blur-sm">
              <Shield className="h-3.5 w-3.5" />
              Admin only
            </div>
            <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
              Super Edit
            </h1>
            <p className="mt-1 max-w-md text-sm text-white/85">
              Status & courier tracking only — customer, items, and payment stay
              locked.
            </p>
          </div>
          <Link
            href="/dashboard/orders/approved/list"
            className="inline-flex items-center gap-2 rounded-xl bg-white/15 px-4 py-2 text-sm font-semibold backdrop-blur-sm transition hover:bg-white/25"
          >
            <ArrowLeft className="h-4 w-4" />
            Order List
          </Link>
        </div>
      </div>

      {/* Lookup */}
      <div className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
        <label className="mb-2 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-500">
          <Search className="h-3.5 w-3.5" />
          Find order
        </label>
        <div className="flex flex-col gap-2 sm:flex-row">
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), lookup())}
            placeholder="Order ID · e.g. WO-4374 or TURU4834"
            className="flex-1 rounded-xl border border-slate-200 bg-slate-50/80 px-4 py-3 font-mono text-sm font-semibold text-slate-900 outline-none ring-indigo-500/0 transition focus:border-indigo-400 focus:bg-white focus:ring-4 focus:ring-indigo-500/15"
          />
          <button
            type="button"
            onClick={lookup}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-indigo-600 px-6 py-3 text-sm font-bold text-white shadow-md shadow-indigo-500/25 transition hover:bg-indigo-700"
          >
            <Search className="h-4 w-4" />
            Load order
          </button>
        </div>
        {recentOrders.length > 0 && (
          <div className="mt-3 flex flex-wrap gap-1.5">
            <span className="text-[10px] font-semibold text-slate-400">Recent:</span>
            {recentOrders.map((o) => (
              <button
                key={o.id}
                type="button"
                onClick={() => {
                  setQuery(o.id);
                  setOrderId(o.id);
                  setForm(orderToForm(o));
                  setError("");
                }}
                className="rounded-lg bg-slate-100 px-2 py-0.5 font-mono text-[10px] font-bold text-slate-600 hover:bg-indigo-100 hover:text-indigo-700"
              >
                {o.id}
              </button>
            ))}
          </div>
        )}
        {error && (
          <p className="mt-3 text-sm font-medium text-rose-600">{error}</p>
        )}
      </div>

      {order && form && (
        <div className="grid gap-5 lg:grid-cols-5">
          {/* Locked summary */}
          <div className="space-y-4 lg:col-span-2">
            <div className="rounded-2xl border border-slate-200 bg-slate-50/60 p-5">
              <div className="mb-3 flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-slate-400">
                <Lock className="h-3.5 w-3.5" />
                Read only
              </div>
              <p className="font-mono text-lg font-bold text-slate-900">{order.id}</p>
              <p className="mt-1 text-sm font-semibold text-slate-700">
                {order.customerName}
              </p>
              <p className="text-sm text-slate-500">{order.phone}</p>
              <p className="mt-2 line-clamp-2 text-xs text-slate-500">{order.address}</p>
              <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
                <div className="rounded-lg bg-white px-2.5 py-2 shadow-sm">
                  <dt className="text-slate-400">Courier</dt>
                  <dd className="font-bold text-slate-800">{order.courier || "—"}</dd>
                </div>
                <div className="rounded-lg bg-white px-2.5 py-2 shadow-sm">
                  <dt className="text-slate-400">Total</dt>
                  <dd className="font-bold text-slate-800">৳{order.total}</dd>
                </div>
              </dl>
              <p className="mt-3 text-[10px] leading-relaxed text-slate-400">
                Name, address, items & payment — edit from{" "}
                <Link
                  href={`/dashboard/orders/approved/edit/${order.id}`}
                  className="font-semibold text-indigo-600 underline"
                >
                  normal edit
                </Link>
                .
              </p>
            </div>
          </div>

          {/* Editable */}
          <form
            onSubmit={handleSave}
            className="space-y-4 lg:col-span-3"
          >
            <div className="rounded-2xl border-2 border-indigo-200/80 bg-white p-5 shadow-sm ring-4 ring-indigo-500/5">
              <div className="mb-4 flex items-center gap-2">
                <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
                  <Sparkles className="h-4 w-4" />
                </span>
                <div>
                  <h2 className="text-sm font-bold text-slate-900">
                    Editable fields
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Turume-style super edit — limited scope
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <Field label="Current status">
                  <select
                    value={form.status}
                    onChange={(e) =>
                      setForm((f) =>
                        f ? { ...f, status: e.target.value as OrderStatus } : f
                      )
                    }
                    className={selectCls}
                  >
                    {ORDER_LIST_TABS.map((t) => (
                      <option key={t.key} value={t.key}>
                        {t.label}
                      </option>
                    ))}
                    <option value="lost">Lost</option>
                  </select>
                  <span
                    className={clsx(
                      "mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[10px] font-bold ring-1",
                      statusColors[form.status] ?? "bg-slate-100 text-slate-600 ring-slate-200"
                    )}
                  >
                    → {ORDER_STATUS_LABELS[form.status]} tab
                  </span>
                </Field>

                <Field label={`Uploaded to ${courierBrand}`}>
                  <select
                    value={form.uploadState}
                    onChange={(e) =>
                      setForm((f) =>
                        f
                          ? {
                              ...f,
                              uploadState: e.target.value as UploadState,
                            }
                          : f
                      )
                    }
                    className={selectCls}
                  >
                    <option value="uploaded">Uploaded</option>
                    <option value="not_uploaded">Not uploaded</option>
                  </select>
                </Field>

                <Field
                  label={`${courierBrand} tracking ID`}
                  hint="e.g. SFR260523ST846E083BD"
                >
                  <input
                    value={form.trackingId}
                    onChange={(e) =>
                      setForm((f) =>
                        f ? { ...f, trackingId: e.target.value } : f
                      )
                    }
                    disabled={form.uploadState === "not_uploaded"}
                    placeholder="Tracking code"
                    className={inputCls}
                  />
                </Field>

                <Field
                  label={`${courierBrand} consignment ID`}
                  hint="Numeric ID for merchant panel"
                >
                  <input
                    value={form.consignmentId}
                    onChange={(e) =>
                      setForm((f) =>
                        f ? { ...f, consignmentId: e.target.value } : f
                      )
                    }
                    disabled={form.uploadState === "not_uploaded"}
                    placeholder="e.g. 254486772"
                    className={inputCls}
                  />
                </Field>

                {form.uploadState === "uploaded" && previewUrl && (
                  <a
                    href={previewUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex items-center gap-2 rounded-xl border border-blue-100 bg-blue-50/80 px-3 py-2.5 text-xs font-bold text-blue-700 hover:bg-blue-100"
                  >
                    <Truck className="h-4 w-4 shrink-0" />
                    Preview parcel link
                    <ExternalLink className="ml-auto h-3.5 w-3.5 opacity-70" />
                  </a>
                )}

                {(getSteadfastTrackingCode(order) ||
                  getSteadfastConsignmentId(order)) &&
                  courierBrand === "Steadfast" && (
                    <p className="flex items-start gap-2 rounded-lg bg-amber-50 px-3 py-2 text-[11px] text-amber-900">
                      <Package className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                      Steadfast: keep both SFR tracking + numeric consignment when
                      available for best panel link.
                    </p>
                  )}
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="submit"
                className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-indigo-600 to-violet-600 px-8 py-3 text-sm font-bold text-white shadow-lg shadow-indigo-500/30 transition hover:from-indigo-700 hover:to-violet-700"
              >
                Update
              </button>
              {saved && (
                <span className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                  Saved
                </span>
              )}
            </div>
          </form>
        </div>
      )}

      {!order && !error && query && (
        <p className="text-center text-sm text-slate-400">
          Enter order ID and click Load order
        </p>
      )}
    </div>
  );
}

function Field({
  label,
  hint,
  children,
}: {
  label: string;
  hint?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-xs font-bold text-slate-700">
        {label}
      </label>
      {children}
      {hint && <p className="mt-1 text-[10px] text-slate-400">{hint}</p>}
    </div>
  );
}

const selectCls =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/15 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400";

const inputCls =
  "w-full rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-mono text-sm font-semibold text-slate-900 outline-none transition focus:border-indigo-400 focus:ring-4 focus:ring-indigo-500/15 disabled:cursor-not-allowed disabled:bg-slate-100 disabled:text-slate-400";
