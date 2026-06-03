"use client";

import clsx from "clsx";
import type { Order } from "@/lib/orders-store";
import {
  CREATOR_ROLE_CLASS,
  getOrderCreatorInfo,
} from "@/lib/order-creator";

type Props = {
  order: Pick<Order, "handledBy" | "createdByRole" | "createdByUserId">;
  compact?: boolean;
};

export function OrderCreatorCell({ order, compact }: Props) {
  const info = getOrderCreatorInfo(order);

  if (info.role === "SYSTEM") {
    return (
      <p
        className={clsx(
          "font-semibold text-slate-600",
          compact ? "text-xs" : "text-sm"
        )}
      >
        {info.name}
      </p>
    );
  }

  return (
    <div>
      <p
        className={clsx(
          "font-bold uppercase tracking-wide",
          CREATOR_ROLE_CLASS[info.role],
          compact ? "text-[9px]" : "text-[10px]"
        )}
      >
        {info.roleLabel}
      </p>
      <p
        className={clsx(
          "font-semibold text-slate-800",
          compact ? "text-xs" : "text-sm"
        )}
      >
        {info.name}
      </p>
    </div>
  );
}
