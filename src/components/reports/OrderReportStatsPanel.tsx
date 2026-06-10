"use client";

import { CheckCircle2, Clock, Globe, Package, Timer, Truck } from "lucide-react";
import { formatBdt } from "@/lib/accounting-store";
import type { OrderAllReport } from "@/lib/reports/order-report-analytics";

type PreorderStats = {
  total: number;
  open: number;
  overdue: number;
  dueSoon: number;
  totalValue: number;
};

type WebStats = {
  total: number;
  inQueue: number;
  released: number;
  conversionRate: number;
};

type Props =
  | { mode: "approved"; report: OrderAllReport }
  | { mode: "web"; web: WebStats }
  | { mode: "preorder"; preorder: PreorderStats };

export function OrderReportStatsPanel(props: Props) {
  if (props.mode === "approved") {
    const { report } = props;
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="glass-card rounded-2xl p-4">
          <Package className="mb-2 h-5 w-5 text-indigo-600" />
          <p className="text-sm text-slate-500">Approved Orders</p>
          <p className="text-2xl font-bold text-indigo-700">{report.stats.approved}</p>
          <p className="mt-1 text-xs text-slate-500">Panel & released from web</p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <Truck className="mb-2 h-5 w-5 text-emerald-600" />
          <p className="text-sm text-slate-500">Delivered</p>
          <p className="text-2xl font-bold text-emerald-700">{report.stats.delivered}</p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <Clock className="mb-2 h-5 w-5 text-amber-600" />
          <p className="text-sm text-slate-500">Open / Pending</p>
          <p className="text-2xl font-bold text-amber-700">{report.stats.pending}</p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <CheckCircle2 className="mb-2 h-5 w-5 text-slate-600" />
          <p className="text-sm text-slate-500">Order Value</p>
          <p className="text-2xl font-bold text-slate-900">{formatBdt(report.stats.totalValue)}</p>
        </div>
      </div>
    );
  }

  if (props.mode === "web") {
    const { web } = props;
    return (
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="glass-card rounded-2xl p-4">
          <Globe className="mb-2 h-5 w-5 text-sky-600" />
          <p className="text-sm text-slate-500">Web Orders</p>
          <p className="text-2xl font-bold text-sky-700">{web.total}</p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <Clock className="mb-2 h-5 w-5 text-amber-600" />
          <p className="text-sm text-slate-500">In Queue</p>
          <p className="text-2xl font-bold text-amber-700">{web.inQueue}</p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <CheckCircle2 className="mb-2 h-5 w-5 text-indigo-600" />
          <p className="text-sm text-slate-500">Released</p>
          <p className="text-2xl font-bold text-indigo-700">{web.released}</p>
        </div>
        <div className="glass-card rounded-2xl p-4">
          <Package className="mb-2 h-5 w-5 text-emerald-600" />
          <p className="text-sm text-slate-500">Conversion</p>
          <p className="text-2xl font-bold text-emerald-700">{web.conversionRate.toFixed(1)}%</p>
        </div>
      </div>
    );
  }

  const { preorder } = props;
  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
      <div className="glass-card rounded-2xl p-4">
        <Timer className="mb-2 h-5 w-5 text-violet-600" />
        <p className="text-sm text-slate-500">Preorders</p>
        <p className="text-2xl font-bold text-violet-700">{preorder.total}</p>
      </div>
      <div className="glass-card rounded-2xl p-4">
        <Package className="mb-2 h-5 w-5 text-indigo-600" />
        <p className="text-sm text-slate-500">Open</p>
        <p className="text-2xl font-bold text-indigo-700">{preorder.open}</p>
      </div>
      <div className="glass-card rounded-2xl p-4">
        <Clock className="mb-2 h-5 w-5 text-rose-600" />
        <p className="text-sm text-slate-500">Overdue</p>
        <p className="text-2xl font-bold text-rose-700">{preorder.overdue}</p>
      </div>
      <div className="glass-card rounded-2xl p-4">
        <CheckCircle2 className="mb-2 h-5 w-5 text-amber-600" />
        <p className="text-sm text-slate-500">Due in 7 days</p>
        <p className="text-2xl font-bold text-amber-700">{preorder.dueSoon}</p>
      </div>
    </div>
  );
}
