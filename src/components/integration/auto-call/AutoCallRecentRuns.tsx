"use client";

import clsx from "clsx";
import { loadAutoCallRuns, type AutoCallRun } from "@/lib/auto-call-store";
import { useEffect, useState } from "react";
import { acCard, acSectionTitle } from "@/lib/auto-call-ui";
import { History } from "lucide-react";

function runStatusLabel(status: string): string {
  const s = status.toLowerCase();
  if (s === "completed" || s === "done") return "Finished";
  if (s === "running" || s === "active") return "In progress";
  return status.replace(/_/g, " ");
}

export function AutoCallRecentRuns() {
  const [runs, setRuns] = useState<AutoCallRun[]>([]);

  useEffect(() => {
    const refresh = () => setRuns(loadAutoCallRuns().slice(0, 3));
    refresh();
    window.addEventListener("youraiseller-autocall-updated", refresh);
    return () => window.removeEventListener("youraiseller-autocall-updated", refresh);
  }, []);

  if (runs.length === 0) return null;

  return (
    <section className={acCard}>
      <div className="mb-4 flex items-center gap-2">
        <History className="h-4 w-4 text-violet-600" />
        <h3 className={acSectionTitle}>Recent batches</h3>
      </div>
      <div className="space-y-3">
        {runs.map((run) => (
          <div
            key={run.id}
            className="rounded-xl border border-slate-100 bg-gradient-to-r from-slate-50/80 to-violet-50/30 p-4"
          >
            <div className="mb-2 flex flex-wrap items-center gap-2">
              <span className="font-bold text-slate-900">Batch #{run.id}</span>
              <span
                className={clsx(
                  "rounded-full px-2 py-0.5 text-[10px] font-bold uppercase",
                  run.status.toLowerCase() === "completed"
                    ? "bg-emerald-100 text-emerald-800"
                    : "bg-indigo-100 text-indigo-800"
                )}
              >
                {runStatusLabel(run.status)}
              </span>
              <span className="text-xs text-slate-500">{run.startedAt}</span>
            </div>
            <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-slate-600">
              <span>
                <strong className="text-slate-800">{run.processed}</strong> of{" "}
                <strong className="text-slate-800">{run.total}</strong> called
              </span>
              <span className="text-emerald-700">
                ✓ Confirmed: <strong>{run.pressed1}</strong>
              </span>
              <span className="text-rose-700">
                ✗ Cancelled (2): <strong>{run.pressed2}</strong>
              </span>
              <span className="text-amber-700">
                No key: <strong>{run.answeredNoInput}</strong>
              </span>
              <span>
                No answer: <strong>{run.noAnswer}</strong>
              </span>
              <span>
                Failed: <strong>{run.failed}</strong>
              </span>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}
