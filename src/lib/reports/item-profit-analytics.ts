import { getCategoryName, getProduct } from "@/lib/inventory-store";
import type { Order } from "@/lib/orders-store";
import type { DateRange } from "./report-types";
import { isWithinRange, parseOrderDate } from "./report-utils";

const PROFIT_STATUSES = new Set(["delivered", "partial"]);
const RETURNED_STATUS = "returned";

export type ItemProfitRow = {
  productId: string;
  name: string;
  code: string;
  category: string;
  qtySold: number;
  qtyReturned: number;
  revenue: number;
  cogs: number;
  grossProfit: number;
  marginPct: number;
  orderCount: number;
  sellPrice: number;
  costPrice: number;
};

export type CategoryProfitRow = {
  id: string;
  name: string;
  qtySold: number;
  revenue: number;
  grossProfit: number;
  marginPct: number;
  productCount: number;
};

export type ItemProfitReport = {
  summary: {
    totalRevenue: number;
    totalCogs: number;
    grossProfit: number;
    avgMargin: number;
    itemsSold: number;
    uniqueProducts: number;
    lossMakingCount: number;
    bestItem: { name: string; profit: number } | null;
  };
  rows: ItemProfitRow[];
  topByProfit: { name: string; profit: number; revenue: number }[];
  byCategory: CategoryProfitRow[];
};

function lineUnitCost(productId: string, fallbackPrice: number): number {
  const product = getProduct(productId);
  return product?.costPrice ?? fallbackPrice * 0.65;
}

function productMeta(productId: string, lineName: string, lineCode: string) {
  const product = getProduct(productId);
  return {
    name: product?.name ?? lineName,
    code: product?.code ?? lineCode,
    category: product ? getCategoryName(product.categoryId) : "Uncategorized",
    sellPrice: product?.sellPrice ?? 0,
    costPrice: product?.costPrice ?? 0,
  };
}

export function buildItemProfitReport(
  orders: Order[],
  range: DateRange,
  from: string,
  to: string
): ItemProfitReport {
  const map = new Map<
    string,
    ItemProfitRow & { orderIds: Set<string> }
  >();

  for (const order of orders) {
    if (!isWithinRange(parseOrderDate(order), range, from, to)) continue;

    const isProfit = PROFIT_STATUSES.has(order.status);
    const isReturn = order.status === RETURNED_STATUS;
    if (!isProfit && !isReturn) continue;

    for (const line of order.items) {
      const unitCost = lineUnitCost(line.productId, line.price);
      const meta = productMeta(line.productId, line.productName, line.productCode);
      const existing = map.get(line.productId) ?? {
        productId: line.productId,
        name: meta.name,
        code: meta.code,
        category: meta.category,
        qtySold: 0,
        qtyReturned: 0,
        revenue: 0,
        cogs: 0,
        grossProfit: 0,
        marginPct: 0,
        orderCount: 0,
        sellPrice: meta.sellPrice,
        costPrice: meta.costPrice,
        orderIds: new Set<string>(),
      };

      if (isReturn) {
        existing.qtyReturned += line.qty;
        existing.revenue -= line.total;
        existing.cogs -= unitCost * line.qty;
      } else {
        existing.qtySold += line.qty;
        existing.revenue += line.total;
        existing.cogs += unitCost * line.qty;
        existing.orderIds.add(order.id);
      }

      map.set(line.productId, existing);
    }
  }

  const rows = [...map.values()]
    .map((row) => {
      const grossProfit = row.revenue - row.cogs;
      return {
        productId: row.productId,
        name: row.name,
        code: row.code,
        category: row.category,
        qtySold: row.qtySold,
        qtyReturned: row.qtyReturned,
        revenue: row.revenue,
        cogs: row.cogs,
        grossProfit,
        marginPct: row.revenue > 0 ? (grossProfit / row.revenue) * 100 : 0,
        orderCount: row.orderIds.size,
        sellPrice: row.sellPrice,
        costPrice: row.costPrice,
      };
    })
    .filter((row) => row.qtySold > 0 || row.qtyReturned > 0 || row.revenue !== 0)
    .sort((a, b) => b.grossProfit - a.grossProfit);

  const totalRevenue = rows.reduce((sum, row) => sum + row.revenue, 0);
  const totalCogs = rows.reduce((sum, row) => sum + row.cogs, 0);
  const grossProfit = totalRevenue - totalCogs;
  const itemsSold = rows.reduce((sum, row) => sum + row.qtySold, 0);
  const lossMakingCount = rows.filter((row) => row.grossProfit < 0).length;
  const best = rows.find((row) => row.grossProfit > 0) ?? null;

  const categoryMap = new Map<string, CategoryProfitRow>();
  for (const row of rows) {
    const product = getProduct(row.productId);
    const catId = product?.categoryId ?? "uncategorized";
    const cat = categoryMap.get(catId) ?? {
      id: catId,
      name: row.category,
      qtySold: 0,
      revenue: 0,
      grossProfit: 0,
      marginPct: 0,
      productCount: 0,
    };
    cat.qtySold += row.qtySold;
    cat.revenue += row.revenue;
    cat.grossProfit += row.grossProfit;
    cat.productCount += 1;
    categoryMap.set(catId, cat);
  }

  const byCategory = [...categoryMap.values()]
    .map((row) => ({
      ...row,
      marginPct: row.revenue > 0 ? (row.grossProfit / row.revenue) * 100 : 0,
    }))
    .sort((a, b) => b.grossProfit - a.grossProfit);

  return {
    summary: {
      totalRevenue,
      totalCogs,
      grossProfit,
      avgMargin: totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0,
      itemsSold,
      uniqueProducts: rows.length,
      lossMakingCount,
      bestItem: best ? { name: best.name, profit: best.grossProfit } : null,
    },
    rows,
    topByProfit: rows.slice(0, 10).map((row) => ({
      name: row.name.length > 22 ? `${row.name.slice(0, 20)}…` : row.name,
      profit: row.grossProfit,
      revenue: row.revenue,
    })),
    byCategory,
  };
}
