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
  { label: "Today's Sales", href: "/dashboard/pos/todays-sales", featureKey: posFeature },
  { label: "Cash Counter", href: "/dashboard/pos/cash-counter", featureKey: posFeature },
  { label: "POS Sale Screen", href: "/dashboard/pos/sale-screen", featureKey: posFeature },
  {
    label: "Product Search (Barcode / Name)",
    href: "/dashboard/pos/product-search",
    featureKey: posFeature,
  },
  { label: "Cart", href: "/dashboard/pos/cart", featureKey: posFeature },
  { label: "Discount", href: "/dashboard/pos/discount", featureKey: posFeature },
  {
    label: "Payment Method",
    featureKey: posFeature,
    expandPath: "/dashboard/pos/payment",
    children: [
      { label: "Cash", href: "/dashboard/pos/payment/cash", featureKey: posFeature },
      { label: "Bkash", href: "/dashboard/pos/payment/bkash", featureKey: posFeature },
      { label: "Nagad", href: "/dashboard/pos/payment/nagad", featureKey: posFeature },
      { label: "Card", href: "/dashboard/pos/payment/card", featureKey: posFeature },
      { label: "Bank", href: "/dashboard/pos/payment/bank", featureKey: posFeature },
    ],
  },
  { label: "Complete Sale", href: "/dashboard/pos/complete-sale", featureKey: posFeature },
];
