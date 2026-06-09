"use client";

import { ArrowDownLeft, ArrowRightLeft, ArrowUpRight } from "lucide-react";
import { formatBdt } from "@/lib/accounting-store";
import { AccountingStatCards } from "./AccountingStatCards";
import { useAccountingData } from "./useAccountingData";

export function AccountingDashboard() {
  const { recent } = useAccountingData();

  return (
    <div className="space-y-6">
      <AccountingStatCards />
      <div className="glass-card rounded-2xl p-5">
        <h3 className="mb-4 font-bold text-slate-800">Recent Transactions</h3>
        {recent.length === 0 ? (
          <p className="text-sm text-slate-500">No transactions yet. Add income or expense to get started.</p>
        ) : (
          <div className="space-y-2">
            {recent.map((t) => (
              <div
                key={`${t.type}-${t.id}`}
                className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
              >
                <div className="flex items-center gap-3">
                  {t.type === "income" ? (
                    <ArrowDownLeft className="h-5 w-5 text-teal-500" />
                  ) : t.type === "transfer" ? (
                    <ArrowRightLeft className="h-5 w-5 text-indigo-500" />
                  ) : (
                    <ArrowUpRight className="h-5 w-5 text-rose-500" />
                  )}
                  <div>
                    <p className="text-sm font-medium">{t.label}</p>
                    <p className="text-xs text-slate-500">{t.date}</p>
                  </div>
                </div>
                <span
                  className={`font-bold ${
                    t.type === "transfer"
                      ? "text-indigo-600"
                      : t.amount > 0
                        ? "text-teal-600"
                        : "text-rose-600"
                  }`}
                >
                  {t.type === "transfer" ? "" : t.amount > 0 ? "+" : ""}
                  {formatBdt(t.amount)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
