"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { CheckCircle2, AlertTriangle, XCircle, X } from "lucide-react";
import {
  onCourierAlert,
  type CourierAlertDetail,
} from "@/lib/courier-entry-alerts";

export function CourierEntryToast() {
  const [alert, setAlert] = useState<CourierAlertDetail | null>(null);

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    const off = onCourierAlert((d) => {
      setAlert(d);
      if (timer) clearTimeout(timer);
      timer = setTimeout(() => setAlert(null), 8000);
    });
    return () => {
      off();
      if (timer) clearTimeout(timer);
    };
  }, []);

  if (!alert) return null;

  const styles =
    alert.type === "success"
      ? "border-emerald-300 bg-emerald-50 text-emerald-950 shadow-emerald-200/50"
      : alert.type === "error"
        ? "border-rose-300 bg-rose-50 text-rose-950 shadow-rose-200/50"
        : "border-amber-300 bg-amber-50 text-amber-950 shadow-amber-200/50";

  const Icon =
    alert.type === "success"
      ? CheckCircle2
      : alert.type === "error"
        ? XCircle
        : AlertTriangle;

  return (
    <div
      className={clsx(
        "pointer-events-auto fixed right-4 top-20 z-[200] flex max-w-md items-start gap-3 rounded-2xl border-2 px-4 py-3 shadow-xl",
        styles
      )}
      role="alert"
    >
      <Icon className="mt-0.5 h-6 w-6 shrink-0" />
      <div className="min-w-0 flex-1 pr-6">
        <p className="text-sm font-extrabold">{alert.title}</p>
        <p className="mt-1 whitespace-pre-line text-xs font-medium opacity-90">
          {alert.message}
        </p>
      </div>
      <button
        type="button"
        onClick={() => setAlert(null)}
        className="absolute right-2 top-2 rounded-lg p-1 opacity-60 hover:opacity-100"
        aria-label="Dismiss"
      >
        <X className="h-4 w-4" />
      </button>
    </div>
  );
}
