import { emitDataUpdated } from "./data-events";
import { isDemoSellerAccount, sellerStorageKey } from "./seller-storage";
import { pushSellerData } from "./seller-sync";

export type Category = { id: string; name: string };
export type Brand = { id: string; name: string };

export type Product = {
  id: string;
  name: string;
  code: string;
  categoryId: string;
  brandId: string;
  costPrice: number;
  sellPrice: number;
  websitePrice: number;
  stockQty: number;
  alertQty: number;
  manageStock: boolean;
  featured: boolean;
  active: boolean;
  weight: number;
  weightUnit: "kg" | "g";
  imageDataUrl?: string;
  /** WooCommerce simple product id */
  wooProductId?: number;
  /** WooCommerce variation id (size/color etc.) */
  wooVariationId?: number;
  wooParentId?: number;
  createdAt: string;
  updatedAt: string;
};

export type StockMovementType = "increase" | "decrease" | "transfer";

export type StockMovement = {
  id: string;
  type: StockMovementType;
  productId: string;
  productName: string;
  productCode: string;
  qty: number;
  reason: string;
  note?: string;
  fromLocation?: string;
  toLocation?: string;
  createdAt: string;
};

export type SmartRestockItem = {
  product: Product;
  status: "out" | "critical" | "low" | "ok";
  suggestedQty: number;
  daysToStockout?: number;
};

export type SmartRestockAnalytics = {
  lowStock: number;
  critical: number;
  outOfStock: number;
  activeAlerts: number;
};

export type InventoryMovementSummary = {
  unitsSold: number;
  unitsPurchased: number;
  returns: number;
  netChange: number;
  totalMovements: number;
};

export type InventoryHealthStats = {
  totalProducts: number;
  healthyStock: number;
  lowStock: number;
  outOfStock: number;
  negativeStock: number;
};

export type AbcAnalysisRow = {
  product: Product;
  soldQty: number;
  revenue: number;
  grade: "A" | "B" | "C";
};

function nextProductId(products: Product[]): string {
  const used = new Set(products.map((p) => p.id));
  let maxSeq = 0;
  for (const p of products) {
    const match = /^PRD-(\d+)$/.exec(p.id);
    if (!match) continue;
    const seq = Number(match[1]);
    if (Number.isFinite(seq)) {
      maxSeq = Math.max(maxSeq, seq);
    }
  }
  let candidate = `PRD-${String(maxSeq + 1).padStart(3, "0")}`;
  if (!used.has(candidate)) return candidate;
  candidate = `PRD-${Date.now()}`;
  if (!used.has(candidate)) return candidate;
  let suffix = 1;
  while (used.has(`${candidate}-${suffix}`)) suffix += 1;
  return `${candidate}-${suffix}`;
}

function parseMovementDate(createdAt: string): Date | null {
  const d = new Date(createdAt);
  return Number.isNaN(d.getTime()) ? null : d;
}

function movementsInPeriod(days: number): StockMovement[] {
  const all = loadMovements();
  if (days <= 0) return all;
  const cutoff = Date.now() - days * 24 * 60 * 60 * 1000;
  const filtered = all.filter((m) => {
    const d = parseMovementDate(m.createdAt);
    return d ? d.getTime() >= cutoff : false;
  });
  return filtered.length > 0 ? filtered : all;
}

type InventoryData = {
  products: Product[];
  categories: Category[];
  brands: Brand[];
  movements: StockMovement[];
};

const DEFAULT_CATEGORIES: Category[] = [
  { id: "cat-1", name: "Apparel" },
  { id: "cat-2", name: "Electronics" },
  { id: "cat-3", name: "Beauty" },
];

const DEFAULT_BRANDS: Brand[] = [
  { id: "br-1", name: "YourAI" },
  { id: "br-2", name: "Generic" },
];

