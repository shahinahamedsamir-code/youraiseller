import type { FeatureKey } from "./features";

export type IntegrationNavItem = {
  label: string;
  href: string;
  description: string;
  featureKey: FeatureKey;
};

export const integrationNav: IntegrationNavItem[] = [
  {
    label: "WooCommerce Integration",
    href: "/dashboard/integration/woocommerce",
    description: "Connect and sync WooCommerce store",
    featureKey: "woocommerce",
  },
  {
    label: "Shopify Integration",
    href: "/dashboard/integration/shopify",
    description: "Connect Shopify storefront",
    featureKey: "shopify_integration",
  },
  {
    label: "Courier Integration",
    href: "/dashboard/integration/courier",
    description: "API connect Steadfast, Pathao & more",
    featureKey: "courier_integration",
  },
  {
    label: "SMS Integration",
    href: "/dashboard/integration/sms",
    description: "Recharge, auto SMS & delivery log",
    featureKey: "sms",
  },
  {
    label: "Auto Call Integration",
    href: "/dashboard/integration/auto-call",
    description: "Automated IVR calls to verify web orders",
    featureKey: "auto_call_integration",
  },
  {
    label: "Additional Sites",
    href: "/dashboard/integration/additional-sites",
    description: "Manage multiple web storefronts",
    featureKey: "additional_sites",
  },
  {
    label: "Sync Products",
    href: "/dashboard/integration/sync-products",
    description: "Sync product catalog with connected stores",
    featureKey: "sync_products",
  },
];

export const integrationBasePath = "/dashboard/integration";
