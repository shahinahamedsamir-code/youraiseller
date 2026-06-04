import type { LucideIcon } from "lucide-react";
import { BarChart3, List, Phone, Settings, Zap } from "lucide-react";

export const autoCallBasePath = "/dashboard/integration/auto-call";

export type AutoCallNavItem = {
  label: string;
  href: string;
  description: string;
  icon: LucideIcon;
};

export const autoCallNav: AutoCallNavItem[] = [
  {
    label: "Call Center",
    href: autoCallBasePath,
    description: "Select orders & start verification calls",
    icon: Phone,
  },
  {
    label: "Summary Report",
    href: `${autoCallBasePath}/report`,
    description: "Batch results & confirmation stats",
    icon: BarChart3,
  },
  {
    label: "Call Logs",
    href: `${autoCallBasePath}/logs`,
    description: "Every call, status & key press",
    icon: List,
  },
  {
    label: "Auto Rules",
    href: `${autoCallBasePath}/rules`,
    description: "When to call without manual action",
    icon: Zap,
  },
  {
    label: "Setup",
    href: `${autoCallBasePath}/setup`,
    description: "Voice messages, balance & preferences",
    icon: Settings,
  },
];
