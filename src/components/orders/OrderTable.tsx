"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  loadOrders,
  toggleOrderPrinted,
  setOrderTracking,
  type Order,
  type OrderLine,
  type OrderStatus,
} from "@/lib/orders-store";
import { ORDER_STATUS_LABELS } from "@/lib/order-status-tabs";
import { buildOrderListChips } from "@/lib/order-list-chips";
import { loadActiveDeliveryMethods } from "@/lib/delivery-methods-store";
import { getProductImageForLine } from "@/lib/inventory-store";
import { OrderStatusTabs } from "./OrderStatusTabs";
import { OrderDetailsModal } from "./OrderDetailsModal";
import { OrderRowActionsMenu } from "./OrderRowActionsMenu";
import { ApprovedOrderActionsMenu } from "./ApprovedOrderActionsMenu";
import { canEditOrder } from "@/lib/order-edit";
import { OrderSourceBadge } from "@/components/orders/OrderSourceBadge";
import { OrderTagChips } from "@/components/orders/OrderTagChips";
import { CourierTrackingCell } from "@/components/orders/CourierTrackingCell";
import {
  Search,
  Filter,
  ArrowUpDown,
  LayoutList,
  LayoutGrid,
  MessageCircle,
  Phone,
  Check,
} from "lucide-react";
import {
  TablePagination,
  DEFAULT_ROWS_PER_PAGE,
  paginateSlice,
} from "@/components/ui/TablePagination";
import clsx from "clsx";
import { OrderProductsCell } from "@/components/orders/OrderProductsCell";
import { OrderProductsList } from "@/components/orders/OrderProductsList";
import { OrderCreatorCell } from "@/components/orders/OrderCreatorCell";
import { OrderNoteModal } from "@/components/orders/OrderNoteModal";
import { OrderProductDetailModal } from "@/components/orders/OrderProductDetailModal";

type Props = {
  mode?: "approved" | "all" | "preorder";
  showStatusTabs?: boolean;
};

type ViewMode = "comfort" | "compact";
type SortKey = "date" | "total" | "customer";

const TH =
  "whitespace-nowrap px-4 py-4 text-left text-sm font-bold uppercase tracking-wide text-slate-700";
const TD = "align-top px-4 py-4 text-sm leading-relaxed text-slate-800";

function phoneScore(phone: string): number {
  const n = phone.replace(/\D/g, "").slice(-2);
  const v = parseInt(n, 10);
  return Number.isNaN(v) ? 92 : 80 + (v % 21);
}

