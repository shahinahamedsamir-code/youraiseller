import type { FeatureKey } from "./features";

export const deliveryBasePath = "/dashboard/delivery";

export type DeliveryNavItem = {
  label: string;
  href: string;
  featureKey: FeatureKey;
};

export const deliveryNav: DeliveryNavItem[] = [
  {
    label: "Delivery Method List",
    href: "/dashboard/delivery",
    featureKey: "delivery",
  },
  {
    label: "Add Method",
    href: "/dashboard/delivery/new",
    featureKey: "delivery",
  },
];
