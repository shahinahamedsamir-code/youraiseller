import type { Order } from "./orders-store";
import { isInWebQueue, isWebSourceOrder } from "./web-order-queue";
import { resolveWebDisplayStatus } from "./order-edit";
import { ORDER_STATUS_LABELS } from "./order-status-tabs";

export type SearchFieldMode = "all" | "invoice" | "mobile";

export type WebsiteOrderPlacement = "web_queue" | "approved";

export type SearchPartition = {
  approved: Order[];
  /** Every order that came from website / WooCommerce (queue + approved) */
  websiteOrders: Order[];
  websiteOnWebList: number;
  websiteApproved: number;
  total: number;
};

function normalizePhone(p: string): string {
  return p.replace(/\D/g, "");
}

export function phonesMatch(a: string, b: string): boolean {
  const na = normalizePhone(a).slice(-11);
  const nb = normalizePhone(b).slice(-11);
  return na.length >= 10 && nb.length >= 10 && na === nb;
}

function orderHaystack(o: Order): string {
  const parts = [
    o.id,
    o.wooNumber ?? "",
    o.trackingId ?? "",
    o.customerName,
    o.phone,
    o.address,
    o.district,
    o.courier,
    o.note ?? "",
    ...(o.tags ?? []),
    ...o.items.map((i) => `${i.productName} ${i.productCode}`),
  ];
  return parts.join(" ").toLowerCase();
}

export function orderMatchesSearch(
  o: Order,
  raw: string,
  mode: SearchFieldMode
): boolean {
  const q = raw.trim();
  if (!q) return false;

  if (mode === "mobile") {
    const n = normalizePhone(q);
    if (n.length < 3) return false;
    return normalizePhone(o.phone).includes(n);
  }

  if (mode === "invoice") {
    const lower = q.toLowerCase();
    return (
      o.id.toLowerCase().includes(lower) ||
      (o.wooNumber?.toLowerCase().includes(lower) ?? false) ||
      (o.trackingId?.toLowerCase().includes(lower) ?? false)
    );
  }

  const lower = q.toLowerCase();
  if (orderHaystack(o).includes(lower)) return true;
  const digits = normalizePhone(q);
  if (digits.length >= 3 && normalizePhone(o.phone).includes(digits)) return true;
  return false;
}

export function getWebsiteOrderPlacement(
  o: Order
): WebsiteOrderPlacement | null {
  if (!isWebSourceOrder(o)) return null;
  return isInWebQueue(o) ? "web_queue" : "approved";
}

export function partitionSearchResults(
  orders: Order[],
  query: string,
  mode: SearchFieldMode
): SearchPartition {
  const matched = orders.filter((o) => orderMatchesSearch(o, query, mode));
  const websiteOrders = matched.filter((o) => isWebSourceOrder(o));
  const websiteOnWebList = websiteOrders.filter((o) => isInWebQueue(o)).length;
  const websiteApproved = websiteOrders.length - websiteOnWebList;

  return {
    approved: matched.filter((o) => !isInWebQueue(o)),
    websiteOrders,
    websiteOnWebList,
    websiteApproved,
    total: matched.length,
  };
}

/** Count website orders for same customer phone as first matched row */
export function websiteOrdersForCustomerPhone(
  orders: Order[],
  phone: string
): { total: number; onWebList: number; approved: number } {
  const web = orders.filter(
    (o) => isWebSourceOrder(o) && phonesMatch(o.phone, phone)
  );
  const onWebList = web.filter((o) => isInWebQueue(o)).length;
  return {
    total: web.length,
    onWebList,
    approved: web.length - onWebList,
  };
}

export function getOrderSearchStatusLabel(o: Order): string {
  if (isInWebQueue(o)) {
    const ws = resolveWebDisplayStatus(o);
    return ws.replace(/_/g, " ");
  }
  return ORDER_STATUS_LABELS[o.status] ?? o.status;
}

export function isWooCommerceSearchResult(o: Order): boolean {
  return isWebSourceOrder(o);
}
