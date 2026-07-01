import {
  ensureWooCommerceBrand,
  ensureWooCommerceCategory,
  loadProducts,
  upsertProductByCode,
  setProductStockByWooRef,
} from "./inventory-store";
import { loadWooCommerceSettings } from "./woocommerce-integration-store";
import { appendWooLog } from "./woocommerce-integration-store";
import { sellerStorageKey } from "./seller-storage";

export type WooAttribute = {
  id?: number;
  name?: string;
  option?: string;
};

export type WooProductRow = {
  id: number;
  name: string;
  sku: string;
  type?: string;
  parent_id?: number;
  price: string;
  regular_price: string;
  sale_price: string;
  stock_quantity: number | null;
  manage_stock: boolean;
  stock_status: string;
  images?: { src: string }[];
  /** Variations often use singular image, not images[] */
  image?: { src?: string };
  attributes?: WooAttribute[];
};

export type ProductSyncResult = {
  created: number;
  updated: number;
  skipped: number;
  failed: number;
  total: number;
  variationsSynced: number;
  variationsSkipped: number;
  variableParents: number;
  errors: string[];
};

type SyncMeta = {
  lastSyncAt: string | null;
  lastSuccessAt: string | null;
  lastCounts: ProductSyncResult | null;
};

function metaKey(): string | null {
  return sellerStorageKey("woo-product-sync-meta");
}

/** WooCommerce /products does NOT accept type=variation (returns 400). */
const INVALID_PRODUCT_TYPES = new Set(["variation", "variations"]);

function loadMeta(): SyncMeta {
  if (typeof window === "undefined") {
    return { lastSyncAt: null, lastSuccessAt: null, lastCounts: null };
  }
  const key = metaKey();
  if (!key) return { lastSyncAt: null, lastSuccessAt: null, lastCounts: null };
  try {
    const raw = localStorage.getItem(key);
    if (!raw) return { lastSyncAt: null, lastSuccessAt: null, lastCounts: null };
    return JSON.parse(raw) as SyncMeta;
  } catch {
    return { lastSyncAt: null, lastSuccessAt: null, lastCounts: null };
  }
}

function saveMeta(meta: SyncMeta) {
  if (typeof window === "undefined") return;
  const key = metaKey();
  if (!key) return;
  localStorage.setItem(key, JSON.stringify(meta));
}

export function getProductSyncMeta() {
  return loadMeta();
}

function attributeLabel(row: WooProductRow): string {
  const parts =
    row.attributes
      ?.filter((a) => a.option?.trim())
      .map((a) => `${a.name ?? "Option"}: ${a.option}`) ?? [];
  return parts.join(" · ");
}

function resolveWooImage(
  row: WooProductRow,
  parentImageUrl?: string
): string | undefined {
  const own =
    row.image?.src?.trim() ||
    row.images?.[0]?.src?.trim() ||
    undefined;
  if (own) return own;
  return parentImageUrl?.trim() || undefined;
}

function mapWooToInventory(
  row: WooProductRow,
  parent?: { name?: string; imageUrl?: string }
) {
  const parentName = parent?.name;
  const parentImageUrl = parent?.imageUrl;
  const categoryId = ensureWooCommerceCategory();
  const brandId = ensureWooCommerceBrand();
  const isVariation = row.type === "variation" || (row.parent_id ?? 0) > 0;
  const code = row.sku?.trim() || (isVariation ? `WOO-V${row.id}` : `WOO-${row.id}`);
  const sell = parseFloat(row.sale_price || row.price || row.regular_price) || 0;
  const stockQty =
    row.manage_stock && row.stock_quantity !== null
      ? Number(row.stock_quantity)
      : row.stock_status === "instock"
        ? 1
        : 0;

  const attrText = attributeLabel(row);
  let name = row.name?.trim() || code;
  if (isVariation && attrText && !name.toLowerCase().includes(attrText.toLowerCase())) {
    const base = parentName?.trim() || name.split(" - ")[0] || name;
    name = `${base} — ${attrText}`;
  }

  return {
    name,
    code,
    categoryId,
    brandId,
    costPrice: sell > 0 ? Math.round(sell * 0.65) : 0,
    sellPrice: sell,
    websitePrice: sell,
    stockQty: Math.max(0, stockQty),
    alertQty: 10,
    manageStock: row.manage_stock !== false,
    featured: false,
    active: true,
    weight: 0,
    weightUnit: "g" as const,
    imageDataUrl: resolveWooImage(row, parentImageUrl),
    wooProductId: isVariation ? undefined : row.id,
    wooVariationId: isVariation ? row.id : undefined,
    wooParentId: isVariation ? row.parent_id : undefined,
  };
}

