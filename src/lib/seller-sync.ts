import { getSellerStorageScope } from "./seller-storage";
import { getSessionUser } from "./dev-users";

export type SellerKind =
  | "orders"
  | "inventory"
  | "customers"
  | "woocommerce"
  | "business"
  | "ordersources"
  | "shippingnotes"
  | "ordertags"
  | "advancesettings"
  | "sms";

const KINDS: SellerKind[] = [
  "orders",
  "inventory",
  "customers",
  "woocommerce",
  "business",
  "ordersources",
  "shippingnotes",
  "ordertags",
  "advancesettings",
  "sms",
];

function localKey(kind: SellerKind, scope: string): string {
  return `youraiseller-${kind}-${scope}`;
}

/** Skip a server pull right after a local save to avoid clobbering edits. */
const lastPush: Record<string, number> = {};

export async function pushSellerData(kind: SellerKind, data: unknown): Promise<void> {
  if (typeof window === "undefined") return;
  const scope = getSellerStorageScope();
  if (!scope) return;
  lastPush[`${scope}:${kind}`] = Date.now();
  try {
    await fetch("/api/seller-data", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ scope, kind, data }),
    });
  } catch {
    /* offline — keep local copy */
  }
}

export async function pullSellerData(kind: SellerKind): Promise<unknown | null> {
  if (typeof window === "undefined") return null;
  const scope = getSellerStorageScope();
  if (!scope) return null;
  try {
    const res = await fetch(
      `/api/seller-data?scope=${encodeURIComponent(scope)}&kind=${kind}`,
      { cache: "no-store" }
    );
    if (!res.ok) return null;
    const json = await res.json();
    return json?.data ?? null;
  } catch {
    return null;
  }
}

/**
 * Pull this business's data from the server into localStorage so any
 * device/browser of the same business sees the same orders/products/customers.
 * If the server has nothing yet, seed it from this browser's existing data.
 */
function isConnectedWoo(v: unknown): boolean {
  return Boolean(
    v && typeof v === "object" && (v as { connected?: boolean }).connected
  );
}

export async function syncSellerDataFromServer(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const scope = getSellerStorageScope();
  if (!scope) return false;

  // Only the business owner may seed the server from their local data;
  // team members pull only, so their empty/default state never overwrites.
  const isOwner = !getSessionUser()?.parentAccountId;

  let changed = false;
  const adopt = (key: string, data: unknown) => {
    const next = JSON.stringify(data);
    if (localStorage.getItem(key) !== next) {
      localStorage.setItem(key, next);
      changed = true;
    }
  };

  for (const kind of KINDS) {
    const serverData = await pullSellerData(kind);
    const key = localKey(kind, scope);
    const localRaw = localStorage.getItem(key);
    const local = localRaw ? safeParse(localRaw) : null;

    // WooCommerce: a real (connected) config always wins over an empty one.
    if (kind === "woocommerce") {
      const localOn = isConnectedWoo(local);
      const serverOn = isConnectedWoo(serverData);
      if (localOn && !serverOn) {
        await pushSellerData(kind, local);
        continue;
      }
      if (serverData != null) adopt(key, serverData);
      continue;
    }

    if (serverData != null) {
      adopt(key, serverData);
    } else if (localRaw && isOwner) {
      const since = lastPush[`${scope}:${kind}`] ?? 0;
      if (Date.now() - since > 2000 && local != null) {
        await pushSellerData(kind, local);
      }
    }
  }

  if (changed) {
    window.dispatchEvent(new Event("youraiseller-data-updated"));
  }
  return changed;
}

/** Pull latest orders from server into localStorage (e.g. after auto-call key routing). */
export async function pullOrdersFromServer(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const scope = getSellerStorageScope();
  if (!scope) return false;

  const serverData = await pullSellerData("orders");
  if (serverData == null) return false;

  const key = localKey("orders", scope);
  const next = JSON.stringify(serverData);
  if (localStorage.getItem(key) === next) return false;

  localStorage.setItem(key, next);
  window.dispatchEvent(new Event("youraiseller-data-updated"));
  return true;
}

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return null;
  }
}
