"use client";

import { ReportsView } from "@/components/reports/ReportsView";
import { useReportsData } from "@/hooks/useReportsData";

export function ReportsPageContent() {
  const data = useReportsData();
  return <ReportsView {...data} />;
}
