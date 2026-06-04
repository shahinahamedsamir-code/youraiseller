"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { List, Loader2, Search } from "lucide-react";
import {
  autoCallLogOutcome,
  autoCallLogSource,
  autoCallLogStatusBadge,
  formatAutoCallDuration,
  formatAutoCallPhoneDisplay,
  formatAutoCallRelativeTime,
} from "@/lib/auto-call-log-display";
import { autoCallKeyDigit } from "@/lib/auto-call-response-codes";
import {
  loadAutoCallLogs,
  pollAutoCallStatuses,
  refreshAutoCallAccount,
  type AutoCallLogRow,
} from "@/lib/auto-call-store";
import { AutoCallStatusBadge } from "@/components/integration/auto-call/AutoCallStatusBadge";
import {
  acBtnSecondary,
  acCard,
  acInput,
  acLabel,
  acSectionSub,
  acSectionTitle,
} from "@/lib/auto-call-ui";

export function AutoCallLogsPanel() {
  const [logs, setLogs] = useState<AutoCallLogRow[]>([]);
  const [refreshing, setRefreshing] = useState(false);
  const [phoneFilter, setPhoneFilter] = useState("");

  const reload = useCallback(() => {
    setLogs(loadAutoCallLogs());
  }, []);

  useEffect(() => {
    void (async () => {
      await pollAutoCallStatuses();
      await refreshAutoCallAccount();
      reload();
    })();

    window.addEventListener("youraiseller-autocall-updated", reload);

    const interval = window.setInterval(() => {
      void pollAutoCallStatuses().then(async () => {
        await refreshAutoCallAccount();
        reload();
      });
    }, 20000);

    return () => {
      window.removeEventListener("youraiseller-autocall-updated", reload);
      window.clearInterval(interval);
    };
  }, [reload]);

  const filtered = useMemo(() => {
    const q = phoneFilter.replace(/\D/g, "");
    if (!q) return logs;
    return logs.filter((log) => log.phone.replace(/\D/g, "").includes(q));
  }, [logs, phoneFilter]);

  const handleRefresh = async () => {
    setRefreshing(true);
    await pollAutoCallStatuses();
    await refreshAutoCallAccount();
    reload();
    setRefreshing(false);
  };

  return (
    <div className="space-y-5">
      <section className="rounded-2xl border border-teal-100 bg-gradient-to-br from-teal-50/60 via-white to-violet-50/30 p-5">
        <div className="flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-teal-100 text-teal-700">
            <List className="h-5 w-5" />
          </div>
          <div>
            <h2 className={acSectionTitle}>Call logs</h2>
            <p className={acSectionSub}>
              Every verification call — who was called, whether they pressed a key, and what
              happened. Updates every 20 seconds while calls are running.
            </p>
          </div>
        </div>
      </section>

      <section className={acCard}>
        <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
          <label className="block min-w-[200px] flex-1 max-w-sm">
            <span className={acLabel}>Search by phone number</span>
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <input
                value={phoneFilter}
                onChange={(e) => setPhoneFilter(e.target.value)}
                placeholder="01XXXXXXXXX"
                className={`${acInput} pl-9`}
              />
            </div>
          </label>
          <button
            type="button"
            disabled={refreshing}
            onClick={() => void handleRefresh()}
            className={acBtnSecondary}
          >
            {refreshing ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : null}
            Refresh now
          </button>
        </div>

        <div className="overflow-x-auto rounded-xl border border-slate-200">
          <table className="min-w-full text-left text-sm">
            <thead className="bg-slate-50 text-xs font-bold uppercase tracking-wide text-slate-500">
              <tr>
                <th className="px-3 py-3">Phone</th>
                <th className="px-3 py-3">Status</th>
                <th className="px-3 py-3">Result</th>
                <th className="px-3 py-3">Key pressed</th>
                <th className="px-3 py-3">Try #</th>
                <th className="px-3 py-3">From</th>
                <th className="px-3 py-3">Length</th>
                <th className="px-3 py-3">Note</th>
                <th className="px-3 py-3">When</th>
              </tr>
            </thead>
            <tbody>
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-12 text-center text-slate-500">
                    No calls yet. Send a test call from Setup or start calling from Call Center.
                  </td>
                </tr>
              ) : (
                filtered.map((log) => {
                  const outcome = autoCallLogOutcome(log);
                  const statusBadge = autoCallLogStatusBadge(log);
                  const digit = autoCallKeyDigit(log.responseCode);

                  return (
                    <tr key={log.id} className="border-t border-slate-100 hover:bg-slate-50/40">
                      <td className="px-3 py-3 font-semibold tabular-nums text-slate-800">
                        {formatAutoCallPhoneDisplay(log.phone)}
                      </td>
                      <td className="px-3 py-3">
                        <AutoCallStatusBadge
                          label={statusBadge.label}
                          className={statusBadge.className}
                          icon={statusBadge.icon}
                          pulsing={statusBadge.pulsing}
                          size="md"
                        />
                      </td>
                      <td className="px-3 py-3">
                        <AutoCallStatusBadge
                          label={outcome.label}
                          className={outcome.className}
                          icon={outcome.icon}
                          pulsing={outcome.pulsing}
                          size="md"
                        />
                      </td>
                      <td className="px-3 py-3 tabular-nums text-slate-700">
                        {digit != null ? digit : "—"}
                      </td>
                      <td className="px-3 py-3 tabular-nums text-slate-700">
                        {log.attempt ?? 1}
                      </td>
                      <td className="px-3 py-3 text-xs font-semibold text-slate-600">
                        {autoCallLogSource(log)}
                      </td>
                      <td className="px-3 py-3 tabular-nums text-slate-700">
                        {formatAutoCallDuration(log.durationSec)}
                      </td>
                      <td className="max-w-[160px] truncate px-3 py-3 text-xs text-rose-700">
                        {log.error || (log.status === "failed" ? log.providerMessage : "") || "—"}
                      </td>
                      <td className="whitespace-nowrap px-3 py-3 text-xs text-slate-500">
                        {formatAutoCallRelativeTime(log.sentAt)}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
