"use client";

import { useEffect, useState } from "react";
import { AlertTriangle } from "lucide-react";
import {
  incompleteCooldownRemainingMs,
  formatCooldown,
} from "@/lib/incomplete-cooldown";
import type { Order } from "@/lib/orders-store";

/**
 * "Customer still on site" guard — shown when staff try to open/contact a
 * just-captured incomplete lead. Counts down; auto-proceeds when the cooldown
 * ends so nobody gets stuck.
 */
export function IncompleteCooldownModal({
  order,
  onCancel,
  onProceed,
}: {
  order: Order;
  onCancel: () => void;
  onProceed: () => void;
}) {
  const [remaining, setRemaining] = useState(() =>
    incompleteCooldownRemainingMs(order)
  );

  useEffect(() => {
    const t = setInterval(() => {
      const r = incompleteCooldownRemainingMs(order);
      setRemaining(r);
      if (r <= 0) {
        clearInterval(t);
        onProceed();
      }
    }, 1000);
    return () => clearInterval(t);
  }, [order, onProceed]);

  return (
    <div
      className="fixed inset-0 z-[130] flex items-center justify-center bg-slate-900/50 p-4 backdrop-blur-sm"
      onClick={onCancel}
      role="presentation"
    >
      <div
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="mb-3 flex items-center gap-2">
          <AlertTriangle className="h-6 w-6 text-amber-500" />
          <h2 className="text-lg font-extrabold text-amber-600">Hold on</h2>
        </div>
        <p className="text-sm leading-6 text-slate-600">
          The customer is still on the website and may complete this order on
          their own. Please wait a little before contacting them.
        </p>
        <div className="mt-4 flex items-center justify-between rounded-xl bg-amber-50 px-4 py-3 ring-1 ring-amber-100">
          <span className="text-sm font-semibold text-amber-700">Time remaining</span>
          <span className="font-mono text-xl font-black tabular-nums text-amber-700">
            {formatCooldown(remaining)}
          </span>
        </div>
        <div className="mt-5 flex justify-end gap-2">
          <button
            type="button"
            onClick={onCancel}
            className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onProceed}
            className="rounded-lg bg-amber-500 px-5 py-2 text-sm font-bold text-white hover:bg-amber-600"
          >
            Open anyway
          </button>
        </div>
      </div>
    </div>
  );
}
