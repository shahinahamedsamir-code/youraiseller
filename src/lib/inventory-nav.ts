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
  { label: "Stock Management", href: "/dashboard/inventory/stock-management", featureKey: "inv_stock_in" },
  { label: "Inventory Dashboard", href: "/dashboard/inventory/dashboard", featureKey: "inv_dashboard" },
];
