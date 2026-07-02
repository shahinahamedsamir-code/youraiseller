"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ClipboardList,
  Filter,
  Search,
  RotateCcw,
  FileSpreadsheet,
  ExternalLink,
  CalendarRange,
} from "lucide-react";
import clsx from "clsx";
import {
  loadOrders,
  getOrder,
  type Order,
  type OrderStatus,
  type PaymentMethod,
} from "@/lib/orders-store";
import { isInWebQueue, isWebSourceOrder } from "@/lib/web-order-queue";
import { ORDER_STATUS_LABELS } from "@/lib/order-status-tabs";
import {
  ORDER_SOURCE_OPTIONS,
  inferOrderSourceFromOrder,
  type OrderSource,
} from "@/lib/order-source";
import { loadDeliveryMethods } from "@/lib/delivery-methods-store";
import { OrderStatusBadge } from "./OrderStatusBadge";
import { OrderSourceBadge } from "./OrderSourceBadge";
import {
  getCourierPanelTrackingUrl,
  getCourierTrackingDisplayId,
} from "@/lib/courier-tracking-url";
import { OrderDetailsModal } from "./OrderDetailsModal";
import {
  TablePagination,
  DEFAULT_ROWS_PER_PAGE,
  paginateSlice,
} from "@/components/ui/TablePagination";
import { parseActivityDate } from "@/lib/order-activity";

type StatusFilter = OrderStatus | "all";
type DateField = "created" | "approved";
/** Which orders appear in the report base list */
type OrderScope = "approved" | "web_queue" | "web" | "all";

type Filters = {
  search: string;
  invoice: string;
  orderScope: OrderScope;
  dateField: DateField;
  dateFrom: string;
  dateTo: string;
  orderSource: OrderSource | "all";
  courierId: string;
  district: string;
  status: StatusFilter;
  payment: PaymentMethod | "all";
  handledBy: string;
  tag: string;
};

const EMPTY_FILTERS: Filters = {
  search: "",
  invoice: "",
  orderScope: "approved",
  dateField: "created",
  dateFrom: "",
  dateTo: "",
  orderSource: "all",
  courierId: "all",
  district: "all",
  status: "all",
  payment: "all",
  handledBy: "all",
  tag: "all",
};

function toInputDate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function getOrderDateMs(order: Order, field: DateField): number {
  const raw =
    field === "approved" ? order.approvedAt ?? order.createdAt : order.createdAt;
  return parseActivityDate(raw);
}

function inDateRange(ms: number, from: string, to: string): boolean {
  if (!from && !to) return true;
  if (!ms) return false;
  const start = from ? new Date(`${from}T00:00:00`).getTime() : Number.NEGATIVE_INFINITY;
  const end = to ? new Date(`${to}T23:59:59.999`).getTime() : Number.POSITIVE_INFINITY;
  return ms >= start && ms <= end;
}

function formatDateRangeLabel(from: string, to: string): string {
  const fmt = (iso: string) => {
    const d = new Date(`${iso}T12:00:00`);
    return d.toLocaleDateString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    });
  };
  if (from && to) return `${fmt(from)} – ${fmt(to)}`;
  if (from) return `From ${fmt(from)}`;
  if (to) return `Until ${fmt(to)}`;
  return "";
}

const SUMMARY_CARDS: {
  key: StatusFilter;
  label: string;
  border: string;
  bg: string;
  countKey?: OrderStatus;
}[] = [
  { key: "all", label: "Total", border: "border-t-violet-500", bg: "bg-violet-50/80" },
  {
    key: "pending",
    label: "Pending",
    border: "border-t-sky-500",
    bg: "bg-sky-50/80",
    countKey: "pending",
  },
  {
    key: "rts",
    label: "RTS",
    border: "border-t-teal-500",
    bg: "bg-teal-50/80",
    countKey: "rts",
  },
  {
    key: "shipped",
    label: "Shipped",
    border: "border-t-indigo-500",
    bg: "bg-indigo-50/80",
    countKey: "shipped",
  },
  {
    key: "delivered",
    label: "Delivered",
    border: "border-t-emerald-500",
    bg: "bg-emerald-50/80",
    countKey: "delivered",
  },
  {
    key: "returned",
    label: "Returned",
    border: "border-t-rose-500",
    bg: "bg-rose-50/80",
    countKey: "returned",
  },
  {
    key: "pending_return",
    label: "Pending Return",
    border: "border-t-orange-500",
    bg: "bg-orange-50/80",
    countKey: "pending_return",
  },
];

