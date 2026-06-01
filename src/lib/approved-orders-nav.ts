import type { FeatureKey } from "./features";

export const approvedOrdersBasePath = "/dashboard/orders/approved";

export type ApprovedOrderNavItem = {
  label: string;
  href: string;
  featureKey: FeatureKey;
};

export const approvedOrdersNav: ApprovedOrderNavItem[] = [
  { label: "New Order", href: "/dashboard/orders/approved/new", featureKey: "new_order" },
  { label: "Order List", href: "/dashboard/orders/approved/list", featureKey: "approved_orders" },
  { label: "All List", href: "/dashboard/orders/approved/all", featureKey: "approved_orders" },
  { label: "Courier Management", href: "/dashboard/orders/approved/courier", featureKey: "approved_orders" },
  { label: "Super Edit", href: "/dashboard/orders/approved/super-edit", featureKey: "approved_orders" },
  { label: "Preorder List", href: "/dashboard/orders/approved/preorders", featureKey: "approved_orders" },
  { label: "Scan To Update", href: "/dashboard/orders/approved/scan", featureKey: "approved_orders" },
];

export const COURIERS = ["Steadfast", "Pathao", "RedX", "Paperfly", "Ecourier", "SA Paribahan"] as const;

export const BD_DISTRICTS = [
  "Dhaka",
  "Chattogram",
  "Rajshahi",
  "Khulna",
  "Sylhet",
  "Rangpur",
  "Barishal",
  "Mymensingh",
  "Gazipur",
  "Narayanganj",
] as const;
