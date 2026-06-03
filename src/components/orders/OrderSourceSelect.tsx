"use client";

import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import clsx from "clsx";
import { ChevronDown, Check, Tag } from "lucide-react";
import { getOrderSourceLabel, type OrderSource } from "@/lib/order-source";
import {
  loadEnabledOrderSources,
  ORDER_SOURCES_UPDATED,
  type OrderSourceItem,
} from "@/lib/order-source-store";
import { OrderSourceIcon } from "./OrderSourceIcon";

type Props = {
  value: OrderSource;
  onChange: (value: OrderSource) => void;
  customLabel?: string;
  onCustomLabelChange?: (value: string) => void;
  disabled?: boolean;
  inputClassName?: string;
  compact?: boolean;
  hint?: string;
  required?: boolean;
};

export function OrderSourceSelect({
  value,
  onChange,
  customLabel = "",
  onCustomLabelChange,
  disabled = false,
  inputClassName = "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100",
  compact = false,
  hint = "Track where this order came from — helps compare Facebook, Website, WhatsApp, etc.",
  required = false,
}: Props) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [items, setItems] = useState<OrderSourceItem[]>([]);
  const [menuPos, setMenuPos] = useState({ top: 0, left: 0, width: 0 });
  const rootRef = useRef<HTMLDivElement>(null);
  const anchorRef = useRef<HTMLButtonElement>(null);
  const menuRef = useRef<HTMLUListElement>(null);
  const listId = useId();

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    const refresh = () => setItems(loadEnabledOrderSources());
    refresh();
    window.addEventListener(ORDER_SOURCES_UPDATED, refresh);
    window.addEventListener("youraiseller-data-updated", refresh);
    return () => {
      window.removeEventListener(ORDER_SOURCES_UPDATED, refresh);
      window.removeEventListener("youraiseller-data-updated", refresh);
    };
  }, []);

  const updateMenuPos = () => {
    const el = anchorRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    setMenuPos({
      top: r.bottom + 4,
      left: r.left,
      width: r.width,
    });
  };

  useEffect(() => {
    if (!open) return;
    updateMenuPos();
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (rootRef.current?.contains(t) || menuRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    window.addEventListener("scroll", updateMenuPos, true);
    window.addEventListener("resize", updateMenuPos);
    return () => {
      window.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("scroll", updateMenuPos, true);
      window.removeEventListener("resize", updateMenuPos);
    };
  }, [open]);

  const selectedLabel = getOrderSourceLabel(value, customLabel);
  const trimmedCustom = customLabel.trim().toLowerCase();
  const namedCustomLabels = items
    .filter((i) => i.base === "custom" && !i.builtin)
    .map((i) => i.label.trim().toLowerCase());

  const isItemSelected = (item: OrderSourceItem): boolean => {
    if (item.base !== "custom") return value === item.base;
    if (value !== "custom") return false;
    if (item.builtin) {
      // Generic "Custom Source": selected only for free-typed labels
      // that don't match a named custom source.
      return !namedCustomLabels.includes(trimmedCustom);
    }
    return item.label.trim().toLowerCase() === trimmedCustom;
  };

  const selectItem = (item: OrderSourceItem) => {
    if (item.base === "custom" && !item.builtin) {
      onChange("custom");
      onCustomLabelChange?.(item.label);
    } else if (item.base === "custom") {
      // generic custom — let the user type a label
      onChange("custom");
      onCustomLabelChange?.("");
    } else {
      onChange(item.base);
      onCustomLabelChange?.("");
    }
    setOpen(false);
  };

  const menu =
    open ? (
      <ul
        ref={menuRef}
        id={listId}
        role="listbox"
        style={{
          position: "fixed",
          top: menuPos.top,
          left: menuPos.left,
          width: menuPos.width,
        }}
        className="z-[200] max-h-[280px] overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg ring-1 ring-slate-200/80"
      >
        {items.map((opt) => {
          const selected = isItemSelected(opt);
          return (
            <li key={opt.id} role="option" aria-selected={selected}>
              <button
                type="button"
                onClick={() => selectItem(opt)}
                className={clsx(
                  "flex w-full items-center gap-3 px-3 py-2.5 text-left transition",
                  selected ? "bg-teal-50/90" : "hover:bg-slate-50"
                )}
              >
                <OrderSourceIcon source={opt.base} size="sm" />
                <span
                  className={clsx(
                    "flex-1 text-sm font-semibold",
                    selected ? "text-teal-800" : "text-slate-700"
                  )}
                >
                  {opt.label}
                </span>
                {selected && (
                  <Check className="h-4 w-4 shrink-0 text-teal-600" />
                )}
              </button>
            </li>
          );
        })}
        {items.length === 0 && (
          <li className="px-3 py-3 text-center text-xs text-slate-400">
            No active sources — add some in Settings → New Order Source.
          </li>
        )}
      </ul>
    ) : null;

  return (
    <div ref={rootRef} className={clsx(compact ? "space-y-2" : "space-y-3")}>
      <div
        className={clsx(
          "rounded-2xl border border-slate-200/90 bg-gradient-to-br from-white to-slate-50/80 p-3 shadow-sm",
          compact && "p-2.5"
        )}
      >
        <div className="mb-2.5 flex items-center gap-2">
          <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-indigo-100 text-indigo-600">
            <Tag className="h-4 w-4" />
          </span>
          <div>
            <p className="text-xs font-bold uppercase tracking-wide text-slate-700">
              Order source
              {required && <span className="text-rose-500"> *</span>}
            </p>
            <p className="text-[10px] leading-snug text-slate-500">{hint}</p>
          </div>
        </div>

        <button
          ref={anchorRef}
          type="button"
          disabled={disabled}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={listId}
          onClick={() => {
            if (disabled) return;
            updateMenuPos();
            setOpen((o) => !o);
          }}
          className={clsx(
            "flex w-full items-center gap-3 rounded-xl border bg-white px-3 py-2.5 text-left transition",
            open
              ? "border-teal-400 ring-2 ring-teal-100"
              : "border-slate-200 hover:border-teal-300 hover:shadow-sm",
            disabled && "cursor-not-allowed opacity-60"
          )}
        >
          <OrderSourceIcon source={value} size="md" />
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-bold text-slate-800">
              {selectedLabel}
            </span>
            <span className="text-[10px] text-slate-500">Tap to change source</span>
          </span>
          <ChevronDown
            className={clsx(
              "h-5 w-5 shrink-0 text-slate-400 transition",
              open && "rotate-180 text-teal-600"
            )}
          />
        </button>
      </div>

      {mounted && menu && createPortal(menu, document.body)}

      {value === "custom" && onCustomLabelChange && !disabled && (
        <div>
          <label className="mb-1 block text-xs font-bold text-slate-500">
            Custom source name
          </label>
          <input
            value={customLabel}
            onChange={(e) => onCustomLabelChange(e.target.value)}
            placeholder="e.g. Influencer campaign"
            className={inputClassName}
          />
        </div>
      )}
    </div>
  );
}
