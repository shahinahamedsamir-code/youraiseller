"use client";

import { SmartRestockPanel } from "@/components/inventory/SmartRestockPanel";

export default function SmartRestockPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">Smart Restock</h1>
      </div>
      <SmartRestockPanel />
    </div>
  );
}
