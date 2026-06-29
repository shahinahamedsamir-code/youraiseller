import { sellerStorageKey } from "./seller-storage";
import { loadProducts, type Product } from "./inventory-store";
import {
  appendWooLog,
  loadWooCommerceSettings,
  type WooCommerceSettings,
} from "./woocommerce-integration-store";

export type StockSyncTrigger = "every_change" | "alert_qty" | "zero_only";
export type StockSyncMode = "exact" | "status_only";
export type StockSyncScope = "all" | "low" | "test" | "full";

export type WooStockSyncSettings = {
  enabled: boolean;
  trigger: StockSyncTrigger;
  mode: StockSyncMode;
  dailySyncEnabled: boolean;
  autoSyncOnChange: boolean;
  /** Push sell-price changes to WooCommerce regular_price. */
  priceSyncEnabled: boolean;
  lastSyncAt: string | null;
  lastDailySyncAt: string | null;
  successCount: number;
  failedCount: number;
};

export type StockSyncItemResult = {
  sku: string;
  name: string;
  qty: number;
  ok: boolean;
  message: string;
};

export type StockSyncRunResult = {
  synced: number;
  skipped: number;
  failed: number;
  eligible: number;
  items: StockSyncItemResult[];
  hint?: string;
};

const DEFAULT: WooStockSyncSettings = {
  enabled: true,
  trigger: "zero_only",
  mode: "status_only",
  dailySyncEnabled: true,
  autoSyncOnChange: false,
  priceSyncEnabled: false,
  lastSyncAt: null,
  lastDailySyncAt: null,
  successCount: 0,
  failedCount: 0,
};

function storageKey(): string | null {
  return sellerStorageKey("woo-stock-sync");
}

