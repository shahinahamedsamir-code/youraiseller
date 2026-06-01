"use client";

import { useRouter } from "next/navigation";
import { PageHeader } from "@/components/ui/PageHeader";
import { WebOrderTable } from "@/components/web-orders/WebOrderTable";
import { Download, Plus } from "lucide-react";

export default function WebOrderListPage() {
  const router = useRouter();

  return (
    <div className="min-w-0">
      <PageHeader
        title="Web Order List"
        description="All incoming orders from your website and connected channels"
        actions={
          <>
            <button
              type="button"
              className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium text-slate-700 shadow-sm hover:bg-slate-50"
            >
              <Download className="h-4 w-4" />
              Export
            </button>
            <button
              type="button"
              onClick={() => router.push("/dashboard/orders/web/manual")}
              className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-teal-500 to-emerald-500 px-4 py-2 text-sm font-semibold text-white shadow-md"
            >
              <Plus className="h-4 w-4" />
              New Order
            </button>
          </>
        }
      />

      <WebOrderTable />
    </div>
  );
}
