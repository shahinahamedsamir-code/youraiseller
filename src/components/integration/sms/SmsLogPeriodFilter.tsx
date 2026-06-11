"use client";

import clsx from "clsx";
import { MoreHorizontal } from "lucide-react";
import { PERIOD_OPTIONS, type SmsLogPeriod } from "@/lib/sms-log-analytics";

type Props = {
  value: SmsLogPeriod;
  onChange: (period: SmsLogPeriod) => void;
  compact?: boolean;
};

export function SmsLogPeriodFilter({ value, onChange, compact }: Props) {
  return (
    <div className="max-w-full overflow-x-auto rounded-xl border border-slate-200 bg-white p-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="inline-flex min-w-max items-center gap-1">
      {PERIOD_OPTIONS.map((opt) => (
        <button
          key={opt.id}
          type="button"
          onClick={() => onChange(opt.id)}
          className={clsx(
            "shrink-0 rounded-lg px-3 py-1.5 text-xs font-bold transition",
            compact && "px-2.5",
            value === opt.id
              ? "bg-slate-100 text-slate-900 shadow-sm"
              : "text-slate-500 hover:bg-slate-50 hover:text-slate-700"
          )}
        >
          {opt.label}
        </button>
      ))}
      <button
        type="button"
        className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-50 hover:text-slate-600"
        aria-label="More ranges"
      >
        <MoreHorizontal className="h-4 w-4" />
      </button>
      </div>
    </div>
  );
}
