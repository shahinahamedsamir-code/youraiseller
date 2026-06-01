"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { StockMovementForm } from "@/components/inventory/StockMovementForm";
import { List } from "lucide-react";

export default function NewDecreaseStockPage() {
  return (
    <div>
      <PageHeader
        title="New Decrease Stock"
        description="Reduce stock for sales, damage, or adjustments"
        actions={
          <Link
            href="/dashboard/inventory/stock/decrease"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <List className="h-4 w-4" /> Decrease List
          </Link>
        }
      />
      <StockMovementForm mode="decrease" />
    </div>
  );
}
