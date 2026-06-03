"use client";

import clsx from "clsx";

type Props = {
  title: string;
  hint: string;
  enabled: boolean;
  onChange: (next: boolean) => void;
};

export function SmsToggleSetting({ title, hint, enabled, onChange }: Props) {
  return (
    <div className="flex items-start justify-between gap-4 rounded-xl border border-slate-200/90 bg-white px-4 py-4 transition hover:border-teal-200 hover:shadow-sm">
      <div className="min-w-0">
        <p className="font-bold text-slate-900">{title}</p>
        <p className="mt-1 text-sm leading-relaxed text-slate-500">{hint}</p>
      </div>
      <button
        type="button"
        role="switch"
        aria-checked={enabled}
        onClick={() => onChange(!enabled)}
        className={clsx(
          "relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition",
          enabled ? "bg-teal-500" : "bg-slate-200"
        )}
      >
        <span
          className={clsx(
            "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition",
            enabled ? "left-[22px]" : "left-0.5"
          )}
        />
      </button>
    </div>
  );
}
