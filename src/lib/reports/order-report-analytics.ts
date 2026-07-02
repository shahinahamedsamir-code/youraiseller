import { orderGrossTotal, type Order } from "@/lib/orders-store";
import { isInWebQueue, isWebSourceOrder } from "@/lib/web-order-queue";

export type OrderReportBucket = "approved" | "web" | "preorder";

export type OrderAllReport = {
  stats: {
    total: number;
    approved: number;
    web: number;
    webInQueue: number;
    preorder: number;
    delivered: number;
    pending: number;
    totalValue: number;
  };
};

export function classifyOrderBucket(o: Order): OrderReportBucket {
  if (o.isPreorder || o.status === "preorder") return "preorder";
  if (isWebSourceOrder(o) && isInWebQueue(o)) return "web";
  return "approved";
}

export function filterOrdersByBucket(
  orders: Order[],
  bucket: OrderReportBucket
): Order[] {
  return orders.filter((o) => classifyOrderBucket(o) === bucket);
}

export function buildOrderAllReport(orders: Order[]): OrderAllReport {
  let approved = 0;
  let webInQueue = 0;
  let preorder = 0;
  let delivered = 0;
  let pending = 0;
  let totalValue = 0;

  for (const o of orders) {
    const bucket = classifyOrderBucket(o);
    if (bucket === "approved") approved += 1;
    if (bucket === "web") webInQueue += 1;
    if (bucket === "preorder") preorder += 1;
    if (o.status === "delivered" || o.status === "partial") delivered += 1;
    if (["pending", "preorder", "rts", "shipped"].includes(o.status)) pending += 1;
    if (!["cancelled", "lost", "returned"].includes(o.status)) {
      totalValue += orderGrossTotal(o);
    }
  }

  const webSourceCount = orders.filter((o) => isWebSourceOrder(o)).length;

  return {
    stats: {
      total: orders.length,
      approved,
      web: webSourceCount,
      webInQueue,
      preorder,
      delivered,
      pending,
      totalValue,
    },
  };
}
