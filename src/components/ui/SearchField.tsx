"use client";

import { Search } from "lucide-react";
import clsx from "clsx";

type SearchFieldProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  /** Dark theme for dev-admin panels */
  variant?: "light" | "dark";
};

export function SearchField({
  value,
  onChange,
  placeholder = "Search…",
  className,
  variant = "light",
}: SearchFieldProps) {
  const isDark = variant === "dark";

  return (
    <div className={clsx("relative w-full", className)}>
      <span
        className={clsx(
          "pointer-events-none absolute inset-y-0 left-0 flex w-11 items-center justify-center",
          isDark ? "text-slate-500" : "text-slate-400"
        )}
        aria-hidden
      >
        <Search className="h-4 w-4 shrink-0" />
      </span>
      <input
        type="search"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className={clsx(
          "w-full rounded-xl border py-3 pl-11 pr-4 text-sm outline-none transition",
          isDark
            ? "border-slate-600 bg-slate-900 text-white placeholder:text-slate-500 focus:border-orange-500"
            : "border-slate-200 bg-white text-slate-800 placeholder:text-slate-400 focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100"
        )}
      />
    </div>
  );
}
