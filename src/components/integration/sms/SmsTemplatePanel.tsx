"use client";

import { FileText } from "lucide-react";
import { SmsCustomQuickTemplates } from "@/components/integration/sms/SmsCustomQuickTemplates";

export function SmsTemplatePanel() {
  return (
    <div className="yai-panel overflow-hidden">
      <div className="border-b border-slate-100 bg-gradient-to-r from-white to-violet-50/40 px-5 py-4 sm:px-6">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div className="flex items-start gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
              <FileText className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-slate-900">SMS Template</h2>
              <p className="mt-1 text-sm text-slate-500">
                Custom messages for Quick Send dropdown
              </p>
            </div>
          </div>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <SmsCustomQuickTemplates embedded />
      </div>
    </div>
  );
}
