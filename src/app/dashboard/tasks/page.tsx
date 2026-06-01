"use client";

import { PageHeader } from "@/components/ui/PageHeader";
import { tasks } from "@/lib/mock-admin";
import { Plus } from "lucide-react";
import clsx from "clsx";

const priorityColors = {
  high: "bg-rose-100 text-rose-800",
  medium: "bg-amber-100 text-amber-800",
  low: "bg-slate-100 text-slate-600",
};

export default function TasksPage() {
  return (
    <div>
      <PageHeader
        title="Task & Follow-up"
        description="Team tasks and customer follow-ups"
        actions={
          <button
            type="button"
            className="flex items-center gap-2 rounded-xl bg-teal-500 px-4 py-2 text-sm font-semibold text-white"
          >
            <Plus className="h-4 w-4" /> New Task
          </button>
        }
      />
      <div className="space-y-3">
        {tasks.map((t) => (
          <div
            key={t.id}
            className="glass-card flex flex-wrap items-center justify-between gap-3 rounded-2xl p-5"
          >
            <div>
              <p className="font-bold text-slate-800">{t.title}</p>
              <p className="text-sm text-slate-500">
                {t.assignee} · Due {t.due}
              </p>
            </div>
            <span
              className={clsx(
                "rounded-full px-3 py-0.5 text-xs font-semibold capitalize",
                priorityColors[t.priority as keyof typeof priorityColors]
              )}
            >
              {t.priority}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
