"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Wallet, ArrowDownLeft, ArrowUpRight } from "lucide-react";

const transactions = [
  { type: "income", label: "Order Payment — WO-1041", amount: 2490, date: "20 May" },
  { type: "expense", label: "Courier — Steadfast", amount: -120, date: "20 May" },
  { type: "income", label: "Order Payment — WO-1039", amount: 3200, date: "19 May" },
  { type: "expense", label: "Meta Ads Spend", amount: -1250, date: "19 May" },
];

export default function AccountingPage() {
  return (
    <div>
      <PageHeader
        title="Accounting"
        description="Income, expenses and profit overview"
      />
      <div className="mb-6 grid gap-4 sm:grid-cols-3">
        <div className="glass-card rounded-2xl p-5">
          <p className="text-sm text-slate-500">Total Income</p>
          <p className="text-2xl font-bold text-teal-600">৳23,700</p>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <p className="text-sm text-slate-500">Total Expense</p>
          <p className="text-2xl font-bold text-rose-600">৳14,808</p>
        </div>
        <div className="glass-card rounded-2xl p-5">
          <Wallet className="mb-2 h-6 w-6 text-violet-500" />
          <p className="text-sm text-slate-500">Net Profit</p>
          <p className="text-2xl font-bold text-slate-900">৳8,892</p>
        </div>
      </div>
      <div className="glass-card rounded-2xl p-5">
        <h3 className="mb-4 font-bold text-slate-800">Recent Transactions</h3>
        <div className="space-y-2">
          {transactions.map((t) => (
            <div
              key={t.label}
              className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
            >
              <div className="flex items-center gap-3">
                {t.type === "income" ? (
                  <ArrowDownLeft className="h-5 w-5 text-teal-500" />
                ) : (
                  <ArrowUpRight className="h-5 w-5 text-rose-500" />
                )}
                <div>
                  <p className="text-sm font-medium">{t.label}</p>
                  <p className="text-xs text-slate-500">{t.date}</p>
                </div>
              </div>
              <span
                className={`font-bold ${t.amount > 0 ? "text-teal-600" : "text-rose-600"}`}
              >
                {t.amount > 0 ? "+" : ""}৳{Math.abs(t.amount).toLocaleString()}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
