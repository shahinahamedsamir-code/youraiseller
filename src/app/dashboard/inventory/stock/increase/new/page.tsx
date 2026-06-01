"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { StockMovementForm } from "@/components/inventory/StockMovementForm";

export default function NewIncreaseStockPage() {
  return (
    <div>
      <PageHeader title="New Increase Stock" description="Add purchased or returned stock" />
      <StockMovementForm mode="increase" />
    </div>
  );
}
