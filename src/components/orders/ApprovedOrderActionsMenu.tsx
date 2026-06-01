"use client";

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import {
  ChevronDown,
  Loader2,
  Plane,
  Printer,
  RefreshCw,
  Send,
  Truck,
} from "lucide-react";
import {
  courierSupportsApiEntry,
  getCourierEntryActionLabel,
  getRefreshCourierStatusLabel,
  pushOrdersToCourier,
  refreshCourierStatusForOrders,
  resolveCourierEntryMethod,
} from "@/lib/courier-entry";
import { showCourierAlert } from "@/lib/courier-entry-alerts";
import {
  getOrderStatusFlowAction,
  ORDER_STATUS_LABELS,
} from "@/lib/order-status-tabs";
import { updateOrderStatus } from "@/lib/orders-store";
import type { OrderStatus } from "@/lib/orders-store";
import type { DeliveryMethod } from "@/lib/delivery-methods-store";

type Props = {
  selectedIds: string[];
  activeChipId: string;
  activeTab: OrderStatus;
  onDone: () => void;
  onClearSelection?: () => void;
};

const MENU_W = 320;

export function ApprovedOrderActionsMenu({
  selectedIds,
  activeChipId,
  activeTab,
  onDone,
  onClearSelection,
}: Props) {
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  const btnRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLDivElement>(null);
  const [mounted, setMounted] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });

  const count = selectedIds.length;
  const courierMethod = resolveCourierEntryMethod({
    chipDeliveryMethodId: activeChipId !== "all" ? activeChipId : undefined,
  });
  const canApiEntry = courierMethod && courierSupportsApiEntry(courierMethod);
  const entryLabel = courierMethod
    ? getCourierEntryActionLabel(courierMethod)
    : "Courier entry";
  const refreshLabel = courierMethod
    ? getRefreshCourierStatusLabel(courierMethod)
    : "Refresh status";

  const flow = getOrderStatusFlowAction(activeTab);
  const showCourierEntry =
    activeTab === "pending" || activeTab === "rts" || activeTab === "shipped";

  useEffect(() => setMounted(true), []);

  useLayoutEffect(() => {
    if (!open || !btnRef.current) return;
    const place = () => {
      const rect = btnRef.current!.getBoundingClientRect();
      let left = rect.left;
      let top = rect.bottom + 6;
      if (left + MENU_W > window.innerWidth - 12) {
        left = window.innerWidth - MENU_W - 12;
      }
      if (top + 480 > window.innerHeight - 12) {
        top = rect.top - 480 - 6;
      }
      setCoords({ top: Math.max(12, top), left: Math.max(12, left) });
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
      setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  const runEntry = async () => {
    if (!courierMethod || count === 0) return;
    if (!canApiEntry) {
      const msg = `Configure ${courierMethod.name} API keys under Delivery Methods → Edit.`;
      setMessage(msg);
      showCourierAlert({
        type: "error",
        title: "API keys missing",
        message: msg,
      });
      return;
    }
    if (
      !window.confirm(
        count === 1
          ? `Send 1 order to ${courierMethod.name}? Customer details and COD will be pushed.`
          : `Send ${count} orders to ${courierMethod.name}? Customer details and COD will be pushed for each.`
      )
    ) {
      return;
    }

    setBusy(true);
    setMessage("");
    try {
      const batch = await pushOrdersToCourier(selectedIds, courierMethod.id);
      const parts = [
        batch.ok > 0 ? `${batch.ok} sent ✓` : null,
        batch.fail > 0 ? `${batch.fail} failed` : null,
        batch.skipped > 0 ? `${batch.skipped} skipped` : null,
      ].filter(Boolean);
      setMessage(parts.join(" · ") || "Done");
      onDone();
      if (batch.ok > 0) onClearSelection?.();
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Courier entry failed";
      setMessage(msg);
      showCourierAlert({ type: "error", title: "Courier push failed", message: msg });
    } finally {
      setBusy(false);
    }
  };

  const runRefresh = async () => {
    if (!courierMethod || !canApiEntry || count === 0) return;
    setBusy(true);
    setMessage("");
    try {
      const batch = await refreshCourierStatusForOrders(
        selectedIds,
        courierMethod.id
      );
      setMessage(
        `Synced ${batch.updated} · ${batch.statusChanged} moved to new status tab`
      );
      onDone();
    } catch (e) {
      setMessage(e instanceof Error ? e.message : "Refresh failed");
    } finally {
      setBusy(false);
    }
  };

  const bulkStatus = (next: OrderStatus) => {
    if (!window.confirm(`Move ${count} order(s) to ${ORDER_STATUS_LABELS[next]}?`))
      return;
    for (const id of selectedIds) {
      updateOrderStatus(id, next);
    }
    onDone();
    setOpen(false);
    onClearSelection?.();
  };

  const menu =
    open &&
    mounted &&
    createPortal(
      <>
        <div
          className="fixed inset-0 z-[90] bg-slate-900/25"
          onClick={() => setOpen(false)}
        />
        <div
          ref={menuRef}
          className="fixed z-[91] overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl"
          style={{ top: coords.top, left: coords.left, width: MENU_W }}
        >
          <div className="border-b border-slate-100 bg-slate-50 px-4 py-3">
            <p className="text-xs font-bold uppercase tracking-wide text-slate-500">
              Actions
            </p>
            <p className="text-sm font-extrabold text-slate-900">
              {count} selected
            </p>
            {courierMethod && (
              <p className="mt-0.5 text-[11px] text-slate-500">
                Courier: <strong>{courierMethod.name}</strong>
                {courierMethod.preferred ? " (preferred)" : ""}
              </p>
            )}
          </div>

          <div className="max-h-[70vh] overflow-y-auto p-3 space-y-4">
            <section>
              <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                Print
              </p>
              <div className="flex flex-wrap gap-2">
                {["Invoice", "Sticker"].map((label) => (
                  <button
                    key={label}
                    type="button"
                    className="rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                    onClick={() =>
                      setMessage(`${label} print — select orders and use row menu`)
                    }
                  >
                    <Printer className="mr-1 inline h-3 w-3" />
                    {label}
                  </button>
                ))}
              </div>
            </section>

            {flow && (
              <section>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Status update
                </p>
                <button
                  type="button"
                  onClick={() => bulkStatus(flow.next)}
                  className="flex w-full items-center gap-2 rounded-xl border border-indigo-200 bg-indigo-50 px-3 py-2.5 text-sm font-bold text-indigo-800 hover:bg-indigo-100"
                >
                  <Send className="h-4 w-4" />
                  {flow.action} ({count})
                </button>
              </section>
            )}

            {showCourierEntry && (
              <section>
                <p className="mb-2 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                  Courier services
                </p>
                <p className="mb-2 text-[11px] text-slate-500">
                  Manual push only — nothing is sent until you click entry.
                </p>
                <CourierEntryButton
                  method={courierMethod}
                  label={entryLabel}
                  disabled={busy || count === 0 || !canApiEntry}
                  onClick={runEntry}
                />
                {!canApiEntry && courierMethod && (
                  <p className="mt-2 text-[11px] text-amber-700">
                    Add API keys for {courierMethod.name} in Delivery Methods.
                  </p>
                )}
                {canApiEntry && (
                  <button
                    type="button"
                    disabled={busy || count === 0}
                    onClick={runRefresh}
                    className="mt-2 flex w-full items-center justify-center gap-2 rounded-xl border border-slate-200 px-3 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50 disabled:opacity-50"
                  >
                    <RefreshCw className="h-4 w-4" />
                    {refreshLabel}
                  </button>
                )}
              </section>
            )}
          </div>
        </div>
      </>,
      document.body
    );

  if (count === 0) return null;

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-indigo-100 bg-indigo-50/60 px-3 py-2">
      <button
        ref={btnRef}
        type="button"
        disabled={busy}
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          "inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-bold shadow-md transition",
          open
            ? "bg-indigo-700 text-white"
            : "bg-indigo-600 text-white hover:bg-indigo-700",
          busy && "opacity-70"
        )}
      >
        {busy ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <ChevronDown
            className={clsx("h-4 w-4 transition", open && "rotate-180")}
          />
        )}
        Actions
        <span className="rounded-md bg-white/20 px-1.5 py-0.5 text-xs">
          {count}
        </span>
      </button>

      {canApiEntry && (
        <button
          type="button"
          disabled={busy}
          onClick={runEntry}
          className="inline-flex items-center gap-2 rounded-xl bg-rose-500 px-4 py-2 text-sm font-bold text-white shadow-md hover:bg-rose-600 disabled:opacity-60"
        >
          {busy ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Plane className="h-4 w-4" />
          )}
          {entryLabel}
        </button>
      )}

      {message && (
        <span className="text-xs font-semibold text-slate-700">{message}</span>
      )}

      {menu}
    </div>
  );
}

function CourierEntryButton({
  method,
  label,
  disabled,
  onClick,
}: {
  method?: DeliveryMethod;
  label: string;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-rose-500 to-rose-600 px-4 py-3 text-sm font-extrabold text-white shadow-lg hover:from-rose-600 hover:to-rose-700 disabled:opacity-50"
    >
      <Plane className="h-5 w-5" />
      {label}
      {method?.type === "steadfast" && (
        <Truck className="h-4 w-4 opacity-80" />
      )}
    </button>
  );
}
