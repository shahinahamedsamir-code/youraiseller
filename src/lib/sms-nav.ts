import type { LucideIcon } from "lucide-react";
import { History, Send, Zap } from "lucide-react";

export const smsIntegrationBasePath = "/dashboard/integration/sms";

export type SmsNavItem = {
  label: string;
  href: string;
  description: string;
  icon: LucideIcon;
};

export const smsNav: SmsNavItem[] = [
  {
    label: "Send SMS",
    href: "/dashboard/integration/sms",
    description: "Quick send & templates",
    icon: Send,
  },
  {
    label: "Auto Send Message",
    href: "/dashboard/integration/sms/auto",
    description: "Order status triggers",
    icon: Zap,
  },
  {
    label: "SMS Log",
    href: "/dashboard/integration/sms/log",
    description: "Delivery history",
    icon: History,
  },
];
