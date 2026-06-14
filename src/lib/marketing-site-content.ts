import type { LucideIcon } from "lucide-react";
import {
  BarChart3,
  Boxes,
  Calculator,
  CheckCircle2,
  Globe,
  LayoutDashboard,
  Megaphone,
  MessageSquare,
  Package,
  PhoneCall,
  Plug,
  ScanLine,
  Settings,
  Shield,
  ShoppingCart,
  Sparkles,
  Truck,
  Users,
  Zap,
} from "lucide-react";

export type MarketingFeature = {
  title: string;
  description: string;
  icon: LucideIcon;
  accent: string;
};

export type MarketingFeatureGroup = {
  id: string;
  label: string;
  headline: string;
  blurb: string;
  icon: LucideIcon;
  features: MarketingFeature[];
};

export const MARKETING_HERO_STATS = [
  { value: "50+", label: "Seller tools in one place" },
  { value: "24/7", label: "Web order sync & alerts" },
  { value: "BD", label: "Built for local couriers & payments" },
] as const;

export const MARKETING_STEPS = [
  {
    step: "01",
    title: "Connect your store",
    body: "Link WooCommerce or Shopify, set courier APIs, and invite your team in minutes.",
  },
  {
    step: "02",
    title: "Verify & approve orders",
    body: "Use auto call, SMS, and smart web queues to confirm real buyers before shipping.",
  },
  {
    step: "03",
    title: "Ship, track & grow",
    body: "Push to Steadfast, Pathao or Carrybee, manage stock, and read profit in one dashboard.",
  },
] as const;

