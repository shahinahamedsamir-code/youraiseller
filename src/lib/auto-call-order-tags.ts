import type { AutoCallKeyOrderAction } from "./auto-call-key-actions";

export const AUTO_CALL_ORDER_TAG = "Auto Call";
export const REJECTED_ORDER_TAG = "Rejected";

const WOO_STATUS_TAG_LABELS = new Set([
  "processing",
  "pending",
  "on-hold",
  "on hold",
  "completed",
  "complete",
  "cancelled",
  "canceled",
  "failed",
  "refunded",
]);

export function pressedKeyOrderTag(digit: number): string {
  return `Pressed ${digit}`;
}

function normalizeTagList(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  return raw
    .filter((t): t is string => typeof t === "string")
    .map((t) => t.trim())
    .filter(Boolean);
}

function appendUniqueTag(tags: string[], label: string): void {
  const key = label.trim().toLowerCase();
  if (!key) return;
  if (tags.some((t) => t.toLowerCase() === key)) return;
  tags.push(label.trim());
}

/** Drop Woo status chips and legacy auto-call labels we no longer show. */
export function stripAutoCallNoiseTags(tags: string[]): string[] {
  return tags.filter((label) => {
    const key = label.trim().toLowerCase();
    if (!key) return false;
    if (key === "approve order") return false;
    if (WOO_STATUS_TAG_LABELS.has(key)) return false;
    if (WOO_STATUS_TAG_LABELS.has(key.replace(/-/g, " "))) return false;
    return true;
  });
}

/** Tags to show on the order after an auto-call key press is processed. */
export function buildAutoCallOrderTags(
  action: AutoCallKeyOrderAction,
  digit: number,
  existing?: unknown
): string[] {
  void action;
  const tags = stripAutoCallNoiseTags(normalizeTagList(existing));

  appendUniqueTag(tags, AUTO_CALL_ORDER_TAG);
  appendUniqueTag(tags, pressedKeyOrderTag(digit));

  return tags;
}
