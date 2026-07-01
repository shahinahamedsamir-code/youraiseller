"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import type { Order, OrderLine, WebDisplayStatus } from "@/lib/orders-store";
import { getOrder, updateOrder } from "@/lib/orders-store";
import {
  isInWebQueue,
  shouldStayInWebQueueAfterWooSync,
} from "@/lib/web-order-queue";
import { incompleteCooldownRemainingMs } from "@/lib/incomplete-cooldown";
import { IncompleteCooldownModal } from "@/components/web-orders/IncompleteCooldownModal";
import {
  buildDuplicateIndex,
  duplicateFlags,
  type DuplicateIndex,
} from "@/lib/order-duplicates";
import { getWebOrdersFromStore } from "@/lib/woocommerce-order-sync";
import { getProductImageForLine } from "@/lib/inventory-store";
import { pullOrdersFromServer } from "@/lib/seller-sync";
import { compactOrderStorage, repairWebOrdersInQueue } from "@/lib/orders-store";
import { WooOrderSyncBar } from "@/components/web-orders/WooOrderSyncBar";
import { ShopifyOrderSyncBar } from "@/components/web-orders/ShopifyOrderSyncBar";
import { loadWooCommerceSettings } from "@/lib/woocommerce-integration-store";
import { WebOrderCourierRatioCell } from "@/components/web-orders/WebOrderCourierRatioCell";
import { resolveWebDisplayStatus } from "@/lib/order-edit";
import { statusColors } from "@/lib/mock-web-orders";
import {
  isWebOrderTabKey,
  type WebOrderTabKey,
} from "@/lib/web-order-tabs";
import { WebOrderStatusTabs } from "@/components/web-orders/WebOrderStatusTabs";
import { useWebOrders } from "@/components/web-orders/useWebOrders";
import {
  TablePagination,
  DEFAULT_ROWS_PER_PAGE,
} from "@/components/ui/TablePagination";
import { formatRelativeTime } from "@/lib/format-relative-time";
import {
  getOrderSourceDisplay,
  getWooCommerceStatus,
  formatWcStatusLabel,
  sourceBadgeCls,
  wcStatusBadgeCls,
} from "@/lib/web-order-display";
import {
  ExternalLink,
  MessageCircle,
  Phone,
  Package,
  MapPin,
  User,
  Search,
  Filter,
} from "lucide-react";
import clsx from "clsx";
import { buildAutoCallLogIndex } from "@/lib/auto-call-order-status";
import {
  loadAutoCallAccountLocal,
  loadAutoCallLogs,
  pollAutoCallStatuses,
  refreshAutoCallAccount,
  hasPendingAutoCallLogs,
} from "@/lib/auto-call-store";
import { WebOrderAutoCallCell } from "@/components/web-orders/WebOrderAutoCallCell";

/** Sticky left columns — Open stays visible when scrolling */
const stickyCheckCls =
  "sticky left-0 z-30 w-11 min-w-[44px] border-r border-slate-100/80 bg-slate-50/95 backdrop-blur-sm";
const stickyOpenCls =
  "sticky left-11 z-30 w-[108px] min-w-[108px] border-r border-slate-200/80 bg-slate-50/95 shadow-[4px_0_10px_-4px_rgba(15,23,42,0.08)] backdrop-blur-sm";

function stickyBodyCell(
  base: "check" | "open",
  isChecked: boolean
): string {
  const bg = isChecked
    ? "bg-teal-50/95 group-hover:bg-teal-50/95"
    : "bg-white group-hover:bg-teal-50/50";
  return clsx(
    base === "check" ? stickyCheckCls : stickyOpenCls,
    "z-20 px-3 py-3",
    bg
  );
}

function lineImage(item: OrderLine): string | undefined {
  return getProductImageForLine(item);
}

function siteLabel(): string {
  const url = loadWooCommerceSettings().storeUrl.trim();
  if (!url) return "Main";
  try {
    const host = new URL(
      url.startsWith("http") ? url : `https://${url}`
    ).hostname;
    return host.replace(/^www\./, "").split(".")[0] || "Main";
  } catch {
    return "Main";
  }
}

