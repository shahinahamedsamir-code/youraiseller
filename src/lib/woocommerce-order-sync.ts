import {
  upsertWooCommerceOrder,
  loadOrders,
  repairWebOrdersInQueue,
  runWithBulkOrderSync,
  runWithBulkOrderSyncAsync,
} from "./orders-store";
import type { Order, OrderLine, PaymentMethod, WebDisplayStatus } from "./orders-store";
import { loadWooCommerceSettings, appendWooLog } from "./woocommerce-integration-store";
import { findProductForWooLine } from "./inventory-store";
import { sellerStorageKey } from "./seller-storage";

import {
  detectOrderSourceFromWooRow,
  parseWooOrderSnapshot,
  type WooOrderApiRow,
} from "./woo-order-snapshot";

export type WooOrderRow = WooOrderApiRow & {
  total: string;
  payment_method: string;
  billing: {
    first_name: string;
    last_name: string;
    phone: string;
    email: string;
    address_1: string;
    city: string;
    state: string;
  };
  shipping_lines?: { total: string }[];
  line_items: {
    id: number;
    name: string;
    sku: string;
    product_id: number;
    variation_id: number;
    quantity: number;
    total: string;
    price: number;
    image?: { src?: string };
  }[];
  customer_note?: string;
};

export type OrderSyncResult = {
  imported: number;
  updated: number;
  skipped: number;
  failed: number;
  errors: string[];
};

type SyncMeta = {
  autoSyncEnabled: boolean;
  lastSyncAt: string | null;
  lastResult: OrderSyncResult | null;
  /** False until the first import window sync finishes for this store URL. */
  firstSyncCompleted: boolean;
  syncedStoreUrl: string | null;
};

function metaKey(): string | null {
  return sellerStorageKey("woo-order-sync-meta");
}

function loadMeta(): SyncMeta {
  if (typeof window === "undefined") {
    return {
      autoSyncEnabled: false,
      lastSyncAt: null,
      lastResult: null,
      firstSyncCompleted: false,
      syncedStoreUrl: null,
    };
  }
  const key = metaKey();
  if (!key) {
    return {
      autoSyncEnabled: false,
      lastSyncAt: null,
      lastResult: null,
      firstSyncCompleted: false,
      syncedStoreUrl: null,
    };
  }
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      return {
        autoSyncEnabled: false,
        lastSyncAt: null,
        lastResult: null,
        firstSyncCompleted: false,
        syncedStoreUrl: null,
      };
    }
    const parsed = JSON.parse(raw) as Partial<SyncMeta>;
    return {
      autoSyncEnabled: parsed.autoSyncEnabled === true,
      lastSyncAt: parsed.lastSyncAt ?? null,
      lastResult: parsed.lastResult ?? null,
      firstSyncCompleted: parsed.firstSyncCompleted === true,
      syncedStoreUrl:
        typeof parsed.syncedStoreUrl === "string" ? parsed.syncedStoreUrl : null,
    };
  } catch {
    return {
      autoSyncEnabled: false,
      lastSyncAt: null,
      lastResult: null,
      firstSyncCompleted: false,
      syncedStoreUrl: null,
    };
  }
}

/** New store connect or URL change — next sync uses the 12/24h import window only. */
export function resetWooFirstOrderSync() {
  return saveOrderSyncMeta({
    firstSyncCompleted: false,
    syncedStoreUrl: null,
    lastSyncAt: null,
    lastResult: null,
  });
}

export function saveOrderSyncMeta(patch: Partial<SyncMeta>) {
  const next = { ...loadMeta(), ...patch };
  if (typeof window !== "undefined") {
    const key = metaKey();
    if (key) localStorage.setItem(key, JSON.stringify(next));
  }
  return next;
}

export function getOrderSyncMeta() {
  return loadMeta();
}

function mapWcPayment(method: string): PaymentMethod {
  const m = method.toLowerCase();
  if (m.includes("bkash")) return "bkash";
  if (m.includes("nagad")) return "nagad";
  if (m === "cod" || m.includes("cash")) return "cod";
  return "prepaid";
}

