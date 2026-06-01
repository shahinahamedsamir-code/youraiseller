"use client";

import Link from "next/link";
import { DeliveryMethodTable } from "@/components/delivery/DeliveryMethodTable";
import { Plus, Truck } from "lucide-react";

export default function DeliveryMethodListPage() {
  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="flex items-center gap-2 text-2xl font-extrabold text-slate-900">
            <Truck className="h-7 w-7 text-indigo-500" />
            Delivery Method List
          </h1>
          <p className="mt-0.5 text-sm text-slate-500">
            Methods added here appear as filters on Order List and in New Order
          </p>
        </div>
        <Link
          href="/dashboard/delivery/new"
          className="flex items-center gap-2 rounded-xl bg-teal-600 px-4 py-2.5 text-sm font-bold text-white shadow-md hover:bg-teal-700"
        >
          <Plus className="h-4 w-4" /> Add Method
        </Link>
      </div>
      <DeliveryMethodTable />
    </div>
  );
}
