import type { LucideIcon } from "lucide-react";
import { BarChart3, List, Phone, Settings, Zap } from "lucide-react";

export const autoCallIntegrationBasePath = "/dashboard/integration/auto-call";
export const autoCallCenterBasePath = "/dashboard/orders/web/auto-call-center";

/** @deprecated use autoCallIntegrationBasePath */
export const autoCallBasePath = autoCallIntegrationBasePath;

export type AutoCallNavItem = {
  label: string;
  href: string;
  description: string;
  icon: LucideIcon;
};

const integrationOnly: AutoCallNavItem[] = [
  {
    label: "Auto Rules",
    href: `${autoCallIntegrationBasePath}/rules`,
    description: "When to call without manual action",
    icon: Zap,
  },
  {
    label: "Setup",
    href: `${autoCallIntegrationBasePath}/setup`,
    description: "Voice messages, balance & preferences",
    icon: Settings,
  },
];

const sharedTabs = (basePath: string): AutoCallNavItem[] => [
  {
    label: "Call Center",
    href: basePath,
    description: "Select orders & start verification calls",
    icon: Phone,
  },
  {
    label: "Summary Report",
    href: `${basePath}/report`,
    description: "Batch results & confirmation stats",
    icon: BarChart3,
  },
  {
    label: "Call Logs",
    href: `${basePath}/logs`,
    description: "Every call, status & key press",
    icon: List,
  },
];

/** Web Orders → Auto Call Center (operations only) */
export const autoCallCenterNav: AutoCallNavItem[] = sharedTabs(autoCallCenterBasePath);

/** Integration → full auto call admin */
export const autoCallIntegrationNav: AutoCallNavItem[] = [
  ...sharedTabs(autoCallIntegrationBasePath),
  ...integrationOnly,
];

/** @deprecated use autoCallIntegrationNav */
export const autoCallNav = autoCallIntegrationNav;

export function getAutoCallNav(variant: "center" | "integration"): AutoCallNavItem[] {
  return variant === "center" ? autoCallCenterNav : autoCallIntegrationNav;
}

export function getAutoCallBasePath(variant: "center" | "integration"): string {
  return variant === "center" ? autoCallCenterBasePath : autoCallIntegrationBasePath;
}
