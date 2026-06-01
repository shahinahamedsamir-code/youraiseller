"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { employees } from "@/lib/mock-admin";
import { UserPlus } from "lucide-react";

export default function HRMPage() {
  return (
    <div>
      <PageHeader
        title="HRM"
        description="Human resource and employee performance"
        actions={
          <button
            type="button"
            className="flex items-center gap-2 rounded-xl bg-violet-500 px-4 py-2 text-sm font-semibold text-white"
          >
            <UserPlus className="h-4 w-4" /> Add Employee
          </button>
        }
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
        {employees.map((e) => (
          <div key={e.id} className="glass-card rounded-2xl p-5">
            <div className="mb-3 flex h-12 w-12 items-center justify-center rounded-full bg-gradient-to-br from-teal-400 to-violet-500 text-lg font-bold text-white">
              {e.name.charAt(0)}
            </div>
            <h3 className="font-bold text-slate-900">{e.name}</h3>
            <p className="text-sm text-slate-500">{e.role}</p>
            <p className="mt-3 text-2xl font-bold text-teal-600">{e.orders}</p>
            <p className="text-xs text-slate-500">orders handled</p>
            <span className="mt-2 inline-block rounded-full bg-teal-100 px-2 py-0.5 text-xs font-semibold text-teal-800">
              {e.status}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
