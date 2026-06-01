"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { Building2, Bell, Palette, Shield } from "lucide-react";

const sections = [
  { icon: Building2, title: "Company Profile", desc: "Name, logo, address, currency" },
  { icon: Bell, title: "Notifications", desc: "Email and in-app alerts" },
  { icon: Palette, title: "Appearance", desc: "Theme and branding" },
  { icon: Shield, title: "Security", desc: "Password, 2FA, API keys" },
];

export default function SettingsPage() {
  return (
    <div>
      <PageHeader title="Setting" description="System and account configuration" />
      <div className="grid gap-4 md:grid-cols-2">
        {sections.map((s) => (
          <button
            key={s.title}
            type="button"
            className="glass-card flex items-start gap-4 rounded-2xl p-5 text-left transition hover:shadow-md"
          >
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-slate-100 text-slate-600">
              <s.icon className="h-5 w-5" />
            </div>
            <div>
              <h3 className="font-bold text-slate-800">{s.title}</h3>
              <p className="text-sm text-slate-500">{s.desc}</p>
            </div>
          </button>
        ))}
      </div>
      <div className="glass-card mt-6 rounded-2xl p-6">
        <h3 className="mb-4 font-bold text-slate-800">General Settings</h3>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
              Company Name
            </label>
            <input
              type="text"
              defaultValue="YourAI Seller"
              className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm"
            />
          </div>
          <div>
            <label className="mb-1 block text-xs font-semibold uppercase text-slate-500">
              Currency
            </label>
            <select className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm">
              <option>BDT (৳)</option>
              <option>USD ($)</option>
            </select>
          </div>
        </div>
        <button
          type="button"
          className="mt-4 rounded-xl bg-teal-500 px-6 py-2.5 text-sm font-semibold text-white"
        >
          Save Changes
        </button>
      </div>
    </div>
  );
}
