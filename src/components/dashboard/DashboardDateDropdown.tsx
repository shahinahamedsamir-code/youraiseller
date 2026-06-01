"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar, Check, ChevronDown } from "lucide-react";
import {
  getOverviewDatePresetLabel,
  type OverviewDatePreset,
} from "@/lib/dashboard-stats";
import clsx from "clsx";

const DATE_PRESETS: OverviewDatePreset[] = [
  "today",
  "yesterday",
  "7d",
  "30d",
  "all",
];

type DashboardDateDropdownProps = {
  value: OverviewDatePreset;
  onChange: (value: OverviewDatePreset) => void;
  accent?: "violet" | "cyan";
};

export function DashboardDateDropdown({
  value,
  onChange,
  accent = "violet",
}: DashboardDateDropdownProps) {
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const onOutside = (e: MouseEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    if (open) document.addEventListener("mousedown", onOutside);
    return () => document.removeEventListener("mousedown", onOutside);
  }, [open]);

  const active =
    accent === "cyan"
      ? "font-semibold text-teal-700"
      : "font-semibold text-violet-700";
  const checkColor = accent === "cyan" ? "text-teal-600" : "text-violet-600";
  const hoverBtn =
    accent === "cyan"
      ? "hover:border-teal-200 hover:text-teal-700"
      : "hover:border-violet-200 hover:text-violet-700";

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={clsx(
          "flex items-center gap-1.5 rounded-xl border border-slate-200/80 bg-white/90 px-3 py-1.5 text-xs font-semibold text-slate-600 shadow-sm transition",
          hoverBtn
        )}
      >
        <Calendar className="h-3.5 w-3.5 text-slate-400" />
        {getOverviewDatePresetLabel(value)}
        <ChevronDown
          className={clsx("h-3.5 w-3.5 text-slate-400 transition", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 min-w-[160px] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            Order date
          </p>
          {DATE_PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                onChange(preset);
                setOpen(false);
              }}
              className={clsx(
                "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition hover:bg-slate-50",
                preset === value ? active : "text-slate-700"
              )}
            >
              {getOverviewDatePresetLabel(preset)}
              {preset === value && (
                <Check className={clsx("h-4 w-4 shrink-0", checkColor)} />
              )}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
