import { getSessionUser, getSessionUserId, loadDevUsers } from "./dev-users";

const DEMO_USER_IDS = new Set(["U-001"]);
const DEMO_EMAILS = new Set(["demo@store.com"]);

/**
 * The account that owns the data — self, or the parent for a team member.
 * Self-healing: resolves the parent by id, then email, then the sole owner,
 * so team data keeps working even if the owner's user id changes.
 */
function scopeOwnerAccount() {
  const user = getSessionUser();
  if (!user) return undefined;
  if (!user.parentAccountId && !user.parentAccountEmail) return user;

  const users = loadDevUsers();
  const owners = users.filter((u) => !u.parentAccountId);
  // 1) stable email link first (email is unique; ids can collide)
  let owner = user.parentAccountEmail
    ? owners.find((u) => u.email === user.parentAccountEmail)
    : undefined;
  // 2) direct id match (the match must itself be an owner, not a member)
  if (!owner) owner = owners.find((u) => u.id === user.parentAccountId);
  // 3) match by company / business name (heals legacy members)
  if (!owner) {
    const target = (user.company || "").trim().toLowerCase();
    if (target) {
      owner = owners.find(
        (u) => (u.company || "").trim().toLowerCase() === target
      );
    }
  }
  // 4) single-business fallback: the only non-team account is the owner
  if (!owner && owners.length === 1) owner = owners[0];
  return owner ?? user;
}

/**
 * True for the built-in demo seller account. A team member of the demo
 * account is also treated as demo so they see the same data.
 */
export function isDemoSellerAccount(
  userId?: string | null,
  email?: string | null
): boolean {
  if (userId || email) {
    const id = userId ?? "";
    const em = (email ?? "").trim().toLowerCase();
    if (id && DEMO_USER_IDS.has(id)) return true;
    if (em && DEMO_EMAILS.has(em)) return true;
  }
  const owner = scopeOwnerAccount();
  const oid = owner?.id ?? getSessionUserId();
  const oem = (owner?.email ?? "").trim().toLowerCase();
  if (oid && DEMO_USER_IDS.has(oid)) return true;
  return DEMO_EMAILS.has(oem);
}

export function getSellerStorageScope(): string | null {
  // Team members operate on their business owner's data.
  const user = getSessionUser();
  if (!user) return getSessionUserId();
  if (user.parentAccountId || user.parentAccountEmail) {
    const owner = scopeOwnerAccount();
    return owner?.id ?? user.parentAccountId ?? getSessionUserId();
  }
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
  "business",
  "ordersources",
  "shippingnotes",
  "ordertags",
  "advancesettings",
  "woo-stock-sync",
  "woo-product-sync-meta",
  "woo-order-sync-meta",
] as const;