function relativeTime(iso: string | null): string {
  if (!iso) return "Never";
  const diff = Date.now() - new Date(iso).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} minute${mins === 1 ? "" : "s"} ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs} hour${hrs === 1 ? "" : "s"} ago`;
  return `${Math.floor(hrs / 24)} day(s) ago`;
}

export function loadWooStockSyncSettings(): WooStockSyncSettings {
  if (typeof window === "undefined") return { ...DEFAULT };
  const key = storageKey();
  if (!key) return { ...DEFAULT };
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      saveWooStockSyncSettings(DEFAULT);
      return DEFAULT;
    }
    return { ...DEFAULT, ...JSON.parse(raw) };
  } catch {
    return DEFAULT;
  }
}

export function saveWooStockSyncSettings(s: WooStockSyncSettings) {
  if (typeof window === "undefined") return;
  const key = storageKey();
  if (!key) return;
  localStorage.setItem(key, JSON.stringify(s));
}

export function formatStockSyncTime(iso: string | null): string {
  return relativeTime(iso);
}

export function matchesSyncTrigger(
  product: Product,
  trigger: StockSyncTrigger
): boolean {
  if (!product.manageStock) return false;
  switch (trigger) {
    case "every_change":
      return true;
    case "alert_qty":
      return product.stockQty <= product.alertQty;
    case "zero_only":
      return product.stockQty === 0;
    default:
      return false;
  }
}

export function shouldSyncProduct(
  product: Product,
  trigger: StockSyncTrigger,
  scope: StockSyncScope
): boolean {
  if (!product.manageStock) return false;
  if (scope === "test") return true;
  // Full = whole catalog reconcile (daily safety net) — ignore the trigger.
  if (scope === "full") return true;
  if (scope === "low") {
    return product.stockQty === 0 || product.stockQty <= product.alertQty;
  }
  return matchesSyncTrigger(product, trigger);
}

function pickProducts(scope: StockSyncScope, trigger: StockSyncTrigger, testSku?: string) {
  const all = loadProducts();
  if (scope === "test" && testSku) {
    const code = testSku.trim().toLowerCase();
    return all.filter((p) => p.code.toLowerCase() === code);
  }
  return all.filter((p) => shouldSyncProduct(p, trigger, scope));
}

async function pushStockToWoo(
  product: Product,
  woo: WooCommerceSettings,
  mode: StockSyncMode
): Promise<void> {
  const res = await fetch("/api/woocommerce/stock", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      storeUrl: woo.storeUrl.trim(),
      consumerKey: woo.consumerKey.trim(),
      consumerSecret: woo.consumerSecret.trim(),
      sku: product.code,
      stockQty: product.stockQty,
      mode,
      wooProductId: product.wooProductId,
      wooVariationId: product.wooVariationId,
      wooParentId: product.wooParentId,
    }),
  });
  const data = (await res.json()) as { ok: boolean; message: string };
  if (!data.ok) throw new Error(data.message);
}

export async function runWooStockSync(params: {
  scope: StockSyncScope;
  testSku?: string;
  force?: boolean;
  /** Override the configured sync mode for this run (e.g. force exact qty). */
  mode?: StockSyncMode;
}): Promise<StockSyncRunResult> {
  const syncSettings = loadWooStockSyncSettings();
  const woo = loadWooCommerceSettings();
  const effectiveMode: StockSyncMode = params.mode ?? syncSettings.mode;

  if (!params.force && !syncSettings.enabled) {
    return { synced: 0, skipped: 0, failed: 0, eligible: 0, items: [] };
  }

  const products = pickProducts(
    params.scope,
    syncSettings.trigger,
    params.testSku
  );

  const managed = loadProducts().filter((p) => p.manageStock);
  const items: StockSyncItemResult[] = [];
  let synced = 0;
  let failed = 0;
  const skipped = Math.max(0, managed.length - products.length);

  let hint: string | undefined;
  if (products.length === 0 && syncSettings.trigger === "zero_only") {
    hint =
      "Trigger is Zero only — no product has stock 0. Use Sync low stock, change trigger, or set a product to 0 stock.";
  } else if (skipped > 0 && syncSettings.trigger === "zero_only") {
    hint = `${skipped} product(s) skipped — only out-of-stock (qty 0) syncs with current trigger.`;
  }

  if (!woo.connected && woo.storeUrl && woo.consumerKey) {
    appendWooLog("error", "Stock sync: connect WooCommerce API first.");
  }

  const canApi = Boolean(
    woo.storeUrl?.trim() && woo.consumerKey?.trim() && woo.consumerSecret?.trim()
  );

  for (const product of products) {
    try {
      if (canApi) {
        await pushStockToWoo(product, woo, effectiveMode);
        items.push({
          sku: product.code,
          name: product.name,
          qty: product.stockQty,
          ok: true,
          message:
            effectiveMode === "exact"
              ? `Stock set to ${product.stockQty}`
              : product.stockQty > 0
                ? "Marked in stock"
                : "Marked out of stock",
        });
        synced++;
        appendWooLog(
          "success",
          `Stock sync: ${product.code} → ${product.stockQty}`
        );
      } else {
        throw new Error("Add Store URL and API keys in WooCommerce tab first.");
      }
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Sync failed";
      items.push({
        sku: product.code,
        name: product.name,
        qty: product.stockQty,
        ok: false,
        message: msg,
      });
      failed++;
      appendWooLog("error", `Stock sync ${product.code}: ${msg}`);
    }
  }

  const next: WooStockSyncSettings = {
    ...syncSettings,
    lastSyncAt: new Date().toISOString(),
    successCount: syncSettings.successCount + synced,
    failedCount: syncSettings.failedCount + failed,
  };
  if (
    (params.scope === "all" || params.scope === "full") &&
    syncSettings.dailySyncEnabled
  ) {
    next.lastDailySyncAt = next.lastSyncAt;
  }
  saveWooStockSyncSettings(next);

  return {
    synced,
    skipped: Math.max(0, skipped),
    failed,
    eligible: products.length,
    items,
    hint,
  };
}

const DAILY_SYNC_MS = 24 * 60 * 60 * 1000;

/**
 * Run a full-catalog reconcile to WooCommerce if the automated daily sync is on
 * and 24h have passed since the last one. No-ops otherwise (disabled, not due,
 * or WooCommerce not connected). Called on an interval by the dashboard runner.
 */
export async function runWooStockDailySyncIfDue(): Promise<StockSyncRunResult | null> {
  const s = loadWooStockSyncSettings();
  if (!s.enabled || !s.dailySyncEnabled) return null;

  if (
    s.lastDailySyncAt &&
    Date.now() - new Date(s.lastDailySyncAt).getTime() < DAILY_SYNC_MS
  ) {
    return null; // already synced within the last 24h
  }

  const woo = loadWooCommerceSettings();
  const canApi = Boolean(
    woo.storeUrl?.trim() && woo.consumerKey?.trim() && woo.consumerSecret?.trim()
  );
  if (!canApi) return null;

  return runWooStockSync({ scope: "full", force: true });
}

/** Push a product's sell price to WooCommerce when price sync is on. */
export async function maybeSyncProductPriceToWoo(productId: string): Promise<void> {
  const sync = loadWooStockSyncSettings();
  if (!sync.enabled || !sync.priceSyncEnabled) return;

  const product = loadProducts().find((p) => p.id === productId);
  if (!product) return;

  const woo = loadWooCommerceSettings();
  const canApi = Boolean(
    woo.storeUrl?.trim() && woo.consumerKey?.trim() && woo.consumerSecret?.trim()
  );
  if (!canApi) return;

  try {
    const res = await fetch("/api/woocommerce/price", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        storeUrl: woo.storeUrl.trim(),
        consumerKey: woo.consumerKey.trim(),
        consumerSecret: woo.consumerSecret.trim(),
        sku: product.code,
        price: product.sellPrice,
        wooProductId: product.wooProductId,
        wooVariationId: product.wooVariationId,
        wooParentId: product.wooParentId,
      }),
    });
    const data = (await res.json()) as { ok: boolean; message: string };
    if (data.ok) {
      appendWooLog("success", `Price sync: ${product.code} → ${product.sellPrice}`);
    } else {
      appendWooLog("error", `Price sync ${product.code}: ${data.message}`);
    }
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Price sync failed";
    appendWooLog("error", `Price sync ${product.code}: ${msg}`);
  }
}

/** Call after inventory stock change when auto-sync is on */
export async function maybeAutoSyncProductToWoo(productId: string): Promise<void> {
  const sync = loadWooStockSyncSettings();
  if (!sync.enabled || !sync.autoSyncOnChange) return;

  const product = loadProducts().find((p) => p.id === productId);
  if (!product || !matchesSyncTrigger(product, sync.trigger)) return;

  await runWooStockSync({ scope: "test", testSku: product.code, force: true });
}
