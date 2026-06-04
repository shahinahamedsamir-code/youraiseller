"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Loader2, PhoneCall } from "lucide-react";
import {
  loadOrders,
  type Order,
} from "@/lib/orders-store";
import { isInWebQueue, isApprovedPendingVisible } from "@/lib/web-order-queue";
import { resolveWebDisplayStatus } from "@/lib/order-edit";
import { matchesWebOrderTab, WEB_ORDER_TABS, type WebOrderTabKey } from "@/lib/web-order-tabs";
import { getOrderSourceDisplay } from "@/lib/web-order-display";
import { loadEnabledOrderSources } from "@/lib/order-source-store";
import {
  loadAutoCallSettings,
  pollAutoCallStatuses,
  refreshAutoCallAccount,
  startAutoCallBatchViaApi,
} from "@/lib/auto-call-store";
import { AutoCallRecentRuns } from "@/components/integration/auto-call/AutoCallRecentRuns";
import {
  acBtnPrimary,
  acCard,
  acInput,
  acLabel,
  acSectionSub,
  acSectionTitle,
} from "@/lib/auto-call-ui";

type BatchTab = "web" | "approved";

const inputCls = acInput;
const labelCls = acLabel;

export function AutoCallBatchPanel() {
  const [batchTab, setBatchTab] = useState<BatchTab>("web");
  const [tick, setTick] = useState(0);
  const [search, setSearch] = useState("");
  const [webStatus, setWebStatus] = useState<WebOrderTabKey>("processing");
  const [orderSource, setOrderSource] = useState("all");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [maxAttempts, setMaxAttempts] = useState(2);
  const [retryGap, setRetryGap] = useState(15);
  const [running, setRunning] = useState(false);
  const [batchMessage, setBatchMessage] = useState<string | null>(null);
  const [systemEnabled, setSystemEnabled] = useState(true);
  const [page, setPage] = useState(0);

  const settings = loadAutoCallSettings();
  const pageSize = 10;

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
    const refresh = () => setTick((t) => t + 1);
    window.addEventListener("youraiseller-data-updated", refresh);
    return () => window.removeEventListener("youraiseller-data-updated", refresh);
  }, []);

  const sourceOptions = useMemo(() => {
    return loadEnabledOrderSources().map((s) => ({
      value: s.id,
      label: s.label,
    }));
  }, [tick]);

  const orders = useMemo(() => {
    const q = search.trim().toLowerCase();
    return loadOrders().filter((o) => {
      if (batchTab === "web") {
        if (!isInWebQueue(o)) return false;
        if (webStatus !== "all" && !matchesWebOrderTab(o, webStatus)) return false;
      } else if (!isApprovedPendingVisible(o) || o.status !== "pending") {
        return false;
      }

      if (orderSource !== "all") {
        const src = getOrderSourceDisplay(o);
        const matchId =
          src.source === "custom" ? o.customOrderSource ?? "custom" : src.source;
        if (matchId !== orderSource && src.source !== orderSource) return false;
      }

      if (!q) return true;
      return (
        o.id.toLowerCase().includes(q) ||
        o.customerName.toLowerCase().includes(q) ||
        o.phone.replace(/\D/g, "").includes(q.replace(/\D/g, ""))
      );
    });
  }, [batchTab, webStatus, orderSource, search, tick]);

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
      selected.size > 0
        ? orders.filter((o) => selected.has(o.id))
        : orders;
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
    void pollAutoCallStatuses();
  };

  const statusLabel = (o: Order) => {
    if (batchTab === "web") {
      return resolveWebDisplayStatus(o).replace(/_/g, " ");
    }
    return o.status;
  };

  return (
    <div className="space-y-5">
      <section className={acCard}>
        <h2 className={acSectionTitle}>Call Center</h2>
        <p className={`${acSectionSub} mb-4`}>
          Pick orders and start verification calls. Customers hear your voice message and press
          1 to confirm or 2 to cancel.
        </p>

        <div className="mb-4 flex gap-1 rounded-xl bg-slate-100 p-1">
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
                "rounded-lg px-4 py-2 text-sm font-bold transition",
                batchTab === tab.id
                  ? "bg-white text-violet-700 shadow-sm"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-5">
          <label className="sm:col-span-2">
            <span className={labelCls}>Search orders</span>
            <input
              className={inputCls}
              value={search}
              onChange={(e) => {
                setSearch(e.target.value);
                setPage(0);
              }}
              placeholder="Phone, customer, order id"
            />
          </label>
          {batchTab === "web" ? (
            <label>
              <span className={labelCls}>Order status</span>
              <select
                className={inputCls}
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
          ) : null}
          <label>
            <span className={labelCls}>Order source</span>
            <select
              className={inputCls}
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
            <span className={labelCls}>Call result</span>
            <select className={inputCls} defaultValue="all">
              <option value="all">All outcomes</option>
              <option value="pending">Pending</option>
              <option value="confirmed">Confirmed</option>
            </select>
          </label>
          <label>
            <span className={labelCls}>Call attempt</span>
            <select className={inputCls} defaultValue="all">
              <option value="all">All attempts</option>
              <option value="0">0</option>
              <option value="1">1</option>
              <option value="2">2</option>
            </select>
          </label>
        </div>

        <div className="mb-4 flex flex-wrap items-end gap-3">
          <label className="min-w-[120px]">
            <span className={labelCls}>Max tries for this batch</span>
            <input
              type="number"
              min={1}
              max={3}
              className={inputCls}
              value={maxAttempts}
              onChange={(e) => setMaxAttempts(Number(e.target.value) || 1)}
            />
          </label>
          <label className="min-w-[140px]">
            <span className={labelCls}>Wait before retry (minutes)</span>
            <input
              type="number"
              min={5}
              max={120}
              className={inputCls}
              value={retryGap}
              onChange={(e) => setRetryGap(Number(e.target.value) || 15)}
            />
          </label>
          <p className="flex-1 text-xs text-slate-500">
            Selected:{" "}
            <strong className="text-slate-700">
              {selected.size > 0 ? `${selected.size} order(s)` : "None — all filtered orders"}
            </strong>
            {selected.size === 0 && orders.length > 0
              ? ` (${orders.length} order(s) match your filters)`
              : null}
          </p>
          <button
            type="button"
            disabled={running || orders.length === 0 || !systemEnabled}
            onClick={() => void startBatch()}
            className={acBtnPrimary}
          >
            {running ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <PhoneCall className="h-4 w-4" />
            )}
            Start calling
          </button>
        </div>

        {batchMessage ? (
          <p className="mb-4 rounded-xl bg-violet-50 px-3 py-2.5 text-sm font-semibold text-violet-900 ring-1 ring-violet-100">
            {batchMessage}
          </p>
        ) : !systemEnabled ? (
          <p className="mb-4 rounded-xl bg-rose-50 px-3 py-2.5 text-sm font-semibold text-rose-800">
            Call service is temporarily unavailable.
          </p>
        ) : null}

        <div className="overflow-x-auto rounded-xl border border-slate-200">
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
                <th className="px-3 py-3">Order</th>
                <th className="px-3 py-3">Customer</th>
                <th className="px-3 py-3">Phone</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Source</th>
                <th className="px-3 py-3">Verification</th>
                <th className="px-3 py-3">Try #</th>
                <th className="px-3 py-3">Created</th>
              </tr>
            </thead>
            <tbody>
              {pageOrders.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-10 text-center text-slate-500">
                    No orders found for selected filters.
                  </td>
                </tr>
              ) : (
                pageOrders.map((o) => {
                  const src = getOrderSourceDisplay(o);
                  return (
                    <tr key={o.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                      <td className="px-3 py-3">
                        <input
                          type="checkbox"
                          checked={selected.has(o.id)}
                          onChange={() => toggleRow(o.id)}
                        />
                      </td>
                      <td className="px-3 py-3 font-semibold text-slate-800">{o.id}</td>
                      <td className="px-3 py-3">{o.customerName}</td>
                      <td className="px-3 py-3 tabular-nums">{o.phone}</td>
                      <td className="px-3 py-3 capitalize">{statusLabel(o)}</td>
                      <td className="px-3 py-3">{src.label}</td>
                      <td className="px-3 py-3 text-slate-400">—</td>
                      <td className="px-3 py-3 text-slate-400">0</td>
                      <td className="px-3 py-3 text-xs text-slate-500">{o.createdAt}</td>
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
      </section>

      <AutoCallRecentRuns />
    </div>
  );
}
