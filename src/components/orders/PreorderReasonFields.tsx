"use client";

import clsx from "clsx";
import {
  PREORDER_REASON_OPTIONS,
  type PreorderReason,
} from "@/lib/preorder-meta";

type Props = {
  reason: PreorderReason;
  onReasonChange: (reason: PreorderReason) => void;
  deliveryAtLocal: string;
  onDeliveryAtChange: (value: string) => void;
  inputClassName?: string;
  compact?: boolean;
};

export function PreorderReasonFields({
  reason,
  onReasonChange,
  deliveryAtLocal,
  onDeliveryAtChange,
  inputClassName = "w-full rounded-lg border border-slate-200 px-3 py-2 text-sm",
  compact = false,
}: Props) {
  return (
    <div
      className={clsx(
        "space-y-3 rounded-lg border border-violet-200 bg-violet-50/80",
        compact ? "p-2.5" : "p-3"
      )}
    >
      <div>
        <label
          className={clsx(
            "mb-1 block font-bold text-violet-800",
            compact ? "text-[10px] uppercase" : "text-xs"
          )}
        >
          Pre order reason?
        </label>
        <select
          value={reason}
          onChange={(e) => onReasonChange(e.target.value as PreorderReason)}
          className={inputClassName}
        >
          {PREORDER_REASON_OPTIONS.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label
          className={clsx(
            "mb-1 block font-bold text-violet-800",
            compact ? "text-[10px] uppercase" : "text-xs"
          )}
        >
          Tentative delivery time
        </label>
        <input
          type="datetime-local"
          value={deliveryAtLocal}
          onChange={(e) => onDeliveryAtChange(e.target.value)}
          className={inputClassName}
        />
        <p className="mt-1 text-[10px] text-violet-600/90">
          Shown on Preorder List — when you plan to deliver or hand over.
        </p>
      </div>
    </div>
  );
}