function loadOrdersForScope(scope: OrderScope): Order[] {
  const all = loadOrders();
  switch (scope) {
    case "approved":
      return all.filter((o) => !isInWebQueue(o));
    case "web_queue":
      return all.filter((o) => isInWebQueue(o));
    case "web":
      return all.filter((o) => isWebSourceOrder(o));
    case "all":
      return all;
  }
}

function matchesSearch(o: Order, q: string): boolean {
  const lower = q.toLowerCase();
  if (
    o.id.toLowerCase().includes(lower) ||
    o.customerName.toLowerCase().includes(lower) ||
    o.phone.includes(q)
  ) {
    return true;
  }
  return o.items.some(
    (i) =>
      i.productName.toLowerCase().includes(lower) ||
      i.productCode.toLowerCase().includes(lower)
  );
}

function applyFilters(orders: Order[], f: Filters): Order[] {
  let list = orders;
  if (f.status !== "all") list = list.filter((o) => o.status === f.status);
  if (f.orderSource !== "all") {
    list = list.filter((o) => inferOrderSourceFromOrder(o) === f.orderSource);
  }
  if (f.courierId !== "all") {
    list = list.filter((o) => o.deliveryMethodId === f.courierId);
  }
  if (f.district !== "all") {
    list = list.filter((o) => o.district === f.district);
  }
  if (f.payment !== "all") {
    list = list.filter((o) => o.paymentMethod === f.payment);
  }
  if (f.handledBy !== "all") {
    list = list.filter((o) => (o.handledBy ?? "Staff") === f.handledBy);
  }
  if (f.tag !== "all") {
    list = list.filter((o) => o.tags?.includes(f.tag));
  }
  if (f.search.trim()) {
    list = list.filter((o) => matchesSearch(o, f.search.trim()));
  }
  if (f.invoice.trim()) {
    const q = f.invoice.trim().toLowerCase();
    list = list.filter(
      (o) =>
        o.id.toLowerCase().includes(q) ||
        (o.trackingId?.toLowerCase().includes(q) ?? false)
    );
  }
  if (f.dateFrom || f.dateTo) {
    list = list.filter((o) => {
      const ms = getOrderDateMs(o, f.dateField);
      return inDateRange(ms, f.dateFrom, f.dateTo);
    });
  }
  return list;
}

function statusCounts(orders: Order[]): Record<OrderStatus, number> & { all: number } {
  const counts = {
    all: orders.length,
    pending: 0,
    rts: 0,
    shipped: 0,
    delivered: 0,
    pending_return: 0,
    returned: 0,
    partial: 0,
    cancelled: 0,
    pending_cancel: 0,
    preorder: 0,
    lost: 0,
  };
  for (const o of orders) {
    counts[o.status] = (counts[o.status] ?? 0) + 1;
  }
  return counts;
}

