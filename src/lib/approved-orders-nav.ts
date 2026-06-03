import type { FeatureKey } from "./features";

export const approvedOrdersBasePath = "/dashboard/orders/approved";

export type ApprovedOrderNavItem = {
  label: string;
  href: string;
  featureKey: FeatureKey;
};

export const approvedOrdersNav: ApprovedOrderNavItem[] = [
  { label: "New Order", href: "/dashboard/orders/approved/new", featureKey: "new_order" },
  { label: "Order List", href: "/dashboard/orders/approved/list", featureKey: "order_list" },
  { label: "All List", href: "/dashboard/orders/approved/all", featureKey: "all_orders" },
  { label: "Courier Management", href: "/dashboard/orders/approved/courier", featureKey: "courier_management" },
  { label: "Super Edit", href: "/dashboard/orders/approved/super-edit", featureKey: "super_edit" },
  { label: "Preorder List", href: "/dashboard/orders/approved/preorders", featureKey: "preorder_list" },
  { label: "Scan To Update", href: "/dashboard/orders/approved/scan", featureKey: "scan_update" },
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
