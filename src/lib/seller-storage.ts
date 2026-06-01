import { getSessionUser, getSessionUserId } from "./dev-users";

const DEMO_USER_IDS = new Set(["U-001"]);
const DEMO_EMAILS = new Set(["demo@store.com"]);

/** True only for the built-in demo seller account. */
export function isDemoSellerAccount(
  userId?: string | null,
  email?: string | null
): boolean {
  const user = getSessionUser();
  const id = userId ?? user?.id ?? getSessionUserId();
  const em = (email ?? user?.email ?? "").trim().toLowerCase();
  if (id && DEMO_USER_IDS.has(id)) return true;
  return DEMO_EMAILS.has(em);
}

export function getSellerStorageScope(): string | null {
  return getSessionUserId();
}

/** Per-seller localStorage key, or null when not signed in. */
export function sellerStorageKey(prefix: string): string | null {
  const scope = getSellerStorageScope();
  if (!scope) return null;
  return `youraiseller-${prefix}-${scope}`;
}

/** Storage prefixes that must never be shared between sellers. */
export const SELLER_SCOPED_PREFIXES = [
  "orders",
  "inventory",
  "customers",
  "delivery-methods",
  "woocommerce",
  "woo-stock-sync",
  "woo-product-sync-meta",
  "woo-order-sync-meta",
] as const;

