"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Megaphone, TrendingUp, MousePointer, DollarSign } from "lucide-react";

const campaigns = [
  { name: "Summer Sale 2026", spend: 12500, clicks: 3420, roas: 3.2, status: "active" },
  { name: "Retargeting — Cart", spend: 4800, clicks: 1890, roas: 4.1, status: "active" },
  { name: "New Product Launch", spend: 8200, clicks: 2100, roas: 2.4, status: "paused" },
];

export default function MetaAdsPage() {
  return (
    <div>
      <PageHeader
        title="Meta Ads"
        description="Facebook & Instagram ad campaigns performance"
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        {[
          { label: "Total Spend", value: "৳25,500", icon: DollarSign },
          { label: "Total Clicks", value: "7,410", icon: MousePointer },
          { label: "Avg ROAS", value: "3.2x", icon: TrendingUp },
        ].map((s) => (
          <div key={s.label} className="glass-card rounded-2xl p-5">
            <s.icon className="mb-2 h-6 w-6 text-[#1877F2]" />
            <p className="text-sm text-slate-500">{s.label}</p>
            <p className="text-2xl font-bold">{s.value}</p>
          </div>
        ))}
      </div>
      <div className="space-y-3">
        {campaigns.map((c) => (
          <div
            key={c.name}
            className="glass-card flex flex-wrap items-center justify-between gap-4 rounded-2xl p-5"
          >
            <div className="flex items-center gap-3">
              <Megaphone className="h-5 w-5 text-[#1877F2]" />
              <div>
                <p className="font-bold text-slate-800">{c.name}</p>
                <p className="text-xs text-slate-500">
                  Spend ৳{c.spend.toLocaleString()} · {c.clicks} clicks · ROAS {c.roas}x
                </p>
              </div>
            </div>
            <span
              className={`rounded-full px-3 py-0.5 text-xs font-semibold capitalize ${
                c.status === "active"
                  ? "bg-green-100 text-green-800"
                  : "bg-slate-100 text-slate-600"
              }`}
            >
              {c.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