export function AllOrdersReport() {
  const router = useRouter();
  const [tick, setTick] = useState(0);
  const [filters, setFilters] = useState<Filters>(EMPTY_FILTERS);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE);
  const [viewOrderId, setViewOrderId] = useState<string | null>(null);

  const refresh = useCallback(() => setTick((t) => t + 1), []);

  useEffect(() => {
    const onData = () => refresh();
    window.addEventListener("youraiseller-data-updated", onData);
    return () => window.removeEventListener("youraiseller-data-updated", onData);
  }, [refresh]);

  const baseOrders = useMemo(() => {
    void tick;
    return loadOrdersForScope(filters.orderScope);
  }, [tick, filters.orderScope]);

  const couriers = useMemo(() => loadDeliveryMethods(), [tick]);

  const districts = useMemo(() => {
    const set = new Set(baseOrders.map((o) => o.district).filter(Boolean));
    return Array.from(set).sort();
  }, [baseOrders]);

  const staffOptions = useMemo(() => {
    const set = new Set(baseOrders.map((o) => o.handledBy ?? "Staff"));
    return Array.from(set).sort();
  }, [baseOrders]);

  const tagOptions = useMemo(() => {
    const set = new Set<string>();
    for (const o of baseOrders) {
      o.tags?.forEach((t) => set.add(t));
    }
    return Array.from(set).sort();
  }, [baseOrders]);

  const counts = useMemo(() => statusCounts(baseOrders), [baseOrders]);

  const filtered = useMemo(
    () => applyFilters(baseOrders, filters),
    [baseOrders, filters]
  );

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) =>
      b.createdAt.localeCompare(a.createdAt)
    );
  }, [filtered]);

  const paged = paginateSlice(sorted, page, rowsPerPage);

  useEffect(() => {
    setPage(1);
  }, [filters, rowsPerPage]);

  const setFilter = <K extends keyof Filters>(key: K, value: Filters[K]) => {
    setFilters((prev) => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => setFilters(EMPTY_FILTERS);

  const setDatePreset = (preset: "today" | "7d" | "30d") => {
    const end = new Date();
    const start = new Date();
    if (preset === "7d") start.setDate(start.getDate() - 6);
    if (preset === "30d") start.setDate(start.getDate() - 29);
    setFilters((prev) => ({
      ...prev,
      dateFrom: toInputDate(start),
      dateTo: toInputDate(end),
    }));
  };

  const dateRangeLabel = formatDateRangeLabel(filters.dateFrom, filters.dateTo);

  const hasActiveFilters =
    filters.search ||
    filters.invoice ||
    filters.orderScope !== "approved" ||
    filters.dateFrom ||
    filters.dateTo ||
    filters.orderSource !== "all" ||
    filters.courierId !== "all" ||
    filters.district !== "all" ||
    filters.status !== "all" ||
    filters.payment !== "all" ||
    filters.handledBy !== "all" ||
    filters.tag !== "all";

  const goEditOrder = (id: string) => {
    setViewOrderId(null);
    router.push(`/dashboard/orders/approved/edit/${encodeURIComponent(id)}`);
  };

  const cardCount = (key: StatusFilter) => {
    if (key === "all") return counts.all;
    return counts[key] ?? 0;
  };

  const viewedOrder = viewOrderId ? getOrder(viewOrderId) : undefined;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-slate-900">
            <ClipboardList className="h-7 w-7 text-violet-500" />
            Orders Report
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Showing {filtered.length} order{filtered.length === 1 ? "" : "s"}
            {dateRangeLabel ? ` · ${dateRangeLabel}` : ""}
            {hasActiveFilters && !dateRangeLabel ? " · filters applied" : ""}
          </p>
        </div>
        <Link
          href="/dashboard/orders/approved/list"
          className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
        >
          Order List →
        </Link>
      </div>

      {/* Filters */}
      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-bold text-slate-800">
            <Filter className="h-4 w-4 text-violet-500" />
            Filters
          </div>
          {hasActiveFilters && (
            <button
              type="button"
              onClick={clearFilters}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-1 text-xs font-bold text-violet-600 hover:bg-violet-50"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Clear
            </button>
          )}
        </div>
        <div className="grid gap-3 border-b border-slate-100 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Filter by
            </span>
            <select
              value={filters.dateField}
              onChange={(e) =>
                setFilter("dateField", e.target.value as DateField)
              }
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-400"
            >
              <option value="created">Order created date</option>
              <option value="approved">Approved order date</option>
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Date range · from
            </span>
            <div className="relative">
              <CalendarRange className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                type="date"
                value={filters.dateFrom}
                onChange={(e) => setFilter("dateFrom", e.target.value)}
                className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
            </div>
          </label>
          <label className="block space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Date range · to
            </span>
            <input
              type="date"
              value={filters.dateTo}
              min={filters.dateFrom || undefined}
              onChange={(e) => setFilter("dateTo", e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
          </label>
          <div className="flex flex-col justify-end gap-1.5">
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Quick range
            </span>
            <div className="flex flex-wrap gap-1.5">
              {(
                [
                  ["today", "Today"],
                  ["7d", "7 days"],
                  ["30d", "30 days"],
                ] as const
              ).map(([key, label]) => (
                <button
                  key={key}
                  type="button"
                  onClick={() => setDatePreset(key)}
                  className="rounded-lg border border-violet-200 bg-violet-50 px-2.5 py-1.5 text-xs font-bold text-violet-700 hover:bg-violet-100"
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
        </div>
        <div className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Order list
            </span>
            <select
              value={filters.orderScope}
              onChange={(e) =>
                setFilter("orderScope", e.target.value as OrderScope)
              }
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-400"
            >
              <option value="approved">Approved orders</option>
              <option value="web_queue">Web orders (queue)</option>
              <option value="web">All web / Woo orders</option>
              <option value="all">All orders</option>
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Search
            </span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={filters.search}
                onChange={(e) => setFilter("search", e.target.value)}
                placeholder="Name, phone, SKU, product…"
                className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
              />
            </div>
          </label>
          <label className="block space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Source
            </span>
            <select
              value={filters.orderSource}
              onChange={(e) =>
                setFilter("orderSource", e.target.value as Filters["orderSource"])
              }
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-400"
            >
              <option value="all">All sources</option>
              {ORDER_SOURCE_OPTIONS.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Courier
            </span>
            <select
              value={filters.courierId}
              onChange={(e) => setFilter("courierId", e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-400"
            >
              <option value="all">All couriers</option>
              {couriers.map((m) => (
                <option key={m.id} value={m.id}>
                  {m.name}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
              District
            </span>
            <select
              value={filters.district}
              onChange={(e) => setFilter("district", e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-400"
            >
              <option value="all">All districts</option>
              {districts.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Status
            </span>
            <select
              value={filters.status}
              onChange={(e) =>
                setFilter("status", e.target.value as StatusFilter)
              }
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-400"
            >
              <option value="all">All statuses</option>
              {(Object.keys(ORDER_STATUS_LABELS) as OrderStatus[]).map((s) => (
                <option key={s} value={s}>
                  {ORDER_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Payment
            </span>
            <select
              value={filters.payment}
              onChange={(e) =>
                setFilter("payment", e.target.value as Filters["payment"])
              }
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-400"
            >
              <option value="all">All payments</option>
              <option value="cod">COD</option>
              <option value="bkash">bKash</option>
              <option value="nagad">Nagad</option>
              <option value="prepaid">Prepaid</option>
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Taken by
            </span>
            <select
              value={filters.handledBy}
              onChange={(e) => setFilter("handledBy", e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-400"
            >
              <option value="all">All users</option>
              {staffOptions.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Order tag
            </span>
            <select
              value={filters.tag}
              onChange={(e) => setFilter("tag", e.target.value)}
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-400"
            >
              <option value="all">All tags</option>
              {tagOptions.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 sm:col-span-2">
            <span className="text-[10px] font-bold uppercase tracking-wide text-slate-500">
              Invoice / tracking search
            </span>
            <input
              value={filters.invoice}
              onChange={(e) => setFilter("invoice", e.target.value)}
              placeholder="Order ID or tracking number…"
              className="w-full rounded-lg border border-slate-200 px-3 py-2 text-sm outline-none focus:border-violet-400 focus:ring-2 focus:ring-violet-100"
            />
          </label>
        </div>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-7">
        {SUMMARY_CARDS.map((card) => {
          const active = filters.status === card.key;
          const n = card.countKey ? counts[card.countKey] : cardCount(card.key);
          return (
            <button
              key={card.key}
              type="button"
              onClick={() => setFilter("status", card.key)}
              className={clsx(
                "rounded-xl border border-slate-200/80 px-3 py-3 text-left shadow-sm transition hover:shadow-md",
                card.bg,
                card.border,
                "border-t-4",
                active && "ring-2 ring-violet-400 ring-offset-1"
              )}
            >
              <p className="text-[10px] font-bold uppercase tracking-wide text-slate-600">
                {card.label}
              </p>
              <p className="mt-1 text-2xl font-extrabold text-slate-900">{n}</p>
              {card.key === "all" && (
                <p className="text-[9px] font-semibold text-violet-600">Active</p>
              )}
            </button>
          );
        })}
      </div>

      {/* Table panel */}
      <div className="overflow-hidden rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 px-4 py-3">
          <div className="flex gap-1 rounded-lg bg-slate-100 p-0.5">
            <span className="rounded-md bg-white px-3 py-1.5 text-xs font-bold text-violet-700 shadow-sm">
              Orders
            </span>
            <span
              className="cursor-not-allowed rounded-md px-3 py-1.5 text-xs font-semibold text-slate-400"
              title="Coming soon"
            >
              Product Report
            </span>
          </div>
          <div className="ml-auto flex flex-wrap items-center gap-2">
            <button
              type="button"
              disabled
              title="Coming soon"
              className="inline-flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-xs font-bold text-slate-400"
            >
              <FileSpreadsheet className="h-3.5 w-3.5" />
              Export Excel
            </button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full min-w-[960px] text-left text-sm">
            <thead>
              <tr className="border-b border-slate-100 bg-slate-50/90 text-[10px] font-bold uppercase tracking-wide text-slate-500">
                <th className="px-4 py-3">Order</th>
                <th className="px-4 py-3">Products</th>
                <th className="px-4 py-3">Status</th>
                <th className="px-4 py-3">Tags</th>
                <th className="px-4 py-3">Amount</th>
                <th className="px-4 py-3">Date</th>
                <th className="px-4 py-3">Method</th>
                <th className="px-4 py-3">Source</th>
                <th className="px-4 py-3">Tracking</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-50">
              {paged.length === 0 ? (
                <tr>
                  <td
                    colSpan={9}
                    className="px-4 py-12 text-center text-sm text-slate-500"
                  >
                    No orders match your filters.
                  </td>
                </tr>
              ) : (
                paged.map((o) => (
                  <ReportRow
                    key={o.id}
                    order={o}
                    onOpen={() => setViewOrderId(o.id)}
                  />
                ))
              )}
            </tbody>
          </table>
        </div>

        <TablePagination
          totalRows={sorted.length}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={setPage}
          onRowsPerPageChange={setRowsPerPage}
          variant="indigo"
        />
      </div>

      {viewOrderId && viewedOrder && (
        <OrderDetailsModal
          orderId={viewOrderId}
          variant={isInWebQueue(viewedOrder) ? "web" : "approved"}
          onClose={() => setViewOrderId(null)}
          onEdit={() => goEditOrder(viewOrderId)}
        />
      )}
    </div>
  );
}

function ReportRow({
  order: o,
  onOpen,
}: {
  order: Order;
  onOpen: () => void;
}) {
  const first = o.items[0];
  const more = o.items.length - 1;
  // o.total is already net of advance — don't subtract it again (double count).
  const due = Math.max(0, o.total);
  const unpaid = due > 0;
  const panelUrl = getCourierPanelTrackingUrl(o);

  return (
    <tr className="align-top hover:bg-violet-50/30">
      <td className="px-4 py-3">
        <button
          type="button"
          onClick={onOpen}
          className="text-left font-bold text-violet-700 hover:underline"
        >
          {o.id}
        </button>
        <p className="mt-0.5 font-semibold text-slate-800">{o.customerName}</p>
        <p className="text-xs text-slate-500">{o.phone}</p>
      </td>
      <td className="px-4 py-3">
        {first ? (
          <>
            <p className="font-semibold text-slate-800">
              <span className="text-violet-600">{first.qty}×</span>{" "}
              {first.productName}
            </p>
            <p className="text-[11px] text-slate-500">{first.productCode}</p>
            {more > 0 && (
              <p className="text-[11px] font-semibold text-slate-400">
                +{more} more
              </p>
            )}
          </>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </td>
      <td className="px-4 py-3">
        <OrderStatusBadge status={o.status} />
        {isInWebQueue(o) && (
          <span className="mt-1 inline-block rounded-full bg-teal-100 px-2 py-0.5 text-[10px] font-bold text-teal-800">
            Web queue
          </span>
        )}
        {unpaid && o.status === "delivered" && (
          <p className="mt-1 text-[10px] font-semibold text-rose-600">
            Payment not received
          </p>
        )}
      </td>
      <td className="px-4 py-3">
        <div className="flex max-w-[140px] flex-wrap gap-1">
          {o.tags?.length ? (
            o.tags.slice(0, 2).map((t) => (
              <span
                key={t}
                className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-600"
              >
                {t}
              </span>
            ))
          ) : (
            <span className="text-slate-400">—</span>
          )}
        </div>
      </td>
      <td className="px-4 py-3">
        <p className="font-extrabold text-slate-900">
          ৳{o.total.toLocaleString()}
        </p>
        {unpaid && (
          <span className="mt-0.5 inline-block rounded bg-rose-100 px-1.5 py-0.5 text-[10px] font-bold text-rose-700">
            Unpaid
          </span>
        )}
        {o.advance > 0 && (
          <p className="text-[10px] text-emerald-600">
            Adv ৳{o.advance.toLocaleString()}
          </p>
        )}
      </td>
      <td className="px-4 py-3 text-xs text-slate-600">
        <p>{o.createdAt}</p>
        {o.approvedAt && (
          <p className="mt-0.5 text-[10px] text-slate-400">
            Approved {o.approvedAt}
          </p>
        )}
      </td>
      <td className="px-4 py-3 text-xs font-semibold text-slate-700">
        {o.courier}
      </td>
      <td className="px-4 py-3">
        <OrderSourceBadge order={o} />
      </td>
      <td className="px-4 py-3">
        {getCourierTrackingDisplayId(o) ? (
          <div>
            <p className="font-mono text-xs font-semibold text-slate-800">
              {getCourierTrackingDisplayId(o)}
            </p>
            {panelUrl ? (
              <a
                href={panelUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-0.5 inline-flex items-center gap-0.5 text-[10px] font-bold text-sky-600 hover:underline"
              >
                Parcel Link
                <ExternalLink className="h-3 w-3" />
              </a>
            ) : null}
            <button
              type="button"
              onClick={onOpen}
              className="mt-0.5 block text-[10px] font-semibold text-slate-500 hover:text-violet-700"
            >
              Order details
            </button>
          </div>
        ) : (
          <span className="text-slate-400">—</span>
        )}
      </td>
    </tr>
  );
}
