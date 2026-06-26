"use client";

import { Suspense } from "react";
import { DeliveryMethodForm } from "@/components/delivery/DeliveryMethodForm";

export default function AddDeliveryMethodPage() {
  return (
    <div>
      <Suspense fallback={<p className="text-sm text-slate-500">Loading...</p>}>
        <DeliveryMethodForm />
      </Suspense>
    </div>
  );
}
