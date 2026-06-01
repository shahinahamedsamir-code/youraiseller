"use client";

import Link from "next/link";
import { PageHeader } from "@/components/ui/PageHeader";
import { ArrowRight, PackagePlus } from "lucide-react";

const links = [
  { label: "New Increase Stock", href: "/dashboard/inventory/stock/increase/new" },
  { label: "Increase Stock List", href: "/dashboard/inventory/stock/increase/list" },
];

export default function StockIncreaseHubPage() {
  return (
    <div>
      <PageHeader title="Stock Increase" description="Add stock to your inventory" />
      <div className="grid gap-4 sm:grid-cols-2">
        {links.map((l) => (
          <Link
            key={l.href}
            href={l.href}
            className="glass-card flex items-center justify-between rounded-2xl p-6 transition hover:ring-2 hover:ring-teal-200"
          >
            <span className="flex items-center gap-3 font-semibold text-slate-800">
              <PackagePlus className="h-5 w-5 text-teal-500" />
              {l.label}
            </span>
            <ArrowRight className="h-5 w-5 text-slate-400" />
          </Link>
        ))}
      </div>
    </div>
  );
}
