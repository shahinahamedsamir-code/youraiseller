"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { NewOrderForm } from "@/components/orders/NewOrderForm";

export default function EditApprovedOrderPage() {
  const params = useParams();
  const orderId = typeof params.orderId === "string" ? params.orderId : "";

  return (
    <div className="min-w-0 space-y-4">
      <PageHeader
        title={orderId ? `Edit order · ${orderId}` : "Edit order"}
        description="Same layout as New Order — tap products, totals, order source"
        actions={
          <Link
            href="/dashboard/orders/approved/list"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Order List
          </Link>
        }
      />
      {orderId ? (
        <NewOrderForm orderId={orderId} />
      ) : (
        <p className="text-sm text-slate-500">Invalid order link.</p>
      )}
    </div>
  );
}
