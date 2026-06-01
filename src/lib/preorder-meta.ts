import type { Order } from "./orders-store";
import { parseActivityDate } from "./order-activity";

export type PreorderReason =
  | "out_of_stock"
  | "gift_parcel"
  | "time_scheduled_delivery"
  | "customer_request"
  | "others";

/** Options when marking / creating a preorder */
export const PREORDER_REASON_OPTIONS: {
  value: PreorderReason;
  label: string;
}[] = [
  { value: "out_of_stock", label: "Out of stock" },
  { value: "gift_parcel", label: "For gift parcel" },
  { value: "time_scheduled_delivery", label: "Time scheduled delivery" },
  { value: "customer_request", label: "Customer request" },
  { value: "others", label: "Others" },
];

export const PREORDER_REASONS: { value: PreorderReason | "all"; label: string }[] =
  [{ value: "all", label: "All Reasons" }, ...PREORDER_REASON_OPTIONS];

export const PREORDER_REASON_LABELS: Record<PreorderReason, string> =
  Object.fromEntries(
    PREORDER_REASON_OPTIONS.map((o) => [o.value, o.label])
  ) as Record<PreorderReason, string>;

export function getPreorderReasonLabel(
  reason?: PreorderReason | string
): string {
  if (!reason) return "—";
  return (
    PREORDER_REASON_LABELS[reason as PreorderReason] ??
    String(reason).replace(/_/g, " ")
  );
}

export type PreorderNotifyTab = "all" | "notified" | "pending_notification";

export function getPreorderReason(order: Order): PreorderReason {
  if (order.preorderReason) return order.preorderReason;
  const note = (order.note ?? "").toLowerCase();
  if (note.includes("gift")) return "gift_parcel";
  if (note.includes("schedule") || note.includes("scheduled")) {
    return "time_scheduled_delivery";
  }
  if (note.includes("stock") || note.includes("out of stock")) {
    return "out_of_stock";
  }
  return "others";
}

export function isPreorderNotified(order: Order): boolean {
  return Boolean(order.preorderNotifiedAt?.trim());
}

/** datetime-local value (YYYY-MM-DDTHH:mm) for inputs */
export function toDatetimeLocalValue(isoOrLabel?: string): string {
  const t = parseActivityDate(isoOrLabel ?? "");
  if (!t) return "";
  const d = new Date(t);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function datetimeLocalToIso(local: string): string | undefined {
  if (!local.trim()) return undefined;
  const t = new Date(local).getTime();
  if (Number.isNaN(t)) return undefined;
  return new Date(t).toISOString();
}

export function formatPreorderDeliveryAt(s?: string): string {
  if (!s?.trim()) return "—";
  const t = parseActivityDate(s);
  if (!t) return s;
  return new Date(t).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

export function preorderProductsSummary(order: Order): string {
  if (order.items.length === 0) return "—";
  const head = order.items
    .slice(0, 2)
    .map((i) => `${i.productName} ×${i.qty}`)
    .join(", ");
  if (order.items.length > 2) return `${head} +${order.items.length - 2}`;
  return head;
}

export const PREORDER_BUSINESS_FILTERS = [
  { value: "all", label: "All Businesses" },
  { value: "web", label: "Web store" },
  { value: "manual", label: "Manual / Panel" },
  { value: "phone", label: "Phone" },
  { value: "whatsapp", label: "WhatsApp" },
] as const;

export type PreorderBusinessFilter =
  (typeof PREORDER_BUSINESS_FILTERS)[number]["value"];
