"use client";

import { useEffect, useState } from "react";
import clsx from "clsx";
import { BarChart3, Loader2 } from "lucide-react";
import {
  loadAutoCallRuns,
  pollAutoCallStatuses,
  type AutoCallRun,
} from "@/lib/auto-call-store";
import { acBtnSecondary, acCard, acSectionSub, acSectionTitle } from "@/lib/auto-call-ui";

function runStatusLabel(status: string): string {
  const s = status.toLowerCase();
  if (s === "completed" || s === "done") return "Finished";
  if (s === "running" || s === "active") return "In progress";
  if (s === "queued") return "Starting";
  return status.replace(/_/g, " ");
}

export function AutoCallReportPanel() {
  const [runs, setRuns] = useState<AutoCallRun[]>([]);
  const [polling, setPolling] = useState(false);

  const refresh = () => setRuns(loadAutoCallRuns());

  useEffect(() => {
    refresh();
    window.addEventListener("youraiseller-autocall-updated", refresh);
    return () => window.removeEventListener("youraiseller-autocall-updated", refresh);
  }, []);

  const handlePoll = async () => {
    setPolling(true);
    await pollAutoCallStatuses();
    refresh();
    setPolling(false);
  };

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-indigo-100 bg-gradient-to-br from-indigo-50/80 via-white to-violet-50/30 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-indigo-100 text-indigo-700">
            <BarChart3 className="h-5 w-5" />
          </div>
          <div>
            <h2 className={acSectionTitle}>Summary report</h2>
            <p className={acSectionSub}>
              See how each batch of verification calls performed — confirmations, no answer,
              and more.
            </p>
          </div>
        </div>
      </section>

      <section className={acCard}>
        <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
          <p className="text-sm text-slate-500">Results update automatically as calls finish.</p>
          <button
            type="button"
            disabled={polling}
            onClick={() => void handlePoll()}
            className={acBtnSecondary}
          >
            {polling ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Refresh results
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-3">Batch</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Started</th>
                <th className="px-3 py-3">Calls made</th>
                <th className="px-3 py-3">Confirmed (1)</th>
                <th className="px-3 py-3">Failed</th>
                <th className="px-3 py-3">No key pressed</th>
              </tr>
            </thead>
            <tbody>
              {runs.length === 0 ? (
                <tr>
                  <td colSpan={7} className="px-4 py-12 text-center text-slate-500">
                    No batches yet. Go to{" "}
                    <strong className="text-slate-700">Call Center</strong> and start calling
                    orders.
                  </td>
                </tr>
              ) : (
                runs.map((run) => (
                  <tr key={run.id} className="border-t border-slate-100 hover:bg-slate-50/50">
                    <td className="px-3 py-3 font-semibold text-slate-800">#{run.id}</td>
                    <td className="px-3 py-3">
                      <span
                        className={clsx(
                          "inline-flex rounded-full px-2 py-0.5 text-xs font-bold",
                          run.status.toLowerCase() === "completed"
                            ? "bg-emerald-50 text-emerald-800"
                            : "bg-indigo-50 text-indigo-800"
                        )}
                      >
                        {runStatusLabel(run.status)}
                      </span>
                    </td>
                    <td className="px-3 py-3 text-xs text-slate-500">{run.startedAt}</td>
                    <td className="px-3 py-3 font-semibold tabular-nums">
                      {run.processed}/{run.total}
                    </td>
                    <td className="px-3 py-3 tabular-nums text-emerald-700">{run.pressed1}</td>
                    <td className="px-3 py-3 tabular-nums text-rose-700">{run.failed}</td>
                    <td className="px-3 py-3 tabular-nums text-amber-700">
                      {run.answeredNoInput}
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
