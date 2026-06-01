"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Zap } from "lucide-react";

const automations = [
  { name: "Auto SMS on new order", enabled: true, runs: 142 },
  { name: "Auto call for unverified orders", enabled: true, runs: 47 },
  { name: "Low stock alert email", enabled: false, runs: 0 },
  { name: "Auto cancel after 72h no response", enabled: true, runs: 12 },
];

export default function AutomationPage() {
  return (
    <div>
      <PageHeader
        title="Automation"
        description="Workflow automations for your store"
      />
      <div className="space-y-3">
        {automations.map((a) => (
          <div
            key={a.name}
            className="glass-card flex items-center justify-between rounded-2xl p-5"
          >
            <div className="flex items-center gap-3">
              <Zap className={`h-5 w-5 ${a.enabled ? "text-amber-500" : "text-slate-300"}`} />
              <div>
                <p className="font-bold text-slate-800">{a.name}</p>
                <p className="text-xs text-slate-500">{a.runs} runs this month</p>
              </div>
            </div>
            <button
              type="button"
              className={`relative h-6 w-11 rounded-full ${a.enabled ? "bg-teal-500" : "bg-slate-200"}`}
              aria-pressed={a.enabled}
            >
              <span
                className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                  a.enabled ? "left-5" : "left-0.5"
                }`}
              />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