const DEFAULT_PRODUCTS: Product[] = [
  {
    id: "PRD-001",
    name: "Premium T-Shirt (L)",
    code: "SKU-001",
    categoryId: "cat-1",
    brandId: "br-1",
    costPrice: 650,
    sellPrice: 1290,
    websitePrice: 1490,
    stockQty: 142,
    alertQty: 20,
    manageStock: true,
    featured: true,
    active: true,
    weight: 0.25,
    weightUnit: "kg",
    createdAt: "01 May 2026",
    updatedAt: "01 May 2026",
  },
  {
    id: "PRD-002",
    name: "Wireless Earbuds",
    code: "SKU-002",
    categoryId: "cat-2",
    brandId: "br-1",
    costPrice: 1200,
    sellPrice: 2490,
    websitePrice: 2790,
    stockQty: 38,
    alertQty: 15,
    manageStock: true,
    featured: false,
    active: true,
    weight: 120,
    weightUnit: "g",
    createdAt: "01 May 2026",
    updatedAt: "01 May 2026",
  },
  {
    id: "PRD-003",
    name: "Smart Watch Band",
    code: "SKU-003",
    categoryId: "cat-2",
    brandId: "br-2",
    costPrice: 400,
    sellPrice: 890,
    websitePrice: 990,
    stockQty: 0,
    alertQty: 10,
    manageStock: true,
    featured: false,
    active: false,
    weight: 50,
    weightUnit: "g",
    createdAt: "01 May 2026",
    updatedAt: "01 May 2026",
  },
  {
    id: "PRD-004",
    name: "Skincare Bundle",
    code: "SKU-004",
    categoryId: "cat-3",
    brandId: "br-1",
    costPrice: 1800,
    sellPrice: 3200,
    websitePrice: 3500,
    stockQty: 67,
    alertQty: 12,
    manageStock: true,
    featured: true,
    active: true,
    weight: 0.5,
    weightUnit: "kg",
    createdAt: "01 May 2026",
    updatedAt: "01 May 2026",
  },
  {
    id: "PRD-005",
    name: "ENGRAVING",
    code: "ENGRAVING",
    categoryId: "cat-2",
    brandId: "br-2",
    costPrice: 120,
    sellPrice: 200,
    websitePrice: 200,
    stockQty: 1069,
    alertQty: 50,
    manageStock: true,
    featured: true,
    active: true,
    weight: 0,
    weightUnit: "g",
    createdAt: "01 May 2026",
    updatedAt: "01 May 2026",
  },
];

function storageKey(): string | null {
  return sellerStorageKey("inventory");
}

function emptyInventory(): InventoryData {
  if (isDemoSellerAccount()) {
    return {
      products: DEFAULT_PRODUCTS,
      categories: DEFAULT_CATEGORIES,
      brands: DEFAULT_BRANDS,
      movements: [],
    };
  }
  return { products: [], categories: [], brands: [], movements: [] };
}

