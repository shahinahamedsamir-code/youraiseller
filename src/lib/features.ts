export type FeatureKey =
  | "dashboard"
  | "search"
  | "approved_orders"
  | "new_order"
  | "order_list"
  | "all_orders"
  | "courier_management"
  | "super_edit"
  | "preorder_list"
  | "scan_update"
  | "web_orders"
  | "web_order_list"
  | "auto_call_center"
  | "auto_call_integration"
  | "preorders"
  | "sync_products"
  | "woocommerce"
  | "additional_sites"
  | "manual_web_order"
  | "order_block_list"
  | "pos_sales"
  | "inventory"
  | "inv_add_product"
  | "inv_product_list"
  | "inv_categories"
  | "inv_stock_out_new"
  | "inv_stock_out_list"
  | "inv_stock_in"
  | "inv_stock_in_new"
  | "inv_stock_in_list"
  | "inv_transfer"
  | "inv_smart_restock"
  | "inv_dashboard"
  | "meta_ads"
  | "accounting"
  | "acct_chart"
  | "acct_accounts"
  | "acct_transfer"
  | "acct_transactions"
  | "acct_assets"
  | "acct_expenses"
  | "acct_income"
  | "acct_liabilities"
  | "acct_invoice"
  | "acct_payment"
  | "tasks"
  | "hrm"
  | "automation"
  | "delivery"
  | "delivery_list"
  | "delivery_add"
  | "integrations"
  | "shopify_integration"
  | "courier_integration"
  | "settings"
  | "settings_users"
  | "settings_business"
  | "settings_invoice"
  | "settings_sticker"
  | "settings_order_source"
  | "settings_order_tags"
  | "settings_shipping_note"
  | "settings_advance"
  | "settings_product_label"
  | "settings_security"
  | "billing_limits"
  | "reports"
  | "customers"
  | "sms"
  | "founder_dashboard"
  | "help_assistant";

export type FeatureDef = {
  key: FeatureKey;
  label: string;
  description: string;
  category: "core" | "orders" | "web_orders" | "operations" | "extras";
  /** Parent menu feature. When the parent is OFF, this child is forced OFF. */
  parent?: FeatureKey;
};