export const MARKETING_FEATURE_GROUPS: MarketingFeatureGroup[] = [
  {
    id: "orders",
    label: "Order operations",
    headline: "Every approved order, from desk to doorstep",
    blurb:
      "Phone, WhatsApp, web and manual orders - create, edit, bulk-update and ship without switching tabs.",
    icon: ShoppingCart,
    features: [
      {
        title: "New order & order list",
        description: "Fast entry for call-center staff with invoice, tags, advance payment and attachments.",
        icon: CheckCircle2,
        accent: "from-emerald-500 to-teal-600",
      },
      {
        title: "All orders & super edit",
        description: "See every status in one place. Bulk edit fields, tags and courier data at scale.",
        icon: LayoutDashboard,
        accent: "from-violet-500 to-indigo-600",
      },
      {
        title: "Courier management",
        description: "Send consignments, read live status, rider info and webhook updates from Steadfast & more.",
        icon: Truck,
        accent: "from-sky-500 to-cyan-600",
      },
      {
        title: "Scan to update",
        description: "Barcode scan workflow for warehouse - update order status in seconds on the floor.",
        icon: ScanLine,
        accent: "from-amber-500 to-orange-600",
      },
      {
        title: "Preorders",
        description: "Hold, notify and release stock when items arrive - never lose a paid preorder again.",
        icon: Package,
        accent: "from-pink-500 to-rose-600",
      },
      {
        title: "Global search",
        description: "Find any order by phone, invoice, tracking ID or customer name instantly.",
        icon: Sparkles,
        accent: "from-fuchsia-500 to-purple-600",
      },
    ],
  },
  {
    id: "web",
    label: "Web orders",
    headline: "WooCommerce & web queue - verify before you pack",
    blurb:
      "Import web orders, auto-call customers, send SMS, and promote only confirmed orders to approved.",
    icon: Globe,
    features: [
      {
        title: "Web order list",
        description: "Unified inbox for WooCommerce and other web channels with staff-controlled status.",
        icon: Globe,
        accent: "from-cyan-500 to-blue-600",
      },
      {
        title: "Auto call center",
        description: "IVR calls ask customers to press 1 to confirm or 2 to cancel - with retry rules.",
        icon: PhoneCall,
        accent: "from-violet-500 to-indigo-600",
      },
      {
        title: "Auto call integration",
        description: "Voice library, DTMF actions, call logs, wallet balance and business-hours scheduling.",
        icon: PhoneCall,
        accent: "from-purple-500 to-violet-600",
      },
      {
        title: "SMS integration",
        description: "Manual send, quick templates, auto rules on order events, logs and bKash recharge.",
        icon: MessageSquare,
        accent: "from-teal-500 to-emerald-600",
      },
      {
        title: "Order block list",
        description: "Block repeat fraud numbers and risky buyers before they clog your pipeline.",
        icon: Shield,
        accent: "from-red-500 to-rose-600",
      },
      {
        title: "Manual web order",
        description: "Add web-style orders by hand when chat or phone orders need the same workflow.",
        icon: ShoppingCart,
        accent: "from-indigo-500 to-blue-600",
      },
    ],
  },
  {
    id: "inventory",
    label: "Inventory",
    headline: "Stock you can trust in every warehouse",
    blurb:
      "Products, categories, stock movements, transfers and smart restock hints for growing catalogs.",
    icon: Boxes,
    features: [
      {
        title: "Product catalog",
        description: "SKUs, variants, images, brands and categories with live stock on each line.",
        icon: Package,
        accent: "from-blue-500 to-indigo-600",
      },
      {
        title: "Stock in & stock out",
        description: "Record purchases, damages and adjustments with full movement history.",
        icon: Boxes,
        accent: "from-emerald-500 to-green-600",
      },
      {
        title: "Transfer stock",
        description: "Move quantity between locations or bins without breaking order reservations.",
        icon: Truck,
        accent: "from-amber-500 to-yellow-600",
      },
      {
        title: "Smart restock",
        description: "See what is running low based on sales velocity - restock before you miss orders.",
        icon: Sparkles,
        accent: "from-violet-500 to-purple-600",
      },
      {
        title: "Inventory dashboard",
        description: "KPI cards for value on hand, fast movers and out-of-stock alerts.",
        icon: BarChart3,
        accent: "from-cyan-500 to-teal-600",
      },
    ],
  },
  {
    id: "integrations",
    label: "Integrations",
    headline: "Plug in the channels you already sell on",
    blurb:
      "WooCommerce, Shopify, courier, SMS and voice - configured once, synced continuously.",
    icon: Plug,
    features: [
      {
        title: "WooCommerce",
        description: "Connect store URL and keys - first sync imports recent orders only, then incremental sync.",
        icon: Plug,
        accent: "from-purple-500 to-violet-600",
      },
      {
        title: "Shopify",
        description: "Bring Shopify orders and catalog into the same web queue and inventory rules.",
        icon: Globe,
        accent: "from-lime-500 to-green-600",
      },
      {
        title: "Courier APIs",
        description: "Steadfast, Pathao, Carrybee and more - balance check, booking and status webhooks.",
        icon: Truck,
        accent: "from-sky-500 to-blue-600",
      },
      {
        title: "Additional sites",
        description: "Run multiple storefronts or landing pages under one seller account.",
        icon: Globe,
        accent: "from-indigo-500 to-blue-600",
      },
      {
        title: "Sync products",
        description: "Keep WooCommerce stock aligned when panel inventory changes.",
        icon: Package,
        accent: "from-teal-500 to-cyan-600",
      },
    ],
  },
  {
    id: "business",
    label: "Grow the business",
    headline: "Beyond orders - run the whole company",
    blurb:
      "Accounting, ads, tasks, HR, automation and reports for founders who want the full picture.",
    icon: BarChart3,
    features: [
      {
        title: "Dashboard & founder view",
        description: "Daily KPIs plus a founder tab for revenue, margin and trend lines.",
        icon: LayoutDashboard,
        accent: "from-violet-500 to-indigo-600",
      },
      {
        title: "Accounting",
        description: "Track income, expenses and profit alongside real order data.",
        icon: Calculator,
        accent: "from-emerald-500 to-teal-600",
      },
      {
        title: "Reports & customers",
        description: "Export insights and maintain a searchable customer database.",
        icon: BarChart3,
        accent: "from-blue-500 to-cyan-600",
      },
      {
        title: "Meta ads",
        description: "Monitor Facebook and Instagram ad performance next to your order flow.",
        icon: Megaphone,
        accent: "from-pink-500 to-rose-600",
      },
      {
        title: "Tasks & HRM",
        description: "Assign follow-ups to staff and manage team roles in one workspace.",
        icon: Users,
        accent: "from-amber-500 to-orange-600",
      },
      {
        title: "Automation",
        description: "Rules for SMS, calls and status changes - less manual work every day.",
        icon: Zap,
        accent: "from-yellow-500 to-amber-600",
      },
    ],
  },
  {
    id: "settings",
    label: "Settings & branding",
    headline: "Your brand, your rules, your team",
    blurb:
      "Invoice templates, stickers, shipping notes, order sources and multi-user access control.",
    icon: Settings,
    features: [
      {
        title: "Team & roles",
        description: "Add staff with plan-based feature access - call center, warehouse or admin.",
        icon: Users,
        accent: "from-indigo-500 to-violet-600",
      },
      {
        title: "Business profile",
        description: "Logo, address, invoice prefix and storefront identity on every printout.",
        icon: Settings,
        accent: "from-slate-500 to-slate-700",
      },
      {
        title: "Invoice & sticker",
        description: "Pick paper layouts and parcel sticker sizes that match your courier.",
        icon: Package,
        accent: "from-teal-500 to-emerald-600",
      },
      {
        title: "Order sources & tags",
        description: "Facebook, website, phone - tag orders for reporting and fraud flags.",
        icon: Sparkles,
        accent: "from-fuchsia-500 to-pink-600",
      },
      {
        title: "Delivery methods",
        description: "Configure inside-city, outside-city and custom shipping rules per channel.",
        icon: Truck,
        accent: "from-cyan-500 to-blue-600",
      },
    ],
  },
];