function mapWcWebStatus(status: string): WebDisplayStatus {
  const s = status.toLowerCase().replace(/^wc-/, "");
  if (s === "completed" || s === "complete") return "complete";
  if (s === "cancelled" || s === "canceled" || s === "refunded") {
    return "cancelled";
  }
  // Started-but-not-finished checkouts need seller follow-up → Incomplete tab.
  if (
    s === "checkout-draft" ||
    s === "checkout_draft" ||
    s === "pending" ||
    s === "failed"
  ) {
    return "incomplete";
  }
  // On-hold in WooCommerce is our own "imported, verify before ship" marker
  // (the import policy sets fresh orders on-hold). In the app these are new
  // orders the seller still needs to work → land them in Processing, not the
  // seller-controlled On Hold tab. Manual/staff holds are preserved separately
  // via webStatusStaffSetAt.
  if (s === "on-hold" || s === "onhold") return "processing";
  if (s === "processing") return "processing";
  return "pending";
}

function mapWcOrderStatus(wcStatus: string): Order["status"] {
  const s = wcStatus.toLowerCase().replace(/^wc-/, "");
  if (s === "completed" || s === "complete" || s === "delivered") return "delivered";
  if (s === "cancelled" || s === "canceled") return "cancelled";
  // Custom statuses set by the plugin come back 1:1.
  if (s === "rts") return "rts";
  if (s === "shipped") return "shipped";
  if (s === "partial") return "partial";
  if (s === "return-pending") return "pending_return";
  if (s === "returned" || s === "refunded") return "returned";
  if (s === "pending-cancel") return "pending_cancel";
  if (s === "preorder") return "preorder";
  if (s === "lost") return "lost";
  // pending / failed / checkout-draft / on-hold / processing → still open (Pending),
  // so failed-payment & abandoned checkouts stay actionable in the Incomplete tab.
  return "pending";
}

/**
 * App order status → WooCommerce status, for the reverse (app → Woo) push. Only
 * the clear, safe transitions are mapped; ambiguous ones return null so the Woo
 * order is left untouched.
 */
// Custom WooCommerce statuses registered by the YourAI Seller Connect plugin,
// so each app status maps 1:1 in WooCommerce (RTS, Shipped, Partial, …).
function wooStatusForAppStatus(status: Order["status"]): string | null {
  switch (status) {
    case "delivered":
      return "completed";
    case "cancelled":
      return "cancelled";
    case "rts":
      return "rts";
    case "shipped":
      return "shipped";
    case "partial":
      return "partial";
    case "pending_return":
      return "return-pending";
    case "returned":
      return "returned";
    case "pending_cancel":
      return "pending-cancel";
    case "preorder":
      return "preorder";
    case "lost":
      return "lost";
    default:
      return null; // pending → not pushed (many Woo statuses map back to it)
  }
}

/** Standard Woo status to fall back to when the custom one isn't registered
 *  (store without the plugin). */
function wooFallbackStatusForAppStatus(status: Order["status"]): string | null {
  switch (status) {
    case "rts":
    case "shipped":
    case "partial":
      return "processing";
    case "returned":
      return "refunded";
    case "pending_return":
    case "pending_cancel":
    case "preorder":
      return "on-hold";
    case "lost":
      return "failed";
    default:
      return null;
  }
}

/**
 * Push an order's new status back to WooCommerce. No-op unless the seller turned
 * on pushOrderStatusToWoo, the store is connected, the order originated in Woo,
 * and the status maps to a Woo status. Best-effort — never throws, so it can't
 * break the local status change.
 */
export async function pushWooOrderStatus(order: Order): Promise<void> {
  if (typeof window === "undefined") return;
  const woo = loadWooCommerceSettings();
  const hasRest =
    woo.connected ||
    Boolean(
      woo.storeUrl?.trim() && woo.consumerKey?.trim() && woo.consumerSecret?.trim()
    );
  const hasPlugin = Boolean(woo.storeUrl?.trim() && woo.apiKey?.trim());
  if (!woo.pushOrderStatusToWoo || (!hasRest && !hasPlugin)) return;
  if (order.wooOrderId == null) return;
  const wcStatus = wooStatusForAppStatus(order.status);
  if (!wcStatus) return;
  const fallbackStatus = wooFallbackStatusForAppStatus(order.status);
  try {
    const res = await fetch("/api/woocommerce/order-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeUrl: woo.storeUrl.trim(),
        consumerKey: woo.consumerKey.trim(),
        consumerSecret: woo.consumerSecret.trim(),
        apiKey: woo.apiKey?.trim(),
        orderId: Number(order.wooOrderId),
        status: wcStatus,
        fallbackStatus: fallbackStatus ?? undefined,
      }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      message?: string;
    };
    if (json.ok) {
      appendWooLog("success", `Pushed ${order.id} → WooCommerce status "${wcStatus}"`);
    } else {
      appendWooLog(
        "error",
        `Woo status push failed for ${order.id}: ${json.message ?? res.status}`
      );
    }
  } catch (e) {
    appendWooLog(
      "error",
      `Woo status push error for ${order.id}: ${e instanceof Error ? e.message : "failed"}`
    );
  }
}

