/** Parsed WooCommerce REST order fields kept on panel orders. */
import type { OrderSource } from "./order-source";

export type WooOrderSnapshot = {
  wcStatus: string;
  paymentMethod?: string;
  paymentMethodTitle?: string;
  transactionId?: string;
  needsPayment?: boolean;
  currency?: string;
  subtotal?: number;
  shippingTotal?: number;
  discountTotal?: number;
  couponCode?: string;
  customerIp?: string;
  customerUserAgent?: string;
  deviceLabel?: string;
  attributionSource?: string;
  dateCreated?: string;
  dateModified?: string;
  datePaid?: string;
  syncedAt: string;
};

type WooMeta = { key: string; value: unknown };

function metaValue(meta: WooMeta[] | undefined, keys: string[]): string | undefined {
  if (!meta?.length) return undefined;
  for (const key of keys) {
    const hit = meta.find((m) => m.key === key);
    if (hit?.value != null && String(hit.value).trim()) {
      return String(hit.value).trim();
    }
  }
  return undefined;
}

function parseNum(v: unknown): number | undefined {
  if (v == null || v === "") return undefined;
  const n = typeof v === "number" ? v : parseFloat(String(v));
  return Number.isFinite(n) ? n : undefined;
}

function deviceFromUserAgent(ua?: string): string | undefined {
  if (!ua?.trim()) return undefined;
  const lower = ua.toLowerCase();
  if (/mobile|android|iphone|ipad|ipod/.test(lower)) return "Mobile";
  if (/tablet/.test(lower)) return "Tablet";
  return "Desktop";
}

/** Raw attribution string from Woo meta (for display / debugging). */
export function getWooAttributionRaw(meta: WooMeta[] | undefined): string | undefined {
  return (
    metaValue(meta, [
      "_wc_order_attribution_source_type",
      "_wc_order_attribution_utm_source",
      "_wc_order_attribution_referrer",
      "_wc_order_attribution_utm_medium",
      "_wc_order_attribution_utm_campaign",
      "utm_source",
      "_order_source",
      "order_source",
      "source",
    ]) ?? undefined
  );
}

function parseAttribution(meta: WooMeta[] | undefined): string | undefined {
  return getWooAttributionRaw(meta);
}

export type WooSourceDetection = {
  orderSource: OrderSource;
  customOrderSource?: string;
  rawAttribution?: string;
};

/** Map WooCommerce order meta → panel Order Source (Facebook, Instagram, …). */
export function detectOrderSourceFromWooRow(
  row: WooOrderApiRow
): WooSourceDetection {
  const meta = row.meta_data;
  const raw = getWooAttributionRaw(meta)?.toLowerCase() ?? "";
  const referrer = metaValue(meta, ["_wc_order_attribution_referrer"])?.toLowerCase() ?? "";
  const blob = `${raw} ${referrer}`.trim();

  // An order placed on the store is a Website order — that's its Order Source.
  // The ad/traffic channel (Facebook, Instagram, …) is kept as rawAttribution
  // for reference/analytics, but we don't override the source with it. Sellers
  // tag other channels (Facebook DM, WhatsApp, …) on manual orders instead.
  return blob
    ? { orderSource: "website", rawAttribution: blob }
    : { orderSource: "website" };
}

export type WooOrderApiRow = {
  id: number;
  number: string;
  status: string;
  date_created?: string;
  date_modified?: string;
  date_paid?: string | null;
  currency?: string;
  payment_method?: string;
  payment_method_title?: string;
  transaction_id?: string;
  needs_payment?: boolean;
  customer_ip_address?: string;
  customer_user_agent?: string;
  subtotal?: string;
  shipping_total?: string;
  discount_total?: string;
  total?: string;
  meta_data?: WooMeta[];
  coupon_lines?: { code?: string; discount?: string }[];
};

export function parseWooOrderSnapshot(row: WooOrderApiRow): WooOrderSnapshot {
  const coupon = row.coupon_lines?.find((c) => c.code?.trim());
  const ua = row.customer_user_agent?.trim();

  return {
    wcStatus: row.status,
    paymentMethod: row.payment_method?.trim() || undefined,
    paymentMethodTitle: row.payment_method_title?.trim() || undefined,
    transactionId: row.transaction_id?.trim() || undefined,
    needsPayment: row.needs_payment,
    currency: row.currency?.trim() || undefined,
    subtotal: parseNum(row.subtotal),
    shippingTotal: parseNum(row.shipping_total),
    discountTotal: parseNum(row.discount_total),
    couponCode: coupon?.code?.trim() || undefined,
    customerIp: row.customer_ip_address?.trim() || undefined,
    customerUserAgent: ua || undefined,
    deviceLabel: deviceFromUserAgent(ua),
    attributionSource: parseAttribution(row.meta_data),
    dateCreated: row.date_created,
    dateModified: row.date_modified,
    datePaid: row.date_paid ?? undefined,
    syncedAt: new Date().toISOString(),
  };
}

export function formatWooDate(iso?: string): string {
  if (!iso?.trim()) return "—";
  try {
    return new Date(iso).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}
