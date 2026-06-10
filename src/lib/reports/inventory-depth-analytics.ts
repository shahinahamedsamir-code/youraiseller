import {
  getBrandName,
  getCategoryName,
  getDeadStockProducts,
  loadProducts,
  type Product,
} from "@/lib/inventory-store";

export type CategoryBrandRow = {
  id: string;
  name: string;
  productCount: number;
  stockUnits: number;
  costValue: number;
  retailValue: number;
};

function aggregateByField(
  products: Product[],
  getId: (product: Product) => string,
  getName: (id: string) => string
): CategoryBrandRow[] {
  const map = new Map<string, CategoryBrandRow>();
  for (const product of products) {
    if (product.active === false) continue;
    const id = getId(product);
    const row = map.get(id) ?? {
      id,
      name: getName(id),
      productCount: 0,
      stockUnits: 0,
      costValue: 0,
      retailValue: 0,
    };
    row.productCount += 1;
    if (product.manageStock) {
      row.stockUnits += product.stockQty;
      row.costValue += product.stockQty * product.costPrice;
      row.retailValue += product.stockQty * product.sellPrice;
    }
    map.set(id, row);
  }
  return [...map.values()].sort((a, b) => b.costValue - a.costValue);
}

export function buildCategoryBreakdown(): CategoryBrandRow[] {
  return aggregateByField(loadProducts(), (p) => p.categoryId, getCategoryName);
}

export function buildBrandBreakdown(): CategoryBrandRow[] {
  return aggregateByField(loadProducts(), (p) => p.brandId, getBrandName);
}

export type DeadStockRow = {
  product: Product;
  stockQty: number;
  costValue: number;
  retailValue: number;
};

export function buildDeadStockReport(limit = 15): {
  rows: DeadStockRow[];
  totalUnits: number;
  costValue: number;
  retailValue: number;
  productCount: number;
} {
  const dead = getDeadStockProducts();
  const rows = dead
    .map((product) => ({
      product,
      stockQty: product.stockQty,
      costValue: product.stockQty * product.costPrice,
      retailValue: product.stockQty * product.sellPrice,
    }))
    .sort((a, b) => b.costValue - a.costValue)
    .slice(0, limit);
  return {
    rows,
    totalUnits: dead.reduce((sum, p) => sum + p.stockQty, 0),
    costValue: dead.reduce((sum, p) => sum + p.stockQty * p.costPrice, 0),
    retailValue: dead.reduce((sum, p) => sum + p.stockQty * p.sellPrice, 0),
    productCount: dead.length,
  };
}

export function buildInventoryValuation() {
  const products = loadProducts().filter(
    (p) => p.active !== false && p.manageStock
  );
  const costValue = products.reduce(
    (sum, p) => sum + p.stockQty * p.costPrice,
    0
  );
  const retailValue = products.reduce(
    (sum, p) => sum + p.stockQty * p.sellPrice,
    0
  );
  const deadStock = buildDeadStockReport(10_000);
  return {
    costValue,
    retailValue,
    potentialMargin: retailValue - costValue,
    stockUnits: products.reduce((sum, p) => sum + p.stockQty, 0),
    deadStockCost: deadStock.costValue,
    deadStockUnits: deadStock.totalUnits,
    deadStockProducts: deadStock.productCount,
    marginPct: retailValue > 0 ? ((retailValue - costValue) / retailValue) * 100 : 0,
  };
}
