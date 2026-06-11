"use client";

import { useState } from "react";
import clsx from "clsx";
import { BarChart3, Download, List } from "lucide-react";
import { SmsLogExportTab } from "@/components/integration/sms/SmsLogExportTab";
import { SmsLogListTab } from "@/components/integration/sms/SmsLogListTab";
import { SmsLogReportsTab } from "@/components/integration/sms/SmsLogReportsTab";
import { useSmsAccount } from "@/components/integration/sms/useSmsAccount";
import type { SmsLogPeriod } from "@/lib/sms-log-analytics";

type Tab = "reports" | "logs" | "export";

const TABS: { id: Tab; label: string; icon: typeof BarChart3 }[] = [
  { id: "reports", label: "Reports", icon: BarChart3 },
  { id: "logs", label: "SMS Logs", icon: List },
  { id: "export", label: "Export", icon: Download },
];

export function SmsLogPanel() {
  const { account, setAccount, smsPriceTaka, loading } = useSmsAccount();
  const [tab, setTab] = useState<Tab>("reports");
  const [reportPeriod, setReportPeriod] = useState<SmsLogPeriod>("today");

  return (
    <div className="yai-panel overflow-hidden">
      <div className="border-b border-slate-100 bg-gradient-to-r from-white to-slate-50 px-4 py-4 sm:px-6">
        <h2 className="text-lg font-extrabold text-slate-900">SMS Logs</h2>
        <p className="mt-1 text-sm text-slate-500">
          View reports, manage logs, and export SMS data
        </p>
      </div>

      <div className="-mx-px flex gap-1 overflow-x-auto border-b border-slate-100 px-3 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {TABS.map((item) => {
          const Icon = item.icon;
          const active = tab === item.id;
          return (
            <button
              key={item.id}
              type="button"
              onClick={() => setTab(item.id)}
              className={clsx(
                "inline-flex shrink-0 items-center gap-2 border-b-2 px-3 py-3 text-sm font-bold transition sm:px-4",
                active
                  ? "border-teal-500 text-teal-700"
                  : "border-transparent text-slate-500 hover:border-slate-200 hover:text-slate-700"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              <span className="whitespace-nowrap">{item.label}</span>
            </button>
          );
        })}
      </div>

      <div className="p-4 sm:p-6">
        {tab === "reports" ? (
          <SmsLogReportsTab
            logs={account.logs}
            smsPriceTaka={smsPriceTaka}
            period={reportPeriod}
            onPeriodChange={setReportPeriod}
          />
        ) : null}

        {tab === "logs" ? (
          <SmsLogListTab
            logs={account.logs}
            smsPriceTaka={smsPriceTaka}
            loading={loading}
            onAccountUpdate={setAccount}
          />
        ) : null}

        {tab === "export" ? (
          <SmsLogExportTab logs={account.logs} smsPriceTaka={smsPriceTaka} />
        ) : null}
      </div>
    </div>
  );
}
