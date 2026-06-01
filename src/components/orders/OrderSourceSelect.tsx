"use client";

import { useEffect, useId, useRef, useState } from "react";
import clsx from "clsx";
import { ChevronDown, Check, Tag } from "lucide-react";
import {
  ORDER_SOURCE_OPTIONS,
  getOrderSourceLabel,
  type OrderSource,
} from "@/lib/order-source";
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
}: Props) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement>(null);
  const listId = useId();

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  const selectedLabel = getOrderSourceLabel(value, customLabel);

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
            </p>
            <p className="text-[10px] leading-snug text-slate-500">{hint}</p>
          </div>
        </div>

        <button
          type="button"
          disabled={disabled}
          aria-expanded={open}
          aria-haspopup="listbox"
          aria-controls={listId}
          onClick={() => !disabled && setOpen((o) => !o)}
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

        {open && (
          <ul
            id={listId}
            role="listbox"
            className="mt-2 max-h-[280px] overflow-y-auto rounded-xl border border-slate-200 bg-white py-1 shadow-lg ring-1 ring-slate-200/80"
          >
            {ORDER_SOURCE_OPTIONS.map((opt) => {
              const selected = opt.value === value;
              return (
                <li key={opt.value} role="option" aria-selected={selected}>
                  <button
                    type="button"
                    onClick={() => {
                      onChange(opt.value);
                      setOpen(false);
                    }}
                    className={clsx(
                      "flex w-full items-center gap-3 px-3 py-2.5 text-left transition",
                      selected
                        ? "bg-teal-50/90"
                        : "hover:bg-slate-50"
                    )}
                  >
                    <OrderSourceIcon source={opt.value} size="sm" />
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
          </ul>
        )}
      </div>

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
