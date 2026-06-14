import type { Order } from "./orders-store";
import type { OrderStatus } from "./orders-store";
import { ORDER_STATUS_LABELS } from "./order-status-tabs";

export type OrderActivityType =
  | "created"
  | "woo_import"
  | "woo_sync"
  | "status"
  | "edited"
  | "opened"
  | "note"
  | "tracking"
  | "printed"
  | "approved"
  | "payment";

/** Where the user opened or saved an edit in the panel */
export type OrderEditContext = {
  entryPoint: string;
};

export type OrderActivity = {
  id: string;
  at: string;
  type: OrderActivityType;
  title: string;
  detail?: string;
  actor?: string;
};

export type OrderOriginInfo = {
  channel: string;
  summary: string;
  detail?: string;
  icon: "web" | "woo" | "manual" | "phone" | "whatsapp";
};

import { getOrderSourceLabel } from "./order-source";
import { getWebStorePlatform, getWebStorePlatformLabel } from "./web-order-platform";

const SOURCE_LABELS: Record<Order["source"], string> = {
  manual: "New Order (Panel)",
  phone: "Phone order",
  whatsapp: "WhatsApp",
  web: "Website",
};

export function describeOrderOrigin(order: Order): OrderOriginInfo {
  const sourceLabel = getOrderSourceLabel(
    order.orderSource,
    order.customOrderSource
  );
  const sourceNote = `Order source: ${sourceLabel}`;

  if (getWebStorePlatform(order)) {
    const label = getWebStorePlatformLabel(order);
    return {
      channel: label,
      summary: `Imported from your ${label} website`,
      detail: order.wooNumber
        ? `Store order #${order.wooNumber} · ${sourceNote}`
        : `${sourceNote} · ${label} ID ${order.wooOrderId}`,
      icon: getWebStorePlatform(order) === "shopify" ? "web" : "woo",
    };
  }
  if (order.source === "web") {
    return {
      channel: "Web order",
      summary: "Came from website / web channel",
      detail: `${sourceNote} · Web Order List`,
      icon: "web",
    };
  }
  if (order.source === "manual") {
    return {
      channel: "Panel",
      summary: "Created manually in Approved Orders",
      detail: `${sourceNote} · New Order form`,
      icon: "manual",
    };
  }
  if (order.source === "phone") {
    return {
      channel: "Phone",
      summary: "Phone / call-in order",
      detail: SOURCE_LABELS.phone,
      icon: "phone",
    };
  }
  return {
    channel: "WhatsApp",
    summary: "WhatsApp or messaging channel",
    detail: SOURCE_LABELS.whatsapp,
    icon: "whatsapp",
  };
}

/** ISO timestamp for a new activity entry (real clock time). */
export function activityNowIso(): string {
  return new Date().toISOString();
}

function orderTimeBase(order: Order): number {
  const created = parseActivityDate(order.createdAt);
  if (created > 0) return created;
  const updated = parseActivityDate(order.updatedAt);
  if (updated > 0) return updated;
  return Date.now();
}

function syntheticAt(order: Order, offsetMs: number): string {
  return new Date(orderTimeBase(order) + offsetMs).toISOString();
}