function nowLabel(): string {
  return new Date().toLocaleString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

/**
 * Parsed + migrated inventory cached by the exact stored string. getItem still
 * runs (so external/cross-tab writes invalidate), but JSON.parse + migrate is
 * skipped when nothing changed. Returns freshly cloned arrays so callers never
 * mutate the cached copy.
 */
let inventoryRawCache: { key: string; raw: string; data: InventoryData } | null = null;

function cloneInventory(data: InventoryData): InventoryData {
  return {
    products: [...data.products],
    categories: [...data.categories],
    brands: [...data.brands],
    movements: [...data.movements],
  };
}

function loadRaw(): InventoryData {
  if (typeof window === "undefined") {
    return emptyInventory();
  }
  const key = storageKey();
  if (!key) return emptyInventory();
  try {
    const raw = localStorage.getItem(key);
    if (!raw) {
      const initial = emptyInventory();
      saveRaw(initial);
      return cloneInventory(initial);
    }
    if (!inventoryRawCache || inventoryRawCache.key !== key || inventoryRawCache.raw !== raw) {
      const data = JSON.parse(raw) as InventoryData;
      data.products = data.products.map((p) => ({
        ...p,
        active: p.active ?? true,
      }));
      inventoryRawCache = { key, raw, data };
    }
    return cloneInventory(inventoryRawCache.data);
  } catch {
    return emptyInventory();
  }
}

function saveRaw(data: InventoryData) {
  if (typeof window === "undefined") return;
  const key = storageKey();
  if (!key) return;
  const json = JSON.stringify(data);
  localStorage.setItem(key, json);
  inventoryRawCache = { key, raw: json, data };
  pushSellerData("inventory", data);
  emitDataUpdated();
}

export function loadProducts(): Product[] {
  return loadRaw().products;
}

export function loadCategories(): Category[] {
  return loadRaw().categories;
}

export function loadBrands(): Brand[] {
  return loadRaw().brands;
}

export function loadMovements(type?: StockMovementType): StockMovement[] {
  const all = loadRaw().movements;
  return type ? all.filter((m) => m.type === type) : all;
}

export function getProduct(id: string): Product | undefined {
  return loadProducts().find((p) => p.id === id);
}

/** Match inventory row for a WooCommerce order line item */
export function findProductForWooLine(item: {
  sku?: string;
  name?: string;
  product_id?: number;
  variation_id?: number;
}): Product | undefined {
  const products = loadProducts();
  if (item.variation_id) {
    const byVar = products.find((p) => p.wooVariationId === item.variation_id);
    if (byVar) return byVar;
  }
  if (item.product_id) {
    const byParent = products.find(
      (p) => p.wooProductId === item.product_id && !p.wooVariationId
    );
    if (byParent) return byParent;
  }
  const sku = item.sku?.trim().toLowerCase();
  if (sku) {
    const bySku = products.find((p) => p.code.toLowerCase() === sku);
    if (bySku) return bySku;
  }
  const name = item.name?.trim().toLowerCase();
  if (name) {
    const byName = products.find((p) => p.name.toLowerCase() === name);
    if (byName) return byName;
  }
  return undefined;
}

/** Product thumbnail — uses own image or parent variable product image. */
export function getProductDisplayImage(product: Product): string | undefined {
  if (product.imageDataUrl?.trim()) return product.imageDataUrl.trim();

  const products = loadProducts();

  if (product.wooParentId) {
    const parent = products.find(
      (p) => p.wooProductId === product.wooParentId && !p.wooVariationId
    );
    if (parent?.imageDataUrl?.trim()) return parent.imageDataUrl.trim();
  }

  // SKU prefix fallback (e.g. SHIRT-003-L → SHIRT-003)
  if (product.wooVariationId || product.code.includes("-")) {
    const dash = product.code.lastIndexOf("-");
    if (dash > 0) {
      const base = product.code.slice(0, dash);
      const parent = products.find(
        (p) =>
          !p.wooVariationId &&
          p.code.toLowerCase() === base.toLowerCase() &&
          p.imageDataUrl?.trim()
      );
      if (parent?.imageDataUrl?.trim()) return parent.imageDataUrl.trim();
    }
  }

  return undefined;
}

export function getProductDisplayImageFromList(
  product: Product,
  products: Product[]
): string | undefined {
  if (product.imageDataUrl?.trim()) return product.imageDataUrl.trim();

  if (product.wooParentId) {
    const parent = products.find(
      (p) => p.wooProductId === product.wooParentId && !p.wooVariationId
    );
    if (parent?.imageDataUrl?.trim()) return parent.imageDataUrl.trim();
  }

  // SKU prefix fallback (e.g. SHIRT-003-L → SHIRT-003)
  if (product.wooVariationId || product.code.includes("-")) {
    const dash = product.code.lastIndexOf("-");
    if (dash > 0) {
      const base = product.code.slice(0, dash);
      const parent = products.find(
        (p) =>
          !p.wooVariationId &&
          p.code.toLowerCase() === base.toLowerCase() &&
          p.imageDataUrl?.trim()
      );
      if (parent?.imageDataUrl?.trim()) return parent.imageDataUrl.trim();
    }
  }

  return undefined;
}

/** Resolve product image for an order line (saved URL, id, SKU, or Woo ids). */
export function getProductImageForLine(line: {
  productId: string;
  productCode: string;
  imageUrl?: string;
  wooProductId?: number;
  wooVariationId?: number;
}): string | undefined {
  if (line.imageUrl?.trim()) return line.imageUrl.trim();
  const byId = getProduct(line.productId);
  if (byId) {
    const img = getProductDisplayImage(byId);
    if (img) return img;
  }
  const matched = findProductForWooLine({
    sku: line.productCode,
    product_id: line.wooProductId,
    variation_id: line.wooVariationId,
  });
  if (matched) {
    const img = getProductDisplayImage(matched);
    if (img) return img;
  }
  const code = line.productCode?.trim().toLowerCase();
  if (!code || code.startsWith("woo-li-")) return undefined;
  return loadProducts().find((p) => p.code.toLowerCase() === code)?.imageDataUrl;
}

export function getCategoryName(id: string): string {
  return loadCategories().find((c) => c.id === id)?.name ?? "—";
}

export function getBrandName(id: string): string {
  return loadBrands().find((b) => b.id === id)?.name ?? "—";
}

export function addCategory(name: string): Category {
  const data = loadRaw();
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Category name is required.");
  if (
    data.categories.some((c) => c.name.toLowerCase() === trimmed.toLowerCase())
  ) {
    throw new Error("Category name already exists.");
  }
  const cat: Category = { id: `cat-${Date.now()}`, name: trimmed };
  data.categories.push(cat);
  saveRaw(data);
  return cat;
}

export function addBrand(name: string): Brand {
  const data = loadRaw();
  const trimmed = name.trim();
  if (!trimmed) throw new Error("Brand name is required.");
  if (data.brands.some((b) => b.name.toLowerCase() === trimmed.toLowerCase())) {
    throw new Error("Brand name already exists.");
  }
  const brand: Brand = { id: `br-${Date.now()}`, name: trimmed };
  data.brands.push(brand);
  saveRaw(data);
  return brand;
}

export function updateCategory(
  id: string,
  name: string
): { ok: true } | { ok: false; message: string } {
  const data = loadRaw();
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, message: "Category name is required." };
  if (
    data.categories.some(
      (c) => c.id !== id && c.name.toLowerCase() === trimmed.toLowerCase()
    )
  ) {
    return { ok: false, message: "Category name already exists." };
  }
  const idx = data.categories.findIndex((c) => c.id === id);
  if (idx < 0) return { ok: false, message: "Category not found." };
  data.categories[idx] = { ...data.categories[idx], name: trimmed };
  saveRaw(data);
  return { ok: true };
}

