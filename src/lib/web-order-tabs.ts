import type { Order, WebDisplayStatus } from "./orders-store";
import { resolveWebDisplayStatus } from "./order-edit";

export type WebOrderTabKey =
  | "processing"
  | "incomplete"
  | "good_no_response"
  | "no_response"
  | "advance_payment"
  | "on_hold"
  | "complete"
  | "cancel"
  | "all";

export type WebOrderTabDef = {
  key: WebOrderTabKey;
  label: string;
};

export const WEB_ORDER_TABS: WebOrderTabDef[] = [
  { key: "processing", label: "Processing" },
  { key: "incomplete", label: "Incomplete" },
  { key: "good_no_response", label: "Good But No Response" },
  { key: "no_response", label: "No Response" },
  { key: "advance_payment", label: "Advance Payment" },
  { key: "on_hold", label: "On Hold" },
  { key: "complete", label: "Complete" },
  { key: "cancel", label: "Cancel" },
  { key: "all", label: "All" },
];

const PROCESSING_STATUSES: WebDisplayStatus[] = [
  "pending",
  "processing",
  "confirmed",
];

const COMPLETE_STATUSES: WebDisplayStatus[] = ["complete"];

const CANCEL_STATUSES: WebDisplayStatus[] = ["cancelled"];

export function isWebOrderIncomplete(o: Order): boolean {
  return (
    !o.customerName.trim() ||
    !o.phone.trim() ||
    !o.address.trim() ||
    o.items.length === 0
  );
}

export function matchesWebOrderTab(o: Order, tab: WebOrderTabKey): boolean {
  const ws = resolveWebDisplayStatus(o);
  const advance = (o.advance ?? 0) > 0;

  switch (tab) {
    case "processing":
      return (
        PROCESSING_STATUSES.includes(ws) &&
        !isWebOrderIncomplete(o) &&
        ws !== "on_hold" &&
        ws !== "good_no_response" &&
        ws !== "no_response"
      );
    case "incomplete":
      return isWebOrderIncomplete(o) && ws !== "cancelled" && ws !== "complete";
    case "good_no_response":
      return ws === "good_no_response";
    case "no_response":
      return ws === "no_response";
    case "advance_payment":
      return advance;
    case "on_hold":
      return ws === "on_hold";
    case "complete":
      return COMPLETE_STATUSES.includes(ws);
    case "cancel":
      return CANCEL_STATUSES.includes(ws);
    case "all":
      return true;
    default:
      return true;
  }
}

/** After saving web status — open matching list tab */
export function webListTabForStatus(ws: WebDisplayStatus): WebOrderTabKey {
  if (ws === "complete") return "complete";
  if (ws === "cancelled") return "cancel";
  if (ws === "on_hold") return "on_hold";
  if (ws === "good_no_response") return "good_no_response";
  if (ws === "no_response") return "no_response";
  if (ws === "incomplete") return "incomplete";
  return "processing";
}

export function isWebOrderTabKey(v: string): v is WebOrderTabKey {
  return WEB_ORDER_TABS.some((t) => t.key === v);
}

export function countWebOrdersByTab(orders: Order[]): Record<WebOrderTabKey, number> {
  const counts = Object.fromEntries(
    WEB_ORDER_TABS.map((t) => [t.key, 0])
  ) as Record<WebOrderTabKey, number>;

  for (const tab of WEB_ORDER_TABS) {
    counts[tab.key] = orders.filter((o) => matchesWebOrderTab(o, tab.key)).length;
  }

  return counts;
}
