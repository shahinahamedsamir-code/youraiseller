"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { ChevronDown, ChevronUp, Loader2, PhoneCall, Settings2 } from "lucide-react";
import {
  loadOrders,
  type Order,
  type OrderStatus,
} from "@/lib/orders-store";
import { isInWebQueue, isApprovedPendingVisible } from "@/lib/web-order-queue";
import { resolveWebDisplayStatus } from "@/lib/order-edit";
import { matchesWebOrderTab, WEB_ORDER_TABS, type WebOrderTabKey } from "@/lib/web-order-tabs";
import { getOrderSourceDisplay } from "@/lib/web-order-display";
import { loadEnabledOrderSources } from "@/lib/order-source-store";
import { ORDER_STATUS_LABELS, ORDER_LIST_TABS } from "@/lib/order-status-tabs";
import { loadActiveDeliveryMethods } from "@/lib/delivery-methods-store";
import { loadOrderTags } from "@/lib/order-tags-store";
import {
  autoCallKeyOrderActionLabel,
  defaultOrderActionForKey,
} from "@/lib/auto-call-key-actions";
import {
  buildAutoCallLogIndex,
  findAutoCallLogsForOrder,
} from "@/lib/auto-call-order-status";
import {
  loadAutoCallLogs,
  loadAutoCallSettings,
  pollAutoCallStatuses,
  refreshAutoCallAccount,
  startAutoCallBatchViaApi,
} from "@/lib/auto-call-store";
import { WebOrderAutoCallCell } from "@/components/web-orders/WebOrderAutoCallCell";
import { AutoCallRecentRuns } from "@/components/integration/auto-call/AutoCallRecentRuns";
import {
  acBtnPrimary,
  acCard,
  acInput,
  acLabel,
} from "@/lib/auto-call-ui";

type BatchTab = "web" | "approved";

const STATUS_TAG_OPTIONS = [
  { value: "all", label: "All status tags" },
  { value: "Auto Call", label: "Auto Call" },
  { value: "Pressed 1", label: "Pressed 1" },
  { value: "Pressed 2", label: "Pressed 2" },
  { value: "Approve Order", label: "Approve Order" },
  { value: "Rejected", label: "Rejected" },
];

function parseOrderDate(createdAt: string): Date | null {
  const d = new Date(createdAt);
  return Number.isNaN(d.getTime()) ? null : d;
}

function orderMatchesDateRange(order: Order, from: string, to: string): boolean {
  if (!from && !to) return true;
  const d = parseOrderDate(order.createdAt);
  if (!d) return true;
  if (from) {
    const fromD = new Date(`${from}T00:00:00`);
    if (d < fromD) return false;
  }
  if (to) {
    const toD = new Date(`${to}T23:59:59`);
    if (d > toD) return false;
  }
  return true;
}

function orderQty(order: Order): number {
  return order.items.reduce((sum, line) => sum + line.qty, 0);
}

function invoiceLabel(order: Order): string {
  return order.invoiceNumber?.trim() || order.id;
}

function orderHasUpload(order: Order): boolean {
  return Boolean(order.attachments?.length);
}

