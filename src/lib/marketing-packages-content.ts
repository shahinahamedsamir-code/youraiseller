import type { LucideIcon } from "lucide-react";
import { Building2, Crown, Rocket, Sparkles } from "lucide-react";
import type { FeatureKey } from "./features";

export type MarketingPackage = {
  id: string;
  name: string;
  tagline: string;
  price: string;
  period: string;
  icon: LucideIcon;
  popular?: boolean;
  accent: string;
  ring: string;
  glow: string;
  cta: string;
  highlights: Array<{
    label: string;
    featureKey?: FeatureKey;
  }>;
};

export const MARKETING_PACKAGES: MarketingPackage[] = [
  {
    id: "basic",
    name: "Starter",
    tagline: "New shop - orders, web list & basic inventory",
    price: "৳999",
    period: "/month",
    icon: Sparkles,
    accent: "from-slate-500 to-slate-700",
    ring: "ring-slate-500/25",
    glow: "shadow-slate-900/40",
    cta: "Start with Starter",
    highlights: [
      { label: "Dashboard", featureKey: "dashboard" },
      { label: "Web Order List", featureKey: "web_order_list" },
      { label: "Product List", featureKey: "inv_product_list" },
      { label: "SMS Integration", featureKey: "sms" },
      { label: "WooCommerce Integration" },
      { label: "Delivery Methods", featureKey: "delivery" },
      { label: "Reports", featureKey: "reports" },
    ],
  },
  {
    id: "pro",
    name: "Growth",
    tagline: "Scaling brand - WooCommerce, Auto Call & integrations",
    price: "৳1,999",
    period: "/month",
    icon: Rocket,
    popular: true,
    accent: "from-violet-500 via-indigo-500 to-cyan-500",
    ring: "ring-violet-400/40",
    glow: "shadow-violet-500/30",
    cta: "Choose Growth",
    highlights: [
      { label: "Everything in Starter" },
      { label: "WooCommerce Integration", featureKey: "woocommerce" },
      { label: "Shopify Integration", featureKey: "shopify_integration" },
      { label: "Auto Call Center", featureKey: "auto_call_center" },
      { label: "Courier Integration", featureKey: "courier_integration" },
      { label: "Smart Restock", featureKey: "inv_smart_restock" },
      { label: "Super Edit", featureKey: "super_edit" },
    ],
  },
  {
    id: "enterprise",
    name: "Business",
    tagline: "Full power - every module, founder view & automation",
    price: "৳4,999",
    period: "/month",
    icon: Crown,
    accent: "from-amber-400 via-orange-500 to-rose-500",
    ring: "ring-amber-400/35",
    glow: "shadow-amber-500/20",
    cta: "Go Business",
    highlights: [
      { label: "Everything in Growth" },
      { label: "Founder Dashboard", featureKey: "founder_dashboard" },
      { label: "Meta Ads", featureKey: "meta_ads" },
      { label: "HRM", featureKey: "hrm" },
      { label: "Accounting", featureKey: "accounting" },
      { label: "Automation", featureKey: "automation" },
      { label: "Additional Sites", featureKey: "additional_sites" },
    ],
  },
  {
    id: "ultimate",
    name: "Enterprise",
    tagline: "Custom scale - white label, API access & premium support",
    price: "Custom",
    period: "pricing",
    icon: Building2,
    accent: "from-emerald-400 via-cyan-500 to-blue-500",
    ring: "ring-emerald-400/35",
    glow: "shadow-cyan-500/20",
    cta: "Talk to sales",
    highlights: [
      { label: "Everything in Business" },
      { label: "White Label" },
      { label: "Custom API" },
      { label: "Priority support" },
      { label: "Multi-brand support", featureKey: "additional_sites" },
      { label: "Advanced automation", featureKey: "automation" },
    ],
  },
];

export const MARKETING_PACKAGE_FAQ = [
  {
    q: "Can I change my package later?",
    a: "Yes. Upgrade or downgrade anytime from your account settings. Your team keeps the same login - only enabled modules change with the plan.",
  },
  {
    q: "Is Auto Call or SMS included in the price?",
    a: "Plans unlock the modules. Auto Call and SMS use separate wallet balance (pay-as-you-go credits) at transparent BDT rates inside the app.",
  },
  {
    q: "Do you offer a free trial?",
    a: "Open the app and sign in to explore the panel. Contact us if you need a guided demo or custom onboarding for larger teams.",
  },
] as const;
