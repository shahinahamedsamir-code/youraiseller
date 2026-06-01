"use client";

import { InventoryDashboardPanel } from "@/components/inventory/InventoryDashboardPanel";

export default function InventoryDashboardPage() {
  return (
    <div>
      <div className="mb-6 flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Inventory Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            Monitor stock health and movements across your inventory
          </p>
        </div>
      </div>
      <InventoryDashboardPanel />
    </div>
  );
}
