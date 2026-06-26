"use client";

import Link from "next/link";
import { DeliveryMethodTable } from "@/components/delivery/DeliveryMethodTable";
import { Plus, Route, Truck } from "lucide-react";

export default function DeliveryMethodListPage() {
  return (
    <div className="space-y-5">
      <div className="overflow-hidden rounded-2xl border border-indigo-100 bg-white shadow-sm">
        <div className="flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div className="flex items-start gap-4">
            <span className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-indigo-600 text-white shadow-md shadow-indigo-200">
              <Truck className="h-6 w-6" />
            </span>
            <div>
              <p className="mb-1 flex items-center gap-1.5 text-xs font-extrabold uppercase text-indigo-500">
                <Route className="h-3.5 w-3.5" />
                Courier routing
              </p>
              <h1 className="text-2xl font-extrabold text-slate-950">
                Delivery Method List
              </h1>
              <p className="mt-1 max-w-2xl text-sm leading-6 text-slate-500">
                Manage courier APIs and manual delivery methods used by New Order,
                Order List filters, and Courier Management.
              </p>
            </div>
          </div>
          <Link
            href="/dashboard/delivery/new"
            className="inline-flex h-11 items-center justify-center gap-2 rounded-xl bg-teal-600 px-5 text-sm font-extrabold text-white shadow-md shadow-teal-100 transition hover:bg-teal-700"
          >
            <Plus className="h-4 w-4" />
            Add Method
          </Link>
        </div>
      </div>
      <DeliveryMethodTable />
    </div>
  );
}