export function buildSyntheticActivityLog(order: Order): OrderActivity[] {
  const origin = describeOrderOrigin(order);
  let offset = 0;
  const atNext = () => {
    const at = syntheticAt(order, offset);
    offset += 1000;
    return at;
  };

  const entries: OrderActivity[] = [
    {
      id: `syn-origin-${order.id}`,
      at: atNext(),
      type: getWebStorePlatform(order) ? "woo_import" : "created",
      title: origin.summary,
      detail: origin.detail,
      actor:
        order.handledBy ??
        (getWebStorePlatform(order)
          ? `${getWebStorePlatformLabel(order)} Sync`
          : order.wooOrderId
            ? "WooCommerce"
            : "Staff"),
    },
  ];
  if ((order.advance ?? 0) > 0) {
    const adv = logForAdvancePayment(order, order.handledBy);
    if (adv) {
      entries.push({
        ...adv,
        id: `syn-adv-${order.id}`,
        at: atNext(),
      });
    }
  }
  if (order.approvedAt) {
    const approvedMs = parseActivityDate(order.approvedAt);
    entries.push({
      id: `syn-rts-${order.id}`,
      at:
        approvedMs > 0
          ? new Date(approvedMs).toISOString()
          : atNext(),
      type: "approved",
      title: "Moved to RTS (Approved)",
      actor: order.handledBy,
    });
  }
  if (order.printed) {
    entries.push({
      id: `syn-print-${order.id}`,
      at: atNext(),
      type: "printed",
      title: "Marked as printed",
    });
  }
  if (order.trackingId) {
    entries.push({
      id: `syn-track-${order.id}`,
      at: atNext(),
      type: "tracking",
      title: "Tracking ID added",
      detail: order.trackingId,
    });
  }
  entries.push({
    id: `syn-upd-${order.id}`,
    at:
      parseActivityDate(order.updatedAt) > 0
        ? new Date(parseActivityDate(order.updatedAt)).toISOString()
        : atNext(),
    type: "edited",
    title: "Last updated",
    detail: `Status: ${ORDER_STATUS_LABELS[order.status]}`,
  });
  return entries;
}

const MONTHS: Record<string, number> = {
  jan: 0,
  feb: 1,
  mar: 2,
  apr: 3,
  may: 4,
  jun: 5,
  jul: 6,
  aug: 7,
  sep: 8,
  oct: 9,
  nov: 10,
  dec: 11,
};

/** Parse panel dates like "20 May 2026, 21:34" or "19 May 2026, 12:00 pm" */
export function parseActivityDate(s: string): number {
  if (!s?.trim()) return 0;

  if (/^\d{4}-\d{2}-\d{2}T/.test(s)) {
    const iso = new Date(s).getTime();
    if (!Number.isNaN(iso)) return iso;
  }

  const direct = new Date(s).getTime();
  if (!Number.isNaN(direct) && direct > 0) return direct;

  const m = s.match(
    /(\d{1,2})\s+([A-Za-z]+)\s+(\d{4})(?:,?\s*(\d{1,2}):(\d{2})(?:\s*(am|pm))?)?/i
  );
  if (m) {
    const mon = MONTHS[m[2].slice(0, 3).toLowerCase()];
    if (mon !== undefined) {
      const day = parseInt(m[1], 10);
      const year = parseInt(m[3], 10);
      let hour = m[4] ? parseInt(m[4], 10) : 0;
      const min = m[5] ? parseInt(m[5], 10) : 0;
      const ap = m[6]?.toLowerCase();
      if (ap === "pm" && hour < 12) hour += 12;
      if (ap === "am" && hour === 12) hour = 0;
      return new Date(year, mon, day, hour, min).getTime();
    }
  }
  return 0;
}

/** Normalize stored activity time to ISO for sorting and display. */
export function normalizeActivityAt(at: string): string {
  const t = parseActivityDate(at);
  if (t > 0) return new Date(t).toISOString();
  return at;
}

export function formatActivityDate(s: string): string {
  const t = parseActivityDate(s);
  if (!t) return s;
  const d = new Date(t);
  const now = new Date();
  const sameDay = d.toDateString() === now.toDateString();
  const time = d.toLocaleString("en-GB", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
  if (sameDay) return `Today, ${time}`;
  return d.toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  });
}

export function getOrderTimeline(order: Order): OrderActivity[] {
  const raw =
    order.activityLog && order.activityLog.length > 0
      ? order.activityLog
      : buildSyntheticActivityLog(order);

  const log = raw.map((entry, index) => ({
    entry: { ...entry, at: normalizeActivityAt(entry.at) },
    index,
  }));

  return log
    .sort((a, b) => {
      const tb = parseActivityDate(b.entry.at);
      const ta = parseActivityDate(a.entry.at);
      if (tb !== ta) return tb - ta;
      return b.index - a.index;
    })
    .map((x) => x.entry);
}

