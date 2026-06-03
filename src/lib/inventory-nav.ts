import type { FeatureKey } from "./features";

export const inventoryBasePath = "/dashboard/inventory";

export type InventoryNavItem = {
  label: string;
  href: string;
  featureKey: FeatureKey;
};

export const inventoryNav: InventoryNavItem[] = [
  { label: "Add New Product", href: "/dashboard/inventory/products/new", featureKey: "inv_add_product" },
  { label: "Product List", href: "/dashboard/inventory/products", featureKey: "inv_product_list" },
  { label: "Categories & Brands", href: "/dashboard/inventory/categories", featureKey: "inv_categories" },
  { label: "New Decrease Stock", href: "/dashboard/inventory/stock/decrease/new", featureKey: "inv_stock_out_new" },
  { label: "Decrease Stock List", href: "/dashboard/inventory/stock/decrease", featureKey: "inv_stock_out_list" },
  { label: "Stock Increase", href: "/dashboard/inventory/stock/increase", featureKey: "inv_stock_in" },
  { label: "New Increase Stock", href: "/dashboard/inventory/stock/increase/new", featureKey: "inv_stock_in_new" },
  { label: "Increase Stock List", href: "/dashboard/inventory/stock/increase/list", featureKey: "inv_stock_in_list" },
  { label: "Transfer Stock", href: "/dashboard/inventory/stock/transfer", featureKey: "inv_transfer" },
  { label: "Smart Restock", href: "/dashboard/inventory/smart-restock", featureKey: "inv_smart_restock" },
  { label: "Inventory Dashboard", href: "/dashboard/inventory/dashboard", featureKey: "inv_dashboard" },
];
