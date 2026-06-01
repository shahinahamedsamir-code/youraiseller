import type { FeatureKey } from "./features";

export const inventoryBasePath = "/dashboard/inventory";

export type InventoryNavItem = {
  label: string;
  href: string;
  featureKey: FeatureKey;
};

export const inventoryNav: InventoryNavItem[] = [
  { label: "Add New Product", href: "/dashboard/inventory/products/new", featureKey: "inventory" },
  { label: "Product List", href: "/dashboard/inventory/products", featureKey: "inventory" },
  { label: "Categories & Brands", href: "/dashboard/inventory/categories", featureKey: "inventory" },
  { label: "New Decrease Stock", href: "/dashboard/inventory/stock/decrease/new", featureKey: "inventory" },
  { label: "Decrease Stock List", href: "/dashboard/inventory/stock/decrease", featureKey: "inventory" },
  { label: "Stock Increase", href: "/dashboard/inventory/stock/increase", featureKey: "inventory" },
  { label: "New Increase Stock", href: "/dashboard/inventory/stock/increase/new", featureKey: "inventory" },
  { label: "Increase Stock List", href: "/dashboard/inventory/stock/increase/list", featureKey: "inventory" },
  { label: "Transfer Stock", href: "/dashboard/inventory/stock/transfer", featureKey: "inventory" },
  { label: "Smart Restock", href: "/dashboard/inventory/smart-restock", featureKey: "inventory" },
  { label: "Inventory Dashboard", href: "/dashboard/inventory/dashboard", featureKey: "inventory" },
];