export function updateBrand(
  id: string,
  name: string
): { ok: true } | { ok: false; message: string } {
  const data = loadRaw();
  const trimmed = name.trim();
  if (!trimmed) return { ok: false, message: "Brand name is required." };
  if (
    data.brands.some(
      (b) => b.id !== id && b.name.toLowerCase() === trimmed.toLowerCase()
    )
  ) {
    return { ok: false, message: "Brand name already exists." };
  }
  const idx = data.brands.findIndex((b) => b.id === id);
  if (idx < 0) return { ok: false, message: "Brand not found." };
  data.brands[idx] = { ...data.brands[idx], name: trimmed };
  saveRaw(data);
  return { ok: true };
}

export function countProductsByCategory(categoryId: string): number {
  return loadRaw().products.filter((p) => p.categoryId === categoryId).length;
}

export function countProductsByBrand(brandId: string): number {
  return loadRaw().products.filter((p) => p.brandId === brandId).length;
}

export function deleteCategory(
  id: string
): { ok: true } | { ok: false; message: string } {
  const data = loadRaw();
  const inUse = data.products.filter((p) => p.categoryId === id).length;
  if (inUse > 0) {
    return {
      ok: false,
      message: `Cannot delete — ${inUse} product(s) use this category.`,
    };
  }
  const before = data.categories.length;
  data.categories = data.categories.filter((c) => c.id !== id);
  if (data.categories.length === before) {
    return { ok: false, message: "Category not found." };
  }
  saveRaw(data);
  return { ok: true };
}

