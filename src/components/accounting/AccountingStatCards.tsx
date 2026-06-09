"use client";

import { Wallet, ArrowDownLeft, ArrowUpRight, Landmark, TrendingUp } from "lucide-react";
import { formatBdt } from "@/lib/accounting-store";
import { useAccountingData } from "./useAccountingData";

export function AccountingStatCards() {
  const { summary } = useAccountingData();

  const cards = [
    {
      label: "Total Income",
      value: formatBdt(summary.totalIncome),
      tone: "text-teal-600",
      icon: ArrowDownLeft,
      iconTone: "text-teal-500",
    },
    {
      label: "Total Expense",
      value: formatBdt(summary.totalExpense),
      tone: "text-rose-600",
      icon: ArrowUpRight,
      iconTone: "text-rose-500",
    },
    {
      label: "Net Profit",
      value: formatBdt(summary.netProfit),
      tone: summary.netProfit >= 0 ? "text-slate-900" : "text-rose-600",
      icon: TrendingUp,
      iconTone: "text-violet-500",
    },
    {
      label: "Cash & Accounts",
      value: formatBdt(summary.cashBalance),
      tone: "text-indigo-600",
      icon: Wallet,
      iconTone: "text-indigo-500",
    },
    {
      label: "Total Assets",
      value: formatBdt(summary.totalAssets),
      tone: "text-amber-700",
      icon: Landmark,
      iconTone: "text-amber-500",
    },
    {
      label: "Ad Spend",
      value: formatBdt(summary.adSpend),
      tone: "text-fuchsia-600",
      icon: ArrowUpRight,
      iconTone: "text-fuchsia-500",
    },
  ];

  return (
    <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
      {cards.map((c) => (
        <div key={c.label} className="glass-card rounded-2xl p-5">
          <c.icon className={`mb-2 h-5 w-5 ${c.iconTone}`} />
          <p className="text-sm text-slate-500">{c.label}</p>
          <p className={`text-2xl font-bold ${c.tone}`}>{c.value}</p>
        </div>
      ))}
    </div>
  );
}
