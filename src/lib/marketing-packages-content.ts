import type { LucideIcon } from "lucide-react";
import { Crown, Rocket, Sparkles } from "lucide-react";

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
  highlights: string[];
};

export const MARKETING_PACKAGES: MarketingPackage[] = [
  {
    id: "basic",
    name: "Starter",
    tagline: "New shop — orders, web list & basic inventory",
    price: "৳1,999",
    period: "/month",
    icon: Sparkles,
    accent: "from-slate-500 to-slate-700",
    ring: "ring-slate-500/25",
    glow: "shadow-slate-900/40",
    cta: "Start with Starter",
    highlights: [
      "Dashboard & order management",
      "Web orders & manual entry",
      "Product list & stock in/out",
      "SMS balance & notifications",
      "Delivery methods & shipping note",
      "Team users & business settings",
      "Reports & customer list",
    ],
  },
  {
    id: "pro",
    name: "Growth",
    tagline: "Scaling brand — WooCommerce, Auto Call & integrations",
    price: "৳4,999",
    period: "/month",
    icon: Rocket,
    popular: true,
    accent: "from-violet-500 via-indigo-500 to-cyan-500",
    ring: "ring-violet-400/40",
    glow: "shadow-violet-500/30",
    cta: "Choose Growth",
    highlights: [
      "Everything in Starter",
      "WooCommerce product & order sync",
      "Auto Call Center & voice campaigns",
      "Steadfast & courier integrations",
      "Smart restock & inventory dashboard",
      "Shopify integration",
      "Super edit & preorder workflows",
    ],
  },
  {
    id: "enterprise",
    name: "Business",
    tagline: "Full power — every module, founder view & automation",
    price: "৳9,999",
    period: "/month",
    icon: Crown,
    accent: "from-amber-400 via-orange-500 to-rose-500",
    ring: "ring-amber-400/35",
    glow: "shadow-amber-500/20",
    cta: "Go Business",
    highlights: [
      "Everything in Growth",
      "Founder dashboard & profit view",
      "Meta ads & marketing tools",
      "HRM, tasks & team workflows",
      "Accounting module",
      "Automation rules",
      "Additional sites & all premium modules",
    ],
  },
];

export const MARKETING_PACKAGE_FAQ = [
  {
    q: "Can I change my package later?",
    a: "Yes. Upgrade or downgrade anytime from your account settings. Your team keeps the same login — only enabled modules change with the plan.",
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