async function fetchWooPage(
  creds: { storeUrl: string; consumerKey: string; consumerSecret: string },
  page: number,
  perPage: number,
  options?: {
    type?: string;
    parentId?: number;
    parentQuery?: number;
    step?: string;
  }
): Promise<{ rows: WooProductRow[]; totalPages: number }> {
  if (options?.type && INVALID_PRODUCT_TYPES.has(options.type)) {
    throw new Error(
      `Invalid product type "${options.type}". Variations must be loaded per parent product.`
    );
  }

  const res = await fetch("/api/woocommerce/products", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...creds, page, perPage, ...options }),
  });
  const data = (await res.json()) as {
    ok: boolean;
    message?: string;
    products?: WooProductRow[];
    totalPages?: number;
  };
  if (!data.ok || !data.products) {
    const step = options?.step ? ` (${options.step})` : "";
    throw new Error(data.message ?? `Failed to fetch WooCommerce products${step}`);
  }
  return { rows: data.products, totalPages: data.totalPages ?? 1 };
}

async function fetchVariationPages(
  creds: { storeUrl: string; consumerKey: string; consumerSecret: string },
  parent: WooProductRow,
  perPage: number,
  mode: "variations" | "parentQuery"
): Promise<WooProductRow[]> {
  const all: WooProductRow[] = [];
  let page = 1;
  let totalPages = 1;

  while (page <= totalPages) {
    const { rows, totalPages: tp } = await fetchWooPage(creds, page, perPage, {
      ...(mode === "variations"
        ? { parentId: parent.id }
        : { parentQuery: parent.id }),
      step: `variations for ${parent.name} (${mode})`,
    });
    totalPages = tp;
    for (const row of rows) {
      all.push({
        ...row,
        type: row.type ?? "variation",
        parent_id: row.parent_id ?? parent.id,
      });
    }
    page++;
  }
  return all;
}

async function fetchAllVariationsForParent(
  creds: { storeUrl: string; consumerKey: string; consumerSecret: string },
  parent: WooProductRow,
  perPage: number
): Promise<WooProductRow[]> {
  const failures: string[] = [];

  try {
    const viaSub = await fetchVariationPages(creds, parent, perPage, "variations");
    if (viaSub.length > 0) return viaSub;
  } catch (e) {
    failures.push(e instanceof Error ? e.message : "variations endpoint failed");
  }

  try {
    const viaParent = await fetchVariationPages(
      creds,
      parent,
      perPage,
      "parentQuery"
    );
    if (viaParent.length > 0) return viaParent;
  } catch (e) {
    failures.push(e instanceof Error ? e.message : "parent query failed");
  }

  if (failures.length > 0) {
    throw new Error(failures.join(" · "));
  }
  return [];
}