export function deleteBrand(
  id: string
): { ok: true } | { ok: false; message: string } {
  const data = loadRaw();
  const inUse = data.products.filter((p) => p.brandId === id).length;
  if (inUse > 0) {
    return {
      ok: false,
      message: `Cannot delete — ${inUse} product(s) use this brand.`,
    };
  }
  const before = data.brands.length;
  data.brands = data.brands.filter((b) => b.id !== id);
  if (data.brands.length === before) {
    return { ok: false, message: "Brand not found." };
  }
  saveRaw(data);
  return { ok: true };
}

export function createProduct(
  input: Omit<Product, "id" | "createdAt" | "updatedAt">
): Product {
  const data = loadRaw();
  const exists = data.products.some(
    (p) => p.code.toLowerCase() === input.code.toLowerCase().trim()
  );
  if (exists) throw new Error("Product code already exists.");

  const product: Product = {
    ...input,
    id: nextProductId(data.products),
    createdAt: nowLabel(),
    updatedAt: nowLabel(),
  };
  data.products.unshift(product);
  saveRaw(data);
  return product;
}

/** Create or update by SKU — used for WooCommerce product sync */
export function upsertProductByCode(
  input: Omit<Product, "id" | "createdAt" | "updatedAt">
): { product: Product; created: boolean } {
  const data = loadRaw();
  const code = input.code.trim();
  const idx = data.products.findIndex(
    (p) => p.code.toLowerCase() === code.toLowerCase()
  );

  if (idx >= 0) {
    const prev = data.products[idx];
    data.products[idx] = {
      ...prev,
      ...input,
      code,
      id: prev.id,
      createdAt: prev.createdAt,
      updatedAt: nowLabel(),
    };
    saveRaw(data);
    return { product: data.products[idx], created: false };
  }

  const product: Product = {
    ...input,
    id: `PRD-${String(Date.now()).slice(-8)}`,
    createdAt: nowLabel(),
    updatedAt: nowLabel(),
  };
  data.products.unshift(product);
  saveRaw(data);
  return { product, created: true };
}

export function ensureWooCommerceCategory(): string {
  const data = loadRaw();
  let cat = data.categories.find((c) => c.name === "WooCommerce");
  if (!cat) {
    cat = { id: `cat-woo-${Date.now()}`, name: "WooCommerce" };
    data.categories.push(cat);
    saveRaw(data);
  }
  return cat.id;
}

export function ensureWooCommerceBrand(): string {
  const data = loadRaw();
  let brand = data.brands.find((b) => b.name === "WooCommerce");
  if (!brand) {
    brand = { id: `br-woo-${Date.now()}`, name: "WooCommerce" };
    data.brands.push(brand);
    saveRaw(data);
  }
  return brand.id;
}

export function updateProduct(id: string, patch: Partial<Product>): Product | null {
  const data = loadRaw();
  const idx = data.products.findIndex((p) => p.id === id);
  if (idx === -1) return null;
  data.products[idx] = { ...data.products[idx], ...patch, updatedAt: nowLabel() };
  saveRaw(data);
  return data.products[idx];
}

export function deleteProduct(id: string): boolean {
  const data = loadRaw();
  const before = data.products.length;
  data.products = data.products.filter((p) => p.id !== id);
  if (data.products.length === before) return false;
  saveRaw(data);
  return true;
}

function applyStockChange(
  productId: string,
  delta: number,
  movement: Omit<StockMovement, "id" | "createdAt">
): StockMovement | null {
  const data = loadRaw();
  const idx = data.products.findIndex((p) => p.id === productId);
  if (idx === -1) return null;
  const p = data.products[idx];
  if (!p.manageStock) {
    p.manageStock = true;
  }

  const next = p.stockQty + delta;
  if (next < 0) throw new Error("Not enough stock.");

  p.stockQty = next;
  p.updatedAt = nowLabel();

  const record: StockMovement = {
    ...movement,
    id: `MOV-${Date.now()}`,
    createdAt: nowLabel(),
  };
  data.movements.unshift(record);
  saveRaw(data);
  return record;
}

export function decreaseStock(params: {
  productId: string;
  qty: number;
  reason: string;
  note?: string;
}): StockMovement | null {
  const p = getProduct(params.productId);
  if (!p) return null;
  return applyStockChange(params.productId, -params.qty, {
    type: "decrease",
    productId: p.id,
    productName: p.name,
    productCode: p.code,
    qty: params.qty,
    reason: params.reason,
    note: params.note,
  });
}