export const FEATURE_LIST: FeatureDef[] = [
  { key: "dashboard", label: "Dashboard", description: "Main overview & KPI cards", category: "core" },
  { key: "founder_dashboard", label: "Founder Dashboard", description: "Revenue & profit tab for founders", category: "core" },
  { key: "search", label: "Search", description: "Global search module", category: "core" },
  // Orders parent + children
  { key: "approved_orders", label: "Approved Orders", description: "Approved & courier orders (parent menu)", category: "orders" },
  { key: "new_order", label: "New Order", description: "Quick new order entry", category: "orders", parent: "approved_orders" },
  { key: "order_list", label: "Order List", description: "Approved order list", category: "orders", parent: "approved_orders" },
  { key: "all_orders", label: "All List", description: "All orders across statuses", category: "orders", parent: "approved_orders" },
  { key: "courier_management", label: "Courier Management", description: "Courier push & tracking", category: "orders", parent: "approved_orders" },
  { key: "super_edit", label: "Super Edit", description: "Bulk / advanced order editing", category: "orders", parent: "approved_orders" },
  { key: "preorder_list", label: "Preorder List", description: "Approved preorders", category: "orders", parent: "approved_orders" },
  { key: "scan_update", label: "Scan To Update", description: "Barcode scan status update", category: "orders", parent: "approved_orders" },
  // Web Orders parent + children
  { key: "web_orders", label: "Web Orders", description: "Web orders sidebar group (parent menu)", category: "web_orders" },
  { key: "web_order_list", label: "Web Order List", description: "List all web orders", category: "web_orders", parent: "web_orders" },
  { key: "auto_call_center", label: "Auto Call Center", description: "IVR auto verification calls", category: "web_orders", parent: "web_orders" },
  { key: "manual_web_order", label: "Manual Web Order", description: "Manual order form", category: "web_orders", parent: "web_orders" },
  { key: "order_block_list", label: "Order Block List", description: "Blocked phones/IPs", category: "web_orders", parent: "web_orders" },
  { key: "preorders", label: "Preorders", description: "Preorder management", category: "web_orders", parent: "web_orders" },
  { key: "pos_sales", label: "POS Sales", description: "Counter sales, draft, return and payment workflow", category: "operations" },
  // Inventory parent + children
  { key: "inventory", label: "Inventory", description: "Stock & SKU management (parent menu)", category: "operations" },
  { key: "inv_add_product", label: "Add New Product", description: "Create a product", category: "operations", parent: "inventory" },
  { key: "inv_product_list", label: "Product List", description: "All products & SKUs", category: "operations", parent: "inventory" },
  { key: "inv_categories", label: "Categories & Brands", description: "Manage categories/brands", category: "operations", parent: "inventory" },
  { key: "inv_stock_out_new", label: "New Decrease Stock", description: "Record stock-out", category: "operations", parent: "inventory" },
  { key: "inv_stock_out_list", label: "Decrease Stock List", description: "Stock-out history", category: "operations", parent: "inventory" },
  { key: "inv_stock_in", label: "Stock Increase", description: "Stock increase overview", category: "operations", parent: "inventory" },
  { key: "inv_stock_in_new", label: "New Increase Stock", description: "Record stock-in", category: "operations", parent: "inventory" },
  { key: "inv_stock_in_list", label: "Increase Stock List", description: "Stock-in history", category: "operations", parent: "inventory" },
  { key: "inv_transfer", label: "Transfer Stock", description: "Move stock between locations", category: "operations", parent: "inventory" },
  { key: "inv_smart_restock", label: "Smart Restock", description: "Restock suggestions", category: "operations", parent: "inventory" },
  { key: "inv_dashboard", label: "Inventory Dashboard", description: "Inventory KPIs", category: "operations", parent: "inventory" },
  { key: "meta_ads", label: "Meta Ads", description: "Facebook/Instagram ads", category: "operations" },
  { key: "accounting", label: "Accounting", description: "Income, expense, profit (parent menu)", category: "operations" },
  { key: "acct_chart", label: "Chart Of Account", description: "Expense names, bank & cash accounts", category: "operations", parent: "accounting" },
  { key: "acct_accounts", label: "Accounts", description: "Cash, bank & wallet accounts", category: "operations", parent: "accounting" },
  { key: "acct_transfer", label: "Account Transfer", description: "Move money between bKash, bank & cash", category: "operations", parent: "accounting" },
  { key: "acct_assets", label: "Assets", description: "Business assets & equipment", category: "operations", parent: "accounting" },
  { key: "acct_expenses", label: "Expense", description: "Expense list and entries", category: "operations", parent: "accounting" },
  { key: "acct_income", label: "Income", description: "Income entries & order payments", category: "operations", parent: "accounting" },
  { key: "acct_liabilities", label: "Liabilities", description: "Loans & payables", category: "operations", parent: "accounting" },
  { key: "acct_invoice", label: "Invoice", description: "Sales & purchase invoices", category: "operations", parent: "accounting" },
  { key: "acct_payment", label: "Payment", description: "Received & paid transactions", category: "operations", parent: "accounting" },
  { key: "acct_transactions", label: "Transaction", description: "Ledger & transaction history", category: "operations", parent: "accounting" },
  { key: "tasks", label: "Task & Follow-up", description: "Team tasks", category: "operations" },
  { key: "hrm", label: "HRM", description: "Employee management", category: "operations" },
  { key: "automation", label: "Automation", description: "Workflow automations", category: "operations" },
  // Delivery parent + children
  { key: "delivery", label: "Delivery Methods", description: "Courier settings (parent menu)", category: "operations" },
  { key: "delivery_list", label: "Delivery Method List", description: "All delivery methods", category: "operations", parent: "delivery" },
  { key: "delivery_add", label: "Add Method", description: "Create a delivery method", category: "operations", parent: "delivery" },
  // Integration parent + children
  { key: "integrations", label: "Integration", description: "Store & courier integrations (parent menu)", category: "operations" },
  { key: "woocommerce", label: "WooCommerce Integration", description: "WooCommerce connect", category: "operations", parent: "integrations" },
  { key: "shopify_integration", label: "Shopify Integration", description: "Shopify connect", category: "operations", parent: "integrations" },
  { key: "courier_integration", label: "Courier Integration", description: "Courier API connect", category: "operations", parent: "integrations" },
  { key: "additional_sites", label: "Additional Sites", description: "Multi-site management", category: "operations", parent: "integrations" },
  { key: "sync_products", label: "Sync Products", description: "Product catalog sync", category: "operations", parent: "integrations" },
  { key: "sms", label: "SMS Integration", description: "SMS gateway, templates & send", category: "operations", parent: "integrations" },
  { key: "auto_call_integration", label: "Auto Call Integration", description: "Setup, rules & admin for IVR auto calls", category: "operations", parent: "integrations" },
  // Settings parent + children
  { key: "settings", label: "Setting", description: "System settings (parent menu)", category: "extras" },
  { key: "settings_users", label: "User List", description: "Team members & roles", category: "extras", parent: "settings" },
  { key: "settings_business", label: "Business Setting", description: "Name, logo, address, invoice slug", category: "extras", parent: "settings" },
  { key: "settings_invoice", label: "Select Invoice", description: "Invoice template & paper", category: "extras", parent: "settings" },
  { key: "settings_sticker", label: "Select Sticker", description: "Parcel sticker template & size", category: "extras", parent: "settings" },
  { key: "settings_order_source", label: "New Order Source", description: "Add/disable order source channels", category: "extras", parent: "settings" },
  { key: "settings_order_tags", label: "Order Tags", description: "Tags for New Order (Engraving, Scammer, etc.)", category: "extras", parent: "settings" },
  { key: "settings_shipping_note", label: "Shipping Note Template", description: "Reusable shipping note presets", category: "extras", parent: "settings" },
  { key: "settings_advance", label: "Advance Setting", description: "Required/optional order fields", category: "extras", parent: "settings" },
  { key: "settings_product_label", label: "Product / Price Label", description: "Barcode price labels for products", category: "extras", parent: "settings" },
  { key: "settings_security", label: "Security", description: "Password & sign-in security settings", category: "extras", parent: "settings" },
  { key: "billing_limits", label: "Billing and Limit", description: "Plan, payment and usage balances", category: "extras" },
  { key: "reports", label: "Reports", description: "Business reports", category: "extras" },
  { key: "customers", label: "Customer", description: "Customer database", category: "extras" },
  { key: "help_assistant", label: "Help Assistant Widget", description: "Floating help button", category: "extras" },
];

