import type { Order, OrderStatus } from "@/lib/orders-store";

export type ReportTab =
  | "sales"
  | "courier"
  | "payment"
  | "staff"
  | "customers"
  | "web"
  | "approved_orders"
  | "preorder"
  | "orders"
  | "inventory"
  | "integrations"
  | "marketing"
  | "accounting";

export type ReportGroupId =
  | "profit-sales"
  | "order-report"
  | "product-report"
  | "employee-report"
  | "customer-report"
  | "meta-ads"
  | "business-finance";

export type ReportGroup = {
  id: ReportGroupId;
  label: string;
  description: string;
  tabs: { id: ReportTab; label: string }[];
};

export type DateRange = "all" | "today" | "week" | "month";

/** Sidebar groups (competitor-style). Internal tab ids stay the same for exports & data. */
export const REPORT_GROUPS: ReportGroup[] = [
  {
    id: "profit-sales",
    label: "Profit & Sales",
    description: "Revenue trends, order drill-down, and payment collection",
    tabs: [
      { id: "sales", label: "Sales" },
      { id: "payment", label: "Payment" },
    ],
  },
  {
    id: "order-report",
    label: "Order Report",
    description: "Approved, web, and preorder reports",
    tabs: [
      { id: "approved_orders", label: "Approved Order Report" },
      { id: "web", label: "Web Order Report" },
      { id: "preorder", label: "Preorder Report" },
    ],
  },
  {
    id: "product-report",
    label: "Product Report",
    description: "Stock health, valuation, and inventory movement",
    tabs: [{ id: "inventory", label: "Inventory" }],
  },
  {
    id: "employee-report",
    label: "Employee Report",
    description: "Staff revenue, deliveries, and team productivity",
    tabs: [{ id: "staff", label: "Staff" }],
  },
  {
    id: "customer-report",
    label: "Customer Report",
    description: "Active, repeat, and top customers by revenue",
    tabs: [{ id: "customers", label: "Customers" }],
  },
  {
    id: "meta-ads",
    label: "Meta Ads Report",
    description: "Ad spend, attributed revenue, and ROAS",
    tabs: [{ id: "marketing", label: "Marketing" }],
  },
  {
    id: "business-finance",
    label: "Business Finance",
    description: "P&L, accounting depth, and connected services",
    tabs: [
      { id: "accounting", label: "Accounting" },
      { id: "integrations", label: "Integrations" },
    ],
  },
];

export const REPORT_TABS: { id: ReportTab; label: string }[] = REPORT_GROUPS.flatMap(
  (g) => g.tabs
);

const TAB_SET = new Set<ReportTab>([
  ...REPORT_TABS.map((t) => t.id),
  "courier",
  "orders",
]);

export function reportTabFromId(value: string | null): ReportTab | null {
  if (!value) return null;
  if (value === "orders") return "approved_orders";
  return TAB_SET.has(value as ReportTab) ? (value as ReportTab) : null;
}

export function reportGroupForTab(tab: ReportTab): ReportGroup {
  return (
    REPORT_GROUPS.find((g) => g.tabs.some((t) => t.id === tab)) ?? REPORT_GROUPS[0]
  );
}

export function reportTabsForGroup(groupId: ReportGroupId): ReportTab[] {
  const group = REPORT_GROUPS.find((g) => g.id === groupId);
  return group ? group.tabs.map((t) => t.id) : [];
}

export const META_ORDER_SOURCES = new Set([
  "facebook",
  "instagram",
  "messenger",
  "tiktok",
]);

export const PIPELINE_STATUSES: OrderStatus[] = [
  "pending",
  "preorder",
  "rts",
  "shipped",
  "delivered",
  "partial",
  "returned",
  "pending_return",
];

export const CHANNEL_LABELS: Record<Order["source"], string> = {
  manual: "Panel / Manual",
  phone: "Phone",
  whatsapp: "WhatsApp",
  web: "Website",
};

export const PIE_COLORS = [
  "#4f46e5",
  "#06b6d4",
  "#10b981",
  "#f59e0b",
  "#ef4444",
  "#8b5cf6",
  "#14b8a6",
  "#f97316",
];

export type PeriodBounds = { from: Date; to: Date };
