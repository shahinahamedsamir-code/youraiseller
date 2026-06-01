"use client";

import { Suspense } from "react";
import { DeliveryMethodForm } from "@/components/delivery/DeliveryMethodForm";

export default function AddDeliveryMethodPage() {
  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-extrabold text-slate-900">
          Add New Delivery Method
        </h1>
        <p className="text-sm text-slate-500">
          Choose <strong>STEADFAST</strong> for API keys, shipping note &amp; auto
          consignment from Courier Management
        </p>
      </div>
      <Suspense fallback={<p className="text-sm text-slate-500">Loading…</p>}>
        <DeliveryMethodForm />
      </Suspense>
    </div>
  );
}
