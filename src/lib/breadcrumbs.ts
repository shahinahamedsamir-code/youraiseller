const labels: Record<string, string> = {
  dashboard: "Dashboard",
  search: "Search",
  orders: "Orders",
  web: "Web Orders",
  approved: "Approved Orders",
  new: "New Order",
  inventory: "Inventory",
  products: "Products",
  categories: "Categories & Brands",
  stock: "Stock",
  decrease: "Decrease Stock",
  increase: "Increase Stock",
  transfer: "Transfer Stock",
  "smart-restock": "Smart Restock",
  list: "List",
  "meta-ads": "Meta Ads",
  accounting: "Accounting",
  "chart-of-accounts": "Chart Of Account",
  accounts: "Accounts",
  transfers: "Account Transfer",
  transactions: "Transaction",
  assets: "Assets",
  expenses: "Expenses",
  income: "Income",
  liabilities: "Liabilities",
  invoice: "Invoice",
  payment: "Payment",
  tasks: "Task & Follow-up",
  hrm: "HRM",
  automation: "Automation",
  delivery: "Delivery Methods",
  "auto-call-center": "Auto Call Center",
  "auto-call": "Auto Call",
  shopify: "Shopify Integration",
  courier: "Courier Integration",
  settings: "Setting",
  reports: "Reports",
  customers: "Customer",
  sms: "SMS Integration",
  auto: "Auto Send Message",
  templates: "SMS Template",
  log: "SMS Log",
  report: "Summary Report",
  logs: "Call Logs",
  rules: "Auto Rules",
  setup: "Setup",
  preorders: "Preorders",
  view: "View order",
  "sync-products": "Sync Products",
  woocommerce: "WooCommerce",
  "additional-sites": "Additional Sites",
  manual: "Manual Web Order",
  "block-list": "Order Block List",
};

export function getBreadcrumbs(pathname: string): { label: string; href: string }[] {
  if (pathname === "/dashboard") {
    return [{ label: "Dashboard", href: "/dashboard" }];
  }

  const segments = pathname.replace("/dashboard", "").split("/").filter(Boolean);
  const crumbs: { label: string; href: string }[] = [
    { label: "Dashboard", href: "/dashboard" },
  ];

  let path = "/dashboard";
  segments.forEach((seg) => {
    path += `/${seg}`;
    let label = labels[seg] ?? seg.replace(/-/g, " ");
    if (path === "/dashboard/inventory/dashboard") label = "Inventory Dashboard";
    if (seg === "new" && path.includes("/inventory/")) label = "New";
    if (seg === "new" && path.includes("/accounting/expenses")) label = "New Expense";
    crumbs.push({ label, href: path });
  });

  return crumbs;
}
