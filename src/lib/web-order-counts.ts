import type { Order } from "./orders-store";
import { isInWebQueue } from "./web-order-queue";
import {
  countWebOrdersByTab,
  matchesWebOrderTab,
  type WebOrderTabKey,
} from "./web-order-tabs";
import { getWebOrdersFromStore } from "./woocommerce-order-sync";

export function filterWebOrdersForTab(
  orders: Order[],
  tab: WebOrderTabKey
): Order[] {
  return orders.filter((o) => matchesWebOrderTab(o, tab));
}

export function getWebOrderTabCounts(
  orders: Order[] = getWebOrdersFromStore()
): Record<WebOrderTabKey, number> {
  return countWebOrdersByTab(orders);
}

/** Orders on the Processing tab — matches Web Order List table filter. */
export function getWebOrdersProcessingCount(
  orders: Order[] = getWebOrdersFromStore()
): number {
  return filterWebOrdersForTab(orders, "processing").length;
}

/** Orders still on Web Order List before promotion to Approved. */
export function getWebOrdersActiveQueueCount(
  orders: Order[] = getWebOrdersFromStore()
): number {
  return orders.filter((o) => isInWebQueue(o)).length;
}
