"use client";

import { QuickSmsForm } from "@/components/integration/sms/QuickSmsForm";

export function SendSmsPanel() {
  return (
    <div className="yai-panel mx-auto w-full max-w-4xl p-4 sm:p-6 lg:p-8">
      <QuickSmsForm />
    </div>
  );
}
