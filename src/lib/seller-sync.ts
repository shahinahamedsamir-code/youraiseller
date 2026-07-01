import { getSellerStorageScope } from "./seller-storage";
import { getSessionUser } from "./dev-users";
import {
  isSellerDataPushTooLarge,
  sellerDataPayloadBytes,
  SELLER_DATA_GZIP_THRESHOLD,
  slimOrdersBlob,
} from "./seller-data-payload";

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
  | "deliverymethods"
  | "sms"
  | "accounting"
  | "poscash";

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
  "deliverymethods",
  "sms",
  "accounting",
];

function localKey(kind: SellerKind, scope: string): string {
  return `youraiseller-${kind}-${scope}`;
}

/** Skip a server pull right after a local save to avoid clobbering edits. */
const lastPush: Record<string, number> = {};

async function gzipBody(json: string): Promise<{ body: BodyInit; headers: Record<string, string> }> {
  if (json.length < SELLER_DATA_GZIP_THRESHOLD || typeof CompressionStream === "undefined") {
    return {
      body: json,
      headers: { "Content-Type": "application/json" },
    };
  }
  const stream = new Blob([json]).stream().pipeThrough(new CompressionStream("gzip"));
  const body = await new Response(stream).arrayBuffer();
  return {
    body,
    headers: {
      "Content-Type": "application/json",
      "Content-Encoding": "gzip",
    },
  };
}

export async function pushSellerData(
  kind: SellerKind,
  data: unknown,
  options: { allowOversized?: boolean } = {}
): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const scope = getSellerStorageScope();
  if (!scope) return false;

  const payload = kind === "orders" ? slimOrdersBlob(data) : data;
  const envelope = { scope, kind, data: payload };

  if (!options.allowOversized && isSellerDataPushTooLarge(envelope)) {
    const mb = (sellerDataPayloadBytes(envelope) / (1024 * 1024)).toFixed(1);
    console.warn(`[seller-sync] skip push ${kind}: payload is ${mb}MB (limit 3.5MB) — using local data only`);
    return false;
  }

  lastPush[`${scope}:${kind}`] = Date.now();
  try {
    const json = JSON.stringify(envelope);
    const { body, headers } = await gzipBody(json);
    const bodyBytes =
      typeof body === "string"
        ? new TextEncoder().encode(body).length
        : body instanceof ArrayBuffer
          ? body.byteLength
          : 0;

    if (!options.allowOversized && bodyBytes > SELLER_DATA_GZIP_THRESHOLD * 80) {
      console.warn(`[seller-sync] skip push ${kind}: compressed body still too large`);
      return false;
    }

    const res = await fetch("/api/seller-data", {
      method: "POST",
      headers,
      credentials: "same-origin",
      body,
    });
    if (!res.ok) {
      console.warn(`[seller-sync] push ${kind} failed: ${res.status}`);
      return false;
    }
    return true;
  } catch {
    /* offline — keep local copy */
    return false;
  }
}

export async function pullSellerData(kind: SellerKind): Promise<unknown | null> {
  if (typeof window === "undefined") return null;
  const scope = getSellerStorageScope();
  if (!scope) return null;
  try {
    const res = await fetch(
      `/api/seller-data?scope=${encodeURIComponent(scope)}&kind=${kind}`,
      { cache: "no-store", credentials: "same-origin" }
    );
    if (!res.ok) {
      if (res.status === 413) {
        console.warn(`[seller-sync] pull ${kind} too large (${res.status}) — using local data`);
      }
      return null;
    }
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
      const since = lastPush[`${scope}:${kind}`] ?? 0;
      if (Date.now() - since < 5000 && localRaw && isOwner) {
        await pushSellerData(kind, local);
      } else {
        adopt(key, serverData);
      }
    } else if (localRaw && isOwner) {
      const since = lastPush[`${scope}:${kind}`] ?? 0;
      // Large order blobs cannot be uploaded in one POST on serverless hosts — keep local.
      if (kind === "orders" && isSellerDataPushTooLarge({ scope, kind, data: slimOrdersBlob(local) })) {
        continue;
      }
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
/**
 * Persist a single order to the server without uploading the whole blob. Used
 * for individual edits (cancel, status change) so they survive even when the
 * full orders blob is over the client push size limit. Also refreshes the
 * pull-guard timestamp so a background pull can't revert this fresh edit.
 */
export async function pushSingleOrder(order: { id: string }): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const scope = getSellerStorageScope();
  if (!scope || !order?.id) return false;
  lastPush[`${scope}:orders`] = Date.now();
  try {
    const res = await fetch("/api/seller-data", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      credentials: "same-origin",
      body: JSON.stringify({ scope, order }),
    });
    return res.ok;
  } catch {
    return false;
  }
}

export async function pullOrdersFromServer(): Promise<boolean> {
  if (typeof window === "undefined") return false;
  const scope = getSellerStorageScope();
  if (!scope) return false;

  // Don't clobber a fresh local edit that is still syncing — the pending push
  // will carry it to the server. Without this, a stale server copy can "revert"
  // an order the seller just changed (e.g. a cancel snapping back to pending).
  const since = lastPush[`${scope}:orders`] ?? 0;
  if (Date.now() - since < 5000) return false;

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
