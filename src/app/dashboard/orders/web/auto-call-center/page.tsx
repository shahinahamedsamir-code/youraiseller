"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Phone, PhoneCall, Clock, CheckCircle2, XCircle, Settings } from "lucide-react";

const stats = [
  { label: "Calls Today", value: "47", icon: PhoneCall, color: "from-teal-500 to-emerald-500" },
  { label: "Confirmed", value: "32", icon: CheckCircle2, color: "from-green-500 to-teal-500" },
  { label: "No Response", value: "9", icon: Clock, color: "from-amber-400 to-orange-500" },
  { label: "Failed", value: "6", icon: XCircle, color: "from-rose-400 to-pink-500" },
];

export default function AutoCallCenterPage() {
  return (
    <div>
      <PageHeader
        title="Auto Call Center"
        description="Automated IVR calls to verify and confirm web orders"
        actions={
          <button
            type="button"
            className="flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium shadow-sm"
          >
            <Settings className="h-4 w-4" />
            Settings
          </button>
        }
      />

      <div className="mb-6 grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="glass-card rounded-2xl p-5">
            <div className={`mb-3 inline-flex rounded-xl bg-gradient-to-br ${s.color} p-2.5 text-white`}>
              <s.icon className="h-5 w-5" />
            </div>
            <p className="text-sm text-slate-500">{s.label}</p>
            <p className="text-3xl font-bold text-slate-900">{s.value}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        <div className="glass-card rounded-2xl p-6">
          <h3 className="mb-4 font-bold text-slate-800">Call Queue</h3>
          <div className="space-y-3">
            {["WO-1042 — Rahim Uddin", "WO-1040 — Karim Hassan", "WO-1035 — Imran Ali"].map(
              (item, i) => (
                <div
                  key={item}
                  className="flex items-center justify-between rounded-xl bg-slate-50 px-4 py-3"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex h-9 w-9 items-center justify-center rounded-full bg-teal-100 text-teal-600">
                      <Phone className="h-4 w-4" />
                    </div>
                    <span className="text-sm font-medium text-slate-700">{item}</span>
                  </div>
                  <span className="text-xs font-semibold text-amber-600">
                    {i === 0 ? "Calling..." : "Queued"}
                  </span>
                </div>
              )
            )}
          </div>
        </div>

        <div className="glass-card rounded-2xl p-6">
          <h3 className="mb-4 font-bold text-slate-800">Auto Call Rules</h3>
          <div className="space-y-4">
            {[
              { label: "Auto call on new order", on: true },
              { label: "Retry after 2 hours if no answer", on: true },
              { label: "Max 3 retry attempts", on: true },
              { label: "Call only 9 AM – 9 PM", on: false },
            ].map((rule) => (
              <div key={rule.label} className="flex items-center justify-between">
                <span className="text-sm text-slate-700">{rule.label}</span>
                <button
                  type="button"
                  className={`relative h-6 w-11 rounded-full transition ${
                    rule.on ? "bg-teal-500" : "bg-slate-200"
                  }`}
                  aria-pressed={rule.on}
                >
                  <span
                    className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${
                      rule.on ? "left-5" : "left-0.5"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