export function increaseStock(params: {
  productId: string;
  qty: number;
  reason: string;
  note?: string;
}): StockMovement | null {
  const p = getProduct(params.productId);
  if (!p) return null;
  return applyStockChange(params.productId, params.qty, {
    type: "increase",
    productId: p.id,
    productName: p.name,
    productCode: p.code,
    qty: params.qty,
    reason: params.reason,
    note: params.note,
  });
}

/** +1 / −1 from product list stock controls */
export function quickAdjustStock(
  productId: string,
  delta: 1 | -1
): StockMovement | null {
  const p = getProduct(productId);
  if (!p) return null;
  if (delta < 0 && p.stockQty <= 0) return null;

  try {
    const result =
      delta > 0
        ? increaseStock({
            productId,
            qty: 1,
            reason: "Quick add (+)",
            note: "Product list",
          })
        : decreaseStock({
            productId,
            qty: 1,
            reason: "Quick remove (−)",
            note: "Product list",
          });

    if (result && typeof window !== "undefined") {
      void import("./woocommerce-stock-sync-store").then((m) =>
        m.maybeAutoSyncProductToWoo(productId)
      );
    }
    return result;
  } catch {
    return null;
  }
}

export function transferStock(params: {
  productId: string;
  qty: number;
  fromLocation: string;
  toLocation: string;
  note?: string;
}): StockMovement | null {
  const p = getProduct(params.productId);
  if (!p) return null;
  if (p.stockQty < params.qty) throw new Error("Not enough stock to transfer.");

  const data = loadRaw();
  const record: StockMovement = {
    id: `MOV-${Date.now()}`,
    type: "transfer",
    productId: p.id,
    productName: p.name,
    productCode: p.code,
    qty: params.qty,
    reason: "Transfer",
    note: params.note,
    fromLocation: params.fromLocation,
    toLocation: params.toLocation,
    createdAt: nowLabel(),
  };
  data.movements.unshift(record);
  saveRaw(data);
  return record;
}

export function getSmartRestockList(): SmartRestockItem[] {
  const data = loadRaw();
  const decreases = data.movements.filter((m) => m.type === "decrease");

  return data.products
    .filter((p) => p.manageStock && p.active !== false)
    .map((product) => {
      let status: SmartRestockItem["status"] = "ok";
      if (product.stockQty === 0) status = "out";
      else if (product.stockQty <= product.alertQty) status = "critical";
      else if (product.stockQty <= product.alertQty * 2) status = "low";

      const suggestedQty = Math.max(
        product.alertQty * 2 - product.stockQty,
        product.alertQty
      );

      const productDecreases = decreases.filter((m) => m.productId === product.id);
      const totalSold = productDecreases.reduce((sum, m) => sum + m.qty, 0);
      const dailyVelocity =
        productDecreases.length > 0 ? Math.max(totalSold / 30, 0.1) : 0;
      const daysToStockout =
        product.stockQty === 0
          ? 0
          : dailyVelocity > 0
            ? Math.floor(product.stockQty / dailyVelocity)
            : undefined;

      return { product, status, suggestedQty, daysToStockout };
    })
    .filter((x) => x.status !== "ok")
    .sort((a, b) => {
      const order = { out: 0, critical: 1, low: 2, ok: 3 };
      return order[a.status] - order[b.status];
    });
}

export function getSmartRestockAnalytics(): SmartRestockAnalytics {
  const products = loadProducts().filter(
    (p) => p.manageStock && p.active !== false
  );
  const list = getSmartRestockList();

  let outOfStock = 0;
  let critical = 0;
  let lowStock = 0;

  for (const p of products) {
    if (p.stockQty === 0) outOfStock += 1;
    else if (p.stockQty <= p.alertQty) critical += 1;
    else if (p.stockQty <= p.alertQty * 2) lowStock += 1;
  }

  const activeAlerts = list.filter(
    (i) =>
      i.daysToStockout != null &&
      i.daysToStockout <= 14 &&
      i.product.stockQty > 0
  ).length;

  return { lowStock, critical, outOfStock, activeAlerts };
}

