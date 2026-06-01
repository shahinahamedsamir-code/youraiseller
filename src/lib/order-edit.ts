import type { OrderStatus, WebDisplayStatus } from "./orders-store";

/** Order statuses that can be opened and edited from the list */
export const EDITABLE_ORDER_STATUSES: OrderStatus[] = [
  "pending",
  "rts",
  "shipped",
];

export const EDITABLE_WEB_STATUSES: WebDisplayStatus[] = [
  "pending",
  "processing",
  "on_hold",
  "good_no_response",
  "no_response",
  "incomplete",
  "complete",
  "cancelled",
];

export function canEditOrder(status: OrderStatus): boolean {
  return EDITABLE_ORDER_STATUSES.includes(status);
}

export function resolveWebDisplayStatus(o: {
  webStatus?: WebDisplayStatus;
  status: string;
}): WebDisplayStatus {
  if (o.webStatus) {
    if (o.webStatus === "confirmed") return "processing";
    return o.webStatus;
  }
  if (o.status === "cancelled") return "cancelled";
  if (o.status === "delivered") return "complete";
  return "pending";
}

export function canEditWebOrder(o: {
  webStatus?: WebDisplayStatus;
  status: string;
}): boolean {
  return EDITABLE_WEB_STATUSES.includes(resolveWebDisplayStatus(o));
}
