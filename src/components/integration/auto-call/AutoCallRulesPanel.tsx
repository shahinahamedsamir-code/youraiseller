"use client";

import { useEffect, useMemo, useState } from "react";
import clsx from "clsx";
import { Clock, Save, Sparkles, Zap } from "lucide-react";
import {
  loadAutoCallRules,
  loadAutoCallSettings,
  saveAutoCallRulesToServer,
  type AutoCallRule,
} from "@/lib/auto-call-store";
import {
  callWindowFromSettings,
  formatCallWindowLabel,
  partsToTimeString,
  timeStringToParts,
  type AutoCallWindow,
} from "@/lib/auto-call-schedule";
import {
  acBtnPrimary,
  acCard,
  acHint,
  acInput,
  acLabel,
  acSectionSub,
  acSectionTitle,
  AUTO_CALL_RULES_COPY,
} from "@/lib/auto-call-ui";

export function AutoCallRulesPanel() {
  const [rules, setRules] = useState<AutoCallRule[]>([]);
  const [callWindow, setCallWindow] = useState<AutoCallWindow>(() =>
    callWindowFromSettings(loadAutoCallSettings())
  );
  const [saved, setSaved] = useState(false);

  const refresh = () => {
    setRules(loadAutoCallRules());
    setCallWindow(callWindowFromSettings(loadAutoCallSettings()));
  };

  useEffect(() => {
    refresh();
    window.addEventListener("youraiseller-autocall-updated", refresh);
    return () => window.removeEventListener("youraiseller-autocall-updated", refresh);
  }, []);

  const scheduleLabel = useMemo(() => formatCallWindowLabel(callWindow), [callWindow]);

  const toggle = (id: string) => {
    setRules((prev) =>
      prev.map((r) => (r.id === id ? { ...r, enabled: !r.enabled } : r))
    );
    setSaved(false);
  };

  const handleSave = async () => {
    const result = await saveAutoCallRulesToServer(rules, callWindow);
    if (!result.ok) {
      return;
    }
    setSaved(true);
    window.setTimeout(() => setSaved(false), 2000);
  };

  return (
    <div className="space-y-5">
      <section className="relative overflow-hidden rounded-2xl border border-violet-100 bg-gradient-to-br from-violet-50 via-white to-indigo-50/40 p-5">
        <div className="pointer-events-none absolute -right-8 -top-8 h-32 w-32 rounded-full bg-violet-200/30 blur-2xl" />
        <div className="relative flex items-start gap-3">
          <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
            <Zap className="h-5 w-5" />
          </div>
          <div>
            <h2 className={acSectionTitle}>Automatic calling rules</h2>
            <p className={acSectionSub}>
              Turn rules on or off to control when orders get a verification call without
              clicking &quot;Start calling&quot; every time.
            </p>
          </div>
        </div>
      </section>

      <section className={acCard}>
        <div className="mb-4 flex items-center gap-2 text-xs font-semibold text-violet-700">
          <Sparkles className="h-3.5 w-3.5" />
          Changes apply after you save
        </div>
        <div className="space-y-3">
          {rules.map((rule) => {
            const copy = AUTO_CALL_RULES_COPY[rule.id];
            const title =
              rule.id === "business_hours"
                ? `Call only ${scheduleLabel}`
                : copy?.title ?? rule.label;
            const description = copy?.description ?? "";
            const showSchedule = rule.id === "business_hours";

            return (
              <div key={rule.id} className="space-y-0">
                <div
                  className={clsx(
                    "flex items-start justify-between gap-4 rounded-xl border px-4 py-3.5 transition",
                    rule.enabled
                      ? "border-violet-200 bg-violet-50/40"
                      : "border-slate-200 bg-slate-50/50",
                    showSchedule && rule.enabled && "rounded-b-none border-b-0"
                  )}
                >
                  <div className="min-w-0">
                    <p className="text-sm font-bold text-slate-900">{title}</p>
                    {description ? (
                      <p className="mt-0.5 text-xs leading-relaxed text-slate-500">
                        {description}
                      </p>
                    ) : null}
                  </div>
                  <button
                    type="button"
                    onClick={() => toggle(rule.id)}
                    className={clsx(
                      "relative mt-0.5 h-7 w-12 shrink-0 rounded-full transition",
                      rule.enabled ? "bg-violet-600" : "bg-slate-300"
                    )}
                    aria-pressed={rule.enabled}
                    aria-label={`${rule.enabled ? "Disable" : "Enable"} ${title}`}
                  >
                    <span
                      className={clsx(
                        "absolute top-0.5 h-6 w-6 rounded-full bg-white shadow transition",
                        rule.enabled ? "left-[22px]" : "left-0.5"
                      )}
                    />
                  </button>
                </div>

                {showSchedule && rule.enabled ? (
                  <div className="rounded-b-xl border border-t-0 border-violet-200 bg-violet-50/30 px-4 py-4">
                    <div className="mb-3 flex items-center gap-2 text-xs font-bold text-violet-800">
                      <Clock className="h-3.5 w-3.5" />
                      Call time schedule (Bangladesh time)
                    </div>
                    <div className="grid gap-3 sm:grid-cols-2">
                      <label>
                        <span className={acLabel}>Start time</span>
                        <input
                          type="time"
                          className={acInput}
                          value={partsToTimeString(
                            callWindow.startHour,
                            callWindow.startMinute
                          )}
                          onChange={(e) => {
                            const next = timeStringToParts(e.target.value);
                            setCallWindow((w) => ({
                              ...w,
                              startHour: next.hour,
                              startMinute: next.minute,
                            }));
                            setSaved(false);
                          }}
                        />
                      </label>
                      <label>
                        <span className={acLabel}>End time</span>
                        <input
                          type="time"
                          className={acInput}
                          value={partsToTimeString(callWindow.endHour, callWindow.endMinute)}
                          onChange={(e) => {
                            const next = timeStringToParts(e.target.value);
                            setCallWindow((w) => ({
                              ...w,
                              endHour: next.hour,
                              endMinute: next.minute,
                            }));
                            setSaved(false);
                          }}
                        />
                      </label>
                    </div>
                    <p className={`${acHint} mt-3`}>
                      Auto calls run only between <strong>{scheduleLabel}</strong>. Outside
                      this window, new calls and retries wait until the schedule opens.
                    </p>
                  </div>
                ) : null}
              </div>
            );
          })}
        </div>

        <button type="button" onClick={handleSave} className={`${acBtnPrimary} mt-6`}>
          <Save className="h-4 w-4" />
          Save rules
          {saved ? <span className="font-medium text-violet-200">· Saved!</span> : null}
        </button>
      </section>
    </div>
  );
}
