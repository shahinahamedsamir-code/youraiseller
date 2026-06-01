import {
  LayoutDashboard,
  Search,
  CheckCircle2,
  Globe,
  Package,
  Megaphone,
  Calculator,
  ListTodo,
  Users,
  Zap,
  Truck,
  Plug,
  Settings,
  BarChart3,
  UserCircle,
  MessageSquare,
  type LucideIcon,
} from "lucide-react";
import type { FeatureKey } from "./features";
import { webOrdersNav, webOrdersBasePath } from "./web-orders-nav";
import { inventoryNav, inventoryBasePath } from "./inventory-nav";
import { approvedOrdersNav, approvedOrdersBasePath } from "./approved-orders-nav";
import { deliveryNav, deliveryBasePath } from "./delivery-nav";
import { integrationNav, integrationBasePath } from "./integration-nav";

export type NavChild = {
  label: string;
  href: string;
  featureKey: FeatureKey;
};

export type NavItem = {
  label: string;
  href?: string;
  icon: LucideIcon;
  badge?: string;
  featureKey: FeatureKey;
  expandPath?: string;
  children?: NavChild[];
};

export const mainNav: NavItem[] = [
  { label: "Dashboard", href: "/dashboard", icon: LayoutDashboard, featureKey: "dashboard" },
  { label: "Search", href: "/dashboard/search", icon: Search, featureKey: "search" },
  {
    label: "Approved Orders",
    icon: CheckCircle2,
    featureKey: "approved_orders",
    expandPath: approvedOrdersBasePath,
    children: approvedOrdersNav.map(({ label, href, featureKey }) => ({
      label,
      href,
      featureKey,
    })),
  },
  {
    label: "Web Orders",
    icon: Globe,
    badge: String(webOrdersNav.length),
    featureKey: "web_orders",
    expandPath: webOrdersBasePath,
    children: webOrdersNav.map(({ label, href, featureKey }) => ({
      label,
      href,
      featureKey,
    })),
  },
  {
    label: "Inventory",
    icon: Package,
    featureKey: "inventory",
    expandPath: inventoryBasePath,
    children: inventoryNav.map(({ label, href, featureKey }) => ({
      label,
      href,
      featureKey,
    })),
  },
  { label: "Meta Ads", href: "/dashboard/meta-ads", icon: Megaphone, featureKey: "meta_ads" },
  {
    label: "Accounting",
    href: "/dashboard/accounting",
    icon: Calculator,
    featureKey: "accounting",
  },
  { label: "Task & Follow-up", href: "/dashboard/tasks", icon: ListTodo, featureKey: "tasks" },
  { label: "HRM", href: "/dashboard/hrm", icon: Users, featureKey: "hrm" },
  { label: "Automation", href: "/dashboard/automation", icon: Zap, featureKey: "automation" },
  {
    label: "Delivery Methods",
    icon: Truck,
    featureKey: "delivery",
    expandPath: deliveryBasePath,
    children: deliveryNav.map(({ label, href, featureKey }) => ({
      label,
      href,
      featureKey,
    })),
  },
  {
    label: "Integration",
    icon: Plug,
    featureKey: "integrations",
    expandPath: integrationBasePath,
    children: integrationNav.map(({ label, href, featureKey }) => ({
      label,
      href,
      featureKey,
    })),
  },
  { label: "Setting", href: "/dashboard/settings", icon: Settings, featureKey: "settings" },
  { label: "Reports", href: "/dashboard/reports", icon: BarChart3, featureKey: "reports" },
  { label: "Customer", href: "/dashboard/customers", icon: UserCircle, featureKey: "customers" },
  { label: "SMS", href: "/dashboard/sms", icon: MessageSquare, featureKey: "sms" },
];

export const quickLinks = [
  { label: "Search", href: "/dashboard/search", featureKey: "search" as FeatureKey },
  { label: "NewOrder", href: "/dashboard/orders/approved/new", featureKey: "new_order" as FeatureKey },
  { label: "WebOrders", href: "/dashboard/orders/web", featureKey: "web_order_list" as FeatureKey },
  { label: "OrderList", href: "/dashboard/orders/web", featureKey: "web_order_list" as FeatureKey },
  { label: "Send Message", href: "/dashboard/sms", featureKey: "sms" as FeatureKey },
];
