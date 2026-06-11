"use client";

import { QuickSmsForm } from "@/components/integration/sms/QuickSmsForm";

export function SendSmsPanel() {
  return (
    <div className="yai-panel p-5 sm:p-6">
      <QuickSmsForm />
    </div>
  );
}
