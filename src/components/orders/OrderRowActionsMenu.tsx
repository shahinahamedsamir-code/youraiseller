"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import {
  MoreVertical,
  FileText,
  Printer,
  ImageIcon,
  Pencil,
  Send,
  Truck,
  CircleCheck,
  ArrowLeft,
  XCircle,
  ListTodo,
  StickyNote,
  Copy,
  ExternalLink,
  Plane,
  RefreshCw,
  Loader2,
  Tag,
} from "lucide-react";
import clsx from "clsx";
import {
  toggleOrderPrinted,
  updateOrder,
  updateOrderStatus,
  appendOrderActivity,
  type Order,
} from "@/lib/orders-store";
import {
  ORDER_STATUS_LABELS,
  getOrderStatusFlowAction,
  getOrderStatusBackAction,
} from "@/lib/order-status-tabs";
import type { OrderStatus } from "@/lib/orders-store";
import {
  courierSupportsApiEntry,
  getCourierEntryActionLabel,
  getRefreshCourierStatusLabel,
  pushOrdersToCourier,
  refreshCourierStatusForOrders,
  resolveCourierEntryMethod,
} from "@/lib/courier-entry";
import { showCourierAlert } from "@/lib/courier-entry-alerts";
import { CancelOrderModal } from "@/components/orders/CancelOrderModal";
import { loadBusinessSettings } from "@/lib/business-settings-store";
import { renderInvoiceDoc } from "@/lib/invoice-templates";
import { renderStickerDoc } from "@/lib/sticker-templates";

const MENU_W = 240;
const MENU_MAX_H = 420;

type Props = {
  order: Order;
  open: boolean;
  onToggle: () => void;
  onClose: () => void;
  canEdit: boolean;
  onViewDetails: () => void;
  onEdit: () => void;
  onRefresh: () => void;
  /** Hide "Order details" when already inside the details panel */
  skipDetails?: boolean;
  /** Teal styling for web order list */
  variant?: "approved" | "web";
  /** Full-width trigger for order list right rail */
  trigger?: "icon" | "rail";
  /** Order list chip filter — used to pick courier for entry */
  activeChipId?: string;
  /** Show manual courier entry (approved order list) */
  showCourierActions?: boolean;
};

type Item = {
  id: string;
  label: string;
  hint?: string;
  icon: typeof FileText;
  onClick: () => void;
  tone?: "default" | "primary" | "danger";
  show?: boolean;
};