export function AutoCallBatchPanel() {
  const [batchTab, setBatchTab] = useState<BatchTab>("web");
  const [tick, setTick] = useState(0);
  const [search, setSearch] = useState("");
  const [webStatus, setWebStatus] = useState<WebOrderTabKey>("processing");
  const [approvedStatus, setApprovedStatus] = useState<OrderStatus | "all">("pending");
  const [tagFilter, setTagFilter] = useState("all");
  const [statusTagFilter, setStatusTagFilter] = useState("all");
  const [orderSource, setOrderSource] = useState("all");
  const [deliveryMethod, setDeliveryMethod] = useState("all");
  const [fromDate, setFromDate] = useState("");
  const [toDate, setToDate] = useState("");
  const [callOutcome, setCallOutcome] = useState("all");
  const [callAttempt, setCallAttempt] = useState("all");
  const [showAdvanced, setShowAdvanced] = useState(false);
  const [voiceOverride, setVoiceOverride] = useState(false);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [maxAttempts, setMaxAttempts] = useState(2);
  const [retryGap, setRetryGap] = useState(15);
  const [running, setRunning] = useState(false);
  const [batchMessage, setBatchMessage] = useState<string | null>(null);
  const [systemEnabled, setSystemEnabled] = useState(true);
  const [page, setPage] = useState(0);
  const [autoCallLogs, setAutoCallLogs] = useState(() => loadAutoCallLogs());

  const settings = loadAutoCallSettings();
  const pageSize = 20;

  useEffect(() => {
    setMaxAttempts(settings.maxAttempts);
    setRetryGap(settings.retryGapMinutes);
  }, [settings.maxAttempts, settings.retryGapMinutes]);

  useEffect(() => {
    void refreshAutoCallAccount().then((data) => {
      if (data) setSystemEnabled(data.systemEnabled);
    });
  }, []);

  useEffect(() => {
    const refresh = () => {
      setTick((t) => t + 1);
      setAutoCallLogs(loadAutoCallLogs());
    };
    window.addEventListener("youraiseller-data-updated", refresh);
    window.addEventListener("youraiseller-autocall-updated", refresh);
    return () => {
      window.removeEventListener("youraiseller-data-updated", refresh);
      window.removeEventListener("youraiseller-autocall-updated", refresh);
    };
  }, []);

  const sourceOptions = useMemo(() => {
    return loadEnabledOrderSources().map((s) => ({
      value: s.id,
      label: s.label,
    }));
  }, [tick]);

  const deliveryMethods = useMemo(() => loadActiveDeliveryMethods(), [tick]);
  const orderTags = useMemo(() => loadOrderTags(), [tick]);
  const logIndex = useMemo(() => buildAutoCallLogIndex(autoCallLogs), [autoCallLogs]);

  const key1Action =
    settings.dtmfOptions.find((row) => row.key === "1")?.orderAction ??
    defaultOrderActionForKey("1");
  const key2Action =
    settings.dtmfOptions.find((row) => row.key === "2")?.orderAction ??
    defaultOrderActionForKey("2");

  const orders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return loadOrders().filter((o) => {
      if (batchTab === "web") {
        if (!isInWebQueue(o)) return false;
        if (webStatus !== "all" && !matchesWebOrderTab(o, webStatus)) return false;
      } else {
        if (!isApprovedPendingVisible(o)) return false;
        if (approvedStatus !== "all" && o.status !== approvedStatus) return false;
      }

      if (orderSource !== "all") {
        const src = getOrderSourceDisplay(o);
        const matchId =
          src.source === "custom" ? o.customOrderSource ?? "custom" : src.source;
        if (matchId !== orderSource && src.source !== orderSource) return false;
      }

      if (deliveryMethod !== "all" && o.deliveryMethodId !== deliveryMethod) {
        return false;
      }

      if (tagFilter !== "all") {
        const tag = orderTags.find((t) => t.id === tagFilter);
        const needle = tag?.label.toLowerCase() ?? tagFilter.toLowerCase();
        if (!o.tags?.some((t) => t.toLowerCase() === needle)) return false;
      }

      if (statusTagFilter !== "all") {
        if (!o.tags?.some((t) => t.toLowerCase() === statusTagFilter.toLowerCase())) {
          return false;
        }
      }

      if (!orderMatchesDateRange(o, fromDate, toDate)) return false;

      const relatedLogs = findAutoCallLogsForOrder(autoCallLogs, o.id);
      const latestLog = logIndex.get(o.id) ?? null;

      if (callOutcome !== "all" && latestLog) {
        const label = latestLog.responseLabel?.toLowerCase() ?? "";
        if (callOutcome === "confirmed" && !label.includes("1") && latestLog.status !== "completed") {
          return false;
        }
        if (callOutcome === "pending" && latestLog.status === "completed") {
          return false;
        }
      }

      if (callAttempt !== "all") {
        const attempts = relatedLogs.length;
        if (String(attempts) !== callAttempt) return false;
      }

      if (!q) return true;
      return (
        o.id.toLowerCase().includes(q) ||
        invoiceLabel(o).toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.phone.replace(/\D/g, "").includes(q.replace(/\D/g, ""))
      );
    });
  }, [
    batchTab,
    webStatus,
    approvedStatus,
    orderSource,
    deliveryMethod,
    tagFilter,
    statusTagFilter,
    fromDate,
    toDate,
    callOutcome,
    callAttempt,
    search,
    tick,
    orderTags,
    autoCallLogs,
    logIndex,
  ]);

  const pageOrders = orders.slice(page * pageSize, page * pageSize + pageSize);
  const totalPages = Math.max(1, Math.ceil(orders.length / pageSize));

  const toggleRow = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const startBatch = async () => {
    const targetOrders =
      selected.size > 0 ? orders.filter((o) => selected.has(o.id)) : orders;
    if (targetOrders.length === 0) return;

    setRunning(true);
    setBatchMessage(null);

    const result = await startAutoCallBatchViaApi({
      calls: targetOrders.map((o) => ({ orderId: o.id, phone: o.phone })),
      maxAttempts,
      retryGapMinutes: retryGap,
    });

    setRunning(false);

    if (!result.ok) {
      setBatchMessage(result.error ?? "Batch failed");
      return;
    }

    const run = result.run;
    setBatchMessage(
      run
        ? `Calling started for ${run.processed} of ${run.total} order(s).${run.failed > 0 ? ` ${run.failed} could not be queued.` : ""} Check Call Logs for live updates.`
        : "Your calls have been queued."
    );
    setSelected(new Set());
    void pollAutoCallStatuses().then(() => setAutoCallLogs(loadAutoCallLogs()));
  };

  const statusLabel = (o: Order) => {
    if (batchTab === "web") {
      return resolveWebDisplayStatus(o).replace(/_/g, " ");
    }
    return ORDER_STATUS_LABELS[o.status] ?? o.status;
  };

  const selectionLabel =
    selected.size > 0
      ? `${selected.size} order${selected.size === 1 ? "" : "s"} selected`
      : batchTab === "approved"
        ? orders.length > 0
          ? "No approved orders selected — all filtered orders will be called"
          : "No approved orders selected"
        : orders.length > 0
          ? "No web orders selected — all filtered orders will be called"
          : "No web orders selected";

  return (
    <div className="space-y-5">
      <section className={acCard}>
        <h2 className="text-base font-extrabold text-slate-900">Manual Call Batches</h2>

        <div className="mb-4 inline-flex overflow-hidden rounded-t-lg border border-b-0 border-slate-200 bg-slate-50">
          {(
            [
              { id: "web" as const, label: "Web Orders" },
              { id: "approved" as const, label: "Approved Orders" },
            ] as const
          ).map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => {
                setBatchTab(tab.id);
                setPage(0);
                setSelected(new Set());
              }}
              className={clsx(
                "border-r border-slate-200 px-5 py-2.5 text-sm font-bold transition last:border-r-0",
                batchTab === tab.id
                  ? "border-t-2 border-t-teal-500 bg-white text-teal-700"
                  : "text-slate-500 hover:bg-white/70 hover:text-slate-700"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="rounded-b-xl rounded-tr-xl border border-slate-200 bg-white p-4">
          <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            <label className="md:col-span-2 xl:col-span-1">
              <span className={acLabel}>Search</span>
              <input
                className={acInput}
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(0);
                }}
                placeholder="Invoice, phone, customer"
              />
            </label>

            {batchTab === "web" ? (
              <label>
                <span className={acLabel}>Web status</span>
                <select
                  className={acInput}
                  value={webStatus}
                  onChange={(e) => {
                    setWebStatus(e.target.value as WebOrderTabKey);
                    setPage(0);
                  }}
                >
                  {WEB_ORDER_TABS.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
            ) : (
              <label>
                <span className={acLabel}>Approved status</span>
                <select
                  className={acInput}
                  value={approvedStatus}
                  onChange={(e) => {
                    setApprovedStatus(e.target.value as OrderStatus | "all");
                    setPage(0);
                  }}
                >
                  <option value="all">All statuses</option>
                  {ORDER_LIST_TABS.map((t) => (
                    <option key={t.key} value={t.key}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </label>
            )}

            <label>
              <span className={acLabel}>Tag</span>
              <select
                className={acInput}
                value={tagFilter}
                onChange={(e) => {
                  setTagFilter(e.target.value);
                  setPage(0);
                }}
              >
                <option value="all">All tags</option>
                {orderTags.map((tag) => (
                  <option key={tag.id} value={tag.id}>
                    {tag.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className={acLabel}>Status tag</span>
              <select
                className={acInput}
                value={statusTagFilter}
                onChange={(e) => {
                  setStatusTagFilter(e.target.value);
                  setPage(0);
                }}
              >
                {STATUS_TAG_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className={acLabel}>Source</span>
              <select
                className={acInput}
                value={orderSource}
                onChange={(e) => {
                  setOrderSource(e.target.value);
                  setPage(0);
                }}
              >
                <option value="all">All sources</option>
                {sourceOptions.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className={acLabel}>Delivery method</span>
              <select
                className={acInput}
                value={deliveryMethod}
                onChange={(e) => {
                  setDeliveryMethod(e.target.value);
                  setPage(0);
                }}
              >
                <option value="all">All delivery methods</option>
                {deliveryMethods.map((m) => (
                  <option key={m.id} value={m.id}>
                    {m.name}
                  </option>
                ))}
              </select>
            </label>

            <label>
              <span className={acLabel}>From date</span>
              <input
                type="date"
                className={acInput}
                value={fromDate}
                onChange={(e) => {
                  setFromDate(e.target.value);
                  setPage(0);
                }}
              />
            </label>

            <label>
              <span className={acLabel}>To date</span>
              <input
                type="date"
                className={acInput}
                value={toDate}
                onChange={(e) => {
                  setToDate(e.target.value);
                  setPage(0);
                }}
              />
            </label>

            <div className="flex min-h-[42px] items-end md:col-span-2 xl:col-span-1">
              <div className="w-full rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <p className="text-[11px] font-bold uppercase tracking-wide text-slate-400">
                  Selection
                </p>
                <p className="mt-0.5 text-sm font-semibold text-slate-700">{selectionLabel}</p>
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setShowAdvanced((v) => !v)}
            className="mt-3 inline-flex items-center gap-1.5 text-xs font-bold text-teal-700 hover:text-teal-800"
          >
            {showAdvanced ? <ChevronUp className="h-3.5 w-3.5" /> : <ChevronDown className="h-3.5 w-3.5" />}
            {showAdvanced ? "Hide advanced filters" : "Show advanced filters"}
          </button>

          {showAdvanced ? (
            <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <label>
                <span className={acLabel}>Call outcome</span>
                <select
                  className={acInput}
                  value={callOutcome}
                  onChange={(e) => {
                    setCallOutcome(e.target.value);
                    setPage(0);
                  }}
                >
                  <option value="all">All outcomes</option>
                  <option value="pending">Pending / calling</option>
                  <option value="confirmed">Confirmed (Key 1)</option>
                </select>
              </label>
              <label>
                <span className={acLabel}>Call attempt</span>
                <select
                  className={acInput}
                  value={callAttempt}
                  onChange={(e) => {
                    setCallAttempt(e.target.value);
                    setPage(0);
                  }}
                >
                  <option value="all">All attempts</option>
                  <option value="0">0</option>
                  <option value="1">1</option>
                  <option value="2">2</option>
                  <option value="3">3</option>
                </select>
              </label>
            </div>
          ) : null}

          <div className="mt-4 grid gap-3 border-t border-slate-100 pt-4 lg:grid-cols-[repeat(3,minmax(0,1fr))_minmax(0,2fr)]">
            <label>
              <span className={acLabel}>Max attempts (override)</span>
              <input
                type="number"
                min={1}
                max={3}
                className={acInput}
                value={maxAttempts}
                onChange={(e) => setMaxAttempts(Number(e.target.value) || 1)}
              />
            </label>
            <label>
              <span className={acLabel}>Retry gap minutes (override)</span>
              <input
                type="number"
                min={5}
                max={120}
                className={acInput}
                value={retryGap}
                onChange={(e) => setRetryGap(Number(e.target.value) || 15)}
              />
            </label>
            <label className="flex items-end">
              <span className="inline-flex w-full items-start gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 py-2.5">
                <input
                  type="checkbox"
                  checked={voiceOverride}
                  onChange={(e) => setVoiceOverride(e.target.checked)}
                  className="mt-0.5"
                />
                <span>
                  <span className="block text-sm font-bold text-slate-800">Voice override</span>
                  <span className="block text-[11px] leading-relaxed text-slate-500">
                    Welcome voice maps to question voice, phrase 1/2 map to keys 1/2.
                  </span>
                </span>
              </span>
            </label>
          </div>

          <div className="mt-4 grid gap-3 lg:grid-cols-2">
            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-extrabold text-slate-900">Key 1 actions</p>
                <Link
                  href="/dashboard/integration/auto-call/setup"
                  className="inline-flex items-center gap-1 text-xs font-bold text-violet-700 hover:text-violet-900"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  Setup
                </Link>
              </div>
              <p className="mt-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-800 ring-1 ring-slate-200">
                {autoCallKeyOrderActionLabel(key1Action)}
              </p>
            </div>

            <div className="rounded-xl border border-slate-200 bg-slate-50/70 p-3">
              <div className="mb-2 flex items-center justify-between gap-2">
                <p className="text-sm font-extrabold text-slate-900">Key 2 actions</p>
                <Link
                  href="/dashboard/integration/auto-call/setup"
                  className="inline-flex items-center gap-1 text-xs font-bold text-violet-700 hover:text-violet-900"
                >
                  <Settings2 className="h-3.5 w-3.5" />
                  Setup
                </Link>
              </div>
              <p className="mt-2 rounded-lg bg-white px-3 py-2 text-sm font-semibold text-slate-800 ring-1 ring-slate-200">
                {autoCallKeyOrderActionLabel(key2Action)}
              </p>
            </div>
          </div>

          <div className="mt-4">
            <button
              type="button"
              disabled={running || orders.length === 0 || !systemEnabled}
              onClick={() => void startBatch()}
              className={clsx(
                "inline-flex w-full items-center justify-center gap-2 rounded-xl px-5 py-3 text-sm font-extrabold text-white shadow-md transition disabled:opacity-50 sm:w-auto",
                batchTab === "approved"
                  ? "bg-gradient-to-r from-teal-500 to-cyan-500 shadow-teal-200/50 hover:from-teal-600 hover:to-cyan-600"
                  : acBtnPrimary
              )}
            >
              {running ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <PhoneCall className="h-4 w-4" />
              )}
              {batchTab === "approved" ? "Start Approved Auto Call" : "Start Web Auto Call"}
            </button>
          </div>

          {batchMessage ? (
            <p className="mt-4 rounded-xl bg-violet-50 px-3 py-2.5 text-sm font-semibold text-violet-900 ring-1 ring-violet-100">
              {batchMessage}
            </p>
          ) : !systemEnabled ? (
            <p className="mt-4 rounded-xl bg-rose-50 px-3 py-2.5 text-sm font-semibold text-rose-800">
              Call service is temporarily unavailable.
            </p>
          ) : null}

          <div className="mt-5 overflow-x-auto rounded-xl border border-slate-200">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
                <tr>
                  <th className="px-3 py-3">
                    <input
                      type="checkbox"
                      checked={
                        pageOrders.length > 0 &&
                        pageOrders.every((o) => selected.has(o.id))
                      }
                      onChange={(e) => {
                        if (e.target.checked) {
                          setSelected(new Set(pageOrders.map((o) => o.id)));
                        } else {
                          setSelected(new Set());
                        }
                      }}
                    />
                  </th>
                  <th className="px-3 py-3">Invoice</th>
                  <th className="px-3 py-3">Customer</th>
                  <th className="px-3 py-3">Phone</th>
                  <th className="px-3 py-3">Status</th>
                  <th className="px-3 py-3">Source</th>
                  <th className="px-3 py-3">Qty</th>
                  <th className="px-3 py-3">Total</th>
                  <th className="px-3 py-3">Uploaded</th>
                  <th className="px-3 py-3">Auto Call</th>
                </tr>
              </thead>
              <tbody>
                {pageOrders.length === 0 ? (
                  <tr>
                    <td colSpan={10} className="px-4 py-10 text-center text-slate-500">
                      No orders found for selected filters.
                    </td>
                  </tr>
                ) : (
                  pageOrders.map((o) => {
                    const src = getOrderSourceDisplay(o);
                    const latestLog = logIndex.get(o.id) ?? null;
                    return (
                      <tr key={o.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                        <td className="px-3 py-3">
                          <input
                            type="checkbox"
                            checked={selected.has(o.id)}
                            onChange={() => toggleRow(o.id)}
                          />
                        </td>
                        <td className="px-3 py-3 font-semibold text-slate-800">
                          {invoiceLabel(o)}
                        </td>
                        <td className="px-3 py-3">{o.customerName}</td>
                        <td className="px-3 py-3 tabular-nums">{o.phone}</td>
                        <td className="px-3 py-3 capitalize">{statusLabel(o)}</td>
                        <td className="px-3 py-3 uppercase">{src.label}</td>
                        <td className="px-3 py-3 tabular-nums">{orderQty(o)}</td>
                        <td className="px-3 py-3 tabular-nums">
                          {o.total.toFixed(2)}
                        </td>
                        <td className="px-3 py-3">{orderHasUpload(o) ? "Yes" : "No"}</td>
                        <td className="px-3 py-3">
                          <WebOrderAutoCallCell log={latestLog} />
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          <div className="mt-3 flex items-center justify-between text-sm">
            <button
              type="button"
              disabled={page === 0}
              onClick={() => setPage((p) => Math.max(0, p - 1))}
              className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-600 disabled:opacity-40"
            >
              Previous
            </button>
            <span className="text-xs text-slate-500">
              Page {page + 1} of {totalPages} · {orders.length} order(s)
            </span>
            <button
              type="button"
              disabled={page >= totalPages - 1}
              onClick={() => setPage((p) => p + 1)}
              className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-600 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </section>

      <AutoCallRecentRuns />
    </div>
  );
}
