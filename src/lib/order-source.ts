import type { Order } from "./orders-store";

/** Where the customer/order came from (marketing attribution). */
export type OrderSource =
  | "facebook"
  | "website"
  | "direct"
  | "unknown"
  | "instagram"
  | "tiktok"
  | "whatsapp"
  | "exchange"
  | "messenger"
  | "custom";

export type OrderSourceOption = {
  value: OrderSource;
  label: string;
};

export const ORDER_SOURCE_OPTIONS: OrderSourceOption[] = [
  { value: "facebook", label: "Facebook" },
  { value: "website", label: "Website" },
  { value: "direct", label: "Direct" },
  { value: "unknown", label: "Unknown" },
  { value: "instagram", label: "Instagram" },
  { value: "tiktok", label: "TikTok" },
  { value: "whatsapp", label: "WhatsApp" },
  { value: "exchange", label: "Exchange" },
  { value: "messenger", label: "Messenger" },
  { value: "custom", label: "Custom Source" },
];

export const DEFAULT_ORDER_SOURCE: OrderSource = "unknown";
export const WEB_DEFAULT_ORDER_SOURCE: OrderSource = "website";

export function isGenericOrderSource(source?: OrderSource): boolean {
  return !source || source === "website" || source === "unknown";
}

/** Apply Woo-detected marketing source without overwriting staff picks. */
export function resolveOrderSourceOnWooSync(
  prev: Pick<Order, "orderSource" | "customOrderSource"> | null | undefined,
  detected: OrderSource,
  customDetected?: string
): Pick<Order, "orderSource" | "customOrderSource"> {
  if (!prev) {
    return {
      orderSource: detected,
      customOrderSource: customDetected?.trim() || undefined,
    };
  }

  if (prev.customOrderSource?.trim() && prev.orderSource === "custom") {
    return {
      orderSource: prev.orderSource,
      customOrderSource: prev.customOrderSource,
    };
  }

  if (isGenericOrderSource(prev.orderSource) && !isGenericOrderSource(detected)) {
    return {
      orderSource: detected,
      customOrderSource: customDetected?.trim() || undefined,
    };
  }

  if (!isGenericOrderSource(prev.orderSource)) {
    return {
      orderSource: prev.orderSource,
      customOrderSource: prev.customOrderSource,
    };
  }

  return {
    orderSource: detected,
    customOrderSource: customDetected?.trim() || undefined,
  };
}

export function getOrderSourceLabel(
  source?: OrderSource,
  customLabel?: string
): string {
  if (!source) return "Unknown";
  if (source === "custom" && customLabel?.trim()) return customLabel.trim();
  return ORDER_SOURCE_OPTIONS.find((o) => o.value === source)?.label ?? source;
}

/** Infer marketing source from legacy channel field. */
export function inferOrderSourceFromOrder(
  order: Pick<Order, "source" | "wooOrderId" | "orderSource">
): OrderSource {
  if (order.orderSource) return order.orderSource;
  if (order.wooOrderId != null || order.source === "web") return "website";
  if (order.source === "whatsapp") return "whatsapp";
  if (order.source === "phone") return "direct";
  return DEFAULT_ORDER_SOURCE;
}

export function orderSourceBadgeClass(source: OrderSource): string {
  const map: Record<OrderSource, string> = {
    facebook: "bg-blue-100 text-blue-800",
    website: "bg-teal-100 text-teal-800",
    direct: "bg-violet-100 text-violet-800",
    unknown: "bg-slate-100 text-slate-600",
    instagram: "bg-fuchsia-100 text-fuchsia-800",
    tiktok: "bg-slate-800 text-white",
    whatsapp: "bg-emerald-100 text-emerald-800",
    exchange: "bg-amber-100 text-amber-800",
    messenger: "bg-sky-100 text-sky-800",
    custom: "bg-indigo-100 text-indigo-800",
  };
  return map[source] ?? "bg-slate-100 text-slate-700";
}

export function countOrdersBySource(orders: Order[]): Record<OrderSource, number> {
  const counts = Object.fromEntries(
    ORDER_SOURCE_OPTIONS.map((o) => [o.value, 0])
  ) as Record<OrderSource, number>;

  for (const o of orders) {
    const key = inferOrderSourceFromOrder(o);
    counts[key] = (counts[key] ?? 0) + 1;
  }
  return counts;
}
