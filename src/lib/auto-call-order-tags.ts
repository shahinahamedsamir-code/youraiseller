import type { AutoCallKeyOrderAction } from "./auto-call-key-actions";

export const AUTO_CALL_ORDER_TAG = "Auto Call";
export const APPROVE_ORDER_TAG = "Approve Order";
export const REJECTED_ORDER_TAG = "Rejected";

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

/** Tags to show on the order after an auto-call key press is processed. */
export function buildAutoCallOrderTags(
  action: AutoCallKeyOrderAction,
  digit: number,
  existing?: unknown
): string[] {
  const tags = normalizeTagList(existing);

  appendUniqueTag(tags, AUTO_CALL_ORDER_TAG);
  appendUniqueTag(tags, pressedKeyOrderTag(digit));

  if (action === "approve_pending" || action === "approve_rts") {
    appendUniqueTag(tags, APPROVE_ORDER_TAG);
  }

  return tags;
}
