import type { AutoCallDtmfOption } from "./auto-call-types";

/** Where the web order goes when customer presses this key. */
export type AutoCallKeyOrderAction =
  | "none"
  | "stay_processing"
  | "approve_pending"
  | "approve_rts"
  | "web_cancel"
  | "web_no_response"
  | "web_on_hold";

export type AutoCallKeyOrderActionDef = {
  value: AutoCallKeyOrderAction;
  label: string;
  description: string;
};

export const AUTO_CALL_KEY_ORDER_ACTIONS: AutoCallKeyOrderActionDef[] = [
  {
    value: "none",
    label: "No change",
    description: "Order stays where it is on Web Order List",
  },
  {
    value: "stay_processing",
    label: "Keep on Processing",
    description: "Stay on Processing tab — only note the key press",
  },
  {
    value: "approve_pending",
    label: "Approved → Pending",
    description: "Same as clicking Create Order — moves to Approved Orders",
  },
  {
    value: "approve_rts",
    label: "Approved → RTS",
    description: "Skip Pending — mark Ready to Ship directly",
  },
  {
    value: "web_cancel",
    label: "Cancel order",
    description: "Move to Cancel tab on Web Order List",
  },
  {
    value: "web_no_response",
    label: "No Response",
    description: "Move to No Response tab",
  },
  {
    value: "web_on_hold",
    label: "On Hold",
    description: "Move to On Hold tab",
  },
];

const VALID = new Set<string>(AUTO_CALL_KEY_ORDER_ACTIONS.map((a) => a.value));

export function normalizeAutoCallKeyOrderAction(
  raw: unknown,
  key?: string
): AutoCallKeyOrderAction {
  if (typeof raw === "string" && VALID.has(raw)) {
    return raw as AutoCallKeyOrderAction;
  }
  if (key === "1") return "approve_pending";
  if (key === "2") return "web_cancel";
  return "none";
}

export function defaultOrderActionForKey(key: string): AutoCallKeyOrderAction {
  return normalizeAutoCallKeyOrderAction(undefined, key.trim());
}

export function autoCallKeyOrderActionLabel(action: AutoCallKeyOrderAction): string {
  return (
    AUTO_CALL_KEY_ORDER_ACTIONS.find((a) => a.value === action)?.label ?? action
  );
}

export function resolveOrderActionForDigit(
  options: AutoCallDtmfOption[],
  digit: number
): AutoCallKeyOrderAction {
  const key = String(digit);
  const row = options.find((o) => o.key.trim() === key);
  return normalizeAutoCallKeyOrderAction(row?.orderAction, key);
}

export function normalizeDtmfOption(row: Partial<AutoCallDtmfOption>, index: number): AutoCallDtmfOption {
  const key = typeof row.key === "string" ? row.key.trim() : String(index + 1);
  return {
    id: typeof row.id === "string" ? row.id : `dtmf-${index}`,
    key,
    voiceLabel: typeof row.voiceLabel === "string" ? row.voiceLabel : "",
    audioUrl: typeof row.audioUrl === "string" ? row.audioUrl : undefined,
    orderAction: normalizeAutoCallKeyOrderAction(row.orderAction, key),
  };
}