function siteUrl(): string {
  const url = loadWooCommerceSettings().storeUrl.trim();
  if (!url) return "";
  return url.startsWith("http") ? url.replace(/\/$/, "") : `https://${url}`;
}

function OrderItemsCell({ items, total }: { items: OrderLine[]; total: number }) {
  if (items.length === 0) {
    return <span className="text-slate-400">—</span>;
  }

  const first = items[0];
  const img = lineImage(first);
  const extra = items.length - 1;

  return (
    <div className="flex min-w-[180px] items-center gap-2">
      {img ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={img}
          alt=""
          className="h-11 w-11 shrink-0 rounded-md object-cover ring-1 ring-slate-200"
        />
      ) : (
        <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-md bg-teal-50 text-teal-500 ring-1 ring-slate-100">
          <Package className="h-4 w-4" />
        </div>
      )}
      <div className="min-w-0">
        <p className="truncate text-xs font-semibold text-slate-800">
          {first.productName}
        </p>
        <p className="text-[11px] text-slate-500">
          {first.qty}x · ৳{first.total.toLocaleString("en-BD")}
          {extra > 0 ? ` · +${extra}` : ""}
        </p>
        {items.length > 1 && (
          <p className="text-[10px] font-semibold text-teal-600">
            Total ৳{total.toLocaleString("en-BD")}
          </p>
        )}
      </div>
    </div>
  );
}

function DuplicateBadge({
  order,
  index,
}: {
  order: Order;
  index: DuplicateIndex;
}) {
  const dup = duplicateFlags(order, index);
  if (!dup.byPhone && !dup.byIp) return null;
  return (
    <div className="mt-1 flex flex-wrap gap-1">
      {dup.byPhone && (
        <span className="inline-flex items-center gap-1 rounded-md bg-amber-100 px-1.5 py-0.5 text-[10px] font-bold text-amber-700">
          Duplicate by phone
        </span>
      )}
      {dup.byIp && (
        <span className="inline-flex items-center gap-1 rounded-md bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
          Duplicate by IP{dup.ip ? ` · ${dup.ip}` : ""}
        </span>
      )}
    </div>
  );
}

const BULK_STATUSES: { value: WebDisplayStatus; label: string }[] = [
  { value: "processing", label: "Processing" },
  { value: "on_hold", label: "On Hold" },
  { value: "good_no_response", label: "Good but no response" },
  { value: "no_response", label: "No response" },
  { value: "complete", label: "Complete" },
  { value: "cancelled", label: "Cancel" },
];

function bulkWebStatusToOrderStatus(ws: WebDisplayStatus) {
  if (ws === "complete") return "delivered" as const;
  if (ws === "cancelled") return "cancelled" as const;
  return "pending" as const;
}