/**
 * Apply the "Order Status Update" policy to a freshly imported Woo order:
 * - On Hold  → mark the WooCommerce order on-hold (handled here, verify first).
 * - Web / Do not update → leave the original WooCommerce status untouched.
 * Best-effort — never throws, so it can't break the import.
 */
async function applyWooImportStatusPolicy(
  creds: WooCreds,
  order: Order
): Promise<void> {
  if (typeof window === "undefined") return;
  const settings = loadWooCommerceSettings();
  if (settings.orderStatusOnImport !== "on-hold") return;
  if (order.wooOrderId == null) return;
  try {
    const res = await fetch("/api/woocommerce/order-status", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeUrl: creds.storeUrl,
        consumerKey: creds.consumerKey,
        consumerSecret: creds.consumerSecret,
        orderId: Number(order.wooOrderId),
        status: "on-hold",
      }),
    });
    const json = (await res.json().catch(() => ({}))) as {
      ok?: boolean;
      message?: string;
    };
    if (json.ok) {
      appendWooLog("success", `Import: ${order.id} marked On Hold in WooCommerce`);
    } else {
      appendWooLog(
        "error",
        `Import on-hold failed for ${order.id}: ${json.message ?? res.status}`
      );
    }
  } catch (e) {
    appendWooLog(
      "error",
      `Import on-hold error for ${order.id}: ${e instanceof Error ? e.message : "failed"}`
    );
  }
}

function lineFromWooItem(item: WooOrderRow["line_items"][0]): OrderLine {
  const product = findProductForWooLine({
    sku: item.sku,
    name: item.name,
    product_id: item.product_id,
    variation_id: item.variation_id,
  });

  const price = parseFloat(String(item.total)) / item.quantity || item.price || 0;
  const imageUrl =
    item.image?.src?.trim() ||
    product?.imageDataUrl?.trim() ||
    undefined;

  return {
    productId: product?.id ?? `woo-li-${item.id}`,
    productName: item.name,
    productCode: item.sku || product?.code || `WOO-LI-${item.id}`,
    qty: item.quantity,
    price,
    total: parseFloat(String(item.total)) || price * item.quantity,
    imageUrl,
    wooProductId: item.product_id || product?.wooProductId,
    wooVariationId: item.variation_id || product?.wooVariationId,
  };
}

function mapWooOrder(row: WooOrderRow): Parameters<typeof upsertWooCommerceOrder>[0] {
  const name =
    `${row.billing?.first_name ?? ""} ${row.billing?.last_name ?? ""}`.trim() ||
    "WooCommerce Customer";
  const shipping = parseFloat(row.shipping_lines?.[0]?.total ?? "0") || 0;
  const items = row.line_items?.map(lineFromWooItem) ?? [];
  const subtotal = items.reduce((s, i) => s + i.total, 0);
  const total = parseFloat(row.total) || subtotal + shipping;
  const sourceDetect = detectOrderSourceFromWooRow(row);

  return {
    wooOrderId: row.id,
    wooNumber: String(row.number),
    customerName: name,
    phone: row.billing?.phone || "00000000000",
    email: row.billing?.email,
    address: [
      row.billing?.address_1,
      row.billing?.city,
      row.billing?.state,
    ]
      .filter(Boolean)
      .join(", "),
    district: row.billing?.city || row.billing?.state || "Dhaka",
    paymentMethod: mapWcPayment(row.payment_method),
    items,
    shippingCharge: shipping,
    discount: Math.max(0, subtotal + shipping - total),
    advance: 0,
    note: row.customer_note,
    source: "web",
    orderSource: sourceDetect.orderSource,
    customOrderSource: sourceDetect.customOrderSource,
    status: mapWcOrderStatus(row.status),
    webStatus: mapWcWebStatus(row.status),
    isPreorder: false,
    tags: ["WooCommerce", row.status.toUpperCase()],
    wooSnapshot: parseWooOrderSnapshot(row),
    createdAt: new Date(row.date_created ?? Date.now()).toLocaleString("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }),
  };
}

type WooCreds = {
  storeUrl: string;
  consumerKey: string;
  consumerSecret: string;
};

async function fetchSingleWooOrder(
  creds: WooCreds,
  orderId: number
): Promise<WooOrderRow | null> {
  const res = await fetch("/api/woocommerce/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...creds, orderId }),
  });
  const data = (await res.json()) as {
    ok: boolean;
    message?: string;
    order?: WooOrderRow;
  };
  if (!data.ok || !data.order) {
    throw new Error(data.message ?? `Could not load Woo order #${orderId}`);
  }
  return data.order;
}

