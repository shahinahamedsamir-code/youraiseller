"use client";

import clsx from "clsx";
import {
  getOrderSourceLabel,
  inferOrderSourceFromOrder,
  orderSourceBadgeClass,
  type OrderSource,
} from "@/lib/order-source";
import type { Order } from "@/lib/orders-store";
import { OrderSourceIcon } from "./OrderSourceIcon";

type Props = {
  order: Pick<Order, "orderSource" | "customOrderSource" | "source" | "wooOrderId">;
  size?: "sm" | "md";
  className?: string;
};

export function OrderSourceBadge({ order, size = "sm", className }: Props) {
  const source: OrderSource = inferOrderSourceFromOrder(order);
  const label = getOrderSourceLabel(order.orderSource, order.customOrderSource);

  return (
    <span
      className={clsx(
        "inline-flex max-w-full items-center gap-1.5 rounded-full py-0.5 pl-0.5 pr-2.5 font-bold",
        orderSourceBadgeClass(source),
        size === "sm" ? "text-[10px]" : "text-xs",
        className
      )}
    >
      <OrderSourceIcon
        source={source}
        size="sm"
        className={clsx(size === "sm" ? "!h-5 !w-5 !rounded-lg" : "!h-6 !w-6")}
      />
      <span className="truncate">{label}</span>
    </span>
  );
}
