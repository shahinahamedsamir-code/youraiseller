import type { FeatureKey } from "./features";
import {
  REPORT_GROUPS,
  reportTabFromId,
  type ReportTab,
} from "./reports/report-types";

export const reportsBasePath = "/dashboard/reports";

export type ReportsNavItem = {
  label: string;
  href: string;
  featureKey: FeatureKey;
  matchTabs: ReportTab[];
};

export const reportsNav: ReportsNavItem[] = REPORT_GROUPS.map((group) => ({
  label: group.label,
  href: `${reportsBasePath}?tab=${group.tabs[0].id}`,
  featureKey: "reports",
  matchTabs: group.tabs.map((t) => t.id),
}));

export function reportTabFromSearchParam(value: string | null): ReportTab | null {
  if (value === "orders") return "approved_orders";
  return reportTabFromId(value);
}