export function OrderTable({ mode = "approved", showStatusTabs = false }: Props) {
  const router = useRouter();
  const [orders, setOrders] = useState<Order[]>([]);
  const [search, setSearch] = useState("");
  const [activeTab, setActiveTab] = useState<OrderStatus>("pending");
  const [activeChip, setActiveChip] = useState<string>("all");
  const [view, setView] = useState<ViewMode>(
    showStatusTabs || mode === "approved" ? "compact" : "comfort"
  );
  const [sortKey, setSortKey] = useState<SortKey>("date");
  const [sortDesc, setSortDesc] = useState(true);
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [openMenu, setOpenMenu] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [rowsPerPage, setRowsPerPage] = useState(DEFAULT_ROWS_PER_PAGE);
  const [editingTrack, setEditingTrack] = useState<string | null>(null);
  const [trackDraft, setTrackDraft] = useState("");
  const [deliveryMethods, setDeliveryMethods] = useState(loadActiveDeliveryMethods);
  const [viewOrderId, setViewOrderId] = useState<string | null>(null);
  const [notePopup, setNotePopup] = useState<string | null>(null);
  const [productPopup, setProductPopup] = useState<OrderLine[] | null>(null);

  const goEditOrder = (id: string) => {
    setOpenMenu(null);
    setViewOrderId(null);
    router.push(`/dashboard/orders/approved/edit/${encodeURIComponent(id)}`);
  };
  const orderChips = useMemo(
    () => buildOrderListChips(deliveryMethods),
    [deliveryMethods]
  );
  const chipDef = orderChips.find((c) => c.id === activeChip);

  const refresh = useCallback(() => {
    const filter: Parameters<typeof loadOrders>[0] = { search };

    if (showStatusTabs || mode === "approved") {
      filter.status = activeTab;
      if (activeTab === "pending") filter.excludeWebQueue = true;
    } else if (mode === "preorder") {
      filter.preorder = true;
    }

    if (chipDef?.deliveryMethodId) {
      filter.deliveryMethodId = chipDef.deliveryMethodId;
    }

    setOrders(loadOrders(filter));
  }, [search, activeTab, mode, showStatusTabs, chipDef]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  useEffect(() => {
    const onData = () => refresh();
    window.addEventListener("youraiseller-data-updated", onData);
    return () => window.removeEventListener("youraiseller-data-updated", onData);
  }, [refresh]);

  const reloadDeliveryMethods = useCallback(() => {
    const active = loadActiveDeliveryMethods();
    setDeliveryMethods(active);
    setActiveChip((chip) => {
      if (chip === "all") return chip;
      return active.some((m) => m.id === chip) ? chip : "all";
    });
  }, []);

  useEffect(() => {
    reloadDeliveryMethods();
  }, [activeTab, reloadDeliveryMethods]);

  useEffect(() => {
    const onDeliveryMethods = () => reloadDeliveryMethods();
    window.addEventListener("youraiseller-delivery-methods-updated", onDeliveryMethods);
    return () =>
      window.removeEventListener(
        "youraiseller-delivery-methods-updated",
        onDeliveryMethods
      );
  }, [reloadDeliveryMethods]);

  useEffect(() => {
    setPage(1);
  }, [activeTab, activeChip, search]);

  const sorted = useMemo(() => {
    const list = [...orders];
    list.sort((a, b) => {
      let cmp = 0;
      if (sortKey === "date") cmp = a.createdAt.localeCompare(b.createdAt);
      else if (sortKey === "total") cmp = a.total - b.total;
      else cmp = a.customerName.localeCompare(b.customerName);
      return sortDesc ? -cmp : cmp;
    });
    return list;
  }, [orders, sortKey, sortDesc]);

  const paged = paginateSlice(sorted, page, rowsPerPage);

  const chipCounts = useMemo(() => {
    const base = loadOrders(
      showStatusTabs || mode === "approved"
        ? {
            status: activeTab,
            ...(activeTab === "pending" ? { excludeWebQueue: true } : {}),
          }
        : mode === "preorder"
          ? { preorder: true }
          : undefined
    );
    const chips = buildOrderListChips(deliveryMethods);
    const counts: Record<string, number> = {};
    for (const chip of chips) {
      if (chip.id === "all") counts.all = base.length;
      else if (chip.deliveryMethodId) {
        counts[chip.id] = base.filter(
          (o) => o.deliveryMethodId === chip.deliveryMethodId
        ).length;
      }
    }
    return counts;
  }, [activeTab, mode, showStatusTabs, deliveryMethods]);

  const toggleSelect = (id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const toggleAllPage = () => {
    if (paged.every((o) => selected.has(o.id))) {
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

  return (
    <div className="space-y-0">
      {(showStatusTabs || mode === "approved") && (
        <OrderStatusTabs active={activeTab} onChange={setActiveTab} />
      )}

      <div className="yai-panel overflow-x-hidden overflow-y-visible rounded-t-none border-t-0">
        {/* Courier / channel chips */}
        <div className="flex gap-1.5 overflow-x-auto border-b border-slate-100 bg-slate-50/90 px-3 py-2">
          {orderChips.map((chip) => (
            <button
              key={chip.id}
              type="button"
              onClick={() => setActiveChip(chip.id)}
              className={clsx(
                "shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold uppercase tracking-wide transition",
                activeChip === chip.id
                  ? "bg-slate-800 text-white"
                  : "bg-white text-slate-600 shadow-sm hover:bg-slate-100"
              )}
            >
              {chip.label}
              <span className="ml-1 opacity-80">({chipCounts[chip.id] ?? 0})</span>
            </button>
          ))}
        </div>

        {/* Toolbar */}
        <div className="flex flex-wrap items-center gap-2 border-b border-slate-100 px-3 py-3">
          <div className="relative min-w-[200px] flex-1">
            <span className="pointer-events-none absolute inset-y-0 left-0 flex w-9 items-center justify-center text-slate-400">
              <Search className="h-4 w-4 shrink-0" />
            </span>
            <input
              placeholder="Search orders..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full rounded-lg border border-slate-200 py-2 pl-9 pr-3 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
            />
          </div>
          <button
            type="button"
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            <Filter className="h-4 w-4" /> Filters
          </button>
          <button
            type="button"
            onClick={() => setSortDesc((d) => !d)}
            className="flex items-center gap-1.5 rounded-lg border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-600 hover:bg-slate-50"
          >
            <ArrowUpDown className="h-4 w-4" />
            <select
              value={sortKey}
              onChange={(e) => setSortKey(e.target.value as SortKey)}
              className="bg-transparent outline-none"
              onClick={(e) => e.stopPropagation()}
            >
              <option value="date">Date Created</option>
              <option value="total">Grand Total</option>
              <option value="customer">Customer</option>
            </select>
            {sortDesc ? "↓" : "↑"}
          </button>
          <div className="ml-auto flex rounded-lg border border-slate-200 p-0.5">
            <button
              type="button"
              onClick={() => setView("comfort")}
              className={clsx(
                "rounded-md p-2",
                view === "comfort" ? "bg-indigo-100 text-indigo-700" : "text-slate-400"
              )}
              title="Comfort view"
            >
              <LayoutGrid className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setView("compact")}
              className={clsx(
                "rounded-md p-2",
                view === "compact" ? "bg-indigo-100 text-indigo-700" : "text-slate-400"
              )}
              title="Table view (row by row)"
            >
              <LayoutList className="h-4 w-4" />
            </button>
          </div>
        </div>

        {(showStatusTabs || mode === "approved") && selected.size > 0 && (
          <ApprovedOrderActionsMenu
            selectedIds={Array.from(selected)}
            activeChipId={activeChip}
            activeTab={activeTab}
            onDone={refresh}
            onClearSelection={() => setSelected(new Set())}
          />
        )}

        {/* Turume-style table — horizontal + vertical scroll, larger text */}
        {view === "compact" && (
          <div className="rounded-xl border border-slate-200 bg-white shadow-sm">
            <div className="max-h-[min(75vh,780px)] overflow-auto overscroll-x-contain scroll-smooth">
              <table className="w-full min-w-[1400px] border-collapse text-sm">
                <thead className="sticky top-0 z-20 bg-slate-100 shadow-sm">
                  <tr className="border-b border-slate-200">
                    <th className={clsx(TH, "w-11")}>
                      <input
                        type="checkbox"
                        checked={
                          paged.length > 0 &&
                          paged.every((o) => selected.has(o.id))
                        }
                        onChange={toggleAllPage}
                      />
                    </th>
                    <th className={clsx(TH, "min-w-[108px]")}>Date</th>
                    <th className={clsx(TH, "min-w-[128px]")}>Invoice</th>
                    <th className={clsx(TH, "min-w-[220px]")}>Customer</th>
                    <th className={clsx(TH, "min-w-[150px]")}>Note</th>
                    <th className={clsx(TH, "min-w-[220px]")}>Products</th>
                    <th className={clsx(TH, "min-w-[120px]")}>Tags</th>
                    <th className={clsx(TH, "w-14 text-center")}>Print</th>
                    <th className={clsx(TH, "min-w-[88px]")}>Total</th>
                    <th className={clsx(TH, "min-w-[150px]")}>Upload</th>
                    <th className={clsx(TH, "min-w-[100px]")}>User</th>
                    <th className={clsx(TH, "min-w-[100px]")}>Source</th>
                  </tr>
                </thead>
                <tbody>
                  {paged.map((o) => (
                    <OrderTableRow
                      key={o.id}
                      order={o}
                      selected={selected.has(o.id)}
                      onSelect={() => toggleSelect(o.id)}
                      openMenu={openMenu === o.id}
                      onMenuToggle={() =>
                        setOpenMenu(openMenu === o.id ? null : o.id)
                      }
                      onCloseMenu={() => setOpenMenu(null)}
                      editingTrack={editingTrack === o.id}
                      trackDraft={trackDraft}
                      onTrackEdit={() => {
                        setEditingTrack(o.id);
                        setTrackDraft(o.trackingId ?? "");
                      }}
                      onTrackDraft={setTrackDraft}
                      onTrackSave={() => {
                        setOrderTracking(o.id, trackDraft);
                        setEditingTrack(null);
                        refresh();
                      }}
                      onPrinted={() => {
                        toggleOrderPrinted(o.id);
                        refresh();
                      }}
                      canEdit={canEditOrder(o.status)}
                      onViewDetails={() => setViewOrderId(o.id)}
                      onEdit={() => goEditOrder(o.id)}
                      onRefresh={refresh}
                      activeChipId={activeChip}
                      showCourierActions={
                        showStatusTabs || mode === "approved"
                      }
                      showPanelLink={activeTab !== "pending"}
                      onNoteClick={setNotePopup}
                      onProductClick={setProductPopup}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Card view (optional) */}
        <div
          className={clsx(
            view === "comfort" ? "space-y-2 p-3" : "hidden",
            "overflow-visible"
          )}
        >
          {view === "comfort" &&
            paged.map((o) => (
            <OrderRow
              key={o.id}
              order={o}
              selected={selected.has(o.id)}
              onSelect={() => toggleSelect(o.id)}
              openMenu={openMenu === o.id}
              onMenuToggle={() => setOpenMenu(openMenu === o.id ? null : o.id)}
              onCloseMenu={() => setOpenMenu(null)}
              phoneScore={phoneScore(o.phone)}
              editingTrack={editingTrack === o.id}
              trackDraft={trackDraft}
              onTrackEdit={() => {
                setEditingTrack(o.id);
                setTrackDraft(o.trackingId ?? "");
              }}
              onTrackDraft={setTrackDraft}
              onTrackSave={() => {
                setOrderTracking(o.id, trackDraft);
                setEditingTrack(null);
                refresh();
              }}
              onPrinted={() => {
                toggleOrderPrinted(o.id);
                refresh();
              }}
              canEdit={canEditOrder(o.status)}
              onViewDetails={() => setViewOrderId(o.id)}
              onEdit={() => goEditOrder(o.id)}
              onRefresh={refresh}
              activeChipId={activeChip}
              showCourierActions={showStatusTabs || mode === "approved"}
              showPanelLink={activeTab !== "pending"}
              onNoteClick={setNotePopup}
              onProductClick={setProductPopup}
            />
          ))}
        </div>

        {paged.length === 0 && (
          <p className="p-12 text-center text-sm text-slate-500">
            No orders in this view.{" "}
            <Link
              href="/dashboard/orders/approved/new"
              className="font-semibold text-indigo-600 hover:underline"
            >
              Create new order
            </Link>
          </p>
        )}

        <TablePagination
          totalRows={sorted.length}
          page={page}
          rowsPerPage={rowsPerPage}
          selectedCount={selected.size}
          onPageChange={setPage}
          onRowsPerPageChange={setRowsPerPage}
          variant="indigo"
        />
      </div>

      {viewOrderId && (
        <OrderDetailsModal
          orderId={viewOrderId}
          variant="approved"
          onClose={() => setViewOrderId(null)}
          onEdit={() => goEditOrder(viewOrderId)}
        />
      )}
      <OrderNoteModal
        open={!!notePopup}
        note={notePopup ?? ""}
        onClose={() => setNotePopup(null)}
      />
      <OrderProductDetailModal
        open={!!productPopup?.length}
        items={productPopup}
        onClose={() => setProductPopup(null)}
      />
    </div>
  );
}

function OrderTableRow({
  order: o,
  selected,
  onSelect,
  openMenu,
  onMenuToggle,
  onCloseMenu,
  editingTrack,
  trackDraft,
  onTrackEdit,
  onTrackDraft,
  onTrackSave,
  onPrinted,
  canEdit,
  onViewDetails,
  onEdit,
  onRefresh,
  activeChipId,
  showCourierActions,
  showPanelLink = true,
  onNoteClick,
  onProductClick,
}: {
  order: Order;
  selected: boolean;
  onSelect: () => void;
  openMenu: boolean;
  onMenuToggle: () => void;
  onCloseMenu: () => void;
  editingTrack: boolean;
  trackDraft: string;
  onTrackEdit: () => void;
  onTrackDraft: (v: string) => void;
  onTrackSave: () => void;
  onPrinted: () => void;
  canEdit: boolean;
  onViewDetails: () => void;
  onEdit: () => void;
  onRefresh: () => void;
  activeChipId: string;
  showCourierActions?: boolean;
  showPanelLink?: boolean;
  onNoteClick: (note: string) => void;
  onProductClick: (items: OrderLine[]) => void;
}) {
  const createdParts = o.createdAt.split(",");

  return (
    <tr
      className={clsx(
        "border-b border-slate-100 transition-colors hover:bg-indigo-50/40",
        selected && "bg-indigo-50/70"
      )}
    >
      <td className={TD}>
        <input type="checkbox" checked={selected} onChange={onSelect} />
      </td>
      <td className={TD}>
        <p className="text-sm text-slate-600">{createdParts[0]}</p>
        {createdParts[1] && (
          <p className="text-xs text-slate-500">{createdParts[1].trim()}</p>
        )}
      </td>
      <td className={TD}>
        <div className="flex items-start gap-1">
          <button
            type="button"
            onClick={onViewDetails}
            className="text-base font-bold text-indigo-700 hover:underline"
          >
            {o.id}
          </button>
          <OrderRowActionsMenu
            order={o}
            open={openMenu}
            onToggle={onMenuToggle}
            onClose={onCloseMenu}
            canEdit={canEdit}
            onViewDetails={onViewDetails}
            onEdit={onEdit}
            onRefresh={onRefresh}
            activeChipId={activeChipId}
            showCourierActions={showCourierActions}
          />
        </div>
      </td>
      <td className={TD}>
        <p className="font-semibold leading-snug text-slate-900">
          {o.customerName}
        </p>
        <p className="mt-0.5 text-sm text-slate-600">{o.phone}</p>
        <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-slate-500">
          {o.address}
          {o.district ? `, ${o.district}` : ""}
        </p>
      </td>
      <td className={TD}>
        {o.internalNote?.trim() ? (
          <button
            type="button"
            onClick={() => onNoteClick(o.internalNote!.trim())}
            className="line-clamp-3 w-full text-left text-sm leading-relaxed text-slate-700 transition hover:text-violet-700 hover:underline"
          >
            {o.internalNote}
          </button>
        ) : (
          <span className="text-sm text-slate-400">—</span>
        )}
      </td>
      <td className={TD}>
        <OrderProductsCell
          items={o.items}
          onMoreClick={onViewDetails}
          onProductClick={() => onProductClick(o.items)}
        />
      </td>
      <td className={TD}>
        <OrderTagChips tags={o.tags} />
      </td>
      <td className={clsx(TD, "text-center")}>
        <button type="button" onClick={onPrinted} className="mx-auto">
          {o.printed ? (
            <Check className="h-5 w-5 text-emerald-600" />
          ) : (
            <span className="text-sm text-slate-300">—</span>
          )}
        </button>
      </td>
      <td className={TD}>
        <p className="text-base font-extrabold tabular-nums text-slate-900">
          ৳{o.total.toLocaleString()}
        </p>
      </td>
      <td className={clsx(TD, "overflow-visible")}>
        <CourierTrackingCell
          order={o}
          variant="table"
          showPanelLink={showPanelLink}
          editing={editingTrack}
          trackDraft={trackDraft}
          onTrackDraft={onTrackDraft}
          onTrackEdit={onTrackEdit}
          onTrackSave={onTrackSave}
        />
      </td>
      <td className={TD}>
        <OrderCreatorCell order={o} />
      </td>
      <td className={TD}>
        <OrderSourceBadge order={o} size="md" />
      </td>
    </tr>
  );
}

function OrderRow({
  order: o,
  selected,
  onSelect,
  openMenu,
  onMenuToggle,
  onCloseMenu,
  phoneScore,
  editingTrack,
  trackDraft,
  onTrackEdit,
  onTrackDraft,
  onTrackSave,
  onPrinted,
  canEdit,
  onViewDetails,
  onEdit,
  onRefresh,
  activeChipId,
  showCourierActions,
  showPanelLink = true,
  onNoteClick,
  onProductClick,
}: {
  order: Order;
  selected: boolean;
  onSelect: () => void;
  openMenu: boolean;
  onMenuToggle: () => void;
  onCloseMenu: () => void;
  phoneScore: number;
  editingTrack: boolean;
  trackDraft: string;
  onTrackEdit: () => void;
  onTrackDraft: (v: string) => void;
  onTrackSave: () => void;
  onPrinted: () => void;
  canEdit: boolean;
  onViewDetails: () => void;
  onEdit: () => void;
  onRefresh: () => void;
  activeChipId: string;
  showCourierActions?: boolean;
  showPanelLink?: boolean;
  onNoteClick: (note: string) => void;
  onProductClick: (items: OrderLine[]) => void;
}) {
  const firstItem = o.items[0];
  const productImg = firstItem ? getProductImageForLine(firstItem) : undefined;
  const due = Math.max(0, o.total - (o.advance ?? 0));
  const score = phoneScore;

  return (
    <article
      className={clsx(
        "rounded-xl border transition",
        selected
          ? "border-indigo-300 bg-indigo-50/40 ring-2 ring-indigo-100"
          : "border-slate-100 bg-white hover:border-indigo-200 hover:shadow-md"
      )}
    >
      <div className="grid gap-3 p-4 lg:grid-cols-[auto_1fr_auto]">
        <div className="flex items-start gap-3">
          <input
            type="checkbox"
            checked={selected}
            onChange={onSelect}
            className="mt-1 rounded border-slate-300"
          />
          <div className="min-w-0">
            <p className="text-xs text-slate-500">{o.createdAt}</p>
            <p className="text-lg font-extrabold tracking-tight text-indigo-700">
              {o.id}
            </p>
            <div className="mt-1 flex items-center gap-0.5">
              <span className="inline-flex items-center gap-1 rounded-full bg-amber-100 px-2 py-0.5 text-[10px] font-bold text-amber-800">
                <span className="h-1.5 w-1.5 rounded-full bg-amber-500" />
                {ORDER_STATUS_LABELS[o.status]}
              </span>
              <OrderRowActionsMenu
                order={o}
                open={openMenu}
                onToggle={onMenuToggle}
                onClose={onCloseMenu}
                canEdit={canEdit}
                onViewDetails={onViewDetails}
                onEdit={onEdit}
                onRefresh={onRefresh}
                activeChipId={activeChipId}
                showCourierActions={showCourierActions}
              />
            </div>
          </div>
        </div>

        <div className="grid min-w-0 gap-3 md:grid-cols-2 xl:grid-cols-4">
          {/* Customer */}
          <div className="min-w-0 rounded-lg bg-slate-50 p-3">
            <p className="font-bold text-slate-900">{o.customerName}</p>
            <div className="mt-1 flex flex-wrap items-center gap-2">
              <a
                href={`tel:${o.phone}`}
                className="flex items-center gap-1 text-sm font-semibold text-indigo-600"
              >
                <Phone className="h-3.5 w-3.5" />
                {o.phone}
              </a>
              <span
                className={clsx(
                  "rounded-full px-2 py-0.5 text-[10px] font-bold",
                  score >= 95
                    ? "bg-emerald-100 text-emerald-700"
                    : "bg-amber-100 text-amber-700"
                )}
              >
                {score}% verified
              </span>
              <a
                href={`https://wa.me/88${o.phone.replace(/\D/g, "")}`}
                target="_blank"
                rel="noreferrer"
                className="text-emerald-600 hover:text-emerald-700"
              >
                <MessageCircle className="h-4 w-4" />
              </a>
            </div>
            <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-slate-600">
              {o.address}
              {o.district ? `, ${o.district}` : ""}
            </p>
          </div>

          {/* Note */}
          <div className="min-w-0 rounded-lg border border-dashed border-amber-200 bg-amber-50/50 p-3">
            <p className="text-[10px] font-bold uppercase text-amber-700">Note</p>
            {o.internalNote?.trim() ? (
              <button
                type="button"
                onClick={() => onNoteClick(o.internalNote!.trim())}
                className="mt-1 line-clamp-4 w-full text-left text-xs leading-relaxed text-slate-700 hover:text-violet-700 hover:underline"
              >
                {o.internalNote}
              </button>
            ) : (
              <p className="mt-1 text-xs text-slate-400">—</p>
            )}
            {o.advance > 0 && (
              <p className="mt-2 text-xs font-semibold text-indigo-700">
                Advance ৳{o.advance.toLocaleString()}
                {due > 0 && ` · Due ৳${due.toLocaleString()}`}
              </p>
            )}
          </div>

          {/* Products */}
          <OrderProductsList
            items={o.items}
            variant="cards"
            fallbackImage={productImg}
            onMoreClick={onViewDetails}
            onProductClick={() => onProductClick(o.items)}
          />

          {/* Meta */}
          <div className="flex flex-col gap-2">
            <OrderTagChips tags={o.tags} size="md" />
            <button
              type="button"
              onClick={onPrinted}
              className={clsx(
                "flex items-center gap-2 rounded-lg border px-2 py-1.5 text-xs font-semibold",
                o.printed
                  ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                  : "border-slate-200 text-slate-500"
              )}
            >
              <Check className={clsx("h-4 w-4", o.printed && "text-emerald-600")} />
              {o.printed ? "Printed" : "Mark printed"}
            </button>
            <p className="text-2xl font-extrabold text-slate-900">
              ৳{o.total.toLocaleString()}
            </p>
          </div>
        </div>

        {/* Right rail */}
        <div className="flex flex-col items-end gap-2 border-t border-slate-100 pt-3 lg:border-l lg:border-t-0 lg:pl-4 lg:pt-0">
          {showPanelLink && (
            <CourierTrackingCell
              order={o}
              variant="card"
              showPanelLink={showPanelLink}
              editing={editingTrack}
              trackDraft={trackDraft}
              onTrackDraft={onTrackDraft}
              onTrackEdit={onTrackEdit}
              onTrackSave={onTrackSave}
            />
          )}
          <OrderCreatorCell order={o} compact />
          <OrderSourceBadge order={o} size="md" />
        </div>
      </div>
    </article>
  );
}