/** Features that act as parent menus (have at least one child). */
export const PARENT_FEATURE_KEYS: FeatureKey[] = Array.from(
  new Set(FEATURE_LIST.filter((f) => f.parent).map((f) => f.parent as FeatureKey))
);

export function getChildFeatures(parent: FeatureKey): FeatureDef[] {
  return FEATURE_LIST.filter((f) => f.parent === parent);
}

export function isParentFeature(key: FeatureKey): boolean {
  return PARENT_FEATURE_KEYS.includes(key);
}

/** Parent ON/OFF → all direct children match. */
export function applyParentCascade(
  flags: Record<FeatureKey, boolean>,
  parentKey: FeatureKey,
  on: boolean
): Record<FeatureKey, boolean> {
  const next = { ...flags, [parentKey]: on };
  for (const child of getChildFeatures(parentKey)) {
    next[child.key] = on;
  }
  return next;
}

/**
 * Apply parent → child cascade: any child whose parent is OFF is forced OFF.
 * Child's own stored flag is preserved, so re-enabling the parent restores it.
 */
export function cascadeFeatures(
  flags: Record<FeatureKey, boolean>
): Record<FeatureKey, boolean> {
  const out = { ...flags };
  for (const f of FEATURE_LIST) {
    if (f.parent && out[f.parent] === false) out[f.key] = false;
  }
  return out;
}

export const DEFAULT_FEATURES: Record<FeatureKey, boolean> = Object.fromEntries(
  FEATURE_LIST.map((f) => [f.key, true])
) as Record<FeatureKey, boolean>;

