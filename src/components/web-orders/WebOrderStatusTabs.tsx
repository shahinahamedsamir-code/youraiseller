"use client";

import clsx from "clsx";
import {
  Clock,
  AlertTriangle,
  ThumbsUp,
  PhoneOff,
  CreditCard,
  PauseCircle,
  CheckCircle2,
  Ban,
  LayoutList,
} from "lucide-react";
import {
  WEB_ORDER_TABS,
  type WebOrderTabKey,
} from "@/lib/web-order-tabs";

const TAB_ICONS: Record<WebOrderTabKey, typeof Clock> = {
  processing: Clock,
  incomplete: AlertTriangle,
  good_no_response: ThumbsUp,
  no_response: PhoneOff,
  advance_payment: CreditCard,
  on_hold: PauseCircle,
  complete: CheckCircle2,
  cancel: Ban,
  all: LayoutList,
};

type Props = {
  active: WebOrderTabKey;
  counts: Record<WebOrderTabKey, number>;
  onChange: (tab: WebOrderTabKey) => void;
  /** Visible rows for the active tab (search applied) — keeps badge in sync with table */
  activeVisibleCount?: number;
};

export function WebOrderStatusTabs({
  active,
  counts,
  onChange,
  activeVisibleCount,
}: Props) {
  return (
    <div className="overflow-x-auto rounded-t-2xl border border-b-0 border-slate-200/80 bg-white yai-tab-strip">
      <div className="flex min-w-max items-stretch px-1 pt-1">
        {WEB_ORDER_TABS.map((tab) => {
          const Icon = TAB_ICONS[tab.key];
          const isActive = active === tab.key;
          const count =
            isActive && activeVisibleCount != null
              ? activeVisibleCount
              : counts[tab.key] ?? 0;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              className={clsx(
                "relative flex shrink-0 items-center gap-2 border-b-2 px-4 py-3 text-sm font-semibold transition",
                isActive
                  ? "border-teal-500 text-teal-700"
                  : "border-transparent text-slate-600 hover:border-slate-200 hover:text-slate-900"
              )}
            >
              <Icon
                className={clsx(
                  "h-4 w-4 shrink-0",
                  isActive ? "text-teal-600" : "text-slate-400"
                )}
              />
              <span className="whitespace-nowrap">{tab.label}</span>
              <span
                className={clsx(
                  "min-w-[1.35rem] rounded-full px-1.5 py-0.5 text-center text-[11px] font-bold leading-none",
                  isActive
                    ? "bg-teal-100 text-teal-800"
                    : "bg-slate-100 text-slate-600"
                )}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}
