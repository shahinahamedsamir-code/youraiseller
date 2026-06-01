"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { BarChart3, Users, Package, Globe, Download } from "lucide-react";
import Link from "next/link";

const reports = [
  { icon: BarChart3, title: "Sales Report", href: "#", desc: "Daily, weekly, monthly sales" },
  { icon: Users, title: "Employee Report", href: "#", desc: "Staff order performance" },
  { icon: Package, title: "Product Report", href: "#", desc: "Top sellers and stock" },
  { icon: Globe, title: "Web Order Report", href: "/dashboard", desc: "Web order analytics" },
];

export default function ReportsPage() {
  return (
    <div>
      <PageHeader
        title="Reports"
        description="Business intelligence and exportable reports"
        actions={
          <button
            type="button"
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium shadow-sm"
          >
            <Download className="h-4 w-4" /> Export All
          </button>
        }
      />
      <div className="grid gap-4 sm:grid-cols-2">
        {reports.map((r) => (
          <Link
            key={r.title}
            href={r.href}
            className="glass-card flex items-start gap-4 rounded-2xl p-5 transition hover:shadow-md"
          >
            <div className="flex h-12 w-12 items-center justify-center rounded-xl bg-teal-100 text-teal-600">
              <r.icon className="h-6 w-6" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">{r.title}</h3>
              <p className="text-sm text-slate-500">{r.desc}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