/** Merge stored flags with defaults; migrate legacy auto_call_center → integration split. */
export function normalizeStoredFeatures(raw: unknown): Record<FeatureKey, boolean> {
  const merged = { ...DEFAULT_FEATURES };
  if (!raw || typeof raw !== "object") return merged;
  const r = raw as Partial<Record<FeatureKey, boolean>>;
  Object.assign(merged, r);
  if (typeof r.auto_call_integration !== "boolean" && typeof r.auto_call_center === "boolean") {
    merged.auto_call_integration = r.auto_call_center;
  }
  return merged;
}

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
    ["/dashboard/integration/sms/auto", "sms"],
    ["/dashboard/integration/sms/templates", "sms"],
    ["/dashboard/integration/sms/log", "sms"],
    ["/dashboard/integration/sms", "sms"],
    ["/dashboard/integration/auto-call/setup", "auto_call_integration"],
    ["/dashboard/integration/auto-call/rules", "auto_call_integration"],
    ["/dashboard/integration/auto-call/report", "auto_call_integration"],
    ["/dashboard/integration/auto-call/logs", "auto_call_integration"],
    ["/dashboard/integration/auto-call", "auto_call_integration"],
    ["/dashboard/integration", "integrations"],
    ["/dashboard/orders/web/block-list", "order_block_list"],
    ["/dashboard/orders/web/manual", "manual_web_order"],
    ["/dashboard/orders/web/preorders", "preorders"],
    ["/dashboard/orders/web/auto-call-center/report", "auto_call_center"],
    ["/dashboard/orders/web/auto-call-center/logs", "auto_call_center"],
    ["/dashboard/orders/web/auto-call-center", "auto_call_center"],
    ["/dashboard/orders/web/view", "web_order_list"],
    ["/dashboard/orders/web", "web_order_list"],
    ["/dashboard/orders/approved/new", "new_order"],
    ["/dashboard/orders/approved/scan", "scan_update"],
    ["/dashboard/orders/approved/super-edit", "super_edit"],
    ["/dashboard/orders/approved/courier", "courier_management"],
    ["/dashboard/orders/approved/preorders", "preorder_list"],
    ["/dashboard/orders/approved/all", "all_orders"],
    ["/dashboard/orders/approved/list", "order_list"],
    ["/dashboard/orders/approved", "approved_orders"],
    ["/dashboard/orders/new", "new_order"],
    ["/dashboard/search", "search"],
    ["/dashboard/pos", "pos_sales"],
    ["/dashboard/inventory/products/new", "inv_add_product"],
    ["/dashboard/inventory/products", "inv_product_list"],
    ["/dashboard/inventory/categories", "inv_categories"],
    ["/dashboard/inventory/stock/decrease/new", "inv_stock_out_new"],
    ["/dashboard/inventory/stock/decrease", "inv_stock_out_list"],
    ["/dashboard/inventory/stock/increase/new", "inv_stock_in_new"],
    ["/dashboard/inventory/stock/increase/list", "inv_stock_in_list"],
    ["/dashboard/inventory/stock/increase", "inv_stock_in"],
    ["/dashboard/inventory/stock/transfer", "inv_transfer"],
    ["/dashboard/inventory/smart-restock", "inv_smart_restock"],
    ["/dashboard/inventory/dashboard", "inv_dashboard"],
    ["/dashboard/inventory", "inventory"],
    ["/dashboard/meta-ads", "meta_ads"],
    ["/dashboard/accounting/chart-of-accounts", "acct_chart"],
    ["/dashboard/accounting/expenses", "acct_expenses"],
    ["/dashboard/accounting/accounts", "acct_accounts"],
    ["/dashboard/accounting/transfers", "acct_transfer"],
    ["/dashboard/accounting/transactions", "acct_transactions"],
    ["/dashboard/accounting/assets", "acct_assets"],
    ["/dashboard/accounting/income", "acct_income"],
    ["/dashboard/accounting/liabilities", "acct_liabilities"],
    ["/dashboard/accounting/invoice", "acct_invoice"],
    ["/dashboard/accounting/payment", "acct_payment"],
    ["/dashboard/accounting", "accounting"],
    ["/dashboard/tasks", "tasks"],
    ["/dashboard/hrm", "hrm"],
    ["/dashboard/automation", "automation"],
    ["/dashboard/delivery/new", "delivery_add"],
    ["/dashboard/delivery", "delivery_list"],
    ["/dashboard/settings/users", "settings_users"],
    ["/dashboard/settings/business", "settings_business"],
    ["/dashboard/settings/invoice", "settings_invoice"],
    ["/dashboard/settings/sticker", "settings_sticker"],
    ["/dashboard/settings/order-source", "settings_order_source"],
    ["/dashboard/settings/order-tags", "settings_order_tags"],
    ["/dashboard/settings/shipping-note", "settings_shipping_note"],
    ["/dashboard/settings/advance", "settings_advance"],
    ["/dashboard/settings/product-label", "settings_product_label"],
    ["/dashboard/settings/security", "settings_security"],
    ["/dashboard/settings", "settings"],
    ["/dashboard/billing-limit", "billing_limits"],
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