export function createActivityEntry(
  partial: Omit<OrderActivity, "id" | "at"> & { at?: string }
): OrderActivity {
  return {
    id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    at: partial.at ? normalizeActivityAt(partial.at) : activityNowIso(),
    type: partial.type,
    title: partial.title,
    detail: partial.detail,
    actor: partial.actor,
  };
}

const ADVANCE_PAYMENT_LABELS: Record<
  NonNullable<Order["advancePayment"]>["method"],
  string
> = {
  bkash: "bKash",
  nagad: "Nagad",
  rocket: "Rocket",
  hand_cash: "Hand Cash",
  bank: "Bank Transfer",
};

/** Activity log when customer paid advance (method, trx ID, hand cash ref). */
export function logForAdvancePayment(
  order: Order,
  actor?: string
): OrderActivity | null {
  const amount = order.advance ?? 0;
  if (amount <= 0) return null;

  const ap = order.advancePayment;
  const lines: string[] = [`Amount: ৳${amount.toLocaleString("en-BD")}`];
  if (ap) {
    lines.push(
      `Payment method: ${ADVANCE_PAYMENT_LABELS[ap.method] ?? ap.method}`
    );
    if (ap.method === "hand_cash") {
      if (ap.cashReceiverName?.trim()) {
        lines.push(`Received by: ${ap.cashReceiverName.trim()}`);
      }
      if (ap.cashReference?.trim()) {
        lines.push(`Reference: ${ap.cashReference.trim()}`);
      }
    } else if (ap.transactionId?.trim()) {
      lines.push(`Transaction ID: ${ap.transactionId.trim()}`);
    }
  } else {
    lines.push("Payment details were not recorded.");
  }

  return createActivityEntry({
    type: "note",
    title: "Advance payment recorded",
    detail: lines.join("\n"),
    actor: actor ?? order.handledBy ?? "Staff",
  });
}

export function logForNewOrder(order: Order, actor?: string): OrderActivity {
  const origin = describeOrderOrigin(order);
  return createActivityEntry({
    type: "created",
    title: `Order created — ${origin.channel}`,
    detail: order.isPreorder
      ? "Preorder · " + (origin.detail ?? SOURCE_LABELS[order.source])
      : origin.detail ?? `Source: ${SOURCE_LABELS[order.source]}`,
    actor: actor ?? order.handledBy ?? "Staff",
  });
}

export function logForWebStoreImport(
  platform: "shopify" | "woocommerce",
  storeNumber?: string
): OrderActivity {
  const label = platform === "shopify" ? "Shopify" : "WooCommerce";
  return createActivityEntry({
    type: "woo_import",
    title: `Imported from ${label}`,
    detail: storeNumber ? `Website order #${storeNumber}` : `Auto sync from ${label}`,
    actor: `${label} Sync`,
  });
}

export function logForWooImport(wooNumber?: string): OrderActivity {
  return logForWebStoreImport("woocommerce", wooNumber);
}

export function logForWebStoreSync(platform: "shopify" | "woocommerce"): OrderActivity {
  const label = platform === "shopify" ? "Shopify" : "WooCommerce";
  return createActivityEntry({
    type: "woo_sync",
    title: `Updated from ${label}`,
    detail: "Customer or items refreshed on sync",
    actor: `${label} Sync`,
  });
}

export function logForWooSync(): OrderActivity {
  return logForWebStoreSync("woocommerce");
}

export function logForStatusChange(
  from: OrderStatus,
  to: OrderStatus,
  actor?: string
): OrderActivity {
  return createActivityEntry({
    type: "status",
    title: `Status: ${ORDER_STATUS_LABELS[from]} → ${ORDER_STATUS_LABELS[to]}`,
    actor: actor ?? "Staff",
  });
}

function originBlock(order: Order): string[] {
  const origin = describeOrderOrigin(order);
  const lines = [
    `Came from: ${origin.channel}`,
    origin.summary,
  ];
  if (origin.detail) lines.push(origin.detail);
  if (order.wooNumber) {
    lines.push(`${getWebStorePlatformLabel(order)} #${order.wooNumber}`);
  }
  if (order.source) lines.push(`Channel tag: ${order.source}`);
  return lines;
}

