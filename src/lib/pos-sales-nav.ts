import type { FeatureKey } from "./features";

export const posSalesBasePath = "/dashboard/pos";

export type PosSalesNavItem = {
  label: string;
  href?: string;
  featureKey: FeatureKey;
  expandPath?: string;
  children?: PosSalesNavItem[];
};

const posFeature: FeatureKey = "pos_sales";

export const posSalesNav: PosSalesNavItem[] = [
  { label: "New Sale", href: "/dashboard/pos/new-sale", featureKey: posFeature },
  { label: "Draft Sale", href: "/dashboard/pos/draft-sale", featureKey: posFeature },
  { label: "Return Sale", href: "/dashboard/pos/return-sale", featureKey: posFeature },
  { label: "Exchange Sale", href: "/dashboard/pos/exchange-sale", featureKey: posFeature },
  { label: "Today's Sales", href: "/dashboard/pos/todays-sales", featureKey: posFeature },
  {
    label: "Product Search",
    href: "/dashboard/pos/product-search",
    featureKey: posFeature,
  },
  { label: "Cash Register", href: "/dashboard/pos/cash-register", featureKey: posFeature },
  { label: "Complete Sale", href: "/dashboard/pos/complete-sale", featureKey: posFeature },
  { label: "Sales Report", href: "/dashboard/pos/sales-report", featureKey: posFeature },
];