async function syncProductRows(
  rows: WooProductRow[],
  result: ProductSyncResult,
  existingCodes: Set<string>,
  options?: {
    createOnly?: boolean;
    parent?: { name?: string; imageUrl?: string };
    countAsVariation?: boolean;
    variationIdsSeen?: Set<number>;
  }
) {
  for (const row of rows) {
    result.total++;
    const isVariation = row.type === "variation" || (row.parent_id ?? 0) > 0;
    const code = (
      row.sku?.trim() || (isVariation ? `WOO-V${row.id}` : `WOO-${row.id}`)
    ).toLowerCase();
    const exists = existingCodes.has(code);

    if (options?.createOnly && exists) {
      result.skipped++;
      if (options?.countAsVariation) result.variationsSkipped++;
      continue;
    }

    try {
      const { created } = upsertProductByCode(
        mapWooToInventory(row, options?.parent),
        { preserveStockOnUpdate: true } // app owns stock; don't pull it back
      );
      if (created) {
        result.created++;
        existingCodes.add(code);
      } else {
        result.updated++;
      }
      if (options?.countAsVariation && options.variationIdsSeen) {
        if (!options.variationIdsSeen.has(row.id)) {
          options.variationIdsSeen.add(row.id);
          result.variationsSynced++;
        }
      }
    } catch (e) {
      result.failed++;
      const msg = e instanceof Error ? e.message : "Unknown error";
      if (result.errors.length < 10) result.errors.push(`${code}: ${msg}`);
    }
  }
}

export async function syncProductsFromWooCommerce(options?: {
  createOnly?: boolean;
}): Promise<ProductSyncResult> {
  const woo = loadWooCommerceSettings();
  if (!woo.storeUrl || !woo.consumerKey || !woo.consumerSecret) {
    throw new Error("Connect WooCommerce and save API credentials first.");
  }

  const creds = {
    storeUrl: woo.storeUrl.trim(),
    consumerKey: woo.consumerKey.trim(),
    consumerSecret: woo.consumerSecret.trim(),
  };

  const result: ProductSyncResult = {
    created: 0,
    updated: 0,
    skipped: 0,
    failed: 0,
    total: 0,
    variationsSynced: 0,
    variationsSkipped: 0,
    variableParents: 0,
    errors: [],
  };

  const existingCodes = new Set(
    loadProducts().map((p) => p.code.toLowerCase())
  );

  const perPage = 100;
  const variationIdsSeen = new Set<number>();
  const variableParents: WooProductRow[] = [];

  // 1) All published products — collect variable parents, sync simple/external/etc.
  let page = 1;
  let totalPages = 1;
  while (page <= totalPages) {
    const { rows, totalPages: tp } = await fetchWooPage(creds, page, perPage, {
      step: "products",
    });
    totalPages = tp;

    const sellable: WooProductRow[] = [];
    for (const row of rows) {
      if (row.type === "variable") {
        variableParents.push(row);
      } else if (row.type !== "grouped") {
        sellable.push(row);
      }
    }
    await syncProductRows(sellable, result, existingCodes, options);
    page++;
  }

  result.variableParents = variableParents.length;

  // 2) Variations per variable parent (only supported WC endpoint)
  for (const parent of variableParents) {
    try {
      const variations = await fetchAllVariationsForParent(creds, parent, perPage);
      if (variations.length === 0) {
        if (result.errors.length < 10) {
          result.errors.push(`${parent.name}: no variations returned from store`);
        }
        continue;
      }
      await syncProductRows(variations, result, existingCodes, {
        ...options,
        parent: {
          name: parent.name,
          imageUrl: resolveWooImage(parent),
        },
        countAsVariation: true,
        variationIdsSeen,
      });
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Variation fetch failed";
      if (result.errors.length < 10) {
        result.errors.push(`${parent.name} (#${parent.id}): ${msg}`);
      }
    }
  }

  saveMeta({
    lastSyncAt: new Date().toISOString(),
    lastSuccessAt: new Date().toISOString(),
    lastCounts: result,
  });

  appendWooLog(
    "success",
    `Product sync: ${result.created} new, ${result.updated} updated, ${result.variationsSynced} variations from ${result.variableParents} parents`
  );

  if (options?.createOnly && result.variationsSkipped > 0 && result.variationsSynced === 0) {
    result.errors.push(
      `${result.variationsSkipped} variations already in inventory (skipped). Use "Sync products" (not V2) to refresh images & stock.`
    );
  } else if (
    result.variationsSynced === 0 &&
    result.variationsSkipped === 0 &&
    result.variableParents > 0 &&
    result.errors.length === 0
  ) {
    result.errors.push(
      "Found variable products but WooCommerce returned 0 variations — check product has size/color variations published."
    );
  }

  return result;
}