/** Log when staff opens an order for editing (e.g. Web Order List → Open) */
export function logForOpened(order: Order, ctx: OrderEditContext): OrderActivity {
  return createActivityEntry({
    type: "opened",
    title: `Opened for edit — ${ctx.entryPoint}`,
    detail: [
      `Opened via: ${ctx.entryPoint}`,
      ...originBlock(order),
      "You can change customer, items, status, note, and totals.",
    ].join("\n"),
  });
}

function itemsSummary(items: Order["items"]): string {
  return items
    .map((i) => `${i.productName} ×${i.qty}`)
    .slice(0, 4)
    .join("; ");
}

function diffOrderFields(before: Order, after: Order): string[] {
  const changes: string[] = [];

  if (before.customerName !== after.customerName) {
    changes.push(`Name: ${before.customerName} → ${after.customerName}`);
  }
  if (before.phone !== after.phone) {
    changes.push(`Phone: ${before.phone} → ${after.phone}`);
  }
  if ((before.email ?? "") !== (after.email ?? "")) {
    changes.push("Email updated");
  }
  if (before.address !== after.address) {
    changes.push("Address updated");
  }
  if (before.district !== after.district) {
    changes.push(`District: ${before.district} → ${after.district}`);
  }
  if ((before.note ?? "") !== (after.note ?? "")) {
    changes.push("Note updated");
  }
  if (before.paymentMethod !== after.paymentMethod) {
    changes.push(
      `Payment: ${before.paymentMethod} → ${after.paymentMethod}`
    );
  }
  const bws =
    before.webStatus ??
    (before.status === "cancelled"
      ? "cancelled"
      : before.status === "delivered"
        ? "complete"
        : "pending");
  const aws =
    after.webStatus ??
    (after.status === "cancelled"
      ? "cancelled"
      : after.status === "delivered"
        ? "complete"
        : "pending");
  if (bws !== aws) {
    changes.push(`Web status: ${bws} → ${aws}`);
  }
  if (before.shippingCharge !== after.shippingCharge) {
    changes.push(`Shipping: ৳${before.shippingCharge} → ৳${after.shippingCharge}`);
  }
  if (before.discount !== after.discount) {
    changes.push(`Discount: ৳${before.discount} → ৳${after.discount}`);
  }
  if ((before.advance ?? 0) !== (after.advance ?? 0)) {
    changes.push(`Advance: ৳${before.advance ?? 0} → ৳${after.advance ?? 0}`);
  }
  if (before.total !== after.total) {
    changes.push(`Total: ৳${before.total} → ৳${after.total}`);
  }
  if (before.items.length !== after.items.length) {
    changes.push(
      `Items: ${before.items.length} line(s) → ${after.items.length} line(s)`
    );
  } else {
    const itemChanged = before.items.some((line, i) => {
      const n = after.items[i];
      return (
        !n ||
        line.productId !== n.productId ||
        line.productName !== n.productName ||
        line.qty !== n.qty ||
        line.price !== n.price
      );
    });
    if (itemChanged) changes.push("Product lines updated");
  }

  return changes;
}

/** Detailed save log — where order came from + what changed */
export function logForOrderEdit(
  before: Order,
  after: Order,
  ctx: OrderEditContext
): OrderActivity {
  const changes = diffOrderFields(before, after);
  return createActivityEntry({
    type: "edited",
    title: `Order saved — ${ctx.entryPoint}`,
    detail: [
      `Saved via: ${ctx.entryPoint}`,
      ...originBlock(before),
      changes.length > 0
        ? `Changes:\n• ${changes.join("\n• ")}`
        : "No field changes (re-saved)",
      `Items now: ${itemsSummary(after.items)}`,
      `Total: ৳${after.total.toLocaleString("en-BD")}`,
    ].join("\n"),
  });
}
