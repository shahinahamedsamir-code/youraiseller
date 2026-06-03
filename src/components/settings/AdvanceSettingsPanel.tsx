"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { SlidersHorizontal, Sparkles, Asterisk, Circle } from "lucide-react";
import {
  loadAdvanceSettings,
  setFieldRequired,
  REQUIRED_FIELD_META,
  type AdvanceSettings,
} from "@/lib/advance-settings-store";

function ReqToggle({
  required,
  onChange,
}: {
  required: boolean;
  onChange: (req: boolean) => void;
}) {
  return (
    <div className="inline-flex rounded-xl border border-slate-200 bg-slate-50 p-1">
      <button
        type="button"
        onClick={() => onChange(false)}
        className={clsx(
          "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition",
          !required
            ? "bg-white text-slate-700 shadow-sm ring-1 ring-slate-200"
            : "text-slate-400 hover:text-slate-600"
        )}
      >
        <Circle className="h-3.5 w-3.5" />
        Optional
      </button>
      <button
        type="button"
        onClick={() => onChange(true)}
        className={clsx(
          "inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition",
          required
            ? "bg-rose-500 text-white shadow-sm"
            : "text-slate-400 hover:text-rose-500"
        )}
      >
        <Asterisk className="h-3.5 w-3.5" />
        Required
      </button>
    </div>
  );
}

export function AdvanceSettingsPanel() {
  const [settings, setSettings] = useState<AdvanceSettings | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  useEffect(() => {
    setSettings(loadAdvanceSettings());
  }, []);

  const update = (key: (typeof REQUIRED_FIELD_META)[number]["key"], req: boolean) => {
    const next = setFieldRequired(key, req);
    setSettings(next);
    setToast(
      `${REQUIRED_FIELD_META.find((m) => m.key === key)?.label} is now ${
        req ? "required" : "optional"
      }`
    );
    window.setTimeout(() => setToast(null), 2000);
  };

  const requiredCount = settings
    ? REQUIRED_FIELD_META.filter((m) => settings.required[m.key]).length
    : 0;

  return (
    <div className="space-y-6">
      {/* Hero */}
      <div className="relative overflow-hidden rounded-3xl border border-slate-200 bg-gradient-to-br from-slate-700 via-slate-800 to-slate-900 p-6 text-white shadow-lg shadow-slate-300">
        <div className="pointer-events-none absolute -right-10 -top-10 h-44 w-44 rounded-full bg-white/10 blur-2xl" />
        <div className="relative flex items-center gap-4">
          <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-white/15 ring-1 ring-white/30 backdrop-blur">
            <SlidersHorizontal className="h-7 w-7" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-2xl font-extrabold tracking-tight">
                Advance Settings
              </h1>
              <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2.5 py-0.5 text-[11px] font-bold ring-1 ring-white/30">
                <Sparkles className="h-3 w-3" />
                {requiredCount} required
              </span>
            </div>
            <p className="mt-1 text-sm text-white/70">
              Decide which New Order fields are mandatory. Name, mobile, address and
              products are always required.
            </p>
          </div>
        </div>
      </div>

      {/* Field controls */}
      <div className="yai-panel overflow-hidden">
        <div className="border-b border-slate-100 px-5 py-4">
          <h3 className="font-extrabold text-slate-900">New Order fields</h3>
          <p className="text-xs text-slate-500">
            Set each field as required or optional for staff creating orders.
          </p>
        </div>
        {settings && (
          <ul className="divide-y divide-slate-100">
            {REQUIRED_FIELD_META.map((m) => (
              <li
                key={m.key}
                className="flex flex-col gap-3 px-5 py-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div>
                  <p className="flex items-center gap-2 font-bold text-slate-800">
                    {m.label}
                    {settings.required[m.key] && (
                      <span className="text-rose-500">*</span>
                    )}
                  </p>
                  <p className="text-xs text-slate-500">{m.desc}</p>
                </div>
                <ReqToggle
                  required={settings.required[m.key]}
                  onChange={(req) => update(m.key, req)}
                />
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="rounded-2xl border border-slate-200 bg-slate-50/60 px-5 py-4 text-xs text-slate-500">
        <span className="font-bold text-slate-600">Note:</span> Customer name,
        mobile number (11 digits), address and at least one product are always
        required and can&apos;t be turned off.
      </div>

      {toast && (
        <div className="fixed bottom-6 left-1/2 z-50 -translate-x-1/2 rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white shadow-xl">
          {toast}
        </div>
      )}
    </div>
  );
}