function mergeWooOrderRows(listRow: WooOrderRow, full: WooOrderRow): WooOrderRow {
  return {
    ...listRow,
    ...full,
    billing: full.billing ?? listRow.billing,
    line_items: full.line_items?.length ? full.line_items : listRow.line_items,
    shipping_lines: full.shipping_lines?.length
      ? full.shipping_lines
      : listRow.shipping_lines,
    meta_data: full.meta_data?.length ? full.meta_data : listRow.meta_data,
    coupon_lines: full.coupon_lines?.length ? full.coupon_lines : listRow.coupon_lines,
  };
}

async function enrichWooOrderRow(
  creds: WooCreds,
  row: WooOrderRow
): Promise<WooOrderRow> {
  const settings = loadWooCommerceSettings();
  if (!settings.fetchFullOrderViaApi) return row;
  try {
    const full = await fetchSingleWooOrder(creds, row.id);
    if (!full) return row;
    return mergeWooOrderRows(row, full);
  } catch {
    return row;
  }
}

/** Re-fetch one Woo order (full API) and upsert — for edit page refresh. */
export async function refreshWooOrderFromApi(wooOrderId: number): Promise<Order | null> {
  const woo = loadWooCommerceSettings();
  if (!isWooCommerceReadyForSync()) {
    throw new Error("WooCommerce credentials missing.");
  }
  const creds = {
    storeUrl: woo.storeUrl.trim(),
    consumerKey: woo.consumerKey.trim(),
    consumerSecret: woo.consumerSecret.trim(),
  };
  const full = await fetchSingleWooOrder(creds, wooOrderId);
  if (!full?.line_items?.length) {
    throw new Error("Order has no line items in WooCommerce.");
  }
  const enriched = woo.fetchFullOrderViaApi
    ? full
    : await enrichWooOrderRow(creds, full);
  const { order } = upsertWooCommerceOrder(mapWooOrder(enriched));
  return order;
}

const SYNC_STATUSES =
  "pending,processing,on-hold,completed,cancelled,failed,refunded,checkout-draft";
const INITIAL_SYNC_MAX_PAGES = 5;
const INCREMENTAL_MAX_PAGES = 2;
const INCREMENTAL_PER_PAGE = 30;

export type WooSyncMode = "fast" | "full";

function initialImportAfterIso(hours: 12 | 24): string {
  const d = new Date();
  d.setHours(d.getHours() - hours);
  return d.toISOString();
}

function normalizeStoreUrl(url: string): string {
  return url.trim().replace(/\/$/, "").toLowerCase();
}

function shouldUseInitialImportWindow(storeUrl: string): boolean {
  const meta = loadMeta();
  const normalized = normalizeStoreUrl(storeUrl);
  if (!meta.firstSyncCompleted) return true;
  if (!meta.syncedStoreUrl) return true;
  return normalizeStoreUrl(meta.syncedStoreUrl) !== normalized;
}

/** Woo `modified_after` — catch new/changed orders since last pull */
function incrementalModifiedAfter(): string {
  const meta = loadMeta();
  if (meta.lastSyncAt) {
    const t = new Date(meta.lastSyncAt).getTime() - 2 * 60 * 1000;
    return new Date(t).toISOString();
  }
  const d = new Date();
  d.setHours(d.getHours() - 24);
  return d.toISOString();
}

