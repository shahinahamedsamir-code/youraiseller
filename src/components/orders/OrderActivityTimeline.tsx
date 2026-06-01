"use client";

import {
  History,
  Globe,
  Store,
  RefreshCw,
  Printer,
  Truck,
  StickyNote,
  ExternalLink,
} from "lucide-react";
import clsx from "clsx";
import {
  formatActivityDate,
  type OrderActivity,
  type OrderActivityType,
} from "@/lib/order-activity";

function activityIcon(type: OrderActivityType) {
  const map = {
    created: Store,
    woo_import: Globe,
    woo_sync: RefreshCw,
    status: History,
    edited: History,
    opened: ExternalLink,
    note: StickyNote,
    tracking: Truck,
    printed: Printer,
    approved: History,
  };
  return map[type] ?? History;
}

function activityDotClass(type: OrderActivityType, isWeb: boolean) {
  if (type === "woo_import" || type === "woo_sync")
    return "bg-violet-100 text-violet-600";
  if (type === "opened")
    return isWeb ? "bg-teal-100 text-teal-700" : "bg-indigo-100 text-indigo-600";
  if (type === "created")
    return isWeb ? "bg-teal-100 text-teal-600" : "bg-indigo-100 text-indigo-600";
  if (type === "status" || type === "approved")
    return "bg-amber-100 text-amber-700";
  return "bg-slate-100 text-slate-600";
}

type Props = {
  timeline: OrderActivity[];
  variant?: "web" | "approved";
};

export function OrderActivityTimeline({
  timeline,
  variant = "approved",
}: Props) {
  const isWeb = variant === "web";

  return (
    <div
      className={clsx(
        "rounded-2xl border bg-gradient-to-br p-4",
        isWeb
          ? "border-teal-100 from-teal-50/60 to-white"
          : "border-indigo-100 from-indigo-50/60 to-white"
      )}
    >
      <p className="mb-3 flex items-center justify-between gap-2">
        <span
          className={clsx(
            "flex items-center gap-2 text-xs font-bold uppercase tracking-wide",
            isWeb ? "text-teal-700" : "text-indigo-600"
          )}
        >
          <History className="h-4 w-4" />
          Order source &amp; activity
        </span>
        <span className="text-[10px] font-medium text-slate-400">
          Latest first
        </span>
      </p>
      <ul className="space-y-3">
        {timeline.map((entry, i) => {
          const Icon = activityIcon(entry.type);
          const isLatest = i === 0;
          return (
            <li
              key={entry.id}
              className={clsx(
                "flex gap-3",
                isLatest &&
                  clsx(
                    "rounded-xl border bg-white p-3 shadow-sm",
                    isWeb ? "border-teal-100/80" : "border-indigo-100/80"
                  )
              )}
            >
              <span
                className={clsx(
                  "flex h-9 w-9 shrink-0 items-center justify-center rounded-full",
                  activityDotClass(entry.type, isWeb)
                )}
              >
                <Icon className="h-4 w-4" />
              </span>
              <div className="min-w-0 flex-1 pb-1">
                {isLatest && (
                  <span
                    className={clsx(
                      "mb-1.5 inline-block rounded-full px-2 py-0.5 text-[9px] font-bold uppercase",
                      isWeb
                        ? "bg-teal-100 text-teal-700"
                        : "bg-indigo-100 text-indigo-700"
                    )}
                  >
                    Latest
                  </span>
                )}
                <p className="text-sm font-semibold leading-snug text-slate-800">
                  {entry.title}
                </p>
                {entry.detail && (
                  <p className="mt-0.5 whitespace-pre-line text-xs leading-relaxed text-slate-500">
                    {entry.detail}
                  </p>
                )}
                <p className="mt-1.5 text-[10px] text-slate-400">
                  {formatActivityDate(entry.at)}
                  {entry.actor ? ` · ${entry.actor}` : ""}
                </p>
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
