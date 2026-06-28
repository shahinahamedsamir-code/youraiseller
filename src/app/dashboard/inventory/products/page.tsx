"use client";

import Link from "next/link";
import { ProductTable } from "@/components/inventory/ProductTable";
import { InventorySyncProductsButton } from "@/components/inventory/InventorySyncProductsButton";
import { InventoryPushStockButton } from "@/components/inventory/InventoryPushStockButton";
import { Plus, Package } from "lucide-react";
import { useFeatures } from "@/context/FeatureContext";

export default function ProductListPage() {
  const { isEnabled } = useFeatures();

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-slate-900">
            <Package className="h-7 w-7 text-indigo-500" />
            Product List
          </h1>
        </div>
        <div className="flex flex-wrap items-start gap-2">
          {isEnabled("sync_products") ? <InventorySyncProductsButton /> : null}
          {isEnabled("sync_products") ? <InventoryPushStockButton /> : null}
          <Link
            href="/dashboard/inventory/products/new"
            className="flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 text-sm font-bold text-white shadow-md shadow-indigo-200 hover:bg-indigo-700"
          >
            <Plus className="h-4 w-4" /> Add New Product
          </Link>
        </div>
      </div>
      <ProductTable />
    </div>
  );
}