function esc(v: unknown): string {
  return String(v ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function openPrintWindow(order: Order) {
  const biz = loadBusinessSettings();
  const template =
    (order.deliveryMethodId && biz.deliveryInvoices[order.deliveryMethodId]) ||
    biz.invoiceTemplate;
  const html = renderInvoiceDoc(order, biz, template, {
    print: true,
    paper: biz.invoicePaper,
  });
  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}

function openStickerWindow(order: Order) {
  const biz = loadBusinessSettings();
  const html = renderStickerDoc(order, biz, biz.stickerTemplate, biz.stickerSize, {
    print: true,
  });
  const w = window.open("", "_blank");
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}

function openJpgPreview(order: Order) {
  const w = window.open("", "_blank", "width=480,height=720");
  if (!w) return;
  const biz = loadBusinessSettings();
  const sym = biz.currency === "USD" ? "$" : "৳";
  const brand = biz.name || "YOUR AI SELLER";
  const logo = biz.logoUrl
    ? `<img src="${esc(biz.logoUrl)}" alt="logo" style="max-height:40px;max-width:160px;object-fit:contain;margin-bottom:6px"/>`
    : "";
  const items = order.items
    .map(
      (i) =>
        `<li style="margin:6px 0"><b>${esc(i.productName)}</b><br><span style="color:#64748b;font-size:12px">${esc(i.productCode)} · Qty ${i.qty} · ${sym}${i.total}</span></li>`
    )
    .join("");
  w.document.write(`<!DOCTYPE html><html><head><title>${esc(order.id)} export</title></head>
<body style="font-family:system-ui;background:linear-gradient(135deg,#eef2ff,#fdf2f8);padding:20px;margin:0">
<div style="background:#fff;border-radius:16px;padding:20px;box-shadow:0 8px 30px rgba(79,70,229,.15);max-width:400px">
${logo}
<div style="font-size:11px;font-weight:700;color:#6366f1;text-transform:uppercase">${esc(brand)}</div>
<h2 style="margin:8px 0 4px;color:#1e1b4b">${esc(order.id)}</h2>
<p style="margin:0 0 12px;color:#64748b;font-size:13px">${esc(order.createdAt)}</p>
<p style="margin:0 0 8px"><b>${esc(order.customerName)}</b><br>${esc(order.phone)}</p>
<p style="font-size:12px;color:#475569;margin:0 0 12px">${esc(order.address)}</p>
<ul style="padding-left:18px;margin:0 0 12px">${items}</ul>
<p style="font-size:18px;font-weight:800;color:#4f46e5;margin:0">${sym}${order.total.toLocaleString()}</p>
${biz.invoiceFooter ? `<p style="font-size:11px;color:#94a3b8;margin:10px 0 0">${esc(biz.invoiceFooter)}</p>` : ""}
</div>
</body></html>`);
  w.document.close();
}

export function OrderRowActionsMenu({
  order: o,
  open,
  onToggle,
  onClose,
  canEdit,
  onViewDetails,
  onEdit,
  onRefresh,
  skipDetails = false,
  variant = "approved",
  trigger = "icon",
  activeChipId = "all",
  showCourierActions = false,
}: Props) {
  const isWeb = variant === "web";
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const [courierBusy, setCourierBusy] = useState(false);
  const [courierMsg, setCourierMsg] = useState("");
  const [cancelOpen, setCancelOpen] = useState(false);

  const courierMethod = showCourierActions
    ? resolveCourierEntryMethod({
        chipDeliveryMethodId: activeChipId !== "all" ? activeChipId : undefined,
        orderDeliveryMethodId: o.deliveryMethodId,
      })
    : undefined;
  const canCourierEntry =
    courierMethod && courierSupportsApiEntry(courierMethod);
  const showCourierSection =
    showCourierActions &&
    courierMethod &&
    (o.status === "pending" || o.status === "rts" || o.status === "shipped");

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;

    const place = () => {
      const rect = btnRef.current!.getBoundingClientRect();
      const gap = 6;
      let left = rect.left;
      let top = rect.bottom + gap;

      if (left + MENU_W > window.innerWidth - 12) {
        left = window.innerWidth - MENU_W - 12;
      }
      if (left < 12) left = 12;

      if (top + MENU_MAX_H > window.innerHeight - 12) {
        top = rect.top - MENU_MAX_H - gap;
      }
      if (top < 12) top = 12;

      setCoords({ top, left });
    };

    place();
    window.addEventListener("resize", place);
    window.addEventListener("scroll", place, true);
    return () => {
      window.removeEventListener("resize", place);
      window.removeEventListener("scroll", place, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (btnRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      onClose();
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open, onClose]);

  const flowStep = getOrderStatusFlowAction(o.status);
  const flowBack = getOrderStatusBackAction(o.status);

  const advanceStatus = (next: OrderStatus) => {
    updateOrderStatus(o.id, next);
    onRefresh();
    onClose();
  };

  const runCourierEntry = async () => {
    if (!courierMethod) return;
    if (!canCourierEntry) {
      showCourierAlert({
        type: "error",
        title: "API keys missing",
        message: `Add Steadfast Api-Key and Secret in Delivery Methods → ${courierMethod.name}.`,
      });
      return;
    }
    if (
      !window.confirm(
        `Send ${o.id} to ${courierMethod.name}? Customer, address, phone and COD will be pushed.`
      )
    ) {
      return;
    }
    setCourierBusy(true);
    setCourierMsg("");
    try {
      const batch = await pushOrdersToCourier([o.id], courierMethod.id);
      const r = batch.results[0];
      setCourierMsg(r?.ok ? `Sent · ${r.trackingCode}` : r?.message ?? "Failed");
      if (r?.ok) {
        onRefresh();
        onClose();
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Failed";
      setCourierMsg(msg);
      showCourierAlert({ type: "error", title: "Courier push failed", message: msg });
    } finally {
      setCourierBusy(false);
    }
  };

  const runRefreshStatus = async () => {
    if (!courierMethod || !canCourierEntry || !o.trackingId) return;
    setCourierBusy(true);
    try {
      const batch = await refreshCourierStatusForOrders(
        [o.id],
        courierMethod.id
      );
      setCourierMsg(batch.results[0]?.message ?? "Done");
      onRefresh();
    } finally {
      setCourierBusy(false);
    }
  };

  const appendNote = (prefix: string, text: string) => {
    const chunk = `[${prefix} ${new Date().toLocaleString("en-GB", { day: "2-digit", month: "short", hour: "2-digit", minute: "2-digit" })}] ${text}`;
    const next = o.note?.trim() ? `${o.note.trim()}\n${chunk}` : chunk;
    updateOrder(o.id, { note: next });
    appendOrderActivity(o.id, {
      type: "note",
      title: prefix === "TASK" ? "Task added" : "Note added",
      detail: text,
    });
    onRefresh();
    onClose();
  };

  const items: Item[] = [
    {
      id: "details",
      label: "Order details",
      hint: "Full view",
      icon: FileText,
      tone: "primary",
      onClick: () => {
        onViewDetails();
        onClose();
      },
      show: !skipDetails,
    },
    {
      id: "print",
      label: o.printed ? "Printed" : "Print",
      hint: "Invoice",
      icon: Printer,
      onClick: () => {
        toggleOrderPrinted(o.id);
        openPrintWindow(o);
        onRefresh();
        onClose();
      },
      show: true,
    },
    {
      id: "sticker",
      label: "Print sticker",
      hint: "Shipping label",
      icon: Tag,
      onClick: () => {
        openStickerWindow(o);
        onClose();
      },
      show: true,
    },
    {
      id: "jpg",
      label: "JPG export",
      hint: "Preview card",
      icon: ImageIcon,
      onClick: () => {
        openJpgPreview(o);
        onClose();
      },
      show: true,
    },
    {
      id: "edit",
      label: "Edit order",
      hint: "Fix mistakes",
      icon: Pencil,
      tone: "primary",
      onClick: () => {
        onEdit();
        onClose();
      },
      show: canEdit,
    },
    {
      id: "flow_next",
      label: flowStep?.action ?? "Next step",
      hint: flowStep?.hint,
      icon:
        o.status === "pending"
          ? Send
          : o.status === "rts"
            ? Truck
            : CircleCheck,
      tone: "primary",
      onClick: () => {
        if (flowStep) advanceStatus(flowStep.next);
      },
      show: !!flowStep,
    },
    {
      id: "flow_back",
      label: flowBack?.action ?? "Go back",
      hint: flowBack?.hint,
      icon: ArrowLeft,
      onClick: () => {
        if (flowBack) advanceStatus(flowBack.prev);
      },
      show: !!flowBack,
    },
    {
      id: "cancel",
      label: "Cancel order",
      icon: XCircle,
      tone: "danger",
      onClick: () => {
        onClose();
        setCancelOpen(true);
      },
      show:
        variant === "approved" &&
        o.status !== "cancelled" &&
        o.status !== "delivered",
    },
    {
      id: "task",
      label: "Create task",
      icon: ListTodo,
      onClick: () => {
        const t = window.prompt("Task for this order:", "");
        if (t?.trim()) appendNote("TASK", t.trim());
      },
      show: true,
    },
    {
      id: "note",
      label: "Add note",
      icon: StickyNote,
      onClick: () => {
        const n = window.prompt("Add note:", "");
        if (n?.trim()) appendNote("NOTE", n.trim());
      },
      show: true,
    },
    {
      id: "copy",
      label: "Copy invoice ID",
      icon: Copy,
      onClick: () => {
        void navigator.clipboard?.writeText(o.id);
        onClose();
      },
      show: true,
    },
  ];

  const visible = items.filter((i) => i.show !== false);
  const primary = visible.filter((i) => ["details", "edit"].includes(i.id));
  const workflow = visible.filter((i) =>
    ["flow_next", "flow_back", "cancel"].includes(i.id)
  );
  const exportItems = visible.filter((i) =>
    ["print", "sticker", "jpg"].includes(i.id)
  );
  const extra = visible.filter((i) =>
    ["task", "note", "copy"].includes(i.id)
  );

  const renderItem = (item: Item) => (
    <button
      key={item.id}
      type="button"
      onClick={item.onClick}
      className={clsx(
        "flex w-full items-center gap-3 rounded-xl px-3 py-2.5 text-left text-sm transition",
        item.tone === "danger" && "text-rose-600 hover:bg-rose-50",
        item.tone === "primary" && "text-indigo-700 hover:bg-indigo-50",
        (!item.tone || item.tone === "default") &&
          "text-slate-700 hover:bg-slate-50"
      )}
    >
      <span
        className={clsx(
          "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg",
          item.tone === "danger" && "bg-rose-100 text-rose-600",
          item.tone === "primary" && "bg-indigo-100 text-indigo-600",
          (!item.tone || item.tone === "default") && "bg-slate-100 text-slate-600"
        )}
      >
        <item.icon className="h-4 w-4" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block font-semibold leading-tight">{item.label}</span>
        {item.hint && (
          <span className="block text-[10px] font-medium text-slate-400">
            {item.hint}
          </span>
        )}
      </span>
      {item.id === "details" && (
        <ExternalLink className="h-3.5 w-3.5 shrink-0 text-slate-300" />
      )}
    </button>
  );

  const menuPanel = open && mounted && (
    <>
      <div
        className="fixed inset-0 z-[100] bg-slate-900/20"
        aria-hidden
        onClick={onClose}
      />
      <div
        ref={menuRef}
        role="menu"
        className="fixed z-[101] overflow-hidden rounded-2xl border border-indigo-100/80 bg-white shadow-2xl shadow-indigo-500/15 ring-1 ring-indigo-50"
        style={{
          top: coords.top,
          left: coords.left,
          width: MENU_W,
          maxHeight: MENU_MAX_H,
        }}
      >
        <div className="border-b border-indigo-50 bg-gradient-to-r from-indigo-50 via-white to-rose-50/80 px-3 py-2.5">
          <p className="text-[10px] font-bold uppercase tracking-wider text-indigo-500">
            Order actions
          </p>
          <p className="truncate text-sm font-extrabold text-slate-900">{o.id}</p>
          <p className="text-[10px] text-slate-500">
            {ORDER_STATUS_LABELS[o.status]} · ৳{o.total.toLocaleString()}
          </p>
        </div>

        <div className="max-h-[min(70vh,360px)] overflow-y-auto p-1.5">
          {primary.length > 0 && (
            <>
              <div className="space-y-0.5">{primary.map(renderItem)}</div>
              <div className="my-1.5 border-t border-slate-100" />
            </>
          )}

          {workflow.length > 0 && (
            <>
              <p className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                Status action
              </p>
              <div className="space-y-0.5">{workflow.map(renderItem)}</div>
              <div className="my-1.5 border-t border-slate-100" />
            </>
          )}

          {showCourierSection && courierMethod && (
            <>
              <p className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                Courier services
              </p>
              <div className="space-y-2 px-1 pb-1">
                <button
                  type="button"
                  disabled={courierBusy || !canCourierEntry || !!o.trackingId}
                  onClick={runCourierEntry}
                  className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 px-3 py-2.5 text-sm font-extrabold text-white shadow-md hover:from-rose-600 disabled:opacity-50"
                >
                  {courierBusy ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Plane className="h-4 w-4" />
                  )}
                  {getCourierEntryActionLabel(courierMethod)}
                </button>
                {!canCourierEntry && (
                  <p className="text-[10px] text-amber-700 px-1">
                    Add API keys in Delivery Methods.
                  </p>
                )}
                {o.trackingId && canCourierEntry && (
                  <button
                    type="button"
                    disabled={courierBusy}
                    onClick={runRefreshStatus}
                    className="flex w-full items-center justify-center gap-2 rounded-lg border border-slate-200 py-2 text-xs font-bold text-slate-700 hover:bg-slate-50"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    {getRefreshCourierStatusLabel(courierMethod)}
                  </button>
                )}
                {courierMsg && (
                  <p className="text-[10px] font-semibold text-slate-600 px-1">
                    {courierMsg}
                  </p>
                )}
              </div>
              <div className="my-1.5 border-t border-slate-100" />
            </>
          )}

          {exportItems.length > 0 && (
            <>
              <p className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
                View &amp; export
              </p>
              <div className="space-y-0.5">{exportItems.map(renderItem)}</div>
              <div className="my-1.5 border-t border-slate-100" />
            </>
          )}

          <p className="px-2 py-1 text-[9px] font-bold uppercase tracking-wider text-slate-400">
            Team
          </p>
          <div className="space-y-0.5">{extra.map(renderItem)}</div>

          <Link
            href={`/dashboard/orders/approved/super-edit?id=${o.id}`}
            onClick={onClose}
            className="mt-1 flex items-center gap-2 rounded-xl px-3 py-2 text-xs font-semibold text-slate-500 hover:bg-slate-50"
          >
            Super Edit (status & tracking) →
          </Link>
        </div>
      </div>
    </>
  );

  return (
    <>
      <button
        ref={btnRef}
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          onToggle();
        }}
        className={clsx(
          "transition",
          trigger === "rail"
            ? clsx(
                "flex w-full items-center justify-center gap-2 rounded-lg border px-3 py-2 text-xs font-bold",
                open
                  ? isWeb
                    ? "border-teal-300 bg-teal-50 text-teal-800"
                    : "border-indigo-300 bg-indigo-50 text-indigo-800"
                  : "border-slate-200 bg-white text-slate-700 hover:border-indigo-300 hover:bg-indigo-50"
              )
            : clsx(
                "shrink-0 rounded-lg border border-slate-200 bg-white p-1.5 shadow-sm",
                open
                  ? isWeb
                    ? "border-teal-300 bg-teal-100 text-teal-700"
                    : "border-indigo-300 bg-indigo-100 text-indigo-700"
                  : "text-slate-600 hover:border-indigo-300 hover:bg-indigo-50 hover:text-indigo-700"
              )
        )}
        aria-label="Order actions"
        aria-expanded={open}
        aria-haspopup="menu"
      >
        <MoreVertical className="h-4 w-4" />
      </button>
      {mounted && menuPanel && createPortal(menuPanel, document.body)}
      <CancelOrderModal
        order={o}
        open={cancelOpen}
        onClose={() => setCancelOpen(false)}
        onDone={onRefresh}
      />
    </>
  );
}
