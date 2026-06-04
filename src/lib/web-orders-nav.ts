import type { FeatureKey } from "./features";

export type WebOrderNavItem = {
  label: string;
  href: string;
  description: string;
  featureKey: FeatureKey;
};

export const webOrdersNav: WebOrderNavItem[] = [
  {
    label: "Web Order List",
    href: "/dashboard/orders/web",
    description: "View and manage all incoming web orders",
    featureKey: "web_order_list",
  },
  {
    label: "Auto Call Center",
    href: "/dashboard/integration/auto-call",
    description: "Automated order verification calls",
    featureKey: "auto_call_center",
  },
  {
    label: "Manual Web Order",
    href: "/dashboard/orders/web/manual",
    description: "Manually enter orders from other channels",
    featureKey: "manual_web_order",
  },
  {
    label: "Order Block List",
    href: "/dashboard/orders/web/block-list",
    description: "Blocked customers and fraud patterns",
    featureKey: "order_block_list",
  },
];

export const webOrdersBasePath = "/dashboard/orders/web";
