"use client";

import clsx from "clsx";
import { ORDER_LIST_TABS } from "@/lib/order-status-tabs";
import { getOrderStatusCounts, type OrderStatus } from "@/lib/orders-store";

type Props = {
  active: OrderStatus;
  onChange: (status: OrderStatus) => void;
};

export function OrderStatusTabs({ active, onChange }: Props) {
  const counts = getOrderStatusCounts();

  return (
    <div className="overflow-x-auto rounded-t-2xl border border-b-0 border-slate-200/80 bg-white">
      <div className="flex min-w-max gap-0.5 px-2 pt-2">
        {ORDER_LIST_TABS.map((tab) => {
          const isActive = active === tab.key;
          const count = counts[tab.key] ?? 0;
          return (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChange(tab.key)}
              className={clsx(
                "relative shrink-0 rounded-t-xl px-4 py-2.5 text-sm font-semibold transition",
                isActive
                  ? "bg-indigo-600 text-white shadow-md"
                  : "text-slate-600 hover:bg-slate-100"
              )}
            >
              {tab.label}
              <span
                className={clsx(
                  "ml-1.5 inline-flex min-w-[1.25rem] justify-center rounded-full px-1.5 py-0.5 text-xs font-bold",
                  isActive ? "bg-white/20 text-white" : "bg-slate-100 text-slate-600"
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
