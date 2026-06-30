import type { Order } from "./orders-store";

function normPhone(p?: string): string {
  return (p ?? "").replace(/[^0-9]/g, "").replace(/^88/, "");
}

export type DuplicateIndex = {
  phone: Map<string, number>;
  ip: Map<string, number>;
};

/** Count phones and IPs across the given orders so duplicates can be flagged. */
export function buildDuplicateIndex(orders: Order[]): DuplicateIndex {
  const phone = new Map<string, number>();
  const ip = new Map<string, number>();
  for (const o of orders) {
    const np = normPhone(o.phone);
    if (np) phone.set(np, (phone.get(np) ?? 0) + 1);
    const oip = o.wooSnapshot?.customerIp?.trim();
    if (oip) ip.set(oip, (ip.get(oip) ?? 0) + 1);
  }
  return { phone, ip };
}

export type DuplicateFlags = { byPhone: boolean; byIp: boolean; ip?: string };

/** Whether this order shares its phone or IP with another order. */
export function duplicateFlags(order: Order, index: DuplicateIndex): DuplicateFlags {
  const np = normPhone(order.phone);
  const oip = order.wooSnapshot?.customerIp?.trim();
  return {
    byPhone: !!np && (index.phone.get(np) ?? 0) > 1,
    byIp: !!oip && (index.ip.get(oip) ?? 0) > 1,
    ip: oip,
  };
}