async function fetchWooOrdersPage(
  creds: { storeUrl: string; consumerKey: string; consumerSecret: string },
  page: number,
  options?: {
    after?: string;
    modified_after?: string;
    allStatuses?: boolean;
    perPage?: number;
  }
): Promise<{ rows: WooOrderRow[]; totalPages: number }> {
  const res = await fetch("/api/woocommerce/orders", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...creds,
      page,
      perPage: options?.perPage ?? 50,
      statuses: options?.allStatuses ? "all" : SYNC_STATUSES,
      after: options?.after,
      modified_after: options?.modified_after,
    }),
  });
  const data = (await res.json()) as {
    ok: boolean;
    message?: string;
    orders?: WooOrderRow[];
    totalPages?: number;
  };
  if (!data.ok || !data.orders) {
    throw new Error(data.message ?? "Failed to fetch WooCommerce orders");
  }
  return { rows: data.orders, totalPages: data.totalPages ?? 1 };
}

/** All website/web orders for list history (incl. promoted → Complete tab). */
export function getWebOrdersFromStore() {
  return loadOrders().filter(
    (o) =>
      (o.source === "web" || o.wooOrderId != null || o.id.startsWith("WO-")) &&
      !o.isPreorder &&
      o.status !== "preorder"
  );
}

export function isWooCommerceReadyForSync(): boolean {
  const woo = loadWooCommerceSettings();
  return Boolean(
    woo.storeUrl.trim() &&
      woo.consumerKey.trim() &&
      woo.consumerSecret.trim()
  );
}

export function isWooAutoSyncEnabled(): boolean {
  return isWooCommerceReadyForSync();
}

export async function syncNewOrdersFromWooCommerce(_options?: {
  mode?: WooSyncMode;
}): Promise<OrderSyncResult> {
  const woo = loadWooCommerceSettings();
  if (!isWooCommerceReadyForSync()) {
    throw new Error(
      "Add WooCommerce Store URL and API keys in Integration → WooCommerce."
    );
  }

  const creds = {
    storeUrl: woo.storeUrl.trim(),
    consumerKey: woo.consumerKey.trim(),
    consumerSecret: woo.consumerSecret.trim(),
  };

  const initialImport = shouldUseInitialImportWindow(creds.storeUrl);
  const importHours: 12 | 24 = woo.initialImportHours === 12 ? 12 : 24;

  const result: OrderSyncResult = {
    imported: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    errors: [],
  };

  const maxPages = initialImport ? INITIAL_SYNC_MAX_PAGES : INCREMENTAL_MAX_PAGES;
  let page = 1;
  let totalPages = 1;

  await runWithBulkOrderSyncAsync(async () => {
    while (page <= totalPages && page <= maxPages) {
      const { rows, totalPages: tp } = await fetchWooOrdersPage(creds, page, {
        allStatuses: true,
        perPage: initialImport ? 50 : INCREMENTAL_PER_PAGE,
        after: initialImport ? initialImportAfterIso(importHours) : undefined,
        modified_after: initialImport ? undefined : incrementalModifiedAfter(),
      });
      totalPages = tp;

      for (const row of rows) {
        if (!row.line_items?.length) {
          result.skipped++;
          if (result.errors.length < 8) {
            result.errors.push(`Order #${row.number}: no line items`);
          }
          continue;
        }
        try {
          const enriched = await enrichWooOrderRow(creds, row);
          const { order, created } = upsertWooCommerceOrder(mapWooOrder(enriched));
          if (created) {
            result.imported++;
            // Apply the "Order Status Update" policy for newly imported orders.
            await applyWooImportStatusPolicy(creds, order);
          } else {
            result.updated++;
          }
        } catch (e) {
          result.failed++;
          if (result.errors.length < 8) {
            result.errors.push(
              e instanceof Error
                ? `#${row.number}: ${e.message}`
                : `Order #${row.number} failed`
            );
          }
        }
      }
      page++;
    }
  });

  const repaired = repairWebOrdersInQueue();

  saveOrderSyncMeta({
    lastSyncAt: new Date().toISOString(),
    lastResult: result,
    firstSyncCompleted: true,
    syncedStoreUrl: creds.storeUrl,
  });

  const onWebList = getWebOrdersFromStore().length;
  const syncLabel = initialImport
    ? `First import (${importHours}h): ${result.imported} new, ${result.updated} updated`
    : `Order sync: ${result.imported} new, ${result.updated} updated`;
  appendWooLog(
    "success",
    `${syncLabel}, ${onWebList} on Web List (${repaired} repaired)`
  );

  if (repaired > 0) {
    result.errors.push(
      `${repaired} order(s) moved back to Web List (were stuck off-queue)`
    );
  }

  return result;
}
