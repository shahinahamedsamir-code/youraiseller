"use client";

import { useEffect, useRef, useState } from "react";
import { Calendar, Check, ChevronDown, Filter } from "lucide-react";
import clsx from "clsx";
import { StatCard } from "./StatCard";
import {
  buildOverviewStats,
  getOverviewDateFieldLabel,
  getOverviewDateFieldShortLabel,
  getOverviewDatePresetLabel,
  type OverviewDateField,
  type OverviewDatePreset,
  type OverviewFilterOptions,
} from "@/lib/dashboard-stats";

const DATE_FIELDS: OverviewDateField[] = ["approved", "web_order"];
const DATE_PRESETS: OverviewDatePreset[] = [
  "today",
  "yesterday",
  "7d",
  "30d",
  "all",
];

const DEFAULT_FILTERS: OverviewFilterOptions = {
  dateField: "approved",
  datePreset: "today",
};

function FilterDropdown<T extends string>({
  label,
  icon: Icon,
  value,
  options,
  getLabel,
  getMenuLabel,
  onChange,
}: {
  label: string;
  icon: typeof Filter;
  value: T;
  options: T[];
  getLabel: (value: T) => string;
  getMenuLabel?: (value: T) => string;
  onChange: (value: T) => void;
}) {
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

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm transition hover:border-slate-300 hover:bg-slate-50"
      >
        <Icon className="h-4 w-4 text-slate-400" />
        {getLabel(value)}
        <ChevronDown
          className={clsx("h-4 w-4 text-slate-400 transition", open && "rotate-180")}
        />
      </button>
      {open && (
        <div className="absolute right-0 z-20 mt-1 min-w-[180px] overflow-hidden rounded-xl border border-slate-200 bg-white py-1 shadow-lg">
          <p className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wide text-slate-400">
            {label}
          </p>
          {options.map((opt) => (
            <button
              key={opt}
              type="button"
              onClick={() => {
                onChange(opt);
                setOpen(false);
              }}
              className={clsx(
                "flex w-full items-center justify-between gap-2 px-3 py-2 text-left text-sm transition hover:bg-slate-50",
                opt === value ? "font-semibold text-teal-700" : "text-slate-700"
              )}
            >
              {(getMenuLabel ?? getLabel)(opt)}
              {opt === value && <Check className="h-4 w-4 shrink-0 text-teal-600" />}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function OverviewSection() {
  const [filters, setFilters] = useState<OverviewFilterOptions>(DEFAULT_FILTERS);
  const [stats, setStats] = useState(() => buildOverviewStats(DEFAULT_FILTERS));

  useEffect(() => {
    const refresh = () => setStats(buildOverviewStats(filters));
    refresh();
    const onUpdate = () => refresh();
    window.addEventListener("youraiseller-data-updated", onUpdate);
    window.addEventListener("storage", onUpdate);
    return () => {
      window.removeEventListener("youraiseller-data-updated", onUpdate);
      window.removeEventListener("storage", onUpdate);
    };
  }, [filters]);

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h2 className="text-lg font-bold text-slate-900">Overview</h2>
        <div className="flex flex-wrap items-center gap-2">
          <FilterDropdown
            label="Order type"
            icon={Filter}
            value={filters.dateField}
            options={DATE_FIELDS}
            getLabel={getOverviewDateFieldShortLabel}
            getMenuLabel={getOverviewDateFieldLabel}
            onChange={(dateField) => setFilters((f) => ({ ...f, dateField }))}
          />
          <FilterDropdown
            label="Date range"
            icon={Calendar}
            value={filters.datePreset}
            options={DATE_PRESETS}
            getLabel={getOverviewDatePresetLabel}
            onChange={(datePreset) => setFilters((f) => ({ ...f, datePreset }))}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-4">
        {stats.map((stat, i) => (
          <StatCard
            key={stat.id}
            label={stat.label}
            value={stat.value}
            trend={stat.trend}
            icon={stat.icon}
            accent={stat.accent}
            index={i}
          />
        ))}
      </div>
    </section>
  );
}
