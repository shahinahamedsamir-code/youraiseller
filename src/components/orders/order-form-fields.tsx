"use client";

import clsx from "clsx";

export const orderFormInputCls =
  "w-full rounded-lg border border-slate-200 bg-white px-3 py-2 text-sm outline-none focus:border-indigo-400 focus:ring-2 focus:ring-indigo-100";

export function OrderFormTotalField({
  label,
  value,
  onChange,
  placeholder,
  highlight,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  placeholder?: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={clsx(
        "rounded-xl border px-3 py-2 transition",
        highlight
          ? "border-amber-300 bg-amber-50/50 ring-2 ring-amber-200/60"
          : "border-slate-100 bg-white"
      )}
    >
      <label
        className={clsx(
          "text-xs font-bold uppercase",
          highlight ? "text-amber-800" : "text-slate-500"
        )}
      >
        {label}
      </label>
      <input
        type="number"
        min={0}
        step="any"
        inputMode="decimal"
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full border-0 bg-transparent p-0 text-lg font-bold text-slate-900 outline-none placeholder:font-normal placeholder:text-slate-400"
      />
    </div>
  );
}
