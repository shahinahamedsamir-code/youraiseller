export type FeatureKey =
  | "dashboard"
  | "search"
  | "approved_orders"
  | "web_orders"
  | "web_order_list"
  | "auto_call_center"
  | "preorders"
  | "sync_products"
  | "woocommerce"
  | "additional_sites"
  | "manual_web_order"
  | "order_block_list"
  | "inventory"
  | "meta_ads"
  | "accounting"
  | "tasks"
  | "hrm"
  | "automation"
  | "delivery"
  | "integrations"
  | "shopify_integration"
  | "courier_integration"
  | "settings"
  | "reports"
  | "customers"
  | "sms"
  | "founder_dashboard"
  | "help_assistant"
  | "new_order";

export type FeatureDef = {
  key: FeatureKey;
  label: string;
  description: string;
  category: "core" | "orders" | "web_orders" | "operations" | "extras";
};

export const FEATURE_LIST: FeatureDef[] = [
  { key: "dashboard", label: "Dashboard", description: "Main overview & KPI cards", category: "core" },
  { key: "founder_dashboard", label: "Founder Dashboard", description: "Revenue & profit tab for founders", category: "core" },
  { key: "search", label: "Search", description: "Global search module", category: "core" },
  { key: "new_order", label: "New Order", description: "Quick new order entry", category: "orders" },
  { key: "approved_orders", label: "Approved Orders", description: "Approved & courier orders", category: "orders" },
  { key: "web_orders", label: "Web Orders (Menu)", description: "Web orders sidebar group", category: "web_orders" },
  { key: "web_order_list", label: "Web Order List", description: "List all web orders", category: "web_orders" },
  { key: "auto_call_center", label: "Auto Call Center", description: "IVR auto verification calls", category: "web_orders" },
  { key: "preorders", label: "Preorders", description: "Preorder management", category: "web_orders" },
  { key: "sync_products", label: "Sync Products", description: "Product catalog sync", category: "web_orders" },
  { key: "woocommerce", label: "WooCommerce Integration", description: "WooCommerce connect", category: "web_orders" },
  { key: "additional_sites", label: "Additional Sites", description: "Multi-site management", category: "web_orders" },
  { key: "manual_web_order", label: "Manual Web Order", description: "Manual order form", category: "web_orders" },
  { key: "order_block_list", label: "Order Block List", description: "Blocked phones/IPs", category: "web_orders" },
  { key: "inventory", label: "Inventory", description: "Stock & SKU management", category: "operations" },
  { key: "meta_ads", label: "Meta Ads", description: "Facebook/Instagram ads", category: "operations" },
  { key: "accounting", label: "Accounting", description: "Income, expense, profit", category: "operations" },
  { key: "tasks", label: "Task & Follow-up", description: "Team tasks", category: "operations" },
  { key: "hrm", label: "HRM", description: "Employee management", category: "operations" },
  { key: "automation", label: "Automation", description: "Workflow automations", category: "operations" },
  { key: "delivery", label: "Delivery Methods", description: "Courier settings", category: "operations" },
  { key: "integrations", label: "Integration (Menu)", description: "Store & courier integrations", category: "operations" },
  { key: "shopify_integration", label: "Shopify Integration", description: "Shopify connect", category: "operations" },
  { key: "courier_integration", label: "Courier Integration", description: "Courier API connect", category: "operations" },
  { key: "settings", label: "Setting", description: "System settings", category: "extras" },
  { key: "reports", label: "Reports", description: "Business reports", category: "extras" },
  { key: "customers", label: "Customer", description: "Customer database", category: "extras" },
  { key: "sms", label: "SMS", description: "SMS templates & send", category: "extras" },
  { key: "help_assistant", label: "Help Assistant Widget", description: "Floating help button", category: "extras" },
];

export const DEFAULT_FEATURES: Record<FeatureKey, boolean> = Object.fromEntries(
  FEATURE_LIST.map((f) => [f.key, true])
) as Record<FeatureKey, boolean>;

export const CATEGORY_LABELS: Record<FeatureDef["category"], string> = {
  core: "Core",
  orders: "Orders",
  web_orders: "Web Orders",
  operations: "Operations",
  extras: "Settings & Extras",
};

/** Map URL path → feature key for access control */
export function getFeatureKeyFromPath(pathname: string): FeatureKey | null {
  const map: [string, FeatureKey][] = [
    ["/dashboard/integration/courier", "courier_integration"],
    ["/dashboard/integration/shopify", "shopify_integration"],
    ["/dashboard/integration/woocommerce", "woocommerce"],
    ["/dashboard/integration/additional-sites", "additional_sites"],
    ["/dashboard/integration/sync-products", "sync_products"],
    ["/dashboard/integration", "integrations"],
    ["/dashboard/orders/web/block-list", "order_block_list"],
    ["/dashboard/orders/web/manual", "manual_web_order"],
    ["/dashboard/orders/web/preorders", "preorders"],
    ["/dashboard/orders/web/auto-call-center", "auto_call_center"],
    ["/dashboard/orders/web/view", "web_order_list"],
    ["/dashboard/orders/web", "web_order_list"],
    ["/dashboard/orders/approved/new", "new_order"],
    ["/dashboard/orders/approved/scan", "approved_orders"],
    ["/dashboard/orders/approved/super-edit", "approved_orders"],
    ["/dashboard/orders/approved/courier", "approved_orders"],
    ["/dashboard/orders/approved/preorders", "approved_orders"],
    ["/dashboard/orders/approved/all", "approved_orders"],
    ["/dashboard/orders/approved/list", "approved_orders"],
    ["/dashboard/orders/approved", "approved_orders"],
    ["/dashboard/orders/new", "new_order"],
    ["/dashboard/search", "search"],
    ["/dashboard/inventory/smart-restock", "inventory"],
    ["/dashboard/inventory/dashboard", "inventory"],
    ["/dashboard/inventory", "inventory"],
    ["/dashboard/meta-ads", "meta_ads"],
    ["/dashboard/accounting", "accounting"],
    ["/dashboard/tasks", "tasks"],
    ["/dashboard/hrm", "hrm"],
    ["/dashboard/automation", "automation"],
    ["/dashboard/delivery", "delivery"],
    ["/dashboard/settings", "settings"],
    ["/dashboard/reports", "reports"],
    ["/dashboard/customers", "customers"],
    ["/dashboard/sms", "sms"],
    ["/dashboard", "dashboard"],
  ];
  for (const [path, key] of map) {
    if (pathname === path || (path !== "/dashboard" && pathname.startsWith(path + "/"))) {
      return key;
    }
  }
  if (pathname.startsWith("/dashboard/integration")) return "integrations";
  if (pathname.startsWith("/dashboard/orders/web")) return "web_orders";
  return null;
}