export type StockPullResult = {
  /** Woo rows that had a SKU matching an app product. */
  matched: number;
  /** App products whose stock qty was actually changed. */
  updated: number;
  /** Woo rows whose SKU didn't match any app product. */
  notFound: number;
  /** Total Woo rows scanned (simple + variations). */
  total: number;
  errors: string[];
};

/** Stock quantity a Woo row represents (mirrors mapWooToInventory). */
function wooRowStock(row: WooProductRow): number {
  const qty =
    row.manage_stock && row.stock_quantity !== null
      ? Number(row.stock_quantity)
      : row.stock_status === "instock"
        ? 1
        : 0;
  return Math.max(0, qty);
}

/**
 * One-time PULL of current WooCommerce stock into app inventory (WooCommerce →
 * App). Matches by SKU = app product code and overwrites the app stock. Unlike
 * the plugin (which only pushes on change), this reconciles existing stock.
 */
export async function pullStockFromWooCommerce(): Promise<StockPullResult> {
  const woo = loadWooCommerceSettings();
  if (!woo.storeUrl || !woo.consumerKey || !woo.consumerSecret) {
    throw new Error("Connect WooCommerce and save API credentials first.");
  }

  const creds = {
    storeUrl: woo.storeUrl.trim(),
    consumerKey: woo.consumerKey.trim(),
    consumerSecret: woo.consumerSecret.trim(),
  };

  const result: StockPullResult = {
    matched: 0,
    updated: 0,
    notFound: 0,
    total: 0,
    errors: [],
  };

  const apply = (rows: WooProductRow[]) => {
    for (const row of rows) {
      result.total++;
      const isVariation = row.type === "variation" || (row.parent_id ?? 0) > 0;
      // Match by Woo ID first (survives SKU differences), then SKU = code.
      const outcome = setProductStockByWooRef(
        {
          sku: row.sku?.trim() || undefined,
          wooProductId: isVariation ? undefined : row.id,
          wooVariationId: isVariation ? row.id : undefined,
        },
        wooRowStock(row)
      );
      if (outcome === "notfound") {
        result.notFound++;
      } else {
        result.matched++;
        if (outcome === "updated") result.updated++;
      }
    }
  };

  const perPage = 100;
  const variableParents: WooProductRow[] = [];

  // 1) Simple/external products + collect variable parents.
  let page = 1;
  let totalPages = 1;
  while (page <= totalPages) {
    const { rows, totalPages: tp } = await fetchWooPage(creds, page, perPage, {
      step: "stock pull",
    });
    totalPages = tp;
    const simple: WooProductRow[] = [];
    for (const row of rows) {
      if (row.type === "variable") variableParents.push(row);
      else if (row.type !== "grouped") simple.push(row);
    }
    apply(simple);
    page++;
  }

  // 2) Variations per variable parent.
  for (const parent of variableParents) {
    try {
      const variations = await fetchAllVariationsForParent(creds, parent, perPage);
      apply(variations);
    } catch (e) {
      const msg = e instanceof Error ? e.message : "Variation fetch failed";
      if (result.errors.length < 10) result.errors.push(`${parent.name}: ${msg}`);
    }
  }

  appendWooLog(
    "success",
    `Stock pull (Woo → app): ${result.updated} updated, ${result.matched} matched, ${result.notFound} unmatched of ${result.total}`
  );

  return result;
}

export function formatSyncTime(iso: string | null): string {
  if (!iso) return "Never";
  return new Date(iso).toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}