export function WebOrderTable() {
  const router = useRouter();
  const [cooldownOrder, setCooldownOrder] = useState<Order | null>(null);

  const viewUrl = (id: string) =>
    `/dashboard/orders/web/view/${encodeURIComponent(id)}`;

  // Opening a fresh incomplete lead first warns "customer still on site".
  const openOrder = (order: Order) => {
    if (incompleteCooldownRemainingMs(order) > 0) {
      setCooldownOrder(order);
      return;
    }
    router.push(viewUrl(order.id));
  };
  const searchParams = useSearchParams();
  const [tick, setTick] = useState(0);
  const [activeFilter, setActiveFilter] = useState<WebOrderTabKey>(() => {
    const tab = searchParams.get("tab");
    return tab && isWebOrderTabKey(tab) ? tab : "processing";
  });
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE);
  const [createdFlash, setCreatedFlash] = useState<string | null>(null);
  const [callLogTick, setCallLogTick] = useState(0);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  // Index phones + IPs across all web orders to flag duplicates per row.
  const dupIndex = useMemo<DuplicateIndex>(
    () => buildDuplicateIndex(getWebOrdersFromStore()),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [tick]
  );
  const refreshCallLogs = useCallback(() => setCallLogTick((t) => t + 1), []);

  useEffect(() => {
    const tab = searchParams.get("tab");
    setActiveFilter(tab && isWebOrderTabKey(tab) ? tab : "processing");
  }, [searchParams]);

  useEffect(() => {
    const created = searchParams.get("created");
    if (!created) return;
    setCreatedFlash(created);
    refresh();
    router.replace("/dashboard/orders/web", { scroll: false });
  }, [searchParams, router, refresh]);

  useEffect(() => {
    // Shrink any historically-bloated order blob first so the rest of the page
    // works against slim data, then pull the latest and compact again in case
    // the server copy was still bloated.
    compactOrderStorage();
    repairWebOrdersInQueue();
    void pullOrdersFromServer().finally(() => {
      compactOrderStorage();
      refresh();
    });
  }, [refresh]);

  useEffect(() => {
    let timer: number | undefined;
    const onData = () => {
      if (timer) window.clearTimeout(timer);
      timer = window.setTimeout(() => refresh(), 250);
    };
    window.addEventListener("youraiseller-data-updated", onData);
    return () => {
      if (timer) window.clearTimeout(timer);
      window.removeEventListener("youraiseller-data-updated", onData);
    };
  }, [refresh]);

  useEffect(() => {
    // Poll auto-call status in the background. We only update the (cheap)
    // auto-call cells here via refreshCallLogs(); the full table re-renders
    // only when order data actually changes, driven by the
    // "youraiseller-data-updated" event (pullOrdersFromServer dispatches it
    // exclusively when the data differs). Forcing refresh() on every poll
    // re-derived the whole order list from a large localStorage blob every
    // few seconds, which froze the page for sellers with many web orders.
    const syncCallLogs = () => {
      void pollAutoCallStatuses().then(async () => {
        await refreshAutoCallAccount();
        refreshCallLogs();
      });
    };

    syncCallLogs();

    const onAutoCall = () => refreshCallLogs();
    window.addEventListener("youraiseller-autocall-updated", onAutoCall);

    let dataTimer: number | undefined;
    const onData = () => {
      if (dataTimer) window.clearTimeout(dataTimer);
      dataTimer = window.setTimeout(() => void syncCallLogs(), 3000);
    };
    window.addEventListener("youraiseller-data-updated", onData);

    let interval = window.setInterval(syncCallLogs, 12000);

    const retune = () => {
      window.clearInterval(interval);
      interval = window.setInterval(syncCallLogs, hasPendingAutoCallLogs() ? 8000 : 20000);
    };
    retune();
    const retuneInterval = window.setInterval(retune, 15000);

    return () => {
      window.removeEventListener("youraiseller-autocall-updated", onAutoCall);
      window.removeEventListener("youraiseller-data-updated", onData);
      if (dataTimer) window.clearTimeout(dataTimer);
      window.clearInterval(interval);
      window.clearInterval(retuneInterval);
    };
  }, [refreshCallLogs, refresh]);

  const storeSite = useMemo(() => {
    void tick;
    return siteLabel();
  }, [tick]);
  const storeHref = useMemo(() => {
    void tick;
    return siteUrl();
  }, [tick]);

  // DB-paginated (with localStorage fallback). Only the current page of orders
  // is ever held in memory in DB mode, so this scales to very large datasets.
  const { rows: paged, total: filteredTotal, counts, loading: ordersLoading } =
    useWebOrders({
      tab: activeFilter,
      search,
      page,
      rowsPerPage,
      refreshKey: tick,
    });

  const autoCallLogs = useMemo(() => {
    void callLogTick;
    return loadAutoCallLogs();
  }, [callLogTick]);

  const autoCallByOrderId = useMemo(() => {
    void callLogTick;
    const account = loadAutoCallAccountLocal();
    return buildAutoCallLogIndex(autoCallLogs, {
      maxAttempts: account?.settings.maxAttempts ?? 2,
    });
  }, [autoCallLogs, callLogTick]);

  useEffect(() => {
    setPage(1);
  }, [activeFilter, search]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAll = () => {
    if (paged.length > 0 && paged.every((o) => selected.has(o.id))) {
      setSelected((prev) => {
        const next = new Set(prev);
        paged.forEach((o) => next.delete(o.id));
        return next;
      });
    } else {
      setSelected((prev) => {
        const next = new Set(prev);
        paged.forEach((o) => next.add(o.id));
        return next;
      });
    }
  };

  const [bulkStatus, setBulkStatus] = useState<WebDisplayStatus | "">("");
  const [bulkBusy, setBulkBusy] = useState(false);
  const [bulkMsg, setBulkMsg] = useState("");

  const applyBulkStatus = () => {
    if (!bulkStatus || selected.size === 0) return;
    setBulkBusy(true);
    const ts = new Date().toISOString();
    let done = 0;
    selected.forEach((id) => {
      const before = getOrder(id);
      if (!before) return;
      const stillInQueue = isInWebQueue(before);
      updateOrder(id, {
        webStatus: bulkStatus,
        webStatusStaffSetAt: ts,
        status: stillInQueue ? "pending" : bulkWebStatusToOrderStatus(bulkStatus),
        inWebQueue: shouldStayInWebQueueAfterWooSync(
          { ...before, webStatus: bulkStatus },
          bulkStatus
        ),
      });
      done++;
    });
    const label = BULK_STATUSES.find((s) => s.value === bulkStatus)?.label ?? "";
    setSelected(new Set());
    setBulkStatus("");
    setBulkBusy(false);
    setBulkMsg(`${done} order${done === 1 ? "" : "s"} moved to ${label}.`);
    if (typeof window !== "undefined") {
      window.dispatchEvent(new Event("youraiseller-data-updated"));
    }
    refresh();
    window.setTimeout(() => setBulkMsg(""), 3500);
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-3 lg:grid-cols-2">
        <WooOrderSyncBar onSynced={refresh} compact />
        <ShopifyOrderSyncBar onSynced={refresh} compact />
      </div>

      {createdFlash && (
        <p className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">
          {createdFlash} Created
          <button
            type="button"
            onClick={() => setCreatedFlash(null)}
            className="ml-2 text-xs font-bold text-emerald-600 underline"
          >
            Dismiss
          </button>
        </p>
      )}

      <div className="space-y-0">
        <WebOrderStatusTabs
          active={activeFilter}
          counts={counts}
          activeVisibleCount={filteredTotal}
          onChange={(tab) => {
            setActiveFilter(tab);
            router.replace(
              tab === "processing"
                ? "/dashboard/orders/web"
                : `/dashboard/orders/web?tab=${tab}`,
              { scroll: false }
            );
          }}
        />

        <div className="yai-panel overflow-x-hidden overflow-y-visible rounded-t-none border-t-0">
          <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-3">
            <div className="relative min-w-[200px] flex-1">
              <span className="pointer-events-none absolute inset-y-0 left-0 flex w-9 items-center justify-center text-slate-400">
                <Search className="h-4 w-4 shrink-0" />
              </span>
              <input
                type="search"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Filter orders..."
                className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
              />
            </div>
            <button
              type="button"
              className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
            >
              <Filter className="h-4 w-4 text-teal-500" />
              Filters
            </button>
          </div>

          {/* Bulk status change — shows when rows are selected */}
          {selected.size > 0 && (
            <div className="flex flex-wrap items-center gap-2 border-b border-teal-100 bg-teal-50/70 px-3 py-2.5">
              <span className="text-sm font-bold text-teal-800">
                {selected.size} selected
              </span>
              <select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value as WebDisplayStatus | "")}
                className="rounded-lg border border-teal-200 bg-white px-3 py-1.5 text-sm font-semibold text-slate-700 outline-none focus:border-teal-400 focus:ring-2 focus:ring-teal-100"
              >
                <option value="">Change status to…</option>
                {BULK_STATUSES.map((s) => (
                  <option key={s.value} value={s.value}>
                    {s.label}
                  </option>
                ))}
              </select>
              <button
                type="button"
                onClick={applyBulkStatus}
                disabled={!bulkStatus || bulkBusy}
                className="rounded-lg bg-teal-600 px-4 py-1.5 text-sm font-bold text-white shadow-sm transition hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50"
              >
                {bulkBusy ? "Applying…" : "Apply"}
              </button>
              <button
                type="button"
                onClick={() => setSelected(new Set())}
                className="rounded-lg px-3 py-1.5 text-sm font-semibold text-slate-500 hover:text-slate-700"
              >
                Clear
              </button>
              {bulkMsg && (
                <span className="text-xs font-semibold text-emerald-700">{bulkMsg}</span>
              )}
            </div>
          )}

          {/* ── Mobile card view ── */}
          <div className="space-y-3 px-3 py-3 lg:hidden">
            {paged.length === 0 ? (
              <p className="py-12 text-center text-sm text-slate-500">
                {ordersLoading ? "Loading orders…" : "No web orders in this tab."}
              </p>
            ) : (
              paged.map((order) => {
                const ws = resolveWebDisplayStatus(order);
                const wa = `88${order.phone.replace(/\D/g, "")}`;
                const isChecked = selected.has(order.id);
                const firstItem = order.items[0];
                const firstImg = firstItem ? lineImage(firstItem) : undefined;

                return (
                  <div
                    key={order.id}
                    className={clsx(
                      "rounded-xl border p-3 transition",
                      isChecked
                        ? "border-teal-300 bg-teal-50/50"
                        : "border-slate-200 bg-white"
                    )}
                  >
                    {/* Top row: checkbox + status + date + open */}
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => toggleSelect(order.id)}
                        className="rounded border-slate-300"
                      />
                      <span
                        className={clsx(
                          "rounded-full px-2 py-0.5 text-[9px] font-bold capitalize",
                          statusColors[ws]
                        )}
                      >
                        {ws.replace("_", " ")}
                      </span>
                      <span className="text-[10px] text-slate-400">
                        {order.createdAt}
                      </span>
                      <button
                        type="button"
                        onClick={() => openOrder(order)}
                        className="ml-auto inline-flex items-center gap-1 rounded-lg bg-teal-600 px-3 py-1.5 text-xs font-bold text-white shadow-sm"
                      >
                        Open
                        <ExternalLink className="h-3 w-3" />
                      </button>
                    </div>

                    {/* Customer */}
                    <div className="mt-2 space-y-1 text-xs">
                      <div className="flex items-center gap-2">
                        <a
                          href={`tel:${order.phone}`}
                          className="inline-flex items-center gap-1 font-bold text-teal-700"
                        >
                          <Phone className="h-3 w-3" />
                          {order.phone}
                        </a>
                        <a
                          href={`https://wa.me/${wa}`}
                          target="_blank"
                          rel="noreferrer"
                          className="text-emerald-600"
                        >
                          <MessageCircle className="h-3.5 w-3.5" />
                        </a>
                      </div>
                      <p className="flex items-center gap-1 font-semibold text-slate-800">
                        <User className="h-3 w-3 text-slate-400" />
                        {order.customerName}
                      </p>
                      <p className="flex items-start gap-1 text-slate-500">
                        <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" />
                        <span className="line-clamp-2">
                          {order.address}
                          {order.district ? `, ${order.district}` : ""}
                        </span>
                      </p>
                      <DuplicateBadge order={order} index={dupIndex} />
                    </div>

                    {/* Order item + Courier ratio row */}
                    <div className="mt-3 flex items-start gap-3 border-t border-slate-100 pt-3">
                      {/* Product */}
                      <div className="flex min-w-0 flex-1 items-center gap-2">
                        {firstImg ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={firstImg}
                            alt=""
                            className="h-10 w-10 shrink-0 rounded-md object-cover ring-1 ring-slate-200"
                          />
                        ) : (
                          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-md bg-teal-50 text-teal-500 ring-1 ring-slate-100">
                            <Package className="h-4 w-4" />
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="truncate text-xs font-semibold text-slate-800">
                            {firstItem?.productName ?? "—"}
                          </p>
                          <p className="text-[11px] text-slate-500">
                            {firstItem
                              ? `${firstItem.qty}x · ৳${firstItem.total.toLocaleString("en-BD")}`
                              : ""}
                            {order.items.length > 1
                              ? ` · +${order.items.length - 1}`
                              : ""}
                          </p>
                        </div>
                      </div>

                      {/* Courier ratio */}
                      <div className="shrink-0">
                        <WebOrderCourierRatioCell phone={order.phone} />
                      </div>
                    </div>

                    {/* Bottom: source badges + ID */}
                    <div className="mt-2 flex flex-wrap items-center gap-1.5 text-[10px]">
                      {(() => {
                        const { source, label } = getOrderSourceDisplay(order);
                        return (
                          <span className={sourceBadgeCls(source)}>{label}</span>
                        );
                      })()}
                      {(() => {
                        const wc = getWooCommerceStatus(order);
                        return wc ? (
                          <span className={wcStatusBadgeCls(wc)}>
                            {formatWcStatusLabel(wc)}
                          </span>
                        ) : null;
                      })()}
                      <span className="text-slate-400">
                        {order.id}
                        {order.wooNumber ? ` · WC #${order.wooNumber}` : ""}
                      </span>
                    </div>
                  </div>
                );
              })
            )}
          </div>

          {/* ── Desktop table view ── */}
          <div className="hidden overflow-x-auto lg:block">
          <table className="w-full min-w-[1220px] text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/90 text-left text-[10px] font-bold uppercase tracking-wide text-slate-500">
                <th className={clsx(stickyCheckCls, "px-3 py-3")}>
                  <input
                    type="checkbox"
                    checked={
                      paged.length > 0 &&
                      paged.every((o) => selected.has(o.id))
                    }
                    onChange={toggleAll}
                    className="rounded border-slate-300"
                    aria-label="Select all"
                  />
                </th>
                <th
                  className={clsx(
                    stickyOpenCls,
                    "px-3 py-3 text-left text-[10px] font-bold uppercase"
                  )}
                >
                  Open
                </th>
                <th className="min-w-[120px] px-3 py-3">Created at</th>
                <th className="min-w-[130px] px-3 py-3">Auto Call</th>
                <th className="min-w-[200px] px-3 py-3">Customer</th>
                <th className="min-w-[160px] px-3 py-3">Note</th>
                <th className="min-w-[200px] px-3 py-3">Order items</th>
                <th className="min-w-[160px] px-3 py-3">Courier ratio</th>
                <th className="min-w-[110px] px-3 py-3">Source / WC</th>
                <th className="min-w-[72px] px-3 py-3">Site</th>
              </tr>
            </thead>
            <tbody>
              {paged.length === 0 ? (
                <tr>
                  <td
                    colSpan={10}
                    className="px-4 py-12 text-center text-sm text-slate-500"
                  >
                    {ordersLoading ? "Loading orders…" : "No web orders in this tab."}
                  </td>
                </tr>
              ) : (
                paged.map((order) => {
                  const ws = resolveWebDisplayStatus(order);
                  const wa = `88${order.phone.replace(/\D/g, "")}`;
                  const isChecked = selected.has(order.id);

                  return (
                    <tr
                      key={order.id}
                      className={clsx(
                        "group border-b border-slate-50 align-top transition",
                        isChecked
                          ? "bg-teal-50/50"
                          : "hover:bg-teal-50/25"
                      )}
                    >
                      <td className={stickyBodyCell("check", isChecked)}>
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => toggleSelect(order.id)}
                          className="rounded border-slate-300"
                          aria-label={`Select ${order.id}`}
                        />
                      </td>

                      <td className={stickyBodyCell("open", isChecked)}>
                        <button
                          type="button"
                          onClick={() => openOrder(order)}
                          className="inline-flex w-full items-center justify-center gap-1 rounded-lg bg-teal-600 px-2.5 py-2 text-xs font-bold text-white shadow-sm transition hover:bg-teal-700"
                        >
                          Open
                          <ExternalLink className="h-3.5 w-3.5 shrink-0" />
                        </button>
                      </td>

                      <td className="px-3 py-3">
                        <p className="text-xs font-medium text-slate-700">
                          {order.createdAt}
                        </p>
                        <p className="mt-0.5 text-[10px] text-slate-400">
                          ID: {order.id}
                        </p>
                        {order.wooNumber && (
                          <p className="text-[10px] text-teal-600">
                            WC #{order.wooNumber}
                          </p>
                        )}
                        <span
                          className={clsx(
                            "mt-1.5 inline-flex rounded-full px-2 py-0.5 text-[9px] font-bold capitalize",
                            statusColors[ws]
                          )}
                        >
                          {ws.replace("_", " ")}
                        </span>
                      </td>

                      <td className="px-3 py-3">
                        <WebOrderAutoCallCell
                          log={autoCallByOrderId.get(order.id) ?? null}
                        />
                      </td>

                      <td className="px-3 py-3">
                        <div className="space-y-1 text-xs">
                          <div className="flex flex-wrap items-center gap-1.5">
                            <a
                              href={`tel:${order.phone}`}
                              className="inline-flex items-center gap-1 font-bold text-teal-700 hover:underline"
                            >
                              <Phone className="h-3 w-3 shrink-0" />
                              {order.phone}
                            </a>
                            <a
                              href={`https://wa.me/${wa}`}
                              target="_blank"
                              rel="noreferrer"
                              className="text-emerald-600 hover:text-emerald-700"
                              aria-label="WhatsApp"
                            >
                              <MessageCircle className="h-3.5 w-3.5" />
                            </a>
                          </div>
                          <p className="flex items-start gap-1 font-semibold text-slate-800">
                            <User className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" />
                            {order.customerName}
                          </p>
                          <p className="flex items-start gap-1 leading-snug text-slate-500">
                            <MapPin className="mt-0.5 h-3 w-3 shrink-0 text-slate-400" />
                            <span className="line-clamp-2">
                              {order.address}
                              {order.district ? `, ${order.district}` : ""}
                            </span>
                          </p>
                        </div>
                      </td>

                      <td className="px-3 py-3">
                        <p className="text-[10px] text-slate-400">
                          {formatRelativeTime(order.updatedAt)}
                        </p>
                        {storeHref ? (
                          <a
                            href={storeHref}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 block truncate text-[10px] text-teal-600 hover:underline"
                          >
                            {storeHref.replace(/^https?:\/\//, "")}
                          </a>
                        ) : null}
                        <p className="mt-1 line-clamp-3 text-xs leading-relaxed text-slate-600">
                          {order.note?.trim() || "—"}
                        </p>
                        <DuplicateBadge order={order} index={dupIndex} />
                      </td>

                      <td className="px-3 py-3">
                        <OrderItemsCell items={order.items} total={order.total} />
                      </td>

                      <td className="px-3 py-3">
                        <WebOrderCourierRatioCell phone={order.phone} />
                      </td>

                      <td className="px-3 py-3">
                        <div className="flex flex-wrap gap-1">
                          {(() => {
                            const { source, label } = getOrderSourceDisplay(order);
                            return (
                              <span
                                className={sourceBadgeCls(source)}
                                title="Order source"
                              >
                                {label}
                              </span>
                            );
                          })()}
                          {(() => {
                            const wc = getWooCommerceStatus(order);
                            return wc ? (
                              <span
                                className={wcStatusBadgeCls(wc)}
                                title="WooCommerce status"
                              >
                                {formatWcStatusLabel(wc)}
                              </span>
                            ) : null;
                          })()}
                        </div>
                      </td>

                      <td className="px-3 py-3">
                        <span className="rounded-md bg-slate-100 px-2 py-1 text-[10px] font-bold capitalize text-slate-700">
                          {order.wooOrderId ? storeSite : order.source}
                        </span>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
          </div>

          <TablePagination
            totalRows={filteredTotal}
            page={page}
            rowsPerPage={rowsPerPage}
            selectedCount={selected.size}
            onPageChange={setPage}
            onRowsPerPageChange={setRowsPerPage}
            variant="teal"
          />
        </div>
      </div>

      {cooldownOrder && (
        <IncompleteCooldownModal
          order={cooldownOrder}
          onCancel={() => setCooldownOrder(null)}
          onProceed={() => {
            const o = cooldownOrder;
            setCooldownOrder(null);
            router.push(viewUrl(o.id));
          }}
        />
      )}
    </div>
  );
}
