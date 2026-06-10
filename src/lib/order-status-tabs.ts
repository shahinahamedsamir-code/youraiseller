import type { OrderStatus } from "./orders-store";

export type OrderStatusTab = {
  key: OrderStatus;
  label: string;
};

/** Ecomdrive-style order list status tabs */
export const ORDER_LIST_TABS: OrderStatusTab[] = [
  { key: "pending", label: "Pending" },
  { key: "rts", label: "RTS" },
  { key: "shipped", label: "Shipped" },
  { key: "delivered", label: "Delivered" },
  { key: "returned", label: "Returned" },
  { key: "pending_return", label: "Return Pending" },
  { key: "partial", label: "Partial" },
  { key: "cancelled", label: "Cancelled" },
  { key: "pending_cancel", label: "Pending Cancel" },
  { key: "preorder", label: "Preorder" },
  { key: "lost", label: "Lost" },
];

/** Linear flow: Pending → RTS → Shipped → Delivered */
export const ORDER_STATUS_FLOW: Partial<
  Record<OrderStatus, { next: OrderStatus; action: string; hint: string }>
> = {
  pending: {
    next: "rts",
    action: "Move to RTS",
    hint: "Ready for courier handoff",
  },
  rts: {
    next: "shipped",
    action: "Move to Shipped",
    hint: "Order is shipping",
  },
  shipped: {
    next: "delivered",
    action: "Mark as Delivered",
    hint: "Customer received",
  },
};

export function getOrderStatusFlowAction(status: OrderStatus) {
  return ORDER_STATUS_FLOW[status] ?? null;
}

/** Only RTS can move back to Pending */
export const ORDER_STATUS_BACK: Partial<
  Record<OrderStatus, { prev: OrderStatus; action: string; hint: string }>
> = {
  rts: {
    prev: "pending",
    action: "Back to Pending",
    hint: "Return order to pending list",
  },
};

export function getOrderStatusBackAction(status: OrderStatus) {
  return ORDER_STATUS_BACK[status] ?? null;
}

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  pending: "Pending",
  rts: "RTS",
  shipped: "Shipped",
  delivered: "Delivered",
  pending_return: "Return Pending",
  returned: "Returned",
  partial: "Partial",
  cancelled: "Cancelled",
  pending_cancel: "Pending Cancel",
  preorder: "Preorder",
  lost: "Lost",
};
