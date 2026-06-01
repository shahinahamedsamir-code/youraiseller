"use client";

import Link from "next/link";
import { useParams } from "next/navigation";
import { ArrowLeft } from "lucide-react";
import { PageHeader } from "@/components/ui/PageHeader";
import { WebOrderEditPage } from "@/components/web-orders/WebOrderEditPage";

export default function ViewWebOrderPage() {
  const params = useParams();
  const orderId = typeof params.orderId === "string" ? params.orderId : "";

  return (
    <div className="min-w-0 space-y-4">
      <PageHeader
        title={orderId ? `Web order · ${orderId}` : "Web order"}
        description="Tap products to add — same layout as New Order"
        actions={
          <Link
            href="/dashboard/orders/web"
            className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50"
          >
            <ArrowLeft className="h-4 w-4" />
            Web Order List
          </Link>
        }
      />
      {orderId ? (
        <WebOrderEditPage orderId={orderId} />
      ) : (
        <p className="text-sm text-slate-500">Invalid order link.</p>
      )}
    </div>
  );
}