export function getDeadStockProducts(): Product[] {
  const data = loadRaw();
  return data.products.filter((p) => {
    if (!p.manageStock || p.active === false || p.stockQty <= 0) return false;
    const hasDecrease = data.movements.some(
      (m) => m.type === "decrease" && m.productId === p.id
    );
    return !hasDecrease;
  });
}

export function getAbcAnalysis(limit = 12): AbcAnalysisRow[] {
  const data = loadRaw();
  const rows = data.products
    .filter((p) => p.active !== false)
    .map((product) => {
      const soldQty = data.movements
        .filter((m) => m.type === "decrease" && m.productId === product.id)
        .reduce((sum, m) => sum + m.qty, 0);
      const revenue = soldQty * product.sellPrice;
      return { product, soldQty, revenue, grade: "C" as const };
    })
    .sort((a, b) => b.revenue - a.revenue);

  if (rows.length === 0) return [];

  const top = rows.slice(0, limit);
  return top.map((row, idx) => ({
    ...row,
    grade: idx < Math.ceil(limit * 0.2) ? "A" : idx < Math.ceil(limit * 0.5) ? "B" : "C",
  }));
}

export function getInventoryHealthStats(): InventoryHealthStats {
  const products = loadProducts().filter((p) => p.active !== false);
  let healthyStock = 0;
  let lowStock = 0;
  let outOfStock = 0;
  let negativeStock = 0;

  for (const p of products) {
    if (!p.manageStock) continue;
    if (p.stockQty < 0) negativeStock += 1;
    else if (p.stockQty === 0) outOfStock += 1;
    else if (p.stockQty <= p.alertQty * 2) lowStock += 1;
    else healthyStock += 1;
  }

  return {
    totalProducts: products.length,
    healthyStock,
    lowStock,
    outOfStock,
    negativeStock,
  };
}

export function getInventoryMovementSummary(
  days = 7
): InventoryMovementSummary {
  const movements = movementsInPeriod(days);
  let unitsSold = 0;
  let unitsPurchased = 0;
  let returns = 0;

  for (const m of movements) {
    if (m.type === "decrease") {
      unitsSold += m.qty;
      continue;
    }
    if (m.type === "increase") {
      const reason = m.reason.toLowerCase();
      if (reason.includes("return")) returns += m.qty;
      else unitsPurchased += m.qty;
    }
  }

  return {
    unitsSold,
    unitsPurchased,
    returns,
    netChange: unitsPurchased + returns - unitsSold,
    totalMovements: movements.length,
  };
}

export function getNegativeStockProducts(): Product[] {
  return loadProducts()
    .filter((p) => p.active !== false && p.manageStock && p.stockQty < 0)
    .sort((a, b) => a.stockQty - b.stockQty);
}

export function getProductMovementHistory(
  productId: string,
  limit = 20
): StockMovement[] {
  return loadMovements().filter((m) => m.productId === productId).slice(0, limit);
}

export function getInventoryStats() {
  const products = loadProducts();
  const managed = products.filter((p) => p.manageStock);
  const low = managed.filter((p) => p.stockQty > 0 && p.stockQty <= p.alertQty);
  const out = managed.filter((p) => p.stockQty === 0);
  const totalValue = products.reduce(
    (s, p) => s + p.stockQty * p.costPrice,
    0
  );
  return {
    totalProducts: products.length,
    lowStock: low.length,
    outOfStock: out.length,
    totalStockUnits: managed.reduce((s, p) => s + p.stockQty, 0),
    inventoryValue: totalValue,
    featured: products.filter((p) => p.featured).length,
  };
}

export function applySmartRestock(productId: string, qty?: number): boolean {
  const item = getSmartRestockList().find((x) => x.product.id === productId);
  if (!item) return false;
  increaseStock({
    productId,
    qty: qty ?? item.suggestedQty,
    reason: "Smart Restock",
    note: "Auto restock from smart inventory",
  });
  return true;
}
