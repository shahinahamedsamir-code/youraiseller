"use client";

import { SmartRestockPanel } from "@/components/inventory/SmartRestockPanel";

export default function SmartRestockPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Smart Restock</h1>
        <p className="mt-1 text-sm text-slate-500">
          Intelligent inventory insights and recommendations
        </p>
      </div>
      <SmartRestockPanel />
    </div>
  );
}
